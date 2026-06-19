import { initDatabase, getDrizzleDb } from "../src/lib/db/connection"
import { getPaymentGateway } from "../src/lib/billing/gateway"
import { processAndStoreFile } from "../src/lib/storage/upload"
import { createNotification } from "../src/lib/notifications/engine"
import { generateDatabaseBackup } from "../src/lib/db/backup"
import * as sqliteSchema from "../src/lib/schemas/db-sqlite"
import assert from "assert"
import { eq, and } from "drizzle-orm"
import fs from "fs"
import path from "path"

async function runExtendedTests() {
  console.log("=== STARTING EXTENDED SECURITY & FEATURE SUITE ===")

  await initDatabase()
  const db = getDrizzleDb() as any
  const tables = sqliteSchema

  const mockOrgId = "test-org-id-123"
  const mockUserId = "test-user-id-abc"
  const mockMemberId = "test-member-id-xyz"
  const mockInviteToken = "test-invite-token-999"

  await db.delete(tables.organizationMembers).where(eq(tables.organizationMembers.organizationId, mockOrgId))
  await db.delete(tables.organizationInvitations).where(eq(tables.organizationInvitations.organizationId, mockOrgId))
  await db.delete(tables.organizations).where(eq(tables.organizations.id, mockOrgId))
  await db.delete(tables.users).where(eq(tables.users.id, mockUserId))

  await db.insert(tables.users).values({
    id: mockUserId,
    email: "test-user-extended@test.com",
    passwordHash: "somehash123",
  })

  await db.insert(tables.organizations).values({
    id: mockOrgId,
    name: "Test Org",
    slug: "test-org",
  })

  await db.insert(tables.organizationMembers).values({
    id: mockMemberId,
    organizationId: mockOrgId,
    userId: mockUserId,
    role: "owner",
  })

  const memberRecord = await db
    .select()
    .from(tables.organizationMembers)
    .where(and(eq(tables.organizationMembers.organizationId, mockOrgId), eq(tables.organizationMembers.userId, mockUserId)))
    .limit(1)

  assert.strictEqual(memberRecord.length, 1)
  assert.strictEqual(memberRecord[0].role, "owner")
  console.log("✓ Organization creation and membership verified!")

  const expiresAt = new Date(Date.now() + 600000)
  await db.insert(tables.organizationInvitations).values({
    id: "test-invite-id",
    organizationId: mockOrgId,
    email: "invited-user@test.com",
    role: "member",
    token: mockInviteToken,
    expiresAt,
  })

  const inviteRecord = await db
    .select()
    .from(tables.organizationInvitations)
    .where(eq(tables.organizationInvitations.token, mockInviteToken))
    .limit(1)

  assert.strictEqual(inviteRecord.length, 1)
  assert.strictEqual(inviteRecord[0].email, "invited-user@test.com")
  console.log("✓ Organization invitation creation verified!")

  console.log("Testing generic payment gateway factory and mock stripe/asaas...")
  const gateway = getPaymentGateway("stripe")
  const session = await gateway.createCheckoutSession(mockUserId, mockOrgId, "premium-monthly", "http://success", "http://cancel")
  assert.strictEqual(session.url.startsWith("https://checkout.stripe.com"), true)

  const mockStripeWebhookPayload = JSON.stringify({
    type: "checkout.session.completed",
    client_reference_id: mockUserId,
    customer: "cus_stripe_123",
    subscription: "sub_stripe_456",
    metadata: { planId: "premium-monthly" },
  })

  const parsedWebhook = await gateway.handleWebhook(mockStripeWebhookPayload, {})
  assert.notStrictEqual(parsedWebhook, null)
  assert.strictEqual(parsedWebhook!.userId, mockUserId)
  assert.strictEqual(parsedWebhook!.subscriptionId, "sub_stripe_456")
  assert.strictEqual(parsedWebhook!.customerId, "cus_stripe_123")
  console.log("✓ Gateway checkout session & webhook simulation verified!")

  console.log("Testing file upload utility (local storage fallback)...")
  const mockFileContent = Buffer.from("Hello world from unit tests secure storage upload")
  const uploadResult = await processAndStoreFile("my_test_document.txt", "text/plain", mockFileContent)
  assert.strictEqual(uploadResult.fileName, "my_test_document.txt")
  assert.strictEqual(uploadResult.storageProvider, "local")
  assert.strictEqual(uploadResult.mimeType, "text/plain")

  const savedFilePath = path.join(process.cwd(), "public", "uploads", uploadResult.fileKey)
  assert.strictEqual(fs.existsSync(savedFilePath), true)
  fs.unlinkSync(savedFilePath)
  console.log("✓ Secure file processing and local fallback storage verified!")

  console.log("Testing notifications engine database insertion...")
  await db.delete(tables.notifications).where(eq(tables.notifications.userId, mockUserId))
  await createNotification(mockUserId, "Notification Title", "This is the notification content text body", "success")

  const notificationRecords = await db
    .select()
    .from(tables.notifications)
    .where(eq(tables.notifications.userId, mockUserId))
  assert.strictEqual(notificationRecords.length, 1)
  assert.strictEqual(notificationRecords[0].title, "Notification Title")
  assert.strictEqual(notificationRecords[0].isRead, false)
  console.log("✓ Notification creation & persistence verified!")

  console.log("Testing database JSON backup generation...")
  const backup = await generateDatabaseBackup()
  const parsedBackup = JSON.parse(backup)
  assert.strictEqual(parsedBackup.databaseType, "sqlite")
  assert.ok(parsedBackup.tables.users)
  assert.ok(parsedBackup.tables.organizations)
  console.log("✓ Database backup dump generation verified!")

  await db.delete(tables.organizationMembers).where(eq(tables.organizationMembers.organizationId, mockOrgId))
  await db.delete(tables.organizationInvitations).where(eq(tables.organizationInvitations.organizationId, mockOrgId))
  await db.delete(tables.organizations).where(eq(tables.organizations.id, mockOrgId))
  await db.delete(tables.notifications).where(eq(tables.notifications.userId, mockUserId))
  await db.delete(tables.users).where(eq(tables.users.id, mockUserId))

  console.log("=== ALL EXTENDED TESTS PASSED SUCCESSFULLY ===")
}

runExtendedTests().catch((err) => {
  console.error("Extended test suite failed:", err)
  process.exit(1)
})
