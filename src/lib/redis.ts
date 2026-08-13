// src/lib/redis.ts
import Redis from "ioredis"

let redis: Redis | null = null

export function getRedis(): Redis | null {
  if (redis) return redis
  if (!process.env.REDIS_URL) return null

  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null
        return Math.min(times * 200, 1000)
      },
      lazyConnect: true,
    })

    // 后台连接，不阻塞
    redis.connect().catch(() => {
      redis = null
    })
  } catch {
    redis = null
  }

  return redis
}
