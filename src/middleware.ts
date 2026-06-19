import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isRateLimited, getClientIp } from "./lib/rate-limit/rate-limiter"

export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  const ip = getClientIp(request.headers)
  const path = request.nextUrl.pathname

  if (path.startsWith("/api")) {
    const limited = await isRateLimited(ip, { windowMs: 60000, max: 100 })
    if (limited) {
      return new NextResponse(JSON.stringify({ error: "Too Many Requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      })
    }
  }

  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  const nonce = btoa(String.fromCharCode(...array))

  const isDev = process.env.NODE_ENV === "development"
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    connect-src 'self';
  `.replace(/\s{2,}/g, " ").trim()

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("content-security-policy", cspHeader)

  if (path.startsWith("/dashboard")) {
    const accessToken = request.cookies.get("access_token")?.value
    const refreshToken = request.cookies.get("refresh_token")?.value

    if (!accessToken) {
      if (refreshToken) {
        const url = request.nextUrl.clone()
        url.pathname = "/api/auth/refresh"
        url.searchParams.set("redirect", path)
        return NextResponse.redirect(url)
      }
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }
  }

  let response: NextResponse
  if (path.startsWith("/api/auth/refresh")) {
    // If it's the refresh route, we let it process cookies
    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } else {
    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  const latency = Date.now() - startTime
  response.headers.set("x-middleware-time", `${latency}ms`)
  response.headers.set("Content-Security-Policy", cspHeader)
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
