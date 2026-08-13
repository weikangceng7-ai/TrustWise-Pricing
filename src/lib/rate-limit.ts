// src/lib/rate-limit.ts
/**
 * 基于 API Key 的请求频率限制
 * Redis 模式：多实例部署，Key 前缀 rl:
 * 内存模式：单实例部署（fallback）
 */
import type Redis from "ioredis"
import { getRedis } from "./redis"

const RATE_LIMIT_CONFIG = {
  requestsPerMinute: 100,
  windowMs: 60 * 1000,
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter: number
}

// ====== Redis 实现（滑动窗口计数器） ======

async function checkRateLimitRedis(redis: Redis, apiKeyId: string): Promise<RateLimitResult> {
  const now = Date.now()
  const windowSeconds = Math.ceil(RATE_LIMIT_CONFIG.windowMs / 1000)
  const key = `rl:${apiKeyId}`

  try {
    const current = await redis.get(key)
    const count = current ? parseInt(current, 10) : 0

    if (count >= RATE_LIMIT_CONFIG.requestsPerMinute) {
      const ttl = await redis.ttl(key)
      const retryAfter = ttl > 0 ? ttl : 1
      return {
        allowed: false,
        limit: RATE_LIMIT_CONFIG.requestsPerMinute,
        remaining: 0,
        resetTime: Math.floor((now + retryAfter * 1000) / 1000),
        retryAfter,
      }
    }

    // INCR + 设置过期（首次）
    const newCount = await redis.incr(key)
    if (newCount === 1) {
      await redis.expire(key, windowSeconds)
    }

    return {
      allowed: true,
      limit: RATE_LIMIT_CONFIG.requestsPerMinute,
      remaining: RATE_LIMIT_CONFIG.requestsPerMinute - newCount,
      resetTime: Math.floor((now + RATE_LIMIT_CONFIG.windowMs) / 1000),
      retryAfter: 0,
    }
  } catch (error) {
    console.error("[RateLimit Redis] Error, falling back to allow:", error)
    return {
      allowed: true,
      limit: RATE_LIMIT_CONFIG.requestsPerMinute,
      remaining: RATE_LIMIT_CONFIG.requestsPerMinute - 1,
      resetTime: Math.floor((now + RATE_LIMIT_CONFIG.windowMs) / 1000),
      retryAfter: 0,
    }
  }
}

// ====== 内存实现（fallback） ======

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

function cleanupExpiredEntries(now: number) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

function checkRateLimitMemory(apiKeyId: string): RateLimitResult {
  const now = Date.now()
  cleanupExpiredEntries(now)
  const entry = rateLimitStore.get(apiKeyId)

  if (!entry || now > entry.resetTime) {
    const resetTime = now + RATE_LIMIT_CONFIG.windowMs
    rateLimitStore.set(apiKeyId, { count: 1, resetTime })
    return {
      allowed: true,
      limit: RATE_LIMIT_CONFIG.requestsPerMinute,
      remaining: RATE_LIMIT_CONFIG.requestsPerMinute - 1,
      resetTime: Math.floor(resetTime / 1000),
      retryAfter: 0,
    }
  }

  if (entry.count >= RATE_LIMIT_CONFIG.requestsPerMinute) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return {
      allowed: false,
      limit: RATE_LIMIT_CONFIG.requestsPerMinute,
      remaining: 0,
      resetTime: Math.floor(entry.resetTime / 1000),
      retryAfter,
    }
  }

  entry.count++
  rateLimitStore.set(apiKeyId, entry)

  return {
    allowed: true,
    limit: RATE_LIMIT_CONFIG.requestsPerMinute,
    remaining: RATE_LIMIT_CONFIG.requestsPerMinute - entry.count,
    resetTime: Math.floor(entry.resetTime / 1000),
    retryAfter: 0,
  }
}

// ====== 统一入口 ======

export async function checkRateLimit(apiKeyId: string): Promise<RateLimitResult> {
  const redis = getRedis()
  if (redis) {
    return checkRateLimitRedis(redis, apiKeyId)
  }
  return checkRateLimitMemory(apiKeyId)
}

export function getRateLimitConfig() {
  return {
    requestsPerMinute: RATE_LIMIT_CONFIG.requestsPerMinute,
    windowMs: RATE_LIMIT_CONFIG.windowMs,
  }
}
