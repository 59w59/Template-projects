import { NextResponse } from "next/server"

export const CacheStrategy = {
  noStore: "no-store, no-cache, must-revalidate, proxy-revalidate",
  private: "private, no-cache, no-store, must-revalidate",
  static: (seconds = 31536000) => `public, max-age=${seconds}, immutable`,
  revalidate: (seconds = 60, staleSeconds = 600) => `public, s-maxage=${seconds}, stale-while-revalidate=${staleSeconds}`,
}

export function setCacheHeader(response: NextResponse, strategy: string): NextResponse {
  response.headers.set("Cache-Control", strategy)
  return response
}

export function withNoCache(response: NextResponse): NextResponse {
  return setCacheHeader(response, CacheStrategy.noStore)
}

export function withStaticCache(response: NextResponse, seconds?: number): NextResponse {
  return setCacheHeader(response, CacheStrategy.static(seconds))
}

export function withRevalidateCache(response: NextResponse, seconds?: number, staleSeconds?: number): NextResponse {
  return setCacheHeader(response, CacheStrategy.revalidate(seconds, staleSeconds))
}
