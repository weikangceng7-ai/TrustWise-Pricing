/**
 * Tracker Agent 订阅管理服务
 *
 * 主要职责：
 * 1. CRUD 订阅配置
 * 2. 管理订阅激活状态
 * 3. 更新执行状态
 * 4. 计算下次执行时间
 */

import { db } from "@/db"
import {
  trackerSubscriptions,
  trackerRecords,
  trackerAlerts,
  trackerReports,
  type TrackerSubscription,
  type NewTrackerSubscription,
  type TrackerRecord,
  type NewTrackerRecord,
  type TrackerAlert,
  type NewTrackerAlert,
  type TrackerReport,
  type NewTrackerReport,
} from "@/db/schema-tracker"
import { eq, and, desc, sql, inArray } from "drizzle-orm"

// ==================== 订阅管理 ====================

/**
 * 创建订阅
 */
export async function createSubscription(
  userId: string,
  input: Omit<NewTrackerSubscription, "userId">
): Promise<TrackerSubscription | null> {
  if (!db) {
    return null
  }

  const frequency = (input.frequency || "daily") as "hourly" | "daily" | "weekly"
  const scheduleTime = input.scheduleTime ?? undefined
  const nextRunAt = calculateInitialNextRun(frequency, scheduleTime)

  const [subscription] = await db
    .insert(trackerSubscriptions)
    .values({
      userId,
      ...input,
      nextRunAt,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  return subscription
}

/**
 * 获取用户订阅列表
 */
export async function getSubscriptions(
  userId: string,
  options?: {
    activeOnly?: boolean
    limit?: number
  }
): Promise<TrackerSubscription[]> {
  if (!db) {
    return []
  }

  const { activeOnly = false, limit = 50 } = options || {}

  const conditions = [eq(trackerSubscriptions.userId, userId)]
  if (activeOnly) {
    conditions.push(eq(trackerSubscriptions.isActive, true))
  }

  return db
    .select()
    .from(trackerSubscriptions)
    .where(and(...conditions))
    .orderBy(desc(trackerSubscriptions.createdAt))
    .limit(limit)
}

/**
 * 获取单个订阅
 */
export async function getSubscription(
  subscriptionId: number,
  userId: string
): Promise<TrackerSubscription | null> {
  if (!db) {
    return null
  }

  const [subscription] = await db
    .select()
    .from(trackerSubscriptions)
    .where(and(eq(trackerSubscriptions.id, subscriptionId), eq(trackerSubscriptions.userId, userId)))
    .limit(1)

  return subscription || null
}

/**
 * 更新订阅配置
 */
export async function updateSubscription(
  subscriptionId: number,
  userId: string,
  input: Partial<Omit<NewTrackerSubscription, "userId">>
): Promise<TrackerSubscription | null> {
  if (!db) {
    return null
  }

  // 如果更新了频率或时间，重新计算下次执行时间
  const updateData: Partial<TrackerSubscription> = {
    ...input,
    updatedAt: new Date(),
  }

  if (input.frequency || input.scheduleTime) {
    const existing = await getSubscription(subscriptionId, userId)
    if (existing) {
      const frequency = (input.frequency || existing.frequency || "daily") as "hourly" | "daily" | "weekly"
      const scheduleTime = input.scheduleTime || existing.scheduleTime || "09:00"
      updateData.nextRunAt = calculateInitialNextRun(frequency, scheduleTime)
    }
  }

  const [subscription] = await db
    .update(trackerSubscriptions)
    .set(updateData)
    .where(and(eq(trackerSubscriptions.id, subscriptionId), eq(trackerSubscriptions.userId, userId)))
    .returning()

  return subscription || null
}

/**
 * 删除订阅
 */
export async function deleteSubscription(
  subscriptionId: number,
  userId: string
): Promise<boolean> {
  if (!db) {
    return false
  }

  const result = await db
    .delete(trackerSubscriptions)
    .where(and(eq(trackerSubscriptions.id, subscriptionId), eq(trackerSubscriptions.userId, userId)))
    .returning()

  return result.length > 0
}

/**
 * 激活/停用订阅
 */
export async function toggleSubscription(
  subscriptionId: number,
  userId: string,
  isActive: boolean
): Promise<TrackerSubscription | null> {
  if (!db) {
    return null
  }

  const [subscription] = await db
    .update(trackerSubscriptions)
    .set({
      isActive,
      updatedAt: new Date(),
    })
    .where(and(eq(trackerSubscriptions.id, subscriptionId), eq(trackerSubscriptions.userId, userId)))
    .returning()

  return subscription || null
}

// ==================== 活跃订阅查询 ====================

/**
 * 获取所有活跃订阅（用于调度任务）
 */
export async function getActiveSubscriptions(options?: {
  frequency?: "hourly" | "daily" | "weekly"
}): Promise<TrackerSubscription[]> {
  if (!db) {
    return []
  }

  const conditions = [eq(trackerSubscriptions.isActive, true)]
  if (options?.frequency) {
    conditions.push(eq(trackerSubscriptions.frequency, options.frequency))
  }

  return db
    .select()
    .from(trackerSubscriptions)
    .where(and(...conditions))
    .orderBy(trackerSubscriptions.nextRunAt)
}

/**
 * 获取需要执行的订阅（nextRunAt <= 当前时间）
 */
export async function getPendingSubscriptions(): Promise<TrackerSubscription[]> {
  if (!db) {
    return []
  }

  const now = new Date()

  return db
    .select()
    .from(trackerSubscriptions)
    .where(
      and(
        eq(trackerSubscriptions.isActive, true),
        sql`${trackerSubscriptions.nextRunAt} <= ${now}`
      )
    )
}

// ==================== 执行状态更新 ====================

/**
 * 更新订阅执行状态
 */
export async function updateRunStatus(
  subscriptionId: number,
  status: "success" | "failed" | "partial",
  durationMs?: number,
  errorMessage?: string
): Promise<void> {
  if (!db) {
    return
  }

  const subscription = await db
    .select()
    .from(trackerSubscriptions)
    .where(eq(trackerSubscriptions.id, subscriptionId))
    .limit(1)

  if (subscription[0]) {
    const nextRunAt = calculateNextRunTime(subscription[0])

    await db
      .update(trackerSubscriptions)
      .set({
        lastRunAt: new Date(),
        nextRunAt,
        updatedAt: new Date(),
      })
      .where(eq(trackerSubscriptions.id, subscriptionId))
  }
}

// ==================== 追踪记录管理 ====================

/**
 * 创建追踪记录
 */
export async function createRecord(
  input: NewTrackerRecord
): Promise<TrackerRecord | null> {
  if (!db) {
    return null
  }

  const [record] = await db
    .insert(trackerRecords)
    .values({
      ...input,
      createdAt: new Date(),
    })
    .returning()

  return record
}

/**
 * 获取订阅的追踪记录
 */
export async function getRecords(
  subscriptionId: number,
  options?: {
    limit?: number
    status?: "success" | "failed" | "partial"
  }
): Promise<TrackerRecord[]> {
  if (!db) {
    return []
  }

  const { limit = 30, status } = options || {}

  const conditions = [eq(trackerRecords.subscriptionId, subscriptionId)]
  if (status) {
    conditions.push(eq(trackerRecords.status, status))
  }

  return db
    .select()
    .from(trackerRecords)
    .where(and(...conditions))
    .orderBy(desc(trackerRecords.runAt))
    .limit(limit)
}

// ==================== 异动事件管理 ====================

/**
 * 创建异动事件
 */
export async function createAlert(
  input: NewTrackerAlert
): Promise<TrackerAlert | null> {
  if (!db) {
    return null
  }

  const [alert] = await db
    .insert(trackerAlerts)
    .values({
      ...input,
      createdAt: new Date(),
    })
    .returning()

  return alert
}

/**
 * 批量创建异动事件
 */
export async function createAlerts(
  inputs: NewTrackerAlert[]
): Promise<TrackerAlert[]> {
  if (!db || inputs.length === 0) {
    return []
  }

  return db.insert(trackerAlerts).values(inputs).returning()
}

/**
 * 获取异动事件列表
 */
export async function getAlerts(
  userId: string,
  options?: {
    subscriptionId?: number
    alertType?: string
    urgency?: "high" | "normal" | "low"
    isRead?: boolean
    isHandled?: boolean
    limit?: number
    offset?: number
  }
): Promise<{ alerts: TrackerAlert[]; total: number; unreadCount: number }> {
  if (!db) {
    return { alerts: [], total: 0, unreadCount: 0 }
  }

  const { limit = 20, offset = 0, ...filters } = options || {}

  // 先获取用户的订阅ID列表
  const subscriptions = await getSubscriptions(userId)
  const subscriptionIds = subscriptions.map((s) => s.id)

  if (subscriptionIds.length === 0) {
    return { alerts: [], total: 0, unreadCount: 0 }
  }

  // 构建查询条件
  const conditions: any[] = [inArray(trackerAlerts.subscriptionId, subscriptionIds)]
  if (filters.subscriptionId) {
    conditions.push(eq(trackerAlerts.subscriptionId, filters.subscriptionId))
  }
  if (filters.alertType) {
    conditions.push(eq(trackerAlerts.alertType, filters.alertType))
  }
  if (filters.urgency) {
    conditions.push(eq(trackerAlerts.urgency, filters.urgency))
  }
  if (filters.isRead !== undefined) {
    conditions.push(eq(trackerAlerts.isRead, filters.isRead))
  }
  if (filters.isHandled !== undefined) {
    conditions.push(eq(trackerAlerts.isHandled, filters.isHandled))
  }

  // 查询列表
  const alerts = await db
    .select()
    .from(trackerAlerts)
    .where(and(...conditions))
    .orderBy(desc(trackerAlerts.createdAt))
    .limit(limit)
    .offset(offset)

  // 查询总数
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(trackerAlerts)
    .where(and(...conditions))
  const total = totalResult[0]?.count || 0

  // 查询未读数
  const unreadConditions = [
    inArray(trackerAlerts.subscriptionId, subscriptionIds),
    eq(trackerAlerts.isRead, false),
  ]
  const unreadResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(trackerAlerts)
    .where(and(...unreadConditions))
  const unreadCount = unreadResult[0]?.count || 0

  return { alerts, total, unreadCount }
}

/**
 * 获取单个异动详情（通过 ID 直接查询）
 */
export async function getAlertById(
  alertId: number,
  userId: string
): Promise<TrackerAlert | null> {
  if (!db) {
    return null
  }

  const subscriptions = await getSubscriptions(userId)
  const subscriptionIds = subscriptions.map((s) => s.id)

  if (subscriptionIds.length === 0) {
    return null
  }

  const [alert] = await db
    .select()
    .from(trackerAlerts)
    .where(and(eq(trackerAlerts.id, alertId), inArray(trackerAlerts.subscriptionId, subscriptionIds)))
    .limit(1)

  return alert || null
}

/**
 * 批量标记异动已读
 */
export async function markAllAlertsAsRead(
  userId: string
): Promise<number> {
  if (!db) {
    return 0
  }

  const subscriptions = await getSubscriptions(userId)
  const subscriptionIds = subscriptions.map((s) => s.id)

  if (subscriptionIds.length === 0) {
    return 0
  }

  await db
    .update(trackerAlerts)
    .set({ isRead: true })
    .where(and(inArray(trackerAlerts.subscriptionId, subscriptionIds), eq(trackerAlerts.isRead, false)))

  // 重新查询未读数以确认更新行数
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(trackerAlerts)
    .where(and(inArray(trackerAlerts.subscriptionId, subscriptionIds), eq(trackerAlerts.isRead, false)))

  return result[0]?.count ?? 0
}

/**
 * 批量标记异动已处理
 */
export async function markAllAlertsAsHandled(
  userId: string
): Promise<number> {
  if (!db) {
    return 0
  }

  const subscriptions = await getSubscriptions(userId)
  const subscriptionIds = subscriptions.map((s) => s.id)

  if (subscriptionIds.length === 0) {
    return 0
  }

  await db
    .update(trackerAlerts)
    .set({
      isHandled: true,
      handledBy: userId,
      handledAt: new Date(),
    })
    .where(and(inArray(trackerAlerts.subscriptionId, subscriptionIds), eq(trackerAlerts.isHandled, false)))

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(trackerAlerts)
    .where(and(inArray(trackerAlerts.subscriptionId, subscriptionIds), eq(trackerAlerts.isHandled, false)))

  return result[0]?.count ?? 0
}

/**
 * 标记异动已读
 */
export async function markAlertAsRead(
  alertId: number,
  userId: string
): Promise<TrackerAlert | null> {
  if (!db) {
    return null
  }

  // 验证用户权限
  const subscriptions = await getSubscriptions(userId)
  const subscriptionIds = subscriptions.map((s) => s.id)

  const [alert] = await db
    .update(trackerAlerts)
    .set({ isRead: true })
    .where(and(eq(trackerAlerts.id, alertId), inArray(trackerAlerts.subscriptionId, subscriptionIds)))
    .returning()

  return alert || null
}

/**
 * 标记异动已处理
 */
export async function markAlertAsHandled(
  alertId: number,
  userId: string,
  handleNote?: string
): Promise<TrackerAlert | null> {
  if (!db) {
    return null
  }

  // 验证用户权限
  const subscriptions = await getSubscriptions(userId)
  const subscriptionIds = subscriptions.map((s) => s.id)

  const [alert] = await db
    .update(trackerAlerts)
    .set({
      isHandled: true,
      handledBy: userId,
      handledAt: new Date(),
      handleNote,
    })
    .where(and(eq(trackerAlerts.id, alertId), inArray(trackerAlerts.subscriptionId, subscriptionIds)))
    .returning()

  return alert || null
}

// ==================== 报告管理 ====================

/**
 * 创建报告
 */
export async function createReport(
  input: NewTrackerReport
): Promise<TrackerReport | null> {
  if (!db) {
    return null
  }

  const [report] = await db
    .insert(trackerReports)
    .values({
      ...input,
      createdAt: new Date(),
    })
    .returning()

  return report
}

/**
 * 获取订阅的报告列表
 */
export async function getReports(
  subscriptionId: number,
  options?: {
    reportType?: "daily" | "weekly" | "monthly"
    limit?: number
  }
): Promise<TrackerReport[]> {
  if (!db) {
    return []
  }

  const { limit = 10, reportType } = options || {}

  const conditions = [eq(trackerReports.subscriptionId, subscriptionId)]
  if (reportType) {
    conditions.push(eq(trackerReports.reportType, reportType))
  }

  return db
    .select()
    .from(trackerReports)
    .where(and(...conditions))
    .orderBy(desc(trackerReports.reportDate))
    .limit(limit)
}

// ==================== 统计查询 ====================

/**
 * 获取 Tracker 状态统计
 */
export async function getTrackerStatus(userId: string): Promise<{
  activeSubscriptions: number
  totalSubscriptions: number
  runningTasks: number
  recentAlerts: number
  unreadAlerts: number
  lastRunTime: Date | null
  nextScheduledRun: Date | null
}> {
  if (!db) {
    return {
      activeSubscriptions: 0,
      totalSubscriptions: 0,
      runningTasks: 0,
      recentAlerts: 0,
      unreadAlerts: 0,
      lastRunTime: null,
      nextScheduledRun: null,
    }
  }

  // 统计订阅
  const subscriptions = await getSubscriptions(userId)
  const activeSubscriptions = subscriptions.filter((s) => s.isActive).length

  // 统计异动
  const { alerts: recentAlertsList, unreadCount } = await getAlerts(userId, { limit: 10 })

  // 最近执行时间
  const lastRunTimes = subscriptions
    .filter((s) => s.lastRunAt)
    .map((s) => s.lastRunAt)
    .sort((a, b) => (b?.getTime() || 0) - (a?.getTime() || 0))

  // 下次执行时间
  const nextRuns = subscriptions
    .filter((s) => s.isActive && s.nextRunAt)
    .map((s) => s.nextRunAt)
    .sort((a, b) => (a?.getTime() || 0) - (b?.getTime() || 0))

  return {
    activeSubscriptions,
    totalSubscriptions: subscriptions.length,
    runningTasks: 0, // TODO: 实现任务队列后更新
    recentAlerts: recentAlertsList.length,
    unreadAlerts: unreadCount,
    lastRunTime: lastRunTimes[0] || null,
    nextScheduledRun: nextRuns[0] || null,
  }
}

// ==================== 时间计算辅助函数 ====================

/**
 * 计算初始下次执行时间
 */
function calculateInitialNextRun(
  frequency: "hourly" | "daily" | "weekly",
  scheduleTime?: string
): Date {
  const now = new Date()
  const time = scheduleTime || "09:00"
  const [hours, minutes] = time.split(":").map(Number)

  switch (frequency) {
    case "hourly":
      return new Date(now.getTime() + 60 * 60 * 1000)
    case "daily":
      const next = new Date(now)
      next.setHours(hours, minutes, 0, 0)
      if (next <= now) {
        next.setDate(next.getDate() + 1)
      }
      return next
    case "weekly":
      const weekNext = new Date(now)
      weekNext.setHours(hours, minutes, 0, 0)
      weekNext.setDate(weekNext.getDate() + 7)
      return weekNext
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
  }
}

/**
 * 计算下次执行时间（基于上次执行）
 */
function calculateNextRunTime(subscription: TrackerSubscription): Date {
  const now = new Date()
  const frequency = subscription.frequency as "hourly" | "daily" | "weekly"
  const scheduleTime = subscription.scheduleTime || "09:00"
  const [hours, minutes] = scheduleTime.split(":").map(Number)

  switch (frequency) {
    case "hourly":
      return new Date(now.getTime() + 60 * 60 * 1000)
    case "daily":
      const next = new Date(now)
      next.setHours(hours, minutes, 0, 0)
      if (next <= now) {
        next.setDate(next.getDate() + 1)
      }
      return next
    case "weekly":
      const weekNext = new Date(now)
      weekNext.setHours(hours, minutes, 0, 0)
      weekNext.setDate(weekNext.getDate() + 7)
      return weekNext
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
  }
}