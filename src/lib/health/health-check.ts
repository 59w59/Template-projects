import os from "os"
import { sql } from "drizzle-orm"
import { getDrizzleDb, databaseType } from "../db/connection"
import { connectToMongoDB } from "../db/mongodb"
import { redisClient } from "../services/redis"
import { s3Client } from "../services/s3"

export interface HealthStatus {
  status: "healthy" | "unhealthy"
  timestamp: string
  database: {
    status: "healthy" | "unhealthy"
    type: string
    latencyMs?: number
    error?: string
  }
  redis: {
    status: "healthy" | "unhealthy" | "disabled"
  }
  storage: {
    status: "healthy" | "disabled"
  }
  system: {
    freeMemoryBytes: number
    totalMemoryBytes: number
    memoryUsagePercent: number
    cpuLoadAverage: number[]
    uptimeSeconds: number
  }
}

export async function runHealthCheck(): Promise<HealthStatus> {
  let databaseStatus: "healthy" | "unhealthy" = "healthy"
  let databaseError: string | undefined
  let dbLatency = 0

  try {
    const dbStart = Date.now()
    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      await db.command({ ping: 1 })
    } else {
      const db = getDrizzleDb() as any
      await db.execute(sql`SELECT 1`)
    }
    dbLatency = Date.now() - dbStart
  } catch (err: any) {
    databaseStatus = "unhealthy"
    databaseError = err.message || String(err)
  }

  let redisStatus: "healthy" | "unhealthy" | "disabled" = "disabled"
  if (redisClient) {
    try {
      await redisClient.ping()
      redisStatus = "healthy"
    } catch {
      redisStatus = "unhealthy"
    }
  }

  const storageStatus = s3Client ? "healthy" : "disabled"

  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const memoryUsagePercent = parseFloat(((usedMem / totalMem) * 100).toFixed(2))

  const system = {
    freeMemoryBytes: freeMem,
    totalMemoryBytes: totalMem,
    memoryUsagePercent,
    cpuLoadAverage: os.loadavg(),
    uptimeSeconds: Math.floor(os.uptime()),
  }

  const status = databaseStatus === "healthy" ? "healthy" : "unhealthy"

  return {
    status,
    timestamp: new Date().toISOString(),
    database: {
      status: databaseStatus,
      type: databaseType,
      latencyMs: databaseStatus === "healthy" ? dbLatency : undefined,
      error: databaseError,
    },
    redis: {
      status: redisStatus,
    },
    storage: {
      status: storageStatus,
    },
    system,
  }
}
export async function getQuickDatabaseHealth(): Promise<"healthy" | "unhealthy"> {
  try {
    if (databaseType === "mongodb") {
      const db = await connectToMongoDB()
      await db.command({ ping: 1 })
    } else {
      const db = getDrizzleDb() as any
      await db.execute(sql`SELECT 1`)
    }
    return "healthy"
  } catch {
    return "unhealthy"
  }
}
