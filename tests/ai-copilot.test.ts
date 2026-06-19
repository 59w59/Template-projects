import { initDatabase, getDrizzleDb } from "../src/lib/db/connection"
import { createAccessToken } from "../src/lib/auth/auth"
import { updateSystemSetting } from "../src/lib/settings/system-settings"
import * as sqliteSchema from "../src/lib/schemas/db-sqlite"
import { POST as postChat } from "../src/app/api/ai/chat/route"
import { NextRequest } from "next/server"
import assert from "assert"
import { eq } from "drizzle-orm"
import { GoogleGenerativeAI } from "@google/generative-ai"

GoogleGenerativeAI.prototype.getGenerativeModel = function(config: any) {
  return {
    generateContent: async function(params: any) {
      const contents = params.contents
      const lastItem = contents[contents.length - 1]
      const lastPart = lastItem.parts[0]

      if (lastPart.functionResponse) {
        return {
          response: {
            text: () => `Respondi usando o resultado da funcao ${lastPart.functionResponse.name}`
          }
        }
      }

      const text = lastPart.text || ""
      if (text.includes("diagnostico")) {
        return {
          response: {
            candidates: [{
              content: {
                parts: [{
                  functionCall: {
                    name: "getSystemMetrics",
                    args: {}
                  }
                }]
              }
            }],
            text: () => ""
          }
        }
      }

      return {
        response: {
          candidates: [{
            content: {
              parts: [{
                text: "Ola, sou o co-piloto"
              }]
            }
          }],
          text: () => "Ola, sou o co-piloto"
        }
      }
    }
  } as any
}

async function runCopilotTests() {
  await initDatabase()
  const db = getDrizzleDb() as any
  const tables = sqliteSchema

  const mockAdminId = "test-ai-admin"
  const mockUserId = "test-ai-user"

  await db.delete(tables.users).where(eq(tables.users.id, mockAdminId))
  await db.delete(tables.users).where(eq(tables.users.id, mockUserId))

  await db.insert(tables.users).values({
    id: mockAdminId,
    email: "ai-admin@domain.com",
    role: "admin",
    passwordHash: "dummyhash",
  })

  await db.insert(tables.users).values({
    id: mockUserId,
    email: "ai-user@domain.com",
    role: "user",
    passwordHash: "dummyhash",
  })

  const adminToken = await createAccessToken({ userId: mockAdminId, email: "ai-admin@domain.com", role: "admin" })
  const userToken = await createAccessToken({ userId: mockUserId, email: "ai-user@domain.com", role: "user" })

  const reqUser = new NextRequest("http://localhost/api/ai/chat", {
    method: "POST",
    headers: { authorization: `Bearer ${userToken}` },
    body: JSON.stringify({ message: "Ola" })
  })
  const resUser = await postChat(reqUser, { params: {} })
  assert.strictEqual(resUser.status, 403)

  await updateSystemSetting("geminiApiKey", "")
  const reqNoKey = new NextRequest("http://localhost/api/ai/chat", {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ message: "Ola" })
  })
  const resNoKey = await postChat(reqNoKey, { params: {} })
  assert.strictEqual(resNoKey.status, 500)
  const noKeyData = await resNoKey.json()
  assert.ok(noKeyData.error.includes("Gemini nao configurada"))

  await updateSystemSetting("geminiApiKey", "mock-key")
  const reqNormal = new NextRequest("http://localhost/api/ai/chat", {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ message: "Ola" })
  })
  const resNormal = await postChat(reqNormal, { params: {} })
  assert.strictEqual(resNormal.status, 200)
  const normalData = await resNormal.json()
  assert.strictEqual(normalData.data.response, "Ola, sou o co-piloto")

  const reqFunction = new NextRequest("http://localhost/api/ai/chat", {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ message: "Rodar diagnostico" })
  })
  const resFunction = await postChat(reqFunction, { params: {} })
  assert.strictEqual(resFunction.status, 200)
  const functionData = await resFunction.json()
  assert.strictEqual(functionData.data.response, "Respondi usando o resultado da funcao getSystemMetrics")

  await db.delete(tables.users).where(eq(tables.users.id, mockAdminId))
  await db.delete(tables.users).where(eq(tables.users.id, mockUserId))
  await updateSystemSetting("geminiApiKey", "")
  console.log("AI Copilot Route Tests Passed Successfully.")
}

runCopilotTests().catch(err => {
  console.error("AI Copilot Route Tests Failed:", err)
  process.exit(1)
})
