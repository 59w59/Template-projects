import { defineHandler } from "@/lib/api/api-handler"
import { clearAuthCookies } from "@/lib/auth/auth"
import { writeAuditLog } from "@/lib/security/audit"
import { getClientIp } from "@/lib/rate-limit/rate-limiter"
import * as jose from "jose"

export const POST = defineHandler(
  {},
  async ({ req }) => {
    const ip = getClientIp(req.headers)
    const ua = req.headers.get("user-agent") || "unknown"

    const accessToken = req.cookies.get("access_token")?.value

    if (accessToken) {
      try {
        const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-jwt-secret-key-at-least-32-chars-long")
        const { payload } = await jose.jwtVerify(accessToken, JWT_SECRET)
        const userId = (payload as any).userId
        await writeAuditLog(userId, "USER_LOGOUT", "success", ip, ua, "User logged out")
      } catch {
        // Ignore JWT verification errors on logout
      }
    }

    await clearAuthCookies()
    return { success: true }
  }
)
export const GET = POST
