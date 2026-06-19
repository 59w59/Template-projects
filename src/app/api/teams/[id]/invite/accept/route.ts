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

const acceptInviteSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
})

export const POST = defineHandler(
  { schema: acceptInviteSchema, requireAuth: true },
  async ({ body, user, params, req }) => {
    const orgId = params.id
    const ip = getClientIp(req.headers)
    const ua = req.headers.get("user-agent") || "unknown"

    let invitation: any = null
    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      invitation = await db.collection("organization_invitations").findOne({
        organizationId: orgId,
        token: body.token,
      })
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      const result = await db
        .select()
        .from(tables.organizationInvitations)
        .where(
          and(
            eq(tables.organizationInvitations.organizationId, orgId),
            eq(tables.organizationInvitations.token, body.token)
          )
        )
        .limit(1)
      invitation = result[0] || null
    }

    if (!invitation) {
      throw new HttpError(404, "Convite não encontrado ou inválido")
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      throw new HttpError(400, "Este convite já expirou")
    }

    let isMember = false
    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      const existing = await db.collection("organization_members").findOne({
        organizationId: orgId,
        userId: user.userId,
      })
      if (existing) isMember = true
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      const existing = await db
        .select()
        .from(tables.organizationMembers)
        .where(
          and(
            eq(tables.organizationMembers.organizationId, orgId),
            eq(tables.organizationMembers.userId, user.userId)
          )
        )
        .limit(1)
      if (existing.length > 0) isMember = true
    }

    if (isMember) {
      throw new HttpError(400, "Você já faz parte desta equipe")
    }

    const memberId = generateSecureToken()

    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      await db.collection("organization_members").insertOne({
        id: memberId,
        organizationId: orgId,
        userId: user.userId,
        role: invitation.role,
        createdAt: new Date(),
      })
      await db.collection("organization_invitations").deleteOne({ id: invitation.id })
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      await db.insert(tables.organizationMembers).values({
        id: memberId,
        organizationId: orgId,
        userId: user.userId,
        role: invitation.role,
      })
      await db.delete(tables.organizationInvitations).where(eq(tables.organizationInvitations.id, invitation.id))
    }

    await writeAuditLog(
      user.userId,
      "TEAM_INVITE_ACCEPT",
      "success",
      ip,
      ua,
      `Accepted invitation to team ${orgId} with role ${invitation.role}`
    )

    return {
      success: true,
      message: "Convite aceito com sucesso.",
      membership: {
        id: memberId,
        organizationId: orgId,
        role: invitation.role,
      },
    }
  }
)
