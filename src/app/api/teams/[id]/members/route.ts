import { defineHandler, HttpError } from "@/lib/api/api-handler"
import { getDrizzleDb, databaseType } from "@/lib/db/connection"
import { connectToMongoDB } from "@/lib/db/mongodb"
import { eq, and } from "drizzle-orm"
import * as sqliteSchema from "@/lib/schemas/db-sqlite"
import * as pgSchema from "@/lib/schemas/db-postgres"
import * as mysqlSchema from "@/lib/schemas/db-mysql"
import { generateSecureToken } from "@/lib/utils"
import { writeAuditLog } from "@/lib/security/audit"
import { getClientIp } from "@/lib/rate-limit/rate-limiter"
import { z } from "zod"

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

async function getMembership(orgId: string, userId: string) {
  if (databaseType === "mongodb") {
    const db = await connectToMongoDB()
    return await db.collection("organization_members").findOne({ organizationId: orgId, userId })
  } else {
    const db = getDrizzleDb() as any
    const tables = getTables()
    const result = await db
      .select()
      .from(tables.organizationMembers)
      .where(and(eq(tables.organizationMembers.organizationId, orgId), eq(tables.organizationMembers.userId, userId)))
      .limit(1)
    return result[0] || null
  }
}

const inviteMemberSchema = z.object({
  email: z.string().email("E-mail inválido"),
  role: z.enum(["admin", "member", "viewer"]),
})

const removeMemberSchema = z.object({
  userIdToDelete: z.string().optional(),
  invitationIdToDelete: z.string().optional(),
})

export const GET = defineHandler(
  { requireAuth: true },
  async ({ user, params }) => {
    const orgId = params.id
    const membership = await getMembership(orgId, user.userId)
    if (!membership) {
      throw new HttpError(403, "Você não faz parte desta equipe")
    }

    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      const members = await db.collection("organization_members").find({ organizationId: orgId }).toArray()
      const invitations = await db.collection("organization_invitations").find({ organizationId: orgId }).toArray()
      return { members, invitations }
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      const members = await db
        .select()
        .from(tables.organizationMembers)
        .where(eq(tables.organizationMembers.organizationId, orgId))
      const invitations = await db
        .select()
        .from(tables.organizationInvitations)
        .where(eq(tables.organizationInvitations.organizationId, orgId))
      return { members, invitations }
    }
  }
)

export const POST = defineHandler(
  { schema: inviteMemberSchema, requireAuth: true },
  async ({ body, user, params, req }) => {
    const orgId = params.id
    const ip = getClientIp(req.headers)
    const ua = req.headers.get("user-agent") || "unknown"

    const membership = await getMembership(orgId, user.userId)
    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new HttpError(403, "Apenas proprietários e administradores podem enviar convites")
    }

    const inviteToken = generateSecureToken(32)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const inviteId = generateSecureToken()

    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      await db.collection("organization_invitations").insertOne({
        id: inviteId,
        organizationId: orgId,
        email: body.email,
        role: body.role,
        token: inviteToken,
        expiresAt,
        createdAt: new Date(),
      })
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      await db.insert(tables.organizationInvitations).values({
        id: inviteId,
        organizationId: orgId,
        email: body.email,
        role: body.role,
        token: inviteToken,
        expiresAt,
      })
    }

    await writeAuditLog(
      user.userId,
      "TEAM_INVITE",
      "success",
      ip,
      ua,
      `Invited ${body.email} as ${body.role} to team ${orgId}`
    )

    return {
      success: true,
      invitation: {
        id: inviteId,
        email: body.email,
        role: body.role,
        token: inviteToken,
        expiresAt,
      },
    }
  }
)

export const DELETE = defineHandler(
  { schema: removeMemberSchema, requireAuth: true },
  async ({ body, user, params, req }) => {
    const orgId = params.id
    const ip = getClientIp(req.headers)
    const ua = req.headers.get("user-agent") || "unknown"

    const membership = await getMembership(orgId, user.userId)
    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new HttpError(403, "Apenas proprietários e administradores podem remover membros ou cancelar convites")
    }

    if (body.userIdToDelete) {
      if (body.userIdToDelete === user.userId) {
        throw new HttpError(400, "Você não pode se remover da equipe por esta rota")
      }

      const targetMember = await getMembership(orgId, body.userIdToDelete)
      if (!targetMember) {
        throw new HttpError(404, "Membro não encontrado")
      }

      if (targetMember.role === "owner") {
        throw new HttpError(400, "Não é possível remover o proprietário da equipe")
      }

      if (membership.role === "admin" && targetMember.role === "admin") {
        throw new HttpError(403, "Administradores não podem remover outros administradores")
      }

      if (databaseType === "mongodb") {
        const db = await connectToMongoDB()
        await db.collection("organization_members").deleteOne({ organizationId: orgId, userId: body.userIdToDelete })
      } else {
        const db = getDrizzleDb() as any
        const tables = getTables()
        await db
          .delete(tables.organizationMembers)
          .where(
            and(
              eq(tables.organizationMembers.organizationId, orgId),
              eq(tables.organizationMembers.userId, body.userIdToDelete)
            )
          )
      }

      await writeAuditLog(
        user.userId,
        "TEAM_MEMBER_REMOVE",
        "success",
        ip,
        ua,
        `Removed member ${body.userIdToDelete} from team ${orgId}`
      )

      return { success: true, message: "Membro removido com sucesso." }
    }

    if (body.invitationIdToDelete) {
      if (databaseType === "mongodb") {
        const db = await connectToMongoDB()
        const result = await db.collection("organization_invitations").deleteOne({
          id: body.invitationIdToDelete,
          organizationId: orgId,
        })
        if (result.deletedCount === 0) {
          throw new HttpError(404, "Convite não encontrado")
        }
      } else {
        const db = getDrizzleDb() as any
        const tables = getTables()
        const result = await db
          .delete(tables.organizationInvitations)
          .where(
            and(
              eq(tables.organizationInvitations.id, body.invitationIdToDelete),
              eq(tables.organizationInvitations.organizationId, orgId)
            )
          )
        if (result.rowsAffected === 0 && result.changes === 0) {
          throw new HttpError(404, "Convite não encontrado")
        }
      }

      await writeAuditLog(
        user.userId,
        "TEAM_INVITE_CANCEL",
        "success",
        ip,
        ua,
        `Canceled invitation ${body.invitationIdToDelete} from team ${orgId}`
      )

      return { success: true, message: "Convite cancelado com sucesso." }
    }

    throw new HttpError(400, "Informe userIdToDelete ou invitationIdToDelete")
  }
)
