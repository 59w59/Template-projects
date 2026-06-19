import bcrypt from "bcryptjs"
import * as jose from "jose"
import { getDrizzleDb, databaseType } from "../db/connection"
import { connectToMongoDB } from "../db/mongodb"
import { eq, and } from "drizzle-orm"
import * as sqliteSchema from "../schemas/db-sqlite"
import * as pgSchema from "../schemas/db-postgres"
import * as mysqlSchema from "../schemas/db-mysql"
import { generateSecureToken } from "../utils"
import { generateHMAC, verifyHMAC } from "../security/crypto"
import { logger } from "../logger/logger"
import { cookies } from "next/headers"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-jwt-secret-key-at-least-32-chars-long")
const HMAC_SECRET = process.env.HMAC_SECRET || "fallback-hmac-secret-key"

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createAccessToken(payload: { userId: string; email: string; role: string }): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(JWT_SECRET)
}

export async function verifyAccessToken(token: string): Promise<any> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET)
    return payload
  } catch (err) {
    return null
  }
}

export async function createSession(
  userId: string,
  ipAddress: string,
  userAgent: string
): Promise<{ sessionId: string; refreshToken: string }> {
  const sessionId = generateSecureToken()
  const refreshToken = generateSecureToken()
  const tokenHash = generateHMAC(refreshToken, HMAC_SECRET)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  if (databaseType === "mongodb") {
    const db = await connectToMongoDB()
    await db.collection("sessions").insertOne({
      id: sessionId,
      userId,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
      isValid: true,
      createdAt: new Date(),
    })
  } else {
    const db = getDrizzleDb() as any
    const tables = getTables()
    await db.insert(tables.sessions).values({
      id: sessionId,
      userId,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
      isValid: true,
    })
  }

  return { sessionId, refreshToken }
}

export async function validateAndRotateSession(
  refreshToken: string,
  ipAddress: string,
  userAgent: string
): Promise<{ accessToken: string; newRefreshToken: string } | null> {
  const tokenHash = generateHMAC(refreshToken, HMAC_SECRET)
  let sessionRecord: any = null

  if (databaseType === "mongodb") {
    const db = await connectToMongoDB()
    sessionRecord = await db.collection("sessions").findOne({ tokenHash })
  } else {
    const db = getDrizzleDb() as any
    const tables = getTables()
    const result = await db
      .select()
      .from(tables.sessions)
      .where(eq(tables.sessions.tokenHash, tokenHash))
      .limit(1)
    sessionRecord = result[0] || null
  }

  if (!sessionRecord) {
    return null
  }

  const isValid = typeof sessionRecord.isValid === "number" ? sessionRecord.isValid === 1 : sessionRecord.isValid
  if (!isValid || new Date(sessionRecord.expiresAt) < new Date()) {
    await invalidateSession(sessionRecord.id)
    return null
  }

  if (sessionRecord.ipAddress !== ipAddress || sessionRecord.userAgent !== userAgent) {
    logger.warn("Potential session hijacking detected", {
      sessionId: sessionRecord.id,
      originalIp: sessionRecord.ipAddress,
      newIp: ipAddress,
      originalUA: sessionRecord.userAgent,
      newUA: userAgent,
    })
    await invalidateSession(sessionRecord.id)
    return null
  }

  let userRecord: any = null
  if (databaseType === "mongodb") {
    const db = await connectToMongoDB()
    userRecord = await db.collection("users").findOne({ id: sessionRecord.userId })
  } else {
    const db = getDrizzleDb() as any
    const tables = getTables()
    const result = await db
      .select()
      .from(tables.users)
      .where(eq(tables.users.id, sessionRecord.userId))
      .limit(1)
    userRecord = result[0] || null
  }

  if (!userRecord) {
    return null
  }

  const newRefreshToken = generateSecureToken()
  const newTokenHash = generateHMAC(newRefreshToken, HMAC_SECRET)
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  if (databaseType === "mongodb") {
    const db = await connectToMongoDB()
    await db.collection("sessions").updateOne(
      { id: sessionRecord.id },
      {
        $set: {
          tokenHash: newTokenHash,
          expiresAt: newExpiresAt,
        },
      }
    )
  } else {
    const db = getDrizzleDb() as any
    const tables = getTables()
    await db
      .update(tables.sessions)
      .set({
        tokenHash: newTokenHash,
        expiresAt: newExpiresAt,
      })
      .where(eq(tables.sessions.id, sessionRecord.id))
  }

  const accessToken = await createAccessToken({
    userId: userRecord.id,
    email: userRecord.email,
    role: userRecord.role,
  })

  return { accessToken, newRefreshToken }
}

export async function invalidateSession(sessionId: string): Promise<void> {
  if (databaseType === "mongodb") {
    const db = await connectToMongoDB()
    await db.collection("sessions").updateOne({ id: sessionId }, { $set: { isValid: false } })
  } else {
    const db = getDrizzleDb() as any
    const tables = getTables()
    await db
      .update(tables.sessions)
      .set({ isValid: false })
      .where(eq(tables.sessions.id, sessionId))
  }
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
  if (databaseType === "mongodb") {
    const db = await connectToMongoDB()
    await db.collection("sessions").updateMany({ userId }, { $set: { isValid: false } })
  } else {
    const db = getDrizzleDb() as any
    const tables = getTables()
    await db
      .update(tables.sessions)
      .set({ isValid: false })
      .where(eq(tables.sessions.userId, userId))
  }
}

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies()
  cookieStore.set("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60, // 15 mins
    path: "/",
  })
  cookieStore.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  })
}

export async function clearAuthCookies() {
  const cookieStore = await cookies()
  cookieStore.set("access_token", "", { maxAge: 0, path: "/" })
  cookieStore.set("refresh_token", "", { maxAge: 0, path: "/" })
}
export async function generateCSRFToken(): Promise<string> {
  const token = generateSecureToken()
  const cookieStore = await cookies()
  cookieStore.set("csrf_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  })
  return token
}
export async function verifyCSRFToken(clientToken: string): Promise<boolean> {
  const cookieStore = await cookies()
  const serverToken = cookieStore.get("csrf_token")?.value
  if (!serverToken || !clientToken) return false
  return serverToken === clientToken
}

export async function generatePasswordReset(email: string): Promise<string | null> {
  const token = generateSecureToken()
  const resetTokenHash = generateHMAC(token, HMAC_SECRET)
  const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000)

  if (databaseType === "mongodb") {
    const db = await connectToMongoDB()
    const result = await db.collection("users").updateOne(
      { email },
      {
        $set: {
          resetTokenHash,
          resetTokenExpiresAt,
        },
      }
    )
    return result.matchedCount > 0 ? token : null
  } else {
    const db = getDrizzleDb() as any
    const tables = getTables()
    const userExists = await db.select().from(tables.users).where(eq(tables.users.email, email)).limit(1)
    if (userExists.length === 0) return null

    await db
      .update(tables.users)
      .set({
        resetTokenHash,
        resetTokenExpiresAt,
      })
      .where(eq(tables.users.email, email))
    return token
  }
}

export async function verifyPasswordReset(token: string, newPasswordHash: string): Promise<boolean> {
  const resetTokenHash = generateHMAC(token, HMAC_SECRET)
  let userRecord: any = null

  if (databaseType === "mongodb") {
    const db = await connectToMongoDB()
    userRecord = await db.collection("users").findOne({ resetTokenHash })
  } else {
    const db = getDrizzleDb() as any
    const tables = getTables()
    const result = await db
      .select()
      .from(tables.users)
      .where(eq(tables.users.resetTokenHash, resetTokenHash))
      .limit(1)
    userRecord = result[0] || null
  }

  if (!userRecord) return false

  const expires = new Date(userRecord.resetTokenExpiresAt)
  if (expires < new Date()) {
    return false
  }

  if (databaseType === "mongodb") {
    const db = await connectToMongoDB()
    await db.collection("users").updateOne(
      { id: userRecord.id },
      {
        $set: {
          passwordHash: newPasswordHash,
          resetTokenHash: null,
          resetTokenExpiresAt: null,
        },
      }
    )
  } else {
    const db = getDrizzleDb() as any
    const tables = getTables()
    await db
      .update(tables.users)
      .set({
        passwordHash: newPasswordHash,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      })
      .where(eq(tables.users.id, userRecord.id))
  }

  await invalidateAllUserSessions(userRecord.id)
  return true
}

export async function generate2FACode(userId: string): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const twoFactorCode = generateHMAC(code, HMAC_SECRET)
  const twoFactorExpiresAt = new Date(Date.now() + 5 * 60 * 1000)

  if (databaseType === "mongodb") {
    const db = await connectToMongoDB()
    await db.collection("users").updateOne(
      { id: userId },
      {
        $set: {
          twoFactorCode,
          twoFactorExpiresAt,
        },
      }
    )
  } else {
    const db = getDrizzleDb() as any
    const tables = getTables()
    await db
      .update(tables.users)
      .set({
        twoFactorCode,
        twoFactorExpiresAt,
      })
      .where(eq(tables.users.id, userId))
  }

  return code
}

export async function verify2FACode(userId: string, code: string): Promise<boolean> {
  let userRecord: any = null

  if (databaseType === "mongodb") {
    const db = await connectToMongoDB()
    userRecord = await db.collection("users").findOne({ id: userId })
  } else {
    const db = getDrizzleDb() as any
    const tables = getTables()
    const result = await db
      .select()
      .from(tables.users)
      .where(eq(tables.users.id, userId))
      .limit(1)
    userRecord = result[0] || null
  }

  if (!userRecord || !userRecord.twoFactorCode) return false

  const codeMatch = verifyHMAC(code, userRecord.twoFactorCode, HMAC_SECRET)
  if (!codeMatch) return false

  const expires = new Date(userRecord.twoFactorExpiresAt)
  if (expires < new Date()) {
    return false
  }

  if (databaseType === "mongodb") {
    const db = await connectToMongoDB()
    await db.collection("users").updateOne(
      { id: userId },
      {
        $set: {
          twoFactorCode: null,
          twoFactorExpiresAt: null,
        },
      }
    )
  } else {
    const db = getDrizzleDb() as any
    const tables = getTables()
    await db
      .update(tables.users)
      .set({
        twoFactorCode: null,
        twoFactorExpiresAt: null,
      })
      .where(eq(tables.users.id, userId))
  }

  return true
}

