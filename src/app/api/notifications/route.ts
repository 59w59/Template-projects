import { defineHandler, HttpError } from "@/lib/api/api-handler"
import { getDrizzleDb, databaseType } from "@/lib/db/connection"
import { connectToMongoDB } from "@/lib/db/mongodb"
import { eq, and, inArray } from "drizzle-orm"
import * as sqliteSchema from "@/lib/schemas/db-sqlite"
import * as pgSchema from "@/lib/schemas/db-postgres"
import * as mysqlSchema from "@/lib/schemas/db-mysql"
import { z } from "zod"

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

const readNotificationSchema = z.object({
  notificationIds: z.array(z.string()).optional(),
  all: z.boolean().optional(),
})

export const GET = defineHandler(
  { requireAuth: true },
  async ({ user }) => {
    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      const notifications = await db
        .collection("notifications")
        .find({ userId: user.userId })
        .sort({ createdAt: -1 })
        .toArray()
      return {
        notifications: notifications.map((n) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          type: n.type,
          isRead: n.isRead,
          createdAt: n.createdAt,
        })),
      }
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      const notifications = await db
        .select()
        .from(tables.notifications)
        .where(eq(tables.notifications.userId, user.userId))
      return { notifications }
    }
  }
)

export const POST = defineHandler(
  { schema: readNotificationSchema, requireAuth: true },
  async ({ body, user }) => {
    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      if (body.all) {
        await db.collection("notifications").updateMany({ userId: user.userId }, { $set: { isRead: true } })
      } else if (body.notificationIds && body.notificationIds.length > 0) {
        await db
          .collection("notifications")
          .updateMany({ userId: user.userId, id: { $in: body.notificationIds } }, { $set: { isRead: true } })
      } else {
        throw new HttpError(400, "Forneça notificationIds ou defina all como true")
      }
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      if (body.all) {
        await db
          .update(tables.notifications)
          .set({ isRead: true })
          .where(eq(tables.notifications.userId, user.userId))
      } else if (body.notificationIds && body.notificationIds.length > 0) {
        await db
          .update(tables.notifications)
          .set({ isRead: true })
          .where(
            and(eq(tables.notifications.userId, user.userId), inArray(tables.notifications.id, body.notificationIds))
          )
      } else {
        throw new HttpError(400, "Forneça notificationIds ou defina all como true")
      }
    }

    return { success: true, message: "Notificações marcadas como lidas." }
  }
)
