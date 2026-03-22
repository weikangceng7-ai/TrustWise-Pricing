import { db } from "@/db"
import { notifications } from "@/db/schema"
import { eq, desc, and, sql } from "drizzle-orm"
import type { Notification, NewNotification } from "@/db/schema"

export type NotificationType =
  | "price_alert"
  | "inventory_alert"
  | "purchase_timing"
  | "market_news"
  | "system"
  | "report_ready"

export type NotificationPriority = "high" | "normal" | "low"

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: string
  content: string
  priority?: NotificationPriority
  link?: string
  metadata?: Record<string, unknown>
}

export async function getNotifications(
  userId: string,
  options?: {
    limit?: number
    unreadOnly?: boolean
  }
): Promise<Notification[]> {
  if (!db) {
    return []
  }

  const { limit = 20, unreadOnly = false } = options || {}

  const conditions = [eq(notifications.userId, userId)]
  if (unreadOnly) {
    conditions.push(eq(notifications.isRead, false))
  }

  return db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
}

export async function getUnreadCount(userId: string): Promise<number> {
  if (!db) {
    return 0
  }

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))

  return result[0]?.count || 0
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<Notification | null> {
  if (!db) {
    return null
  }

  const [notification] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      content: input.content,
      priority: input.priority || "normal",
      link: input.link,
      metadata: input.metadata || {},
    })
    .returning()

  return notification
}

export async function markAsRead(
  notificationId: number,
  userId: string
): Promise<Notification | null> {
  if (!db) {
    return null
  }

  const [notification] = await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning()

  return notification || null
}

export async function markAllAsRead(userId: string): Promise<number> {
  if (!db) {
    return 0
  }

  const result = await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    .returning()

  return result.length
}

export async function deleteNotification(
  notificationId: number,
  userId: string
): Promise<boolean> {
  if (!db) {
    return false
  }

  const result = await db
    .delete(notifications)
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning()

  return result.length > 0
}

export async function createDemoNotifications(userId: string): Promise<void> {
  if (!db) {
    return
  }

  const demoNotifications: CreateNotificationInput[] = [
    {
      userId,
      type: "price_alert",
      title: "价格突破预警",
      content: "硫磺价格已突破预设上限 1200 元/吨，当前价格为 1250 元/吨，建议关注市场动态。",
      priority: "high",
      link: "/dashboard",
      metadata: { threshold: 1200, currentPrice: 1250 },
    },
    {
      userId,
      type: "inventory_alert",
      title: "库存预警",
      content: "当前港口库存为 45 万吨，低于安全库存线 50 万吨，建议考虑补货计划。",
      priority: "high",
      link: "/dashboard",
      metadata: { currentInventory: 45, safeLevel: 50 },
    },
    {
      userId,
      type: "purchase_timing",
      title: "最佳采购时机提醒",
      content: "根据 AI 预测，未来 3-5 天可能是较好的采购窗口期，预计价格将小幅回调。",
      priority: "normal",
      link: "/agent-chat",
      metadata: { predictedDays: "3-5" },
    },
  ]

  for (const notification of demoNotifications) {
    await createNotification(notification)
  }
}
