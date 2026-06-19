import { defineHandler } from "@/lib/api/api-handler"
import { getDrizzleDb, databaseType } from "@/lib/db/connection"
import { connectToMongoDB } from "@/lib/db/mongodb"
import { eq } from "drizzle-orm"
import * as sqliteSchema from "@/lib/schemas/db-sqlite"
import * as pgSchema from "@/lib/schemas/db-postgres"
import * as mysqlSchema from "@/lib/schemas/db-mysql"

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

export const GET = defineHandler(
  { requireAuth: true },
  async ({ user }) => {
    let userRecord: any = null

    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      userRecord = await db.collection("users").findOne({ id: user.userId })
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      const result = await db
        .select()
        .from(tables.users)
        .where(eq(tables.users.id, user.userId))
        .limit(1)
      userRecord = result[0] || null
    }

    if (!userRecord) {
      return { user: null }
    }

    const emailVerified = typeof userRecord.emailVerified === "number" ? userRecord.emailVerified === 1 : userRecord.emailVerified
    const twoFactorEnabled = typeof userRecord.twoFactorEnabled === "number" ? userRecord.twoFactorEnabled === 1 : userRecord.twoFactorEnabled

    return {
      user: {
        id: userRecord.id,
        email: userRecord.email,
        role: userRecord.role,
        emailVerified,
        twoFactorEnabled,
        createdAt: userRecord.createdAt,
      },
    }
  }
)
