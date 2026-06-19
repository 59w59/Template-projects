import { defineHandler, HttpError } from "@/lib/api/api-handler"
import { getSystemSettings, updateSystemSetting } from "@/lib/settings/system-settings"
import { z } from "zod"

const settingsUpdateSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().optional(),
  disableRegistrations: z.boolean().optional(),
  blockedIPs: z.array(z.string()).optional(),
  autoPunish: z.boolean().optional(),
  rateLimitMax: z.number().optional(),
  rateLimitWindow: z.number().optional(),
  stripeSecretKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),
  s3AccessKeyId: z.string().optional(),
  s3SecretAccessKey: z.string().optional(),
  s3Bucket: z.string().optional(),
  s3Region: z.string().optional(),
  s3Endpoint: z.string().optional(),
  twilioAccountSid: z.string().optional(),
  twilioAuthToken: z.string().optional(),
  twilioFromNumber: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpSecure: z.boolean().optional(),
  smtpFrom: z.string().optional(),
  redisUrl: z.string().optional(),
  redisToken: z.string().optional(),
  googleClientId: z.string().optional(),
  googleClientSecret: z.string().optional(),
  githubClientId: z.string().optional(),
  githubClientSecret: z.string().optional(),
  discordClientId: z.string().optional(),
  discordClientSecret: z.string().optional(),
  appleClientId: z.string().optional(),
  appleTeamId: z.string().optional(),
  appleKeyId: z.string().optional(),
  applePrivateKey: z.string().optional(),
  appName: z.string().optional(),
  appDescription: z.string().optional(),
  primaryColor: z.string().optional(),
  borderRadius: z.string().optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  geminiApiKey: z.string().optional(),
})

export const GET = defineHandler(
  { requireAuth: true },
  async ({ user }) => {
    if (user.role !== "admin") {
      throw new HttpError(403, "Acesso negado")
    }
    const settings = await getSystemSettings()
    return { settings }
  }
)

export const POST = defineHandler(
  { schema: settingsUpdateSchema, requireAuth: true },
  async ({ body, user }) => {
    if (user.role !== "admin") {
      throw new HttpError(403, "Acesso negado")
    }

    const keys = [
      "maintenanceMode",
      "maintenanceMessage",
      "disableRegistrations",
      "blockedIPs",
      "autoPunish",
      "rateLimitMax",
      "rateLimitWindow",
      "stripeSecretKey",
      "stripeWebhookSecret",
      "s3AccessKeyId",
      "s3SecretAccessKey",
      "s3Bucket",
      "s3Region",
      "s3Endpoint",
      "twilioAccountSid",
      "twilioAuthToken",
      "twilioFromNumber",
      "smtpHost",
      "smtpPort",
      "smtpUser",
      "smtpPass",
      "smtpSecure",
      "smtpFrom",
      "redisUrl",
      "redisToken",
      "googleClientId",
      "googleClientSecret",
      "githubClientId",
      "githubClientSecret",
      "discordClientId",
      "discordClientSecret",
      "appleClientId",
      "appleTeamId",
      "appleKeyId",
      "applePrivateKey",
      "appName",
      "appDescription",
      "primaryColor",
      "borderRadius",
      "logoUrl",
      "faviconUrl",
      "geminiApiKey",
    ] as const

    for (const key of keys) {
      if (body[key] !== undefined) {
        await updateSystemSetting(key, body[key])
      }
    }

    const settings = await getSystemSettings()
    return { success: true, message: "Configurações atualizadas com sucesso", settings }
  }
)
