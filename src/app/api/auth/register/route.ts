import { defineHandler, HttpError } from "@/lib/api/api-handler"
import { registerSchema } from "@/lib/schemas/validation"
import { hashPassword, createSession, createAccessToken, setAuthCookies } from "@/lib/auth/auth"
import { getDrizzleDb, databaseType } from "@/lib/db/connection"
import { connectToMongoDB } from "@/lib/db/mongodb"
import { eq } from "drizzle-orm"
import * as sqliteSchema from "@/lib/schemas/db-sqlite"
import * as pgSchema from "@/lib/schemas/db-postgres"
import * as mysqlSchema from "@/lib/schemas/db-mysql"
import { generateSecureToken } from "@/lib/utils"
import { writeAuditLog } from "@/lib/security/audit"
import { getClientIp } from "@/lib/rate-limit/rate-limiter"
import { sendWelcomeEmail } from "@/lib/email/email"

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

export const POST = defineHandler(
  { schema: registerSchema },
  async ({ body, req }) => {
    const ip = getClientIp(req.headers)
    const ua = req.headers.get("user-agent") || "unknown"

    let existingUser = null
    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      existingUser = await db.collection("users").findOne({ email: body.email })
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      const result = await db
        .select()
        .from(tables.users)
        .where(eq(tables.users.email, body.email))
        .limit(1)
      existingUser = result[0] || null
    }

    if (existingUser) {
      await writeAuditLog(null, "USER_REGISTER", "failed", ip, ua, `Email already exists: ${body.email}`)
      throw new HttpError(400, "Este e-mail já está em uso")
    }

    const userId = generateSecureToken()
    const passwordHash = await hashPassword(body.password)

    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      await db.collection("users").insertOne({
        id: userId,
        email: body.email,
        passwordHash,
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      await db.insert(tables.users).values({
        id: userId,
        email: body.email,
        passwordHash,
        role: "user",
      })
    }

    const { refreshToken } = await createSession(userId, ip, ua)
    const accessToken = await createAccessToken({
      userId,
      email: body.email,
      role: "user",
    })

    await setAuthCookies(accessToken, refreshToken)
    await writeAuditLog(userId, "USER_REGISTER", "success", ip, ua, `User signed up & auto login: ${body.email}`)
    
    sendWelcomeEmail(body.email).catch(() => {})

    return { userId, success: true }
  }
)
