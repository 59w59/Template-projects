import { initDatabase, getDrizzleDb } from "../src/lib/db/connection"
import { createAccessToken } from "../src/lib/auth/auth"
import * as sqliteSchema from "../src/lib/schemas/db-sqlite"
import { GET as getUsers, POST as postUsers } from "../src/app/api/admin/users/route"
import { GET as getLogs } from "../src/app/api/admin/logs/route"
import { NextRequest } from "next/server"
import assert from "assert"
import { eq } from "drizzle-orm"

async function runAdminProfileTests() {
  console.log("=== STARTING ADMIN & PROFILE ROUTE AUDIT ===")

  await initDatabase()
  const db = getDrizzleDb() as any
  const tables = sqliteSchema

  const mockAdminId = "test-admin-id-999"
  const mockUserId = "test-user-id-555"

  await db.delete(tables.users).where(eq(tables.users.id, mockAdminId))
  await db.delete(tables.users).where(eq(tables.users.id, mockUserId))

  await db.insert(tables.users).values({
    id: mockAdminId,
    email: "admin-test@domain.com",
    role: "admin",
    passwordHash: "dummyhash",
  })

  await db.insert(tables.users).values({
    id: mockUserId,
    email: "user-test@domain.com",
    role: "user",
    passwordHash: "dummyhash",
  })

  const adminToken = await createAccessToken({ userId: mockAdminId, email: "admin-test@domain.com", role: "admin" })
  const userToken = await createAccessToken({ userId: mockUserId, email: "user-test@domain.com", role: "user" })

  console.log("Testing GET /api/admin/users...")
  
  const reqAdminUsers = new NextRequest("http://localhost/api/admin/users", {
    headers: { authorization: `Bearer ${adminToken}` }
  })
  const resAdminUsers = await getUsers(reqAdminUsers, { params: {} })
  assert.strictEqual(resAdminUsers.status, 200)
  const dataAdminUsers = await resAdminUsers.json()
  assert.strictEqual(dataAdminUsers.success, true)
  assert.ok(Array.isArray(dataAdminUsers.data.users))
  assert.ok(dataAdminUsers.data.users.length >= 2)

  const reqUserUsers = new NextRequest("http://localhost/api/admin/users", {
    headers: { authorization: `Bearer ${userToken}` }
  })
  const resUserUsers = await getUsers(reqUserUsers, { params: {} })
  assert.strictEqual(resUserUsers.status, 403)

  console.log("Testing POST /api/admin/users (role modification)...")

  const reqPromote = new NextRequest("http://localhost/api/admin/users", {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ userId: mockUserId, role: "admin" })
  })
  const resPromote = await postUsers(reqPromote, { params: {} })
  assert.strictEqual(resPromote.status, 200)

  const userRecordAfter = await db.select().from(tables.users).where(eq(tables.users.id, mockUserId)).limit(1)
  assert.strictEqual(userRecordAfter[0].role, "admin")

  const reqSelfDemote = new NextRequest("http://localhost/api/admin/users", {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ userId: mockAdminId, role: "user" })
  })
  const resSelfDemote = await postUsers(reqSelfDemote, { params: {} })
  assert.strictEqual(resSelfDemote.status, 400)

  console.log("Testing GET /api/admin/logs...")

  const reqAdminLogs = new NextRequest("http://localhost/api/admin/logs", {
    headers: { authorization: `Bearer ${adminToken}` }
  })
  const resAdminLogs = await getLogs(reqAdminLogs, { params: {} })
  assert.strictEqual(resAdminLogs.status, 200)
  const dataAdminLogs = await resAdminLogs.json()
  assert.strictEqual(dataAdminLogs.success, true)
  assert.ok(Array.isArray(dataAdminLogs.data.logs))

  const reqUserLogs = new NextRequest("http://localhost/api/admin/logs", {
    headers: { authorization: `Bearer ${userToken}` }
  })
  const resUserLogs = await getLogs(reqUserLogs, { params: {} })
  assert.strictEqual(resUserLogs.status, 403)

  await db.delete(tables.users).where(eq(tables.users.id, mockAdminId))
  await db.delete(tables.users).where(eq(tables.users.id, mockUserId))

  console.log("=== ALL ADMIN & PROFILE TESTS PASSED SUCCESSFULLY ===")
}

runAdminProfileTests().catch((err) => {
  console.error("Admin/Profile test suite failed:", err)
  process.exit(1)
})
