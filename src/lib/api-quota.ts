// src/lib/api-quota.ts
import { db } from "@/db"
import { apiQuotas, type ApiQuota } from "@/db/schema"
import { eq, sql } from "drizzle-orm"

/**
 * 扣减配额
 * 优先扣减免费额度，不足时扣减付费额度
 * @param userId 用户 ID（可选）
 * @param apiKeyId API Key ID（可选，当 userId 为空时使用）
 */
export async function decrementQuota(userId?: string, apiKeyId?: string): Promise<{
  success: boolean
  quota?: ApiQuota
  error?: string
}> {
  if (!db) {
    return { success: false, error: "数据库不可用" }
  }

  // 根据 userId 或 apiKeyId 查询配额
  const quotaRecord = userId
    ? await db.select().from(apiQuotas).where(eq(apiQuotas.userId, userId)).limit(1)
    : apiKeyId
    ? await db.select().from(apiQuotas).where(eq(apiQuotas.apiKeyId, apiKeyId)).limit(1)
    : []

  if (quotaRecord.length === 0) {
    return { success: false, error: "配额记录不存在" }
  }

  const quota = quotaRecord[0]

  // 优先扣免费额度
  if (quota.usedFree < quota.freeLimit) {
    const [updated] = await db.update(apiQuotas)
      .set({
        usedFree: quota.usedFree + 1,
        updatedAt: new Date(),
      })
      .where(eq(apiQuotas.id, quota.id))
      .returning()

    return { success: true, quota: updated }
  }

  // 扣付费额度
  if (quota.usedPaid < quota.paidLimit) {
    const [updated] = await db.update(apiQuotas)
      .set({
        usedPaid: quota.usedPaid + 1,
        updatedAt: new Date(),
      })
      .where(eq(apiQuotas.id, quota.id))
      .returning()

    return { success: true, quota: updated }
  }

  return { success: false, error: "QUOTA_EXCEEDED", quota }
}

/**
 * 获取用户配额
 */
export async function getUserQuota(userId: string): Promise<ApiQuota | null> {
  if (!db) return null

  const quota = await db.select().from(apiQuotas).where(eq(apiQuotas.userId, userId)).limit(1)
  return quota[0] || null
}

/**
 * 计算剩余配额
 */
export function calculateRemainingQuota(quota: ApiQuota): {
  free: number
  paid: number
  total: number
} {
  const free = Math.max(0, quota.freeLimit - quota.usedFree)
  const paid = Math.max(0, quota.paidLimit - quota.usedPaid)
  return { free, paid, total: free + paid }
}

/**
 * 增加付费额度
 */
export async function addPaidQuota(userId: string, amount: number): Promise<ApiQuota | null> {
  if (!db) return null

  const [updated] = await db.update(apiQuotas)
    .set({
      paidLimit: sql`${apiQuotas.paidLimit} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(apiQuotas.userId, userId))
    .returning()

  return updated || null
}