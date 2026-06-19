import { drizzle } from "drizzle-orm/libsql"
import { createClient } from "@libsql/client"
import * as schema from "../schemas/db-sqlite"

const url = process.env.DATABASE_URL || "file:local.db"
const authToken = process.env.DATABASE_AUTH_TOKEN

export const sqliteClient = createClient({ url, authToken })
export const sqliteDb = drizzle(sqliteClient, { schema })
