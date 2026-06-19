import { logger } from "../logger/logger"

interface RateLimitConfig {
  windowMs: number
  max: number
}

const memoryStore = new Map<string, number[]>()

if (typeof window === "undefined") {
  const interval = setInterval(() => {
    const now = Date.now()
    for (const [ip, timestamps] of memoryStore.entries()) {
      const validTimestamps = timestamps.filter((t) => now - t < 5 * 60 * 1000)
      if (validTimestamps.length === 0) {
        memoryStore.delete(ip)
      } else {
        memoryStore.set(ip, validTimestamps)
      }
    }
  }, 5 * 60 * 1000)
  
  if (interval.unref) {
    interval.unref()
  }
}

export function getClientIp(headersList: Headers): string {
  const xForwardedFor = headersList.get("x-forwarded-for")
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim()
  }
  return headersList.get("x-real-ip") || "127.0.0.1"
}

export async function isRateLimited(ip: string, config: RateLimitConfig): Promise<boolean> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (redisUrl && redisToken) {
    try {
      const { redisClient } = await import("../services/redis")
      if (redisClient) {
        const key = `ratelimit:${ip}`
        const now = Date.now()
        const clearBefore = now - config.windowMs
        
        await redisClient.zremrangebyscore(key, 0, clearBefore)
        const activeCount = await redisClient.zcard(key)
        
        if (activeCount >= config.max) {
          return true
        }
        
        await redisClient.zadd(key, { score: now, member: `${now}-${Math.random()}` })
        await redisClient.expire(key, Math.ceil(config.windowMs / 1000))
        return false
      }
    } catch (err: any) {
      logger.warn("Redis rate limiter failed, falling back to in-memory", undefined, err as Error)
    }
  }

  const now = Date.now()
  const clearBefore = now - config.windowMs
  let timestamps = memoryStore.get(ip) || []
  timestamps = timestamps.filter((t) => t > clearBefore)
  
  if (timestamps.length >= config.max) {
    memoryStore.set(ip, timestamps)
    return true
  }
  
  timestamps.push(now)
  memoryStore.set(ip, timestamps)
  return false
}

export type { RateLimitConfig }
