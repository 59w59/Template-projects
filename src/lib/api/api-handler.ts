import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { logger } from "../logger/logger"
import { isRateLimited } from "../rate-limit/rate-limiter"
import { verifyAccessToken, verifyCSRFToken } from "../auth/auth"
import { getQuickDatabaseHealth } from "../health/health-check"
import { sanitizePayload } from "../security/sanitizer"
import { getSystemSettings, addIPToBlocklist } from "../settings/system-settings"
import os from "os"

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
    this.name = "HttpError"
  }
}

interface HandlerConfig<TBody extends z.ZodTypeAny = z.ZodTypeAny> {
  schema?: TBody
  requireAuth?: boolean
  requireRole?: string[]
  rateLimit?: { windowMs: number; max: number }
  csrfCheck?: boolean
}

type HandlerContext<TBody extends z.ZodTypeAny = z.ZodTypeAny> = {
  body: z.infer<TBody>
  user: any | null
  req: NextRequest
  params: any
}

export function defineHandler<TBody extends z.ZodTypeAny = z.ZodTypeAny>(
  config: HandlerConfig<TBody>,
  handler: (ctx: HandlerContext<TBody>) => Promise<NextResponse | any>
) {
  return async (req: NextRequest, { params }: { params: any }): Promise<NextResponse> => {
    const startTime = Date.now()
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "127.0.0.1"
    const path = req.nextUrl.pathname

    let dbHealth: "healthy" | "unhealthy" = "healthy"
    let response: NextResponse

    try {
      const settings = await getSystemSettings()
      if (settings.blockedIPs.includes(ip)) {
        throw new HttpError(403, "Acesso negado: seu IP está bloqueado.")
      }

      const contentLength = parseInt(req.headers.get("content-length") || "0")
      if (contentLength > 1024 * 1024 && !path.includes("/api/storage/upload")) {
        throw new HttpError(413, "Payload Too Large")
      }

      dbHealth = await getQuickDatabaseHealth()

      const rateLimitMax = settings.rateLimitMax || config.rateLimit?.max || 100
      const rateLimitWindow = settings.rateLimitWindow || config.rateLimit?.windowMs || 60000

      if (config.rateLimit || path.startsWith("/api")) {
        const limited = await isRateLimited(ip, { windowMs: rateLimitWindow, max: rateLimitMax })
        if (limited) {
          if (settings.autoPunish) {
            await addIPToBlocklist(ip)
            logger.warn(`IP ${ip} banido automaticamente após exceder rate limit`)
          }
          throw new HttpError(429, "Limite de requisições excedido. Seu IP foi bloqueado temporariamente.")
        }
      }

      if (config.csrfCheck) {
        const csrfTokenHeader = req.headers.get("x-csrf-token") || ""
        const csrfValid = await verifyCSRFToken(csrfTokenHeader)
        if (!csrfValid) {
          throw new HttpError(403, "Invalid CSRF Token")
        }
      }

      let user = null
      const authHeader = req.headers.get("authorization")
      let token = ""
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7)
      } else {
        token = req.cookies.get("access_token")?.value || ""
      }

      if (token) {
        user = await verifyAccessToken(token)
      }

      if (settings.maintenanceMode) {
        const isApiAdmin = path.startsWith("/api/admin")
        const isAdminUser = user && user.role === "admin"
        if (!isAdminUser && !isApiAdmin && path !== "/api/auth/login" && path !== "/api/auth/me") {
          throw new HttpError(503, settings.maintenanceMessage)
        }
      }

      if (settings.disableRegistrations && path === "/api/auth/register") {
        throw new HttpError(400, "Os novos cadastros estão temporariamente desativados.")
      }

      if (config.requireAuth && !user) {
        throw new HttpError(401, "Unauthorized")
      }

      if (config.requireAuth && user && config.requireRole) {
        if (!config.requireRole.includes(user.role)) {
          throw new HttpError(403, "Forbidden")
        }
      }

      let body: any = null
      if (config.schema) {
        if (req.method === "GET") {
          const queryParams = Object.fromEntries(req.nextUrl.searchParams.entries())
          const sanitizedQuery = sanitizePayload(queryParams)
          const parsed = config.schema.safeParse(sanitizedQuery)
          if (!parsed.success) {
            throw new HttpError(400, JSON.stringify(parsed.error.flatten().fieldErrors))
          }
          body = parsed.data
        } else {
          let rawBody = {}
          try {
            rawBody = await req.json()
          } catch (err) {
            throw new HttpError(400, "Invalid JSON payload")
          }
          const sanitizedBody = sanitizePayload(rawBody)
          const parsed = config.schema.safeParse(sanitizedBody)
          if (!parsed.success) {
            throw new HttpError(400, JSON.stringify(parsed.error.flatten().fieldErrors))
          }
          body = parsed.data
        }
      }

      const result = await handler({ body, user, req, params })
      if (result instanceof NextResponse) {
        response = result
      } else {
        response = NextResponse.json({ success: true, data: result }, { status: 200 })
      }
    } catch (err: any) {
      if (err instanceof HttpError) {
        logger.warn(`API HTTP Error ${err.statusCode} on ${path}: ${err.message}`)
        response = NextResponse.json(
          { success: false, error: err.message, status: err.statusCode },
          { status: err.statusCode }
        )
      } else {
        logger.error(`API Unhandled Error on ${path}:`, err)
        response = NextResponse.json(
          { success: false, error: "Internal Server Error", status: 500 },
          { status: 500 }
        )
      }
    }

    const latency = Date.now() - startTime
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const systemLoad = `${(((totalMem - freeMem) / totalMem) * 100).toFixed(0)}%`

    response.headers.set("x-response-time", `${latency}ms`)
    response.headers.set("x-database-health", dbHealth)
    response.headers.set("x-system-load", systemLoad)

    logger.info(
      `API ${req.method} ${path} - Status: ${response.status} - Latency: ${latency}ms - DB: ${dbHealth} - OS Mem: ${systemLoad}`
    )

    return response
  }
}
