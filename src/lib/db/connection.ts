import { sqliteDb } from "./sqlite"
import { pgDb } from "./postgres"
import { mysqlDb } from "./mysql"
import { connectToMongoDB } from "./mongodb"
import { logger } from "../logger/logger"
import path from "path"

export const databaseType = (process.env.DATABASE_TYPE || "sqlite") as "sqlite" | "postgres" | "mysql" | "mongodb"

export function getDrizzleDb() {
  if (databaseType === "sqlite") return sqliteDb
  if (databaseType === "postgres") return pgDb
  if (databaseType === "mysql") return mysqlDb
  throw new Error("Drizzle ORM is not configured for MongoDB. Use MongoDB native connection instead.")
}

export async function initDatabase() {
  if (databaseType === "sqlite") {
    try {
      const { migrate } = await import("drizzle-orm/libsql/migrator")
      const folder = path.join(process.cwd(), "drizzle")
      await migrate(sqliteDb, { migrationsFolder: folder })
      logger.info("Database auto-migration completed successfully (SQLite).")
    } catch (err: any) {
      logger.error("Failed to run database auto-migration:", err)
    }
  } else if (databaseType === "mongodb") {
    try {
      await connectToMongoDB()
      logger.info("Connected successfully to MongoDB.")
    } catch (err: any) {
      logger.error("Failed to connect to MongoDB:", err)
    }
  } else {
    logger.info(`Database type is set to ${databaseType}. Make sure your connection string is active and migrations are applied.`)
  }
}
