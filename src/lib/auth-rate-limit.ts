// src/lib/auth-rate-limit.ts
/**
 * 认证接口频率限制（基于 IP）
 * 防止暴力破解登录/注册
 */
import type Redis from "ioredis"
import { getRedis } from "./redis"

const AUTH_RATE_LIMIT = {
  // 每个 IP 每分钟最多 5 次登录尝试
  loginPerMinute: 5,
  // 每个 IP 每分钟最多 3 次注册
  registerPerMinute: 3,
  windowSeconds: 60,
}

// 内存 fallback
const memoryStore = new Map<string, { count: number; resetTime: number }>()

function checkMemory(key: string, maxRequests: number): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  const entry = memoryStore.get(key)

  if (!entry || now > entry.resetTime) {
    memoryStore.set(key, { count: 1, resetTime: now + AUTH_RATE_LIMIT.windowSeconds * 1000 })
    return { allowed: true, retryAfter: 0 }
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetTime - now) / 1000) }
  }

  entry.count++
  return { allowed: true, retryAfter: 0 }
}

async function checkRedis(redis: Redis, key: string, maxRequests: number): Promise<{ allowed: boolean; retryAfter: number }> {
  try {
    const current = await redis.get(key)
    const count = current ? parseInt(current, 10) : 0

    if (count >= maxRequests) {
      const ttl = await redis.ttl(key)
      return { allowed: false, retryAfter: ttl > 0 ? ttl : 1 }
    }

    const newCount = await redis.incr(key)
    if (newCount === 1) {
      await redis.expire(key, AUTH_RATE_LIMIT.windowSeconds)
    }

    return { allowed: true, retryAfter: 0 }
  } catch {
    // Redis 故障时放行
    return { allowed: true, retryAfter: 0 }
  }
}

function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp
  return "127.0.0.1"
}

export async function checkAuthRateLimit(
  request: Request,
  action: "login" | "register"
): Promise<{ allowed: boolean; retryAfter: number }> {
  const ip = getClientIP(request)
  const key = `auth:${action}:${ip}`
  const maxRequests = action === "login"
    ? AUTH_RATE_LIMIT.loginPerMinute
    : AUTH_RATE_LIMIT.registerPerMinute

  const redis = getRedis()
  if (redis) {
    return checkRedis(redis, key, maxRequests)
  }
  return checkMemory(key, maxRequests)
}
