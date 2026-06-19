import { NextResponse } from "next/server"
import { getSystemSettings } from "@/lib/settings/system-settings"
import { getDrizzleDb, databaseType } from "@/lib/db/connection"
import { connectToMongoDB } from "@/lib/db/mongodb"
import * as sqliteSchema from "@/lib/schemas/db-sqlite"
import * as pgSchema from "@/lib/schemas/db-postgres"
import * as mysqlSchema from "@/lib/schemas/db-mysql"
import { eq } from "drizzle-orm"
import { createSession, createAccessToken } from "@/lib/auth/auth"
import { generateSecureToken } from "@/lib/utils"
import { cookies } from "next/headers"

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

export async function GET(req: Request, { params }: { params: any }) {
  const provider = params.provider
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")

  if (!code) {
    return NextResponse.json({ error: "Code nao fornecido" }, { status: 400 })
  }

  const settings = await getSystemSettings()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const redirectUri = `${baseUrl}/api/auth/oauth/callback/${provider}`

  let email = ""
  let providerId = ""

  try {
    if (provider === "google") {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: settings.googleClientId,
          client_secret: settings.googleClientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      })

      const tokens = await tokenRes.json()
      if (!tokens.access_token) {
        return NextResponse.json({ error: "Falha ao obter access token" }, { status: 400 })
      }

      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      const userInfo = await userRes.json()
      email = userInfo.email
      providerId = userInfo.id
    } else if (provider === "github") {
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: settings.githubClientId,
          client_secret: settings.githubClientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      })

      const tokens = await tokenRes.json()
      if (!tokens.access_token) {
        return NextResponse.json({ error: "Falha ao obter access token" }, { status: 400 })
      }

      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "User-Agent": "NextJS-App",
        },
      })
      const userInfo = await userRes.json()
      providerId = String(userInfo.id)
      email = userInfo.email

      if (!email) {
        const emailsRes = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            "User-Agent": "NextJS-App",
          },
        })
        const emailsList = await emailsRes.json()
        const primaryEmail = emailsList.find((e: any) => e.primary)
        email = primaryEmail?.email || emailsList[0]?.email || ""
      }
    } else if (provider === "discord") {
      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: settings.discordClientId,
          client_secret: settings.discordClientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      })

      const tokens = await tokenRes.json()
      if (!tokens.access_token) {
        return NextResponse.json({ error: "Falha ao obter access token" }, { status: 400 })
      }

      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      const userInfo = await userRes.json()
      email = userInfo.email
      providerId = userInfo.id
    } else {
      return NextResponse.json({ error: "Provedor nao suportado ou Apple login mock" }, { status: 400 })
    }

    if (!email) {
      return NextResponse.json({ error: "Email nao retornado pelo provedor" }, { status: 400 })
    }

    let userRecord: any = null
    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      userRecord = await db.collection("users").findOne({ email })
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      const result = await db.select().from(tables.users).where(eq(tables.users.email, email)).limit(1)
      userRecord = result[0] || null
    }

    if (!userRecord) {
      const newUserId = generateSecureToken()
      userRecord = {
        id: newUserId,
        email,
        passwordHash: "",
        role: "user",
        emailVerified: true,
        provider,
        providerId,
      }
      if (databaseType === "mongodb") {
        const db = await connectToMongoDB()
        await db.collection("users").insertOne({
          ...userRecord,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      } else {
        const db = getDrizzleDb() as any
        const tables = getTables()
        await db.insert(tables.users).values(userRecord)
      }
    } else {
      if (!userRecord.provider) {
        userRecord.provider = provider
        userRecord.providerId = providerId
        if (databaseType === "mongodb") {
          const db = await connectToMongoDB()
          await db.collection("users").updateOne({ id: userRecord.id }, { $set: { provider, providerId } })
        } else {
          const db = getDrizzleDb() as any
          const tables = getTables()
          await db.update(tables.users).set({ provider, providerId }).where(eq(tables.users.id, userRecord.id))
        }
      }
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1"
    const ua = req.headers.get("user-agent") || "unknown"

    const { refreshToken } = await createSession(userRecord.id, ip, ua)
    const accessToken = await createAccessToken({
      userId: userRecord.id,
      email: userRecord.email,
      role: userRecord.role,
    })

    const cookieStore = await cookies()
    cookieStore.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    })
    cookieStore.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    })

    return NextResponse.redirect(`${baseUrl}/dashboard`)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
