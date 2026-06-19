import { z } from "zod"
import { logger } from "../logger/logger"

const envSchema = z.object({
  DATABASE_TYPE: z.enum(["sqlite", "postgres", "mysql", "mongodb"]).default("sqlite"),
  DATABASE_URL: z.string().optional(),
  MONGODB_URI: z.string().optional(),
  JWT_SECRET: z.string().default("fallback-jwt-secret-key-at-least-32-chars-long"),
  HMAC_SECRET: z.string().default("fallback-hmac-secret-key"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  EMAIL_SERVICE: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  logger.error("Environment variables validation failed:", parsed.error as any)
  process.exit(1)
}

export const env = parsed.data
