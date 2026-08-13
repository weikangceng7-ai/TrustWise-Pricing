// src/db/schema-payment.ts
import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core"
import { user } from "./schema"

// 支付订单表
export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull(),
  planName: text("plan_name").notNull(),
  amount: integer("amount").notNull(),        // 金额（分）
  quotaAmount: integer("quota_amount").notNull(), // 购买的配额数量
  status: text("status").notNull().default("pending"), // pending | paid | cancelled
  stripeSessionId: text("stripe_session_id").unique(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("orders_user_id_idx").on(t.userId),
  index("orders_stripe_session_id_idx").on(t.stripeSessionId),
])

export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
