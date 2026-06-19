import { initDatabase, getDrizzleDb } from "../src/lib/db/connection"
import { createAccessToken } from "../src/lib/auth/auth"
import { updateSystemSetting } from "../src/lib/settings/system-settings"
import * as sqliteSchema from "../src/lib/schemas/db-sqlite"
import { POST as postRegister } from "../src/app/api/auth/register/route"
import { GET as getNotifications } from "../src/app/api/notifications/route"
import { NextRequest } from "next/server"
import assert from "assert"
import { eq } from "drizzle-orm"

async function runAdvancedSettingsTests() {
  console.log("=== STARTING ADVANCED SETTINGS & SECURITY ROUTE AUDIT ===")

  await initDatabase()
  const db = getDrizzleDb() as any
  const tables = sqliteSchema

  const mockAdminId = "test-adv-admin"
  const mockUserId = "test-adv-user"

  await db.delete(tables.users).where(eq(tables.users.id, mockAdminId))
  await db.delete(tables.users).where(eq(tables.users.id, mockUserId))

  await db.insert(tables.users).values({
    id: mockAdminId,
    email: "adv-admin@domain.com",
    role: "admin",
    passwordHash: "dummyhash",
  })

  await db.insert(tables.users).values({
    id: mockUserId,
    email: "adv-user@domain.com",
    role: "user",
    passwordHash: "dummyhash",
  })

  const adminToken = await createAccessToken({ userId: mockAdminId, email: "adv-admin@domain.com", role: "admin" })
  const userToken = await createAccessToken({ userId: mockUserId, email: "adv-user@domain.com", role: "user" })

  console.log("Testing IP Blacklist...")
  await updateSystemSetting("blockedIPs", ["99.88.77.66"])

  const reqBlockedIP = new NextRequest("http://localhost/api/notifications", {
    headers: {
      "x-forwarded-for": "99.88.77.66",
      authorization: `Bearer ${userToken}`
    }
  })
  const resBlockedIP = await getNotifications(reqBlockedIP, { params: {} })
  assert.strictEqual(resBlockedIP.status, 403)

  const reqAllowedIP = new NextRequest("http://localhost/api/notifications", {
    headers: {
      "x-forwarded-for": "12.34.56.78",
      authorization: `Bearer ${userToken}`
    }
  })
  const resAllowedIP = await getNotifications(reqAllowedIP, { params: {} })
  assert.strictEqual(resAllowedIP.status, 200)

  await updateSystemSetting("blockedIPs", [])

  console.log("Testing Maintenance Mode restrictions...")
  await updateSystemSetting("maintenanceMode", true)
  await updateSystemSetting("maintenanceMessage", "Manutencao ativa no teste")

  const reqUserMaintenance = new NextRequest("http://localhost/api/notifications", {
    headers: { authorization: `Bearer ${userToken}` }
  })
  const resUserMaintenance = await getNotifications(reqUserMaintenance, { params: {} })
  assert.strictEqual(resUserMaintenance.status, 503)

  const reqAdminMaintenance = new NextRequest("http://localhost/api/notifications", {
    headers: { authorization: `Bearer ${adminToken}` }
  })
  const resAdminMaintenance = await getNotifications(reqAdminMaintenance, { params: {} })
  assert.strictEqual(resAdminMaintenance.status, 200)

  await updateSystemSetting("maintenanceMode", false)

  console.log("Testing Registration Lock...")
  await updateSystemSetting("disableRegistrations", true)

  const reqRegisterLock = new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: "new-user-test@domain.com",
      password: "Password123!",
      confirmPassword: "Password123!",
    })
  })
  const resRegisterLock = await postRegister(reqRegisterLock, { params: {} })
  assert.strictEqual(resRegisterLock.status, 400)
  const dataRegisterLock = await resRegisterLock.json()
  assert.strictEqual(dataRegisterLock.success, false)

  await updateSystemSetting("disableRegistrations", false)

  await db.delete(tables.users).where(eq(tables.users.id, mockAdminId))
  await db.delete(tables.users).where(eq(tables.users.id, mockUserId))

  console.log("=== ALL ADVANCED SETTINGS TESTS PASSED SUCCESSFULLY ===")
}

runAdvancedSettingsTests().catch((err) => {
  console.error("Advanced settings test suite failed:", err)
  process.exit(1)
})
