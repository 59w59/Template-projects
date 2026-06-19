import { defineHandler, HttpError } from "@/lib/api/api-handler"
import { getDrizzleDb, databaseType } from "@/lib/db/connection"
import { connectToMongoDB } from "@/lib/db/mongodb"
import { eq, and, inArray } from "drizzle-orm"
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

const createTeamSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  slug: z.string().min(2, "Slug deve ter pelo menos 2 caracteres").regex(/^[a-z0-9-]+$/, "Slug inválido"),
})

export const GET = defineHandler(
  { requireAuth: true },
  async ({ user }) => {
    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      const memberships = await db.collection("organization_members").find({ userId: user.userId }).toArray()
      const orgIds = memberships.map((m) => m.organizationId)
      if (orgIds.length === 0) {
        return { teams: [] }
      }
      const teams = await db.collection("organizations").find({ id: { $in: orgIds } }).toArray()
      return {
        teams: teams.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          createdAt: t.createdAt,
        })),
      }
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      const memberships = await db
        .select()
        .from(tables.organizationMembers)
        .where(eq(tables.organizationMembers.userId, user.userId))
      const orgIds = memberships.map((m: any) => m.organizationId)
      if (orgIds.length === 0) {
        return { teams: [] }
      }
      const teams = await db
        .select()
        .from(tables.organizations)
        .where(inArray(tables.organizations.id, orgIds))
      return { teams }
    }
  }
)

export const POST = defineHandler(
  { schema: createTeamSchema, requireAuth: true },
  async ({ body, user, req }) => {
    const ip = getClientIp(req.headers)
    const ua = req.headers.get("user-agent") || "unknown"

    let slugExists = false
    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      const existing = await db.collection("organizations").findOne({ slug: body.slug })
      if (existing) slugExists = true
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      const existing = await db
        .select()
        .from(tables.organizations)
        .where(eq(tables.organizations.slug, body.slug))
        .limit(1)
      if (existing.length > 0) slugExists = true
    }

    if (slugExists) {
      throw new HttpError(400, "Slug de equipe já está em uso")
    }

    const orgId = generateSecureToken()
    const memberId = generateSecureToken()

    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      const now = new Date()
      await db.collection("organizations").insertOne({
        id: orgId,
        name: body.name,
        slug: body.slug,
        createdAt: now,
        updatedAt: now,
      })
      await db.collection("organization_members").insertOne({
        id: memberId,
        organizationId: orgId,
        userId: user.userId,
        role: "owner",
        createdAt: now,
      })
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      await db.insert(tables.organizations).values({
        id: orgId,
        name: body.name,
        slug: body.slug,
      })
      await db.insert(tables.organizationMembers).values({
        id: memberId,
        organizationId: orgId,
        userId: user.userId,
        role: "owner",
      })
    }

    await writeAuditLog(user.userId, "TEAM_CREATE", "success", ip, ua, `Team created: ${body.name} (${orgId})`)

    return {
      success: true,
      team: {
        id: orgId,
        name: body.name,
        slug: body.slug,
      },
    }
  }
)
