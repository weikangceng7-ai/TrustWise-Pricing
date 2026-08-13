/**
 * Tracker Agent 数据库表定义
 *
 * 包含：
 * - tracker_subscriptions: 追踪订阅配置表
 * - tracker_records: 追踪执行记录表
 * - tracker_alerts: 异动事件表
 * - tracker_reports: 追踪报告表
 */

import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  date,
  varchar,
  index,
} from "drizzle-orm/pg-core"
import { user } from "./schema"

// ==================== 类型定义 ====================

/**
 * 阈值规则配置
 */
export interface AlertRuleConfig {
  type: "price_change" | "price_threshold" | "inventory_change" | "inventory_threshold" | "news_keyword"
  // 价格变化阈值（百分比）
  priceChangeThreshold?: number // 例如 5 表示5%
  // 价格绝对阈值
  priceUpperThreshold?: number // 价格上限
  priceLowerThreshold?: number // 价格下限
  // 库存变化阈值
  inventoryChangeThreshold?: number // 例如 10 表示10%
  // 库存绝对阈值
  inventoryUpperThreshold?: number
  inventoryLowerThreshold?: number
  // 新闻关键词
  newsKeywords?: string[] // 关注的新闻关键词
  // 紧急程度
  urgency: "high" | "normal" | "low"
}

/**
 * 通知渠道配置
 */
export interface NotificationChannelConfig {
  email: boolean
  inApp: boolean // 应用内通知
  sms: boolean
  webhookUrl?: string // 外部 webhook
}

/**
 * 价格数据快照
 */
export interface PriceSnapshot {
  currentPrice: number
  previousPrice: number
  changeValue: number
  changePercent: number
  date: string
  market: string
  region?: string
}

/**
 * 库存数据快照
 */
export interface InventorySnapshot {
  currentInventory: number
  previousInventory: number
  changeValue: number
  changePercent: number
  date: string
  location?: string
}

/**
 * 新闻数据快照
 */
export interface NewsSnapshot {
  id: string
  title: string
  source: string
  date: string
  category: string
  relevanceScore: number
  sentiment?: "positive" | "negative" | "neutral"
}

/**
 * 预测结果快照
 */
export interface PredictionSnapshot {
  predictedPrice: number
  trend: string
  confidence: string
  predictionDays: number
  priceRange: {
    min: number
    max: number
  }
  generatedAt: string
}

// ==================== 追踪订阅表 ====================

/**
 * 追踪订阅配置表
 * 用户可以创建多个订阅，配置追踪目标、频率、阈值规则等
 */
export const trackerSubscriptions = pgTable("tracker_subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // 订阅基本信息
  name: varchar("name", { length: 100 }).notNull(), // 订阅名称
  description: text("description"), // 订阅描述

  // 追踪目标配置
  targetType: varchar("target_type", { length: 20 }).notNull(), // price/inventory/news/all
  targetRegion: varchar("target_region", { length: 50 }), // 华东/华北/华南等
  targetMarket: varchar("target_market", { length: 50 }), // 镇江港/青岛港等

  // 频率配置
  frequency: varchar("frequency", { length: 20 }).notNull().default("daily"), // hourly/daily/weekly
  scheduleTime: varchar("schedule_time", { length: 10 }).default("09:00"), // 执行时间 HH:mm

  // 阈值配置（JSONB存储灵活规则）
  alertRules: jsonb("alert_rules")
    .$type<AlertRuleConfig[]>()
    .notNull()
    .default([]),

  // 报告配置
  reportEnabled: boolean("report_enabled").notNull().default(true),
  reportType: varchar("report_type", { length: 20 }).default("daily"), // daily/weekly/monthly

  // 通知配置
  notificationChannels: jsonb("notification_channels")
    .$type<NotificationChannelConfig>()
    .notNull()
    .default({ email: true, inApp: true, sms: false }),

  // 状态
  isActive: boolean("is_active").notNull().default(true),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),

  // 时间戳
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("tracker_subscriptions_user_id_idx").on(t.userId),
])

// ==================== 追踪记录表 ====================

/**
 * 追踪执行记录表
 * 每次 Tracker 执行都会生成一条记录，存储采集的数据快照
 */
export const trackerRecords = pgTable("tracker_records", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id")
    .notNull()
    .references(() => trackerSubscriptions.id, { onDelete: "cascade" }),

  // 执行信息
  runAt: timestamp("run_at").notNull(),
  status: varchar("status", { length: 20 }).notNull(), // success/failed/partial

  // 数据采集结果（JSONB存储采集到的数据）
  priceData: jsonb("price_data").$type<PriceSnapshot>(),
  inventoryData: jsonb("inventory_data").$type<InventorySnapshot>(),
  newsData: jsonb("news_data").$type<NewsSnapshot[]>(),

  // 预测结果
  predictionResult: jsonb("prediction_result").$type<PredictionSnapshot>(),

  // 执行耗时
  durationMs: integer("duration_ms"),

  // 错误信息
  errorMessage: text("error_message"),

  // 时间戳
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("tracker_records_subscription_id_idx").on(t.subscriptionId),
])

// ==================== 异动事件表 ====================

/**
 * 异动事件表
 * 当检测到异动时生成事件记录，支持通知推送和处理状态跟踪
 */
export const trackerAlerts = pgTable("tracker_alerts", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id")
    .notNull()
    .references(() => trackerSubscriptions.id, { onDelete: "cascade" }),
  recordId: integer("record_id")
    .references(() => trackerRecords.id, { onDelete: "set null" }),

  // 异动类型
  alertType: varchar("alert_type", { length: 30 }).notNull(), // price_change/price_threshold/inventory_change/inventory_threshold/news_keyword/prediction_risk

  // 异动详情
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),

  // 异动数据
  triggerValue: decimal("trigger_value", { precision: 10, scale: 2 }), // 触发值
  thresholdValue: decimal("threshold_value", { precision: 10, scale: 2 }), // 阈值
  changePercent: decimal("change_percent", { precision: 5, scale: 2 }), // 变化百分比

  // 紧急程度
  urgency: varchar("urgency", { length: 20 }).notNull().default("normal"), // high/normal/low

  // 通知状态
  notificationSent: boolean("notification_sent").notNull().default(false),
  notificationSentAt: timestamp("notification_sent_at"),
  notificationChannelsUsed: jsonb("notification_channels_used").$type<string[]>().default([]),

  // 处理状态
  isRead: boolean("is_read").notNull().default(false),
  isHandled: boolean("is_handled").notNull().default(false),
  handledBy: text("handled_by").references(() => user.id),
  handledAt: timestamp("handled_at"),
  handleNote: text("handle_note"),

  // 时间戳
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("tracker_alerts_subscription_id_idx").on(t.subscriptionId),
])

// ==================== 追踪报告表 ====================

/**
 * 追踪报告表
 * 存储生成的日/周/月报内容
 */
export const trackerReports = pgTable("tracker_reports", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id")
    .notNull()
    .references(() => trackerSubscriptions.id, { onDelete: "cascade" }),

  // 报告信息
  reportType: varchar("report_type", { length: 20 }).notNull(), // daily/weekly/monthly
  reportDate: date("report_date").notNull(),
  title: varchar("title", { length: 200 }).notNull(),

  // 报告内容
  summary: text("summary").notNull(),
  priceAnalysis: text("price_analysis"),
  inventoryAnalysis: text("inventory_analysis"),
  newsAnalysis: text("news_analysis"),
  predictionAnalysis: text("prediction_analysis"),
  recommendation: text("recommendation"),

  // 数据范围
  dataRangeStart: date("data_range_start"),
  dataRangeEnd: date("data_range_end"),

  // 状态
  status: varchar("status", { length: 20 }).notNull().default("generated"), // generated/sent/archived

  // 时间戳
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// ==================== 类型导出 ====================

export type TrackerSubscription = typeof trackerSubscriptions.$inferSelect
export type NewTrackerSubscription = typeof trackerSubscriptions.$inferInsert
export type TrackerRecord = typeof trackerRecords.$inferSelect
export type NewTrackerRecord = typeof trackerRecords.$inferInsert
export type TrackerAlert = typeof trackerAlerts.$inferSelect
export type NewTrackerAlert = typeof trackerAlerts.$inferInsert
export type TrackerReport = typeof trackerReports.$inferSelect
export type NewTrackerReport = typeof trackerReports.$inferInsert