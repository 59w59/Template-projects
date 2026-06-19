import { NextRequest, NextResponse } from "next/server"
import { validateAndRotateSession, clearAuthCookies } from "@/lib/auth/auth"
import { getClientIp } from "@/lib/rate-limit/rate-limiter"

export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers)
  const ua = req.headers.get("user-agent") || "unknown"

  const searchParams = req.nextUrl.searchParams
  const redirectPath = searchParams.get("redirect") || "/dashboard"

  const refreshToken = req.cookies.get("refresh_token")?.value

  if (!refreshToken) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  const result = await validateAndRotateSession(refreshToken, ip, ua)

  if (!result) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("status", "401")
    url.searchParams.set("message", "Sessão expirada. Faça login novamente.")
    const response = NextResponse.redirect(url)
    
    response.cookies.set("access_token", "", { maxAge: 0, path: "/" })
    response.cookies.set("refresh_token", "", { maxAge: 0, path: "/" })
    return response
  }

  const url = req.nextUrl.clone()
  url.pathname = redirectPath
  url.searchParams.delete("redirect")

  const response = NextResponse.redirect(url)
  const isProd = process.env.NODE_ENV === "production"

  response.cookies.set("access_token", result.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 15 * 60,
    path: "/",
  })
  response.cookies.set("refresh_token", result.newRefreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  })

  return response
}
