import { defineHandler, HttpError } from "@/lib/api/api-handler"
import { loginSchema } from "@/lib/schemas/validation"
import { verifyPassword, createSession, createAccessToken, setAuthCookies, generate2FACode } from "@/lib/auth/auth"
import { getDrizzleDb, databaseType } from "@/lib/db/connection"
import { connectToMongoDB } from "@/lib/db/mongodb"
import { eq } from "drizzle-orm"
import * as sqliteSchema from "@/lib/schemas/db-sqlite"
import * as pgSchema from "@/lib/schemas/db-postgres"
import * as mysqlSchema from "@/lib/schemas/db-mysql"
import { writeAuditLog } from "@/lib/security/audit"
import { getClientIp } from "@/lib/rate-limit/rate-limiter"
import { sendMail } from "@/lib/email/email"
import * as jose from "jose"

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

export const POST = defineHandler(
  { schema: loginSchema },
  async ({ body, req }) => {
    const ip = getClientIp(req.headers)
    const ua = req.headers.get("user-agent") || "unknown"

    let userRecord: any = null
    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      userRecord = await db.collection("users").findOne({ email: body.email })
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      const result = await db
        .select()
        .from(tables.users)
        .where(eq(tables.users.email, body.email))
        .limit(1)
      userRecord = result[0] || null
    }

    if (!userRecord) {
      await writeAuditLog(null, "USER_LOGIN", "failed", ip, ua, `User not found: ${body.email}`)
      throw new HttpError(401, "Credenciais inválidas")
    }

    const passwordValid = await verifyPassword(body.password, userRecord.passwordHash)
    if (!passwordValid) {
      await writeAuditLog(userRecord.id, "USER_LOGIN", "failed", ip, ua, `Incorrect password for: ${body.email}`)
      throw new HttpError(401, "Credenciais inválidas")
    }

    const is2FA = typeof userRecord.twoFactorEnabled === "number" ? userRecord.twoFactorEnabled === 1 : userRecord.twoFactorEnabled

    if (is2FA) {
      const code = await generate2FACode(userRecord.id)

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a;">Código de Verificação de Login (2FA)</h2>
          <p style="color: #475569;">Insira o código abaixo para completar seu acesso:</p>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-radius: 6px; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #0f172a; margin: 20px 0;">
            ${code}
          </div>
          <p style="color: #64748b; font-size: 14px;">Este código expira em 5 minutos.</p>
        </div>
      `
      await sendMail({ to: userRecord.email, subject: "Código de Verificação de Login (2FA)", html })

      const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-jwt-secret-key-at-least-32-chars-long")
      const tempToken = await new jose.SignJWT({ userId: userRecord.id, email: userRecord.email, temp2fa: true })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(JWT_SECRET)

      await writeAuditLog(userRecord.id, "USER_LOGIN_2FA_CHALLENGE", "success", ip, ua, "2FA login challenge generated")
      return { require2fa: true, tempToken }
    }

    const { refreshToken } = await createSession(userRecord.id, ip, ua)
    const accessToken = await createAccessToken({
      userId: userRecord.id,
      email: userRecord.email,
      role: userRecord.role,
    })

    await setAuthCookies(accessToken, refreshToken)
    await writeAuditLog(userRecord.id, "USER_LOGIN", "success", ip, ua, `Login success: ${body.email}`)

    return { userId: userRecord.id }
  }
)
