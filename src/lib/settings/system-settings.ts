import { getDrizzleDb, databaseType } from "../db/connection"
import { connectToMongoDB } from "../db/mongodb"
import * as sqliteSchema from "../schemas/db-sqlite"
import * as pgSchema from "../schemas/db-postgres"
import * as mysqlSchema from "../schemas/db-mysql"
import { eq } from "drizzle-orm"

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

export interface SystemSettings {
  maintenanceMode: boolean
  maintenanceMessage: string
  disableRegistrations: boolean
  blockedIPs: string[]
  autoPunish: boolean
  rateLimitMax: number
  rateLimitWindow: number
  stripeSecretKey: string
  stripeWebhookSecret: string
  s3AccessKeyId: string
  s3SecretAccessKey: string
  s3Bucket: string
  s3Region: string
  s3Endpoint: string
  twilioAccountSid: string
  twilioAuthToken: string
  twilioFromNumber: string
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
  smtpSecure: boolean
  smtpFrom: string
  redisUrl: string
  redisToken: string
  googleClientId: string
  googleClientSecret: string
  githubClientId: string
  githubClientSecret: string
  discordClientId: string
  discordClientSecret: string
  appleClientId: string
  appleTeamId: string
  appleKeyId: string
  applePrivateKey: string
  appName: string
  appDescription: string
  primaryColor: string
  borderRadius: string
  logoUrl: string
  faviconUrl: string
  geminiApiKey: string
}

const DEFAULT_SETTINGS: SystemSettings = {
  maintenanceMode: false,
  maintenanceMessage: "Sistema em manutenção. Por favor, tente novamente mais tarde.",
  disableRegistrations: false,
  blockedIPs: [],
  autoPunish: false,
  rateLimitMax: 100,
  rateLimitWindow: 60000,
  stripeSecretKey: "",
  stripeWebhookSecret: "",
  s3AccessKeyId: "",
  s3SecretAccessKey: "",
  s3Bucket: "",
  s3Region: "",
  s3Endpoint: "",
  twilioAccountSid: "",
  twilioAuthToken: "",
  twilioFromNumber: "",
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPass: "",
  smtpSecure: false,
  smtpFrom: "",
  redisUrl: "",
  redisToken: "",
  googleClientId: "",
  googleClientSecret: "",
  githubClientId: "",
  githubClientSecret: "",
  discordClientId: "",
  discordClientSecret: "",
  appleClientId: "",
  appleTeamId: "",
  appleKeyId: "",
  applePrivateKey: "",
  appName: "NextJS Production Ready Template",
  appDescription: "Template premium de Next.js com segurança avançada e design moderno",
  primaryColor: "240 5.9% 10%",
  borderRadius: "0.5rem",
  logoUrl: "",
  faviconUrl: "",
  geminiApiKey: "",
}

let cachedSettings: SystemSettings | null = null
let cacheExpiresAt = 0

export async function getSystemSettings(): Promise<SystemSettings> {
  const now = Date.now()
  if (cachedSettings && now < cacheExpiresAt) {
    return cachedSettings
  }

  const settings = { ...DEFAULT_SETTINGS }

  try {
    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      const list = await db.collection("system_settings").find().toArray()
      for (const item of list) {
        if (item.key in settings) {
          (settings as any)[item.key] = JSON.parse(item.value)
        }
      }
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      const list = await db.select().from(tables.systemSettings)
      for (const item of list) {
        if (item.key in settings) {
          (settings as any)[item.key] = JSON.parse(item.value)
        }
      }
    }
  } catch {
  }

  cachedSettings = settings
  cacheExpiresAt = now + 5000
  return settings
}

export async function updateSystemSetting(key: keyof SystemSettings, value: any): Promise<void> {
  const serialized = JSON.stringify(value)

  if (databaseType === "mongodb") {
    const db = await connectToMongoDB()
    await db.collection("system_settings").updateOne(
      { key },
      { $set: { key, value: serialized, updatedAt: new Date() } },
      { upsert: true }
    )
  } else {
    const db = getDrizzleDb() as any
    const tables = getTables()
    const result = await db.select().from(tables.systemSettings).where(eq(tables.systemSettings.key, key)).limit(1)
    if (result.length > 0) {
      await db.update(tables.systemSettings).set({ value: serialized }).where(eq(tables.systemSettings.key, key))
    } else {
      await db.insert(tables.systemSettings).values({ key, value: serialized })
    }
  }

  cachedSettings = null
  cacheExpiresAt = 0
}

export async function addIPToBlocklist(ip: string): Promise<void> {
  const settings = await getSystemSettings()
  if (!settings.blockedIPs.includes(ip)) {
    const updated = [...settings.blockedIPs, ip]
    await updateSystemSetting("blockedIPs", updated)
  }
}
