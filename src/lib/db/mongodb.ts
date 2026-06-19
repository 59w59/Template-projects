import { MongoClient, Db } from "mongodb"

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/template_db"

let client: MongoClient | null = null
let db: Db | null = null

export async function connectToMongoDB(): Promise<Db> {
  if (db) return db
  if (!client) {
    client = new MongoClient(uri)
    await client.connect()
  }
  db = client.db()
  return db
}

export { client as mongoClient }
