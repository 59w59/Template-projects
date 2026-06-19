import { defineHandler, HttpError } from "@/lib/api/api-handler"
import { getDrizzleDb, databaseType } from "@/lib/db/connection"
import { connectToMongoDB } from "@/lib/db/mongodb"
import * as sqliteSchema from "@/lib/schemas/db-sqlite"
import * as pgSchema from "@/lib/schemas/db-postgres"
import * as mysqlSchema from "@/lib/schemas/db-mysql"
import { getSystemSettings } from "@/lib/settings/system-settings"

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

    const settings = await getSystemSettings()

    const report: any = {
      database: { status: "unknown", latency: 0 },
      redis: { status: "unknown" },
      storage: { status: "unknown" },
      email: { status: "unknown" },
      twilio: { status: "unknown" },
      stripe: { status: "unknown" },
    }

    const dbStart = Date.now()
    try {
      if (databaseType === "mongodb") {
        const db = await connectToMongoDB()
        await db.command({ ping: 1 })
      } else {
        const db = getDrizzleDb() as any
        const tables = getTables()
        await db.select({ id: tables.users.id }).from(tables.users).limit(1)
      }
      report.database = { status: "healthy", latency: Date.now() - dbStart }
    } catch (err: any) {
      report.database = { status: "unhealthy", error: err.message }
    }

    const redisUrl = settings.redisUrl || process.env.UPSTASH_REDIS_REST_URL
    const redisToken = settings.redisToken || process.env.UPSTASH_REDIS_REST_TOKEN
    if (redisUrl && redisToken) {
      const start = Date.now()
      try {
        const { getRedisClient } = await import("@/lib/services/redis")
        const redis = await getRedisClient()
        if (redis) {
          await redis.ping()
          report.redis = { status: "healthy", latency: Date.now() - start }
        } else {
          report.redis = { status: "unhealthy", error: "Redis client initialization failed" }
        }
      } catch (err: any) {
        report.redis = { status: "unhealthy", error: err.message }
      }
    } else {
      report.redis = { status: "not_configured" }
    }

    const storageProvider = process.env.STORAGE_PROVIDER || "local"
    const s3AccessKeyId = settings.s3AccessKeyId || process.env.S3_ACCESS_KEY_ID
    const s3SecretAccessKey = settings.s3SecretAccessKey || process.env.S3_SECRET_ACCESS_KEY
    if (storageProvider === "s3" || (s3AccessKeyId && s3SecretAccessKey)) {
      const start = Date.now()
      try {
        const { getS3Client } = await import("@/lib/services/s3")
        const s3 = await getS3Client()
        if (s3) {
          report.storage = { status: "healthy", provider: "S3/R2", latency: Date.now() - start }
        } else {
          report.storage = { status: "unhealthy", provider: "S3/R2", error: "Client not initialized" }
        }
      } catch (err: any) {
        report.storage = { status: "unhealthy", provider: "S3/R2", error: err.message }
      }
    } else {
      report.storage = { status: "healthy", provider: "Local Storage Fallback" }
    }

    const emailUser = settings.smtpUser || process.env.EMAIL_USER
    if (emailUser) {
      report.email = { status: "healthy", user: emailUser }
    } else {
      report.email = { status: "not_configured" }
    }

    const twilioSid = settings.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID
    if (twilioSid) {
      report.twilio = { status: "healthy" }
    } else {
      report.twilio = { status: "not_configured" }
    }

    const stripeKey = settings.stripeSecretKey || process.env.STRIPE_SECRET_KEY
    if (stripeKey) {
      if (stripeKey.startsWith("sk_test_mock")) {
        report.stripe = { status: "mock_enabled" }
      } else {
        const start = Date.now()
        try {
          const { getStripeClient } = await import("@/lib/services/stripe")
          const client = await getStripeClient()
          await client.products.list({ limit: 1 })
          report.stripe = { status: "healthy", latency: Date.now() - start }
        } catch (err: any) {
          report.stripe = { status: "unhealthy", error: err.message }
        }
      }
    } else {
      report.stripe = { status: "not_configured" }
    }

    return { diagnostics: report }
  }
)
