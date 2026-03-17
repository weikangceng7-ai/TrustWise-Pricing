import { pgTable, serial, varchar, date, decimal, timestamp, text } from "drizzle-orm/pg-core"

// 硫磺价格表
export const sulfurPrices = pgTable("sulfur_prices", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }).default("元/吨"),
  source: varchar("source", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
})

// 采购报告表
export const purchaseReports = pgTable("purchase_reports", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  reportDate: date("report_date").notNull(),
  summary: text("summary").notNull(),
  recommendation: varchar("recommendation", { length: 50 }),
  priceTrend: varchar("price_trend", { length: 20 }),
  riskLevel: varchar("risk_level", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
})

// 类型导出
export type SulfurPrice = typeof sulfurPrices.$inferSelect
export type NewSulfurPrice = typeof sulfurPrices.$inferInsert
export type PurchaseReport = typeof purchaseReports.$inferSelect
export type NewPurchaseReport = typeof purchaseReports.$inferInsert
