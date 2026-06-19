import { initDatabase, getDrizzleDb } from "../src/lib/db/connection"
import { getSystemSettings, updateSystemSetting } from "../src/lib/settings/system-settings"
import { getStripeClient } from "../src/lib/services/stripe"
import { sendSMS } from "../src/lib/services/twilio"
import { getS3Client, getPublicUrl } from "../src/lib/services/s3"
import { sendMail } from "../src/lib/email/email"
import { getRedisClient } from "../src/lib/services/redis"
import * as sqliteSchema from "../src/lib/schemas/db-sqlite"
import assert from "assert"
import { eq } from "drizzle-orm"

async function runDynamicIntegrationsTests() {
  console.log("=== STARTING DYNAMIC INTEGRATIONS TEST SUITE ===")

  await initDatabase()
  const db = getDrizzleDb() as any
  const tables = sqliteSchema

  const settingsBefore = await getSystemSettings()

  console.log("Testing Stripe client dynamic key override...")
  await updateSystemSetting("stripeSecretKey", "sk_test_dynamic_123")
  const stripeClient = await getStripeClient()
  assert.strictEqual((stripeClient as any)._authenticator?._apiKey, "sk_test_dynamic_123")

  console.log("Testing S3 client dynamic configuration...")
  await updateSystemSetting("s3AccessKeyId", "access_key_dynamic")
  await updateSystemSetting("s3SecretAccessKey", "secret_key_dynamic")
  await updateSystemSetting("s3Bucket", "dynamic-bucket")
  await updateSystemSetting("s3Region", "us-west-2")
  await updateSystemSetting("s3Endpoint", "https://dynamic-endpoint.com")

  const s3Client = await getS3Client()
  assert.notStrictEqual(s3Client, null)

  const publicUrl = await getPublicUrl("test-file-key.png")
  assert.strictEqual(publicUrl, "https://dynamic-endpoint.com/dynamic-bucket/test-file-key.png")

  console.log("Testing Twilio client dynamic configuration...")
  await updateSystemSetting("twilioAccountSid", "AC_dynamic_sid")
  await updateSystemSetting("twilioAuthToken", "auth_token_dynamic")
  await updateSystemSetting("twilioFromNumber", "+1234567")

  const smsResult = await sendSMS("+19999999999", "Olá!")
  assert.strictEqual(smsResult, false)

  console.log("Testing SMTP Mailer dynamic configuration...")
  await updateSystemSetting("smtpHost", "smtp.dynamic.com")
  await updateSystemSetting("smtpPort", 999)
  await updateSystemSetting("smtpUser", "smtp_user_dynamic")
  await updateSystemSetting("smtpPass", "smtp_pass_dynamic")
  await updateSystemSetting("smtpSecure", true)
  await updateSystemSetting("smtpFrom", "dynamic@example.com")

  const mailResult = await sendMail({
    to: "someone@domain.com",
    subject: "Olá",
    html: "<p>Olá</p>",
  })
  assert.strictEqual(mailResult, false)

  console.log("Testing Redis client dynamic configuration...")
  await updateSystemSetting("redisUrl", "https://dynamic-redis.upstash.io")
  await updateSystemSetting("redisToken", "redis_token_dynamic")

  const redisClient = await getRedisClient()
  assert.notStrictEqual(redisClient, null)

  console.log("Restoring original system settings...")
  const keysToRestore: (keyof typeof settingsBefore)[] = [
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
  ]
  for (const key of keysToRestore) {
    await updateSystemSetting(key as any, settingsBefore[key])
  }

  console.log("=== ALL DYNAMIC INTEGRATIONS TESTS PASSED SUCCESSFULLY ===")
}

runDynamicIntegrationsTests().catch((err) => {
  console.error("Dynamic integrations test suite failed:", err)
  process.exit(1)
})
