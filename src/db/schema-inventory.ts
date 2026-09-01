/**
 * 库存分析深化数据库表定义
 *
 * 包含：
 * - inventory_snapshots: 库存快照记录表
 * - inventory_alerts: 库存预警表
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
  varchar,
  date,
  index,
} from "drizzle-orm/pg-core"

// ==================== 库存快照表 ====================

export const inventorySnapshots = pgTable("inventory_snapshots", {
  id: serial("id").primaryKey(),
  enterpriseCode: varchar("enterprise_code", { length: 50 }).notNull(),
  date: date("date").notNull(),
  stockLevel: decimal("stock_level", { precision: 10, scale: 2 }).notNull(), // 库存量（吨）
  dailyConsumption: decimal("daily_consumption", { precision: 10, scale: 2 }), // 日均消耗（吨/天）
  turnoverRate: decimal("turnover_rate", { precision: 5, scale: 2 }), // 库存周转率
  daysOfCover: integer("days_of_cover"), // 库存可用天数
  healthScore: integer("health_score"), // 健康度评分 0-100
  stagnantItems: jsonb("stagnant_items").$type<{
    item?: string
    quantity?: number
    daysStagnant?: number
    riskLevel?: string
  }[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("inv_snapshots_enterprise_code_idx").on(t.enterpriseCode),
  index("inv_snapshots_date_idx").on(t.date),
])

// ==================== 库存预警表 ====================

export const inventoryAlerts = pgTable("inventory_alerts", {
  id: serial("id").primaryKey(),
  enterpriseCode: varchar("enterprise_code", { length: 50 }).notNull(),
  alertType: varchar("alert_type", { length: 30 }).notNull(), // overstock/stockout/stagnant/turnover_low
  severity: varchar("severity", { length: 20 }).notNull().default("normal"), // low/normal/high/critical
  message: text("message").notNull(),
  metadata: jsonb("metadata").$type<{
    currentStock?: number
    threshold?: number
    turnoverRate?: number
    daysOfCover?: number
    stagnantRisk?: string
  }>(),
  isHandled: boolean("is_handled").notNull().default(false),
  handledAt: timestamp("handled_at"),
  handleNote: text("handle_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("inv_alerts_enterprise_code_idx").on(t.enterpriseCode),
  index("inv_alerts_alert_type_idx").on(t.alertType),
])

// ==================== 类型导出 ====================

export type InventorySnapshotRecord = typeof inventorySnapshots.$inferSelect
export type NewInventorySnapshotRecord = typeof inventorySnapshots.$inferInsert
export type InventoryAlert = typeof inventoryAlerts.$inferSelect
export type NewInventoryAlert = typeof inventoryAlerts.$inferInsert
