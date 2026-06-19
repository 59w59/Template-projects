import { getDrizzleDb, databaseType } from "../db/connection"
import { connectToMongoDB } from "../db/mongodb"
import * as sqliteSchema from "../schemas/db-sqlite"
import * as pgSchema from "../schemas/db-postgres"
import * as mysqlSchema from "../schemas/db-mysql"
import { generateSecureToken } from "../utils"
import { sendMail } from "../email/email"

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

export async function createNotification(
  userId: string,
  title: string,
  content: string,
  type: "info" | "warning" | "success" | "error" = "info",
  sendAsEmail = false,
  userEmail?: string
): Promise<void> {
  const id = generateSecureToken()

  if (databaseType === "mongodb") {
    const db = await connectToMongoDB()
    await db.collection("notifications").insertOne({
      id,
      userId,
      title,
      content,
      type,
      isRead: false,
      createdAt: new Date(),
    })
  } else {
    const db = getDrizzleDb() as any
    const tables = getTables()
    await db.insert(tables.notifications).values({
      id,
      userId,
      title,
      content,
      type,
      isRead: false,
    })
  }

  if (sendAsEmail && userEmail) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a;">${title}</h2>
        <p style="color: #475569; line-height: 1.6;">${content}</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">Esta é uma notificação automática do Boilerplate Template.</p>
      </div>
    `
    await sendMail({ to: userEmail, subject: title, html })
  }
}
