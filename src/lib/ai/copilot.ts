import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai"
import { getSystemSettings, updateSystemSetting, addIPToBlocklist } from "../settings/system-settings"
import { getDrizzleDb, databaseType } from "../db/connection"
import { connectToMongoDB } from "../db/mongodb"
import * as sqliteSchema from "../schemas/db-sqlite"
import * as pgSchema from "../schemas/db-postgres"
import * as mysqlSchema from "../schemas/db-mysql"
import { createNotification } from "../notifications/engine"

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

async function runDiagnostics() {
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
  return report
}

async function listUsers() {
  if (databaseType === "mongodb") {
    const db = await connectToMongoDB()
    return await db.collection("users").find({}, { projection: { passwordHash: 0 } }).toArray()
  } else {
    const db = getDrizzleDb() as any
    const tables = getTables()
    return await db.select({
      id: tables.users.id,
      email: tables.users.email,
      role: tables.users.role,
      provider: tables.users.provider,
      emailVerified: tables.users.emailVerified
    }).from(tables.users)
  }
}

async function broadcastNotification(title: string, content: string, type: "info" | "success" | "warning" | "error") {
  let usersList: any[] = []
  if (databaseType === "mongodb") {
    const db = await connectToMongoDB()
    usersList = await db.collection("users").find().toArray()
  } else {
    const db = getDrizzleDb() as any
    const tables = getTables()
    usersList = await db.select({ id: tables.users.id, email: tables.users.email }).from(tables.users)
  }
  for (const u of usersList) {
    await createNotification(u.id, title, content, type, false, u.email)
  }
  return { success: true, count: usersList.length }
}

export async function executeCopilotChat(
  message: string,
  history: { role: string; content: string }[]
): Promise<string> {
  const settings = await getSystemSettings()
  const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("Chave do Gemini nao configurada. Por favor, configure a chave API do Gemini no painel de integracoes.")
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: "gemini-3.5-flash",
    systemInstruction: "Voce e o Co-piloto de IA do Painel Administrativo. Voce tem acesso a ferramentas para diagnosticar o sistema, gerenciar configuracoes, listar usuarios, banir IPs e enviar notificacoes. Ao responder, seja extremamente conciso e profissional no tom. Utilize as ferramentas disponiveis sempre que o usuario solicitar alguma acao descrita nelas. Nao inclua comentarios no codigo gerado ou retornado.",
    tools: [{
      functionDeclarations: [
        {
          name: "getSystemMetrics",
          description: "Obtem relatorio de diagnosticos e latencias do sistema"
        },
        {
          name: "listUsers",
          description: "Lista os usuarios cadastrados no sistema"
        },
        {
          name: "banIP",
          description: "Bane um endereco IP adicionando-o a lista de bloqueios",
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              ip: {
                type: SchemaType.STRING,
                description: "O endereco IP a ser banido"
              }
            },
            required: ["ip"]
          }
        },
        {
          name: "updateSettings",
          description: "Atualiza uma configuracao do sistema (Ex: maintenanceMode como true ou false, etc.)",
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              key: {
                type: SchemaType.STRING,
                description: "A chave de configuracao a ser atualizada"
              },
              value: {
                type: SchemaType.STRING,
                description: "O novo valor a ser definido"
              }
            },
            required: ["key", "value"]
          }
        },
        {
          name: "broadcastNotification",
          description: "Envia uma notificacao para todos os usuarios do sistema",
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              title: {
                type: SchemaType.STRING,
                description: "O titulo da notificacao"
              },
              content: {
                type: SchemaType.STRING,
                description: "O conteudo da notificacao"
              },
              type: {
                type: SchemaType.STRING,
                enum: ["info", "success", "warning", "error"],
                description: "O tipo de alerta"
              } as any
            },
            required: ["title", "content", "type"]
          }
        }
      ]
    }]
  })

  const contents: any[] = history.map(h => ({
    role: h.role === "user" ? "user" : "model",
    parts: [{ text: h.content }]
  }))
  contents.push({ role: "user", parts: [{ text: message }] })

  let response = await model.generateContent({ contents })
  let responsePart = response.response.candidates?.[0]?.content?.parts?.[0]

  if (responsePart && responsePart.functionCall) {
    const call = responsePart.functionCall
    let functionResult: any = null

    if (call.name === "getSystemMetrics") {
      functionResult = await runDiagnostics()
    } else if (call.name === "listUsers") {
      functionResult = await listUsers()
    } else if (call.name === "banIP") {
      const args = call.args as any
      await addIPToBlocklist(args.ip)
      functionResult = { success: true, message: `IP ${args.ip} banido com sucesso.` }
    } else if (call.name === "updateSettings") {
      const args = call.args as any
      let parsedVal: any = args.value
      if (args.value === "true") parsedVal = true
      else if (args.value === "false") parsedVal = false
      else if (!isNaN(Number(args.value))) parsedVal = Number(args.value)
      
      await updateSystemSetting(args.key as any, parsedVal)
      functionResult = { success: true, message: `Configuracao ${args.key} atualizada.` }
    } else if (call.name === "broadcastNotification") {
      const args = call.args as any
      functionResult = await broadcastNotification(args.title, args.content, args.type)
    }

    contents.push({
      role: "model",
      parts: [responsePart]
    })

    contents.push({
      role: "user",
      parts: [{
        functionResponse: {
          name: call.name,
          response: { result: functionResult }
        }
      }]
    })

    response = await model.generateContent({ contents })
    return response.response.text() || ""
  }

  return response.response.text() || ""
}
