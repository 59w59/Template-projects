import { generateHMAC, verifyHMAC, encryptAES, decryptAES, generateRandomSecret } from "../src/lib/security/crypto"
import { verifyWebhookSignature } from "../src/lib/webhooks/webhook-verifier"
import { getDrizzleDb } from "../src/lib/db/connection"
import * as sqliteSchema from "../src/lib/schemas/db-sqlite"
import { generate2FACode, verify2FACode, generatePasswordReset, verifyPasswordReset, hashPassword } from "../src/lib/auth/auth"
import { escapeHTML, sanitizeMongoKeys, sanitizePayload } from "../src/lib/security/sanitizer"
import assert from "assert"
import { eq } from "drizzle-orm"

async function runTests() {
  console.log("=== STARTING SECURITY SUITE AUDIT ===")

  // 1. Test HMAC
  console.log("Testing HMAC signatures...")
  const data = "hello-world-payload"
  const secret = "test-secret-key-123456"
  const signature = generateHMAC(data, secret)
  assert.strictEqual(verifyHMAC(data, signature, secret), true)
  assert.strictEqual(verifyHMAC(data, signature, "wrong-secret"), false)
  assert.strictEqual(verifyHMAC("altered-data", signature, secret), false)
  console.log("✓ HMAC tests passed!")

  // 2. Test AES
  console.log("Testing AES-256-GCM Encryption...")
  const text = "confidential-user-data"
  const aesKey = generateRandomSecret()
  const encrypted = encryptAES(text, aesKey)
  const decrypted = decryptAES(encrypted.encryptedData, encrypted.iv, encrypted.tag, aesKey)
  assert.strictEqual(decrypted, text)
  console.log("✓ AES-256-GCM tests passed!")

  // 3. Test Webhooks Signature & Replay Attacks
  console.log("Testing Webhooks signatures & Replay protection...")
  const webhookSecret = "webhook-signing-secret"
  const payload = JSON.stringify({ event: "payment.succeeded" })
  const timestamp = Math.floor(Date.now() / 1000)
  const signedPayload = `${timestamp}.${payload}`
  const hmacSig = generateHMAC(signedPayload, webhookSecret)

  const headersMap = new Map([
    ["x-signature", hmacSig],
    ["x-timestamp", timestamp.toString()]
  ])
  const mockHeaders = {
    get: (key: string) => headersMap.get(key.toLowerCase()) || null
  }

  const verified = verifyWebhookSignature(payload, mockHeaders as any, {
    secret: webhookSecret,
    signatureHeader: "x-signature",
    timestampHeader: "x-timestamp",
  })
  assert.strictEqual(verified, true)

  const oldTimestamp = timestamp - 400
  const oldHeadersMap = new Map([
    ["x-signature", hmacSig],
    ["x-timestamp", oldTimestamp.toString()]
  ])
  const oldMockHeaders = {
    get: (key: string) => oldHeadersMap.get(key.toLowerCase()) || null
  }
  const verifiedOld = verifyWebhookSignature(payload, oldMockHeaders as any, {
    secret: webhookSecret,
    signatureHeader: "x-signature",
    timestampHeader: "x-timestamp",
  })
  assert.strictEqual(verifiedOld, false)
  console.log("✓ Webhooks tests passed!")

  // 4. Test Integration of 2FA & Password Reset
  console.log("Testing Integration of 2FA & Password Reset (requires SQLite database)...")
  
  const { initDatabase } = await import("../src/lib/db/connection")
  await initDatabase()

  const db = getDrizzleDb() as any
  const tables = sqliteSchema
  
  const mockUserId = "test-security-user-id"
  const mockEmail = "security-test@domain.com"
  const passHash = await hashPassword("super-secret-password-123")

  await db.delete(tables.users).where(eq(tables.users.id, mockUserId))

  await db.insert(tables.users).values({
    id: mockUserId,
    email: mockEmail,
    passwordHash: passHash,
  })

  const code = await generate2FACode(mockUserId)
  assert.strictEqual(code.length, 6)
  assert.strictEqual(isNaN(Number(code)), false)

  const codeValid = await verify2FACode(mockUserId, code)
  assert.strictEqual(codeValid, true)

  const codeInvalidAfterUse = await verify2FACode(mockUserId, code)
  assert.strictEqual(codeInvalidAfterUse, false)

  const resetToken = await generatePasswordReset(mockEmail)
  assert.notStrictEqual(resetToken, null)
  
  const resetSuccess = await verifyPasswordReset(resetToken!, await hashPassword("new-secure-password-456"))
  assert.strictEqual(resetSuccess, true)

  await db.delete(tables.users).where(eq(tables.users.id, mockUserId))
  console.log("✓ Database 2FA & Password Reset integration tests passed!")

  console.log("Testing XSS Sanitization & NoSQL Injection Protection...")
  const maliciousInput = "<script>alert('xss')</script>"
  const sanitizedInput = escapeHTML(maliciousInput)
  assert.strictEqual(sanitizedInput.includes("<script>"), false)
  assert.strictEqual(sanitizedInput, "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;")

  const nestedPayload = {
    username: "john_doe",
    bio: "<img src=x onerror=alert(1)>",
    query: {
      email: { $gt: "" },
      password: "123",
      $where: "true"
    }
  }

  const cleanedPayload = sanitizePayload(nestedPayload)
  assert.strictEqual(cleanedPayload.bio, "&lt;img src=x onerror=alert(1)&gt;")
  assert.strictEqual(cleanedPayload.query.email.$gt, undefined)
  assert.strictEqual(cleanedPayload.query.$where, undefined)
  assert.strictEqual(cleanedPayload.query.password, "123")
  console.log("✓ XSS & NoSQL sanitization tests passed!")

  console.log("=== ALL SECURITY TESTS PASSED SUCCESSFULLY ===")
}

runTests().catch((err) => {
  console.error("Test suite failed:", err)
  process.exit(1)
})
