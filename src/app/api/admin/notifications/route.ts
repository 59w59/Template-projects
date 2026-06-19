import { defineHandler, HttpError } from "@/lib/api/api-handler"
import { getDrizzleDb, databaseType } from "@/lib/db/connection"
import { connectToMongoDB } from "@/lib/db/mongodb"
import * as sqliteSchema from "@/lib/schemas/db-sqlite"
import * as pgSchema from "@/lib/schemas/db-postgres"
import * as mysqlSchema from "@/lib/schemas/db-mysql"
import { createNotification } from "@/lib/notifications/engine"
import { eq } from "drizzle-orm"
import { z } from "zod"

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

const sendNotificationSchema = z.object({
  target: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(["info", "success", "warning", "error"]),
  sendEmail: z.boolean().default(false),
})

export const POST = defineHandler(
  { schema: sendNotificationSchema, requireAuth: true },
  async ({ body, user }) => {
    if (user.role !== "admin") {
      throw new HttpError(403, "Acesso negado")
    }

    if (body.target === "all") {
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
        await createNotification(u.id, body.title, body.content, body.type, body.sendEmail, u.email)
      }

      return { success: true, message: `Notificação enviada em massa para ${usersList.length} usuários.` }
    } else {
      let targetUser: any = null
      if (databaseType === "mongodb") {
        const db = await connectToMongoDB()
        targetUser = await db.collection("users").findOne({ email: body.target })
      } else {
        const db = getDrizzleDb() as any
        const tables = getTables()
        const result = await db.select().from(tables.users).where(eq(tables.users.email, body.target)).limit(1)
        targetUser = result[0] || null
      }

      if (!targetUser) {
        throw new HttpError(404, "Usuário destino não encontrado")
      }

      await createNotification(targetUser.id, body.title, body.content, body.type, body.sendEmail, targetUser.email)
      return { success: true, message: "Notificação direta enviada com sucesso." }
    }
  }
)
