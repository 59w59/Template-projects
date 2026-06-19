import { drizzle } from "drizzle-orm/mysql2"
import mysql from "mysql2/promise"
import * as schema from "../schemas/db-mysql"

const connectionString = process.env.DATABASE_URL || "mysql://root:password@localhost:3306/mysql"

const pool = mysql.createPool({
  uri: connectionString,
  connectionLimit: 10,
})

export const mysqlPool = pool
export const mysqlDb = drizzle(pool, { schema, mode: "default" })
