import { pgTable, serial, varchar, date, decimal, timestamp, text, boolean, jsonb, uniqueIndex } from "drizzle-orm/pg-core"

// Better Auth 用户表 - 必须导出为 user
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  role: text("role").default("user"),
})

// Better Auth 会话表 - 必须导出为 session
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

// Better Auth 账户表 - 必须导出为 account
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// Better Auth 验证表 - 必须导出为 verification
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// 硫磺价格表（详细数据）
export const sulfurPrices = pgTable("sulfur_prices", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  productName: varchar("product_name", { length: 50 }).default("硫磺"),
  region: varchar("region", { length: 50 }), // 华东地区
  market: varchar("market", { length: 50 }), // 镇江港
  specification: varchar("specification", { length: 20 }), // 颗粒
  minPrice: decimal("min_price", { precision: 10, scale: 2 }),
  maxPrice: decimal("max_price", { precision: 10, scale: 2 }),
  mainPrice: decimal("main_price", { precision: 10, scale: 2 }), // 主流价
  changeValue: decimal("change_value", { precision: 10, scale: 2 }), // 涨跌值
  changePercent: varchar("change_percent", { length: 20 }), // 涨跌幅
  unit: varchar("unit", { length: 20 }).default("元/吨"),
  source: varchar("source", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
})

// 港口库存表
export const portInventory = pgTable("port_inventory", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  inventory: decimal("inventory", { precision: 10, scale: 2 }).notNull(), // 港口库存（万吨）
  price: decimal("price", { precision: 10, scale: 2 }), // 镇江港颗粒硫磺价格（元/吨）
  createdAt: timestamp("created_at").defaultNow(),
})

// 宜化知识库条目（资料 / 图 / 文献 预处理后的元数据）
export const yihuaKnowledgeItems = pgTable(
  "yihua_knowledge_items",
  {
    id: serial("id").primaryKey(),
    sectionId: varchar("section_id", { length: 32 }).notNull(),
    name: text("name").notNull(),
    publicPath: text("public_path").notNull(),
    kind: varchar("kind", { length: 32 }).notNull(),
    meta: jsonb("meta")
      .$type<{ year?: number; lang?: "zh" | "en" }>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [uniqueIndex("yihua_knowledge_items_path_uidx").on(t.publicPath)],
)

// 宜化代码库条目（代码/笔记本的元数据，用于知识图谱展示）
export const yihuaCodeItems = pgTable(
  "yihua_code_items",
  {
    id: serial("id").primaryKey(),
    relativePath: varchar("relative_path", { length: 500 }).notNull(),
    fileName: text("file_name").notNull(),
    ext: varchar("ext", { length: 16 }).notNull(),
    kind: varchar("kind", { length: 32 }).notNull(), // python | notebook | matlab | markdown
    topFolder: varchar("top_folder", { length: 256 }).notNull(),
    meta: jsonb("meta")
      .$type<{ year?: number; lang?: "zh" | "en" }>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [uniqueIndex("yihua_code_items_relpath_uidx").on(t.relativePath)],
)

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

// 聊天会话表
export const chatConversations = pgTable("chat_conversations", {
  id: text("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// 聊天消息表
export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => chatConversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// 类型导出
export type SulfurPrice = typeof sulfurPrices.$inferSelect
export type NewSulfurPrice = typeof sulfurPrices.$inferInsert
export type PortInventory = typeof portInventory.$inferSelect
export type NewPortInventory = typeof portInventory.$inferInsert
export type PurchaseReport = typeof purchaseReports.$inferSelect
export type NewPurchaseReport = typeof purchaseReports.$inferInsert
export type YihuaKnowledgeItem = typeof yihuaKnowledgeItems.$inferSelect
export type NewYihuaKnowledgeItem = typeof yihuaKnowledgeItems.$inferInsert
export type YihuaCodeItem = typeof yihuaCodeItems.$inferSelect
export type NewYihuaCodeItem = typeof yihuaCodeItems.$inferInsert
export type ChatConversation = typeof chatConversations.$inferSelect
export type NewChatConversation = typeof chatConversations.$inferInsert
export type ChatMessage = typeof chatMessages.$inferSelect
export type NewChatMessage = typeof chatMessages.$inferInsert
