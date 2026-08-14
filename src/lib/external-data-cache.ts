/**
 * 外部数据缓存层
 *
 * 复用项目现有 Redis（src/lib/redis.ts 的 getRedis），存储「上次成功值」用于降级链兜底：
 * - 新鲜缓存（TTL 内）直接命中，跳过外部 API 调用
 * - 过期缓存作为「最后可用值」兜底，避免静默降级到模拟数据
 *
 * 无 REDIS_URL 时优雅降级：get 返回 null，set 为 no-op，不影响主流程。
 */

import { getRedis } from "@/lib/redis"

const KEY_PREFIX = "external-data:"

export interface CacheEntry<T> {
  data: T
  /** 写入时间戳（毫秒） */
  cachedAt: number
  /** 新鲜期时长（秒），超过即视为 stale */
  freshTtlSeconds: number
}

/** 缓存是否仍在新鲜期内 */
export function isCacheFresh(entry: CacheEntry<unknown>): boolean {
  return Date.now() - entry.cachedAt < entry.freshTtlSeconds * 1000
}

export async function getExternalDataCache<T>(key: string): Promise<CacheEntry<T> | null> {
  const redis = getRedis()
  if (!redis) return null

  try {
    const raw = await redis.get(KEY_PREFIX + key)
    if (!raw) return null
    return JSON.parse(raw) as CacheEntry<T>
  } catch (error) {
    console.error("读取外部数据缓存失败:", error)
    return null
  }
}

export async function setExternalDataCache<T>(
  key: string,
  data: T,
  freshTtlSeconds: number
): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  const entry: CacheEntry<T> = {
    data,
    cachedAt: Date.now(),
    freshTtlSeconds,
  }

  // Redis TTL 设为新鲜期的 24 倍，保留过期值用于降级兜底（最多保留一天）
  const staleTtlSeconds = Math.max(freshTtlSeconds * 24, 3600)

  redis
    .set(KEY_PREFIX + key, JSON.stringify(entry), "EX", staleTtlSeconds)
    .catch((error) => {
      console.error("写入外部数据缓存失败:", error)
    })
}
