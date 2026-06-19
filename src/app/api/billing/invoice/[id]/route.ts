import { defineHandler, HttpError } from "@/lib/api/api-handler"
import { getDrizzleDb, databaseType } from "@/lib/db/connection"
import { connectToMongoDB } from "@/lib/db/mongodb"
import { eq } from "drizzle-orm"
import * as sqliteSchema from "@/lib/schemas/db-sqlite"
import * as pgSchema from "@/lib/schemas/db-postgres"
import * as mysqlSchema from "@/lib/schemas/db-mysql"
import { generateInvoicePDF } from "@/lib/billing/invoice-pdf"
import { NextResponse } from "next/server"

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

export const GET = defineHandler(
  { requireAuth: true },
  async ({ user, params }) => {
    const id = params.id
    let subscription: any = null
    let userEmail = ""

    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      subscription = await db.collection("subscriptions").findOne({ id })
      if (subscription) {
        const u = await db.collection("users").findOne({ id: subscription.userId })
        userEmail = u?.email || ""
      }
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      const result = await db.select().from(tables.subscriptions).where(eq(tables.subscriptions.id, id)).limit(1)
      subscription = result[0] || null
      if (subscription) {
        const uResult = await db.select().from(tables.users).where(eq(tables.users.id, subscription.userId)).limit(1)
        userEmail = uResult[0]?.email || ""
      }
    }

    if (!subscription) {
      throw new HttpError(404, "Fatura nao encontrada")
    }

    if (user.role !== "admin" && subscription.userId !== user.id) {
      throw new HttpError(403, "Acesso negado")
    }

    const pdfBuffer = await generateInvoicePDF(subscription, userEmail)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${id}.pdf"`,
      },
    })
  }
)
