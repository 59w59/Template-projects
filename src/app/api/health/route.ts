import { NextResponse } from "next/server"
import { runHealthCheck } from "@/lib/health/health-check"
import os from "os"

export async function GET() {
  const startTime = Date.now()
  const status = await runHealthCheck()

  const latency = Date.now() - startTime
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const systemLoad = `${(((totalMem - freeMem) / totalMem) * 100).toFixed(0)}%`

  const httpStatus = status.status === "healthy" ? 200 : 503
  const response = NextResponse.json(status, { status: httpStatus })

  response.headers.set("x-response-time", `${latency}ms`)
  response.headers.set("x-database-health", status.database.status)
  response.headers.set("x-system-load", systemLoad)

  return response
}
