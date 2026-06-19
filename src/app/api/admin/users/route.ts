import { defineHandler, HttpError } from "@/lib/api/api-handler"
import { getDrizzleDb, databaseType } from "@/lib/db/connection"
import { connectToMongoDB } from "@/lib/db/mongodb"
import { eq } from "drizzle-orm"
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
    if (user.role !== "admin") {
      throw new HttpError(403, "Acesso negado")
    }

    let allUsers = []
    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      const rawUsers = await db.collection("users").find().toArray()
      allUsers = rawUsers.map((u: any) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        emailVerified: u.emailVerified,
        twoFactorEnabled: u.twoFactorEnabled,
      }))
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      const rawUsers = await db.select({
        id: tables.users.id,
        email: tables.users.email,
        role: tables.users.role,
        createdAt: tables.users.createdAt,
        emailVerified: tables.users.emailVerified,
        twoFactorEnabled: tables.users.twoFactorEnabled,
      }).from(tables.users)
      allUsers = rawUsers
    }

    return { users: allUsers }
  }
)

const changeRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["user", "admin"]),
})

export const POST = defineHandler(
  { schema: changeRoleSchema, requireAuth: true },
  async ({ body, user, req }) => {
    const ip = getClientIp(req.headers)
    const ua = req.headers.get("user-agent") || "unknown"

    if (user.role !== "admin") {
      throw new HttpError(403, "Acesso negado")
    }

    if (user.userId === body.userId) {
      throw new HttpError(400, "Você não pode alterar seu próprio privilégio")
    }

    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      const targetUser = await db.collection("users").findOne({ id: body.userId })
      if (!targetUser) {
        throw new HttpError(404, "Usuário não encontrado")
      }
      await db.collection("users").updateOne({ id: body.userId }, { $set: { role: body.role } })
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      const result = await db.select().from(tables.users).where(eq(tables.users.id, body.userId)).limit(1)
      if (result.length === 0) {
        throw new HttpError(404, "Usuário não encontrado")
      }
      await db.update(tables.users).set({ role: body.role }).where(eq(tables.users.id, body.userId))
    }

    await writeAuditLog(
      user.userId,
      "ADMIN_USER_ROLE_UPDATE",
      "success",
      ip,
      ua,
      `User ${body.userId} role changed to ${body.role}`
    )

    return { message: "Privilégio atualizado com sucesso" }
  }
)
