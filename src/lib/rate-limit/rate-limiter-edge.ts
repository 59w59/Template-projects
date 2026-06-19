import { Redis } from "@upstash/redis"

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null
const memoryStore = new Map<string, number[]>()

export function getClientIp(headersList: Headers): string {
  const xForwardedFor = headersList.get("x-forwarded-for")
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim()
  }
  return headersList.get("x-real-ip") || "127.0.0.1"
}

export async function isRateLimitedEdge(ip: string, config: { windowMs: number; max: number }): Promise<boolean> {
  if (redis) {
    try {
      const key = `ratelimit:${ip}`
      const now = Date.now()
      const clearBefore = now - config.windowMs
      
      await redis.zremrangebyscore(key, 0, clearBefore)
      const activeCount = await redis.zcard(key)
      if (activeCount >= config.max) {
        return true
      }
      await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` })
      await redis.expire(key, Math.ceil(config.windowMs / 1000))
      return false
    } catch {
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
