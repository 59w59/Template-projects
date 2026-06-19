import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "../schemas/db-postgres"

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres"

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
})

export const pgClient = client
export const pgDb = drizzle(client, { schema })
