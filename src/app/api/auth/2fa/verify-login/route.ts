import { defineHandler, HttpError } from "@/lib/api/api-handler"
import { verify2FACode, createSession, createAccessToken, setAuthCookies } from "@/lib/auth/auth"
import { getDrizzleDb, databaseType } from "@/lib/db/connection"
import { connectToMongoDB } from "@/lib/db/mongodb"
import { eq } from "drizzle-orm"
import * as sqliteSchema from "@/lib/schemas/db-sqlite"
import * as pgSchema from "@/lib/schemas/db-postgres"
import * as mysqlSchema from "@/lib/schemas/db-mysql"
import { writeAuditLog } from "@/lib/security/audit"
import { getClientIp } from "@/lib/rate-limit/rate-limiter"
import * as jose from "jose"
import { z } from "zod"

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

const verifyLoginSchema = z.object({
  tempToken: z.string().min(1, "Token temporário é obrigatório"),
  code: z.string().length(6, "Código deve ter 6 dígitos"),
})

export const POST = defineHandler(
  { schema: verifyLoginSchema },
  async ({ body, req }) => {
    const ip = getClientIp(req.headers)
    const ua = req.headers.get("user-agent") || "unknown"

    let payload: any = null
    try {
      const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-jwt-secret-key-at-least-32-chars-long")
      const result = await jose.jwtVerify(body.tempToken, JWT_SECRET)
      payload = result.payload
    } catch {
      throw new HttpError(401, "Token de login expirado ou inválido")
    }

    if (!payload.temp2fa || !payload.userId) {
      throw new HttpError(401, "Token de login inválido")
    }

    const isValid = await verify2FACode(payload.userId, body.code)
    if (!isValid) {
      await writeAuditLog(payload.userId, "USER_LOGIN_2FA", "failed", ip, ua, "Incorrect 2FA code submitted during login")
      throw new HttpError(400, "Código de verificação incorreto ou expirado")
    }

    let userRecord: any = null
    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      userRecord = await db.collection("users").findOne({ id: payload.userId })
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      const result = await db
        .select()
        .from(tables.users)
        .where(eq(tables.users.id, payload.userId))
        .limit(1)
      userRecord = result[0] || null
    }

    if (!userRecord) {
      throw new HttpError(404, "Usuário não encontrado")
    }

    const { refreshToken } = await createSession(userRecord.id, ip, ua)
    const accessToken = await createAccessToken({
      userId: userRecord.id,
      email: userRecord.email,
      role: userRecord.role,
    })

    await setAuthCookies(accessToken, refreshToken)
    await writeAuditLog(userRecord.id, "USER_LOGIN_2FA", "success", ip, ua, "2FA authentication success")

    return { success: true, userId: userRecord.id }
  }
)
