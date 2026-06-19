import { getDrizzleDb, databaseType } from "./connection"
import { connectToMongoDB } from "./mongodb"
import * as sqliteSchema from "../schemas/db-sqlite"
import * as pgSchema from "../schemas/db-postgres"
import * as mysqlSchema from "../schemas/db-mysql"

function getTables() {
  if (databaseType === "sqlite") return sqliteSchema
  if (databaseType === "postgres") return pgSchema
  if (databaseType === "mysql") return mysqlSchema
  throw new Error("No Drizzle tables for MongoDB")
}

export async function generateDatabaseBackup(): Promise<string> {
  const backupData: Record<string, any> = {
    timestamp: new Date().toISOString(),
    databaseType,
    tables: {},
  }

  const collections = [
    "users",
    "sessions",
    "audit_logs",
    "organizations",
    "organization_members",
    "organization_invitations",
    "subscriptions",
    "stored_files",
    "notifications",
  ]

  if (databaseType === "mongodb") {
    const db = await connectToMongoDB()
    for (const collName of collections) {
      const docs = await db.collection(collName).find({}).toArray()
      backupData.tables[collName] = docs
    }
  } else {
    const db = getDrizzleDb() as any
    const tables = getTables() as Record<string, any>

    const mapping: Record<string, any> = {
      users: tables.users,
      sessions: tables.sessions,
      audit_logs: tables.auditLogs,
      organizations: tables.organizations,
      organization_members: tables.organizationMembers,
      organization_invitations: tables.organizationInvitations,
      subscriptions: tables.subscriptions,
      stored_files: tables.storedFiles,
      notifications: tables.notifications,
    }

    for (const key of collections) {
      const tableObj = mapping[key]
      if (tableObj) {
        try {
          const records = await db.select().from(tableObj)
          backupData.tables[key] = records
        } catch {
          backupData.tables[key] = []
        }
      }
    }
  }

  return JSON.stringify(backupData, null, 2)
}
