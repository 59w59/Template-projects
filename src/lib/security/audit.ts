import { getDrizzleDb, databaseType } from "../db/connection"
import { connectToMongoDB } from "../db/mongodb"
import * as sqliteSchema from "../schemas/db-sqlite"
import * as pgSchema from "../schemas/db-postgres"
import * as mysqlSchema from "../schemas/db-mysql"
import { generateSecureToken } from "../utils"

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

export async function writeAuditLog(
  userId: string | null,
  action: string,
  status: string,
  ipAddress: string,
  userAgent: string,
  details?: string
): Promise<void> {
  const id = generateSecureToken()

  try {
    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      await db.collection("audit_logs").insertOne({
        id,
        userId,
        action,
        status,
        ipAddress,
        userAgent,
        details,
        createdAt: new Date(),
      })
    } else {
      const db = getDrizzleDb() as any
      const tables = getTables()
      await db.insert(tables.auditLogs).values({
        id,
        userId,
        action,
        status,
        ipAddress,
        userAgent,
        details,
      })
    }
  } catch (err) {
    // Fail silently to prevent throwing on critical paths, but log it
    console.error("Failed to write audit log:", err)
  }
}
