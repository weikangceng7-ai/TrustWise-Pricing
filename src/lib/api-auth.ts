// src/lib/api-auth.ts
import { nanoid } from "nanoid"
import { db } from "@/db"
import { apiKeys, apiQuotas, type ApiKey, type ApiQuota } from "@/db/schema"
import { eq, and } from "drizzle-orm"

const API_KEY_PREFIX = "sk_"
const API_KEY_LENGTH = 32

/**
 * 生成新的 API Key
 */
export function generateApiKey(): string {
  return `${API_KEY_PREFIX}${nanoid(API_KEY_LENGTH)}`
}

/**
 * 创建新的 API Key 记录
 * @param name Key 名称
 * @param userId 用户 ID（可选，MCP 测试 Key 可为空）
 */
export async function createApiKey(name: string, userId?: string): Promise<ApiKey> {
  if (!db) {
    throw new Error("数据库不可用")
  }

  // 有 userId 时检查数量限制
  if (userId) {
    const existingKeys = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId))
    if (existingKeys.length >= 5) {
      throw new Error("API Key 数量已达上限（最多 5 个）")
    }
  }

  const key = generateApiKey()
  const id = nanoid(16)

  const [apiKey] = await db.insert(apiKeys).values({
    id,
    userId: userId || null,
    key,
    name,
    isActive: true,
    createdAt: new Date(),
  }).returning()

  // 有 userId 时确保配额记录
  if (userId) {
    await ensureUserQuota(userId)
  } else {
    // 无用户关联的 Key（MCP 测试用）创建独立配额
    await ensurePublicApiKeyQuota(apiKey.id)
  }

  return apiKey
}

/**
 * 确保用户有配额记录
 */
async function ensureUserQuota(userId: string): Promise<void> {
  if (!db) return

  const existing = await db.select().from(apiQuotas).where(eq(apiQuotas.userId, userId)).limit(1)

  if (existing.length === 0) {
    // 计算下月 1 日作为重置时间
    const now = new Date()
    const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    await db.insert(apiQuotas).values({
      userId,
      freeLimit: 1000,
      usedFree: 0,
      paidLimit: 0,
      usedPaid: 0,
      resetAt,
    })
  }
}

/**
 * 确保公开 API Key 有配额记录（按 apiKeyId 关联）
 */
async function ensurePublicApiKeyQuota(apiKeyId: string): Promise<void> {
  if (!db) return

  const existing = await db.select().from(apiQuotas).where(eq(apiQuotas.apiKeyId, apiKeyId)).limit(1)

  if (existing.length === 0) {
    const now = new Date()
    const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    await db.insert(apiQuotas).values({
      apiKeyId,
      freeLimit: 10000,
      usedFree: 0,
      paidLimit: 0,
      usedPaid: 0,
      resetAt,
    })
  }
}

/**
 * 验证 API Key
 */
export async function validateApiKey(key: string): Promise<{
  valid: boolean
  apiKey?: ApiKey
  quota?: ApiQuota
  error?: string
}> {
  if (!db) {
    return { valid: false, error: "数据库不可用" }
  }

  if (!key || !key.startsWith(API_KEY_PREFIX)) {
    return { valid: false, error: "INVALID_API_KEY" }
  }

  const apiKeyRecord = await db.select().from(apiKeys).where(eq(apiKeys.key, key)).limit(1)

  if (apiKeyRecord.length === 0) {
    return { valid: false, error: "INVALID_API_KEY" }
  }

  const apiKey = apiKeyRecord[0]

  if (!apiKey.isActive) {
    return { valid: false, error: "API_KEY_DISABLED" }
  }

  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
    return { valid: false, error: "API_KEY_EXPIRED" }
  }

  // 获取配额（有 userId 按 userId 查，否则按 apiKeyId 查）
  const quotaRecord = apiKey.userId
    ? await db.select().from(apiQuotas).where(eq(apiQuotas.userId, apiKey.userId)).limit(1)
    : await db.select().from(apiQuotas).where(eq(apiQuotas.apiKeyId, apiKey.id)).limit(1)
  const quota = quotaRecord[0]

  if (!quota) {
    return { valid: false, error: "配额记录不存在" }
  }

  // 检查配额是否需要重置
  await checkAndResetQuota(quota)

  // 检查配额是否充足
  const freeRemaining = quota.freeLimit - quota.usedFree
  const paidRemaining = quota.paidLimit - quota.usedPaid

  if (freeRemaining <= 0 && paidRemaining <= 0) {
    return {
      valid: false,
      error: "QUOTA_EXCEEDED",
      apiKey,
      quota
    }
  }

  return { valid: true, apiKey, quota }
}

/**
 * 检查并重置配额
 */
async function checkAndResetQuota(quota: ApiQuota): Promise<void> {
  if (!db) return

  const now = new Date()
  if (now >= quota.resetAt) {
    // 计算下月 1 日
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    await db.update(apiQuotas)
      .set({
        usedFree: 0,
        resetAt: nextReset,
        updatedAt: now,
      })
      .where(eq(apiQuotas.id, quota.id))
  }
}

/**
 * 更新 API Key 最后使用时间
 */
export async function updateApiKeyLastUsed(keyId: string): Promise<void> {
  if (!db) return

  await db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyId))
}

/**
 * 获取用户的所有 API Keys
 */
export async function getUserApiKeys(userId: string): Promise<ApiKey[]> {
  if (!db) return []

  return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId))
}

/**
 * 删除 API Key
 * @param keyId Key ID
 * @param userId 用户 ID（可选，用于权限校验）
 */
export async function deleteApiKey(keyId: string, userId?: string): Promise<boolean> {
  if (!db) return false

  // 有 userId 时校验归属
  if (userId) {
    const result = await db.delete(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
      .returning()
    return result.length > 0
  }

  // 无 userId 时直接删除（公开 Key）
  const result = await db.delete(apiKeys)
    .where(eq(apiKeys.id, keyId))
    .returning()
  return result.length > 0
}

/**
 * 重置 API Key（生成新 Key 值）
 * @param keyId Key ID
 * @param userId 用户 ID（可选，用于权限校验）
 */
export async function resetApiKey(keyId: string, userId?: string): Promise<ApiKey | null> {
  if (!db) return null

  const newKey = generateApiKey()

  if (userId) {
    const [updated] = await db.update(apiKeys)
      .set({ key: newKey })
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
      .returning()
    return updated || null
  }

  const [updated] = await db.update(apiKeys)
    .set({ key: newKey })
    .where(eq(apiKeys.id, keyId))
    .returning()
  return updated || null
}