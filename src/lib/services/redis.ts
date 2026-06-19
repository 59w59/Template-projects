import { Redis } from "@upstash/redis"
import { getSystemSettings } from "../settings/system-settings"

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

export const redisClient =
  redisUrl && redisToken
    ? new Redis({
        url: redisUrl,
        token: redisToken,
      })
    : null

export async function getRedisClient(): Promise<Redis | null> {
  const settings = await getSystemSettings()
  const url = settings.redisUrl || redisUrl
  const token = settings.redisToken || redisToken

  if (url && token) {
    return new Redis({
      url,
      token,
    })
  }
  return null
}
