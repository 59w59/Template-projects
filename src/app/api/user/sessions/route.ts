import { defineHandler, HttpError } from "@/lib/api/api-handler"
import { invalidateSession } from "@/lib/auth/auth"
import { getDrizzleDb, databaseType } from "@/lib/db/connection"
import { connectToMongoDB } from "@/lib/db/mongodb"
import { eq, and } from "drizzle-orm"
import * as sqliteSchema from "@/lib/schemas/db-sqlite"
import * as pgSchema from "@/lib/schemas/db-postgres"
import * as mysqlSchema from "@/lib/schemas/db-mysql"
import { writeAuditLog } from "@/lib/security/audit"
import { getClientIp } from "@/lib/rate-limit/rate-limiter"
import { z } from "zod"

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

export const GET = defineHandler(
  { requireAuth: true },
  async ({ user }) => {
    let sessions = []
    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      const rawSessions = await db.collection("sessions").find({ userId: user.userId, isValid: true }).toArray()
      sessions = rawSessions.map((s: any) => ({
        id: s.id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      }))
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      const rawSessions = await db
        .select()
        .from(tables.sessions)
        .where(and(eq(tables.sessions.userId, user.userId), eq(tables.sessions.isValid, true)))
      sessions = rawSessions.map((s: any) => ({
        id: s.id,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      }))
    }
    return { sessions }
  }
)

const revokeSessionSchema = z.object({
  sessionId: z.string().min(1, "ID da sessão é obrigatório"),
})

export const DELETE = defineHandler(
  { schema: revokeSessionSchema, requireAuth: true },
  async ({ body, user, req }) => {
    const ip = getClientIp(req.headers)
    const ua = req.headers.get("user-agent") || "unknown"

    let sessionRecord: any = null
    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      sessionRecord = await db.collection("sessions").findOne({ id: body.sessionId })
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      const result = await db
        .select()
        .from(tables.sessions)
        .where(eq(tables.sessions.id, body.sessionId))
        .limit(1)
      sessionRecord = result[0] || null
    }

    if (!sessionRecord) {
      throw new HttpError(404, "Sessão não encontrada")
    }

    if (sessionRecord.userId !== user.userId) {
      await writeAuditLog(user.userId, "SESSION_REVOKE", "failed", ip, ua, `Unauthorized attempt to revoke session: ${body.sessionId}`)
      throw new HttpError(403, "Sem permissão para revogar esta sessão")
    }

    await invalidateSession(body.sessionId)
    await writeAuditLog(user.userId, "SESSION_REVOKE", "success", ip, ua, `Session revoked: ${body.sessionId}`)

    return { success: true, message: "Sessão revogada com sucesso." }
  }
)
