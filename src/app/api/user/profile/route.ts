import { defineHandler, HttpError } from "@/lib/api/api-handler"
import { profileSchema } from "@/lib/schemas/validation"
import { getDrizzleDb, databaseType } from "@/lib/db/connection"
import { connectToMongoDB } from "@/lib/db/mongodb"
import { eq, ne, and } from "drizzle-orm"
import * as sqliteSchema from "@/lib/schemas/db-sqlite"
import * as pgSchema from "@/lib/schemas/db-postgres"
import * as mysqlSchema from "@/lib/schemas/db-mysql"
import { verifyPassword, hashPassword, invalidateAllUserSessions } from "@/lib/auth/auth"
import { writeAuditLog } from "@/lib/security/audit"
import { getClientIp } from "@/lib/rate-limit/rate-limiter"

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

export const POST = defineHandler(
  { schema: profileSchema, requireAuth: true },
  async ({ body, user, req }) => {
    const ip = getClientIp(req.headers)
    const ua = req.headers.get("user-agent") || "unknown"

    let currentUser: any = null
    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      currentUser = await db.collection("users").findOne({ id: user.userId })
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      const result = await db.select().from(tables.users).where(eq(tables.users.id, user.userId)).limit(1)
      currentUser = result[0] || null
    }

    if (!currentUser) {
      throw new HttpError(404, "Usuário não encontrado")
    }

    const updates: Record<string, any> = {}

    if (body.email && body.email !== currentUser.email) {
      let emailExists = null
      if (databaseType === "mongodb") {
        const db = await connectToMongoDB()
        emailExists = await db.collection("users").findOne({ email: body.email, id: { $ne: user.userId } })
      } else {
        const db = getDrizzleDb() as any
        const tables = getTables()
        const result = await db
          .select()
          .from(tables.users)
          .where(and(eq(tables.users.email, body.email), ne(tables.users.id, user.userId)))
          .limit(1)
        emailExists = result[0] || null
      }

      if (emailExists) {
        throw new HttpError(400, "E-mail já está em uso por outro usuário")
      }
      updates.email = body.email
    }

    if (body.newPassword) {
      if (!body.currentPassword) {
        throw new HttpError(400, "Senha atual é necessária para alterar a senha")
      }
      const isPasswordValid = await verifyPassword(body.currentPassword, currentUser.passwordHash)
      if (!isPasswordValid) {
        await writeAuditLog(user.userId, "USER_PROFILE_UPDATE", "failed", ip, ua, "Incorrect current password submitted")
        throw new HttpError(400, "Senha atual incorreta")
      }

      updates.passwordHash = await hashPassword(body.newPassword)
    }

    if (Object.keys(updates).length === 0) {
      return { message: "Nenhuma alteração enviada." }
    }

    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      await db.collection("users").updateOne({ id: user.userId }, { $set: updates })
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      await db.update(tables.users).set(updates).where(eq(tables.users.id, user.userId))
    }

    if (updates.passwordHash) {
      await invalidateAllUserSessions(user.userId)
      await writeAuditLog(user.userId, "USER_PROFILE_UPDATE", "success", ip, ua, "Password updated successfully, all other sessions revoked")
    } else {
      await writeAuditLog(user.userId, "USER_PROFILE_UPDATE", "success", ip, ua, "Email updated successfully")
    }

    return { message: "Perfil atualizado com sucesso!" }
  }
)
export const GET = defineHandler(
  { requireAuth: true },
  async ({ user }) => {
    let currentUser: any = null
    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      currentUser = await db.collection("users").findOne({ id: user.userId })
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      const result = await db.select().from(tables.users).where(eq(tables.users.id, user.userId)).limit(1)
      currentUser = result[0] || null
    }

    if (!currentUser) {
      throw new HttpError(404, "Usuário não encontrado")
    }

    return {
      email: currentUser.email,
      role: currentUser.role,
    }
  }
)
