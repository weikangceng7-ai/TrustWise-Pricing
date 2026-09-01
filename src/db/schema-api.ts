// src/db/schema-api.ts
import { pgTable, text, serial, integer, timestamp, boolean, index } from "drizzle-orm/pg-core"
import { user } from "./schema"

// API Key 表
export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .references(() => user.id, { onDelete: "cascade" }),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
}, (t) => [
  index("api_keys_user_id_idx").on(t.userId),
])

// API 配额表
export const apiQuotas = pgTable("api_quotas", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .unique(),
  apiKeyId: text("api_key_id")
    .references(() => apiKeys.id, { onDelete: "cascade" })
    .unique(),
  freeLimit: integer("free_limit").notNull().default(1000),
  usedFree: integer("used_free").notNull().default(0),
  paidLimit: integer("paid_limit").notNull().default(0),
  usedPaid: integer("used_paid").notNull().default(0),
  resetAt: timestamp("reset_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// API 使用日志表
export const apiUsageLogs = pgTable("api_usage_logs", {
  id: serial("id").primaryKey(),
  apiKeyId: text("api_key_id")
    .notNull()
    .references(() => apiKeys.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  statusCode: integer("status_code").notNull(),
  responseTime: integer("response_time").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  errorMessage: text("error_message"),
}, (t) => [
  index("api_usage_logs_api_key_id_idx").on(t.apiKeyId),
])

// 类型导出
export type ApiKey = typeof apiKeys.$inferSelect
export type NewApiKey = typeof apiKeys.$inferInsert
export type ApiQuota = typeof apiQuotas.$inferSelect
export type NewApiQuota = typeof apiQuotas.$inferInsert
export type ApiUsageLog = typeof apiUsageLogs.$inferSelect
export type NewApiUsageLog = typeof apiUsageLogs.$inferInsert