// src/lib/rate-limit.ts
/**
 * 基于 API Key 的请求频率限制
 * 使用内存存储（适合单实例部署），生产环境可替换为 Redis
 */

// Rate limit 配置
const RATE_LIMIT_CONFIG = {
  // 每个 API Key 每分钟最多请求次数
  requestsPerMinute: 100,
  // 窗口时间（毫秒）
  windowMs: 60 * 1000,
}

// 内存存储：记录每个 API Key 的请求次数
interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// 定期清理过期记录（每分钟）
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 60 * 1000)

/**
 * Rate Limit 检查结果
 */
export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter: number // 需等待的秒数
}

/**
 * 检查 API Key 的请求频率
 */
export function checkRateLimit(apiKeyId: string): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(apiKeyId)

  // 如果没有记录或已过期，创建新记录
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

  // 检查是否超限
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

  // 增加计数
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

/**
 * 获取当前 Rate Limit 配置
 */
export function getRateLimitConfig() {
  return {
    requestsPerMinute: RATE_LIMIT_CONFIG.requestsPerMinute,
    windowMs: RATE_LIMIT_CONFIG.windowMs,
  }
}