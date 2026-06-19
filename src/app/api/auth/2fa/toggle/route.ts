import { defineHandler, HttpError } from "@/lib/api/api-handler"
import { getDrizzleDb, databaseType } from "@/lib/db/connection"
import { connectToMongoDB } from "@/lib/db/mongodb"
import { eq } from "drizzle-orm"
import * as sqliteSchema from "@/lib/schemas/db-sqlite"
import * as pgSchema from "@/lib/schemas/db-postgres"
import * as mysqlSchema from "@/lib/schemas/db-mysql"
import { generate2FACode, verify2FACode } from "@/lib/auth/auth"
import { sendMail } from "@/lib/email/email"
import { writeAuditLog } from "@/lib/security/audit"
import { getClientIp } from "@/lib/rate-limit/rate-limiter"
import { z } from "zod"

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

const toggle2FASchema = z.object({
  action: z.enum(["request-enable", "confirm-enable", "disable"]),
  code: z.string().optional(),
})

export const POST = defineHandler(
  { schema: toggle2FASchema, requireAuth: true },
  async ({ body, user, req }) => {
    const ip = getClientIp(req.headers)
    const ua = req.headers.get("user-agent") || "unknown"

    if (body.action === "request-enable") {
      const code = await generate2FACode(user.userId)

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a;">Ativação do 2FA</h2>
          <p style="color: #475569;">Use o código de verificação abaixo para ativar a Autenticação de Duplo Fator (2FA) em sua conta:</p>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-radius: 6px; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #0f172a; margin: 20px 0;">
            ${code}
          </div>
          <p style="color: #64748b; font-size: 14px;">Este código expira em 5 minutos.</p>
        </div>
      `
      await sendMail({ to: user.email, subject: "Ativação do 2FA", html })

      await writeAuditLog(user.userId, "2FA_ENABLE_REQUEST", "success", ip, ua, "2FA verification code requested")
      return { message: "Código enviado para seu e-mail." }
    }

    if (body.action === "confirm-enable") {
      if (!body.code) {
        throw new HttpError(400, "Código é obrigatório")
      }

      const isValid = await verify2FACode(user.userId, body.code)
      if (!isValid) {
        await writeAuditLog(user.userId, "2FA_ENABLE_CONFIRM", "failed", ip, ua, "Invalid 2FA code entered")
        throw new HttpError(400, "Código inválido ou expirado")
      }

      if (databaseType === "mongodb") {
        const db = await connectToMongoDB()
        await db.collection("users").updateOne({ id: user.userId }, { $set: { twoFactorEnabled: true } })
      } else {
        const db = getDrizzleDb() as any
        const tables = getTables()
        await db.update(tables.users).set({ twoFactorEnabled: true }).where(eq(tables.users.id, user.userId))
      }

      await writeAuditLog(user.userId, "2FA_ENABLED", "success", ip, ua, "2FA enabled successfully")
      return { message: "MFA ativado com sucesso!" }
    }

    if (body.action === "disable") {
      if (databaseType === "mongodb") {
        const db = await connectToMongoDB()
        await db.collection("users").updateOne({ id: user.userId }, { $set: { twoFactorEnabled: false } })
      } else {
        const db = getDrizzleDb() as any
        const tables = getTables()
        await db.update(tables.users).set({ twoFactorEnabled: false }).where(eq(tables.users.id, user.userId))
      }

      await writeAuditLog(user.userId, "2FA_DISABLED", "success", ip, ua, "2FA disabled")
      return { message: "MFA desativado." }
    }

    throw new HttpError(400, "Ação inválida")
  }
)
