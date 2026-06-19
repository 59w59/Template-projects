import { defineHandler, HttpError } from "@/lib/api/api-handler"
import { getPaymentGateway } from "@/lib/billing/gateway"
import { getDrizzleDb, databaseType } from "@/lib/db/connection"
import { connectToMongoDB } from "@/lib/db/mongodb"
import { eq } from "drizzle-orm"
import * as sqliteSchema from "@/lib/schemas/db-sqlite"
import * as pgSchema from "@/lib/schemas/db-postgres"
import * as mysqlSchema from "@/lib/schemas/db-mysql"
import { generateSecureToken } from "@/lib/utils"
import { createNotification } from "@/lib/notifications/engine"
import { writeAuditLog } from "@/lib/security/audit"
import { getClientIp } from "@/lib/rate-limit/rate-limiter"

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

export const POST = defineHandler(
  {},
  async ({ req }) => {
    const ip = getClientIp(req.headers)
    const ua = req.headers.get("user-agent") || "unknown"

    const payload = await req.text()
    const headersMap: Record<string, string> = {}
    req.headers.forEach((val, key) => {
      headersMap[key] = val
    })

    const gateway = getPaymentGateway()
    const result = await gateway.handleWebhook(payload, headersMap)

    if (result && result.event === "subscription.created") {
      if (databaseType === "mongodb") {
        const db = await connectToMongoDB()
        await db.collection("subscriptions").updateOne(
          { gatewaySubscriptionId: result.subscriptionId },
          {
            $set: {
              userId: result.userId,
              gateway: "stripe",
              gatewayCustomerId: result.customerId,
              gatewaySubscriptionId: result.subscriptionId,
              status: result.status,
              planId: result.planId,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              id: generateSecureToken(),
              createdAt: new Date(),
            },
          },
          { upsert: true }
        )
      } else {
        const db = getDrizzleDb() as any
        const tables = getTables()
        const existing = await db
          .select()
          .from(tables.subscriptions)
          .where(eq(tables.subscriptions.gatewaySubscriptionId, result.subscriptionId))
          .limit(1)

        if (existing.length > 0) {
          await db
            .update(tables.subscriptions)
            .set({
              status: result.status,
              planId: result.planId,
              updatedAt: new Date(),
            })
            .where(eq(tables.subscriptions.gatewaySubscriptionId, result.subscriptionId))
        } else {
          await db.insert(tables.subscriptions).values({
            id: generateSecureToken(),
            userId: result.userId,
            gateway: "stripe",
            gatewayCustomerId: result.customerId,
            gatewaySubscriptionId: result.subscriptionId,
            status: result.status,
            planId: result.planId,
          })
        }
      }

      await createNotification(
        result.userId,
        "Assinatura Ativada 🎉",
        `Sua assinatura do plano ${result.planId} foi ativada com sucesso. Obrigado!`,
        "success"
      )

      await writeAuditLog(
        result.userId,
        "BILLING_WEBHOOK_SUBSCRIPTION_SUCCESS",
        "success",
        ip,
        ua,
        `Subscription created/updated: ${result.subscriptionId}`
      )

      return { success: true, processed: true }
    }

    return { success: true, processed: false }
  }
)
