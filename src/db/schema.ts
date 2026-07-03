import { pgTable, serial, varchar, date, decimal, timestamp, text, boolean, jsonb, uniqueIndex, integer } from "drizzle-orm/pg-core"

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
  // 手机号登录支持
  phone: text("phone").unique(), // 手机号需要唯一约束，防止重复注册
  phoneVerified: boolean("phone_verified").notNull().default(false),
  // 用户自定义预测服务配置
  predictionServiceUrl: text("prediction_service_url"),
  predictionServiceApiKey: text("prediction_service_api_key"), // 预测服务 API 密钥
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

// 知识库条目（资料 / 图 / 文献 预处理后的元数据）
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

// 代码库条目（代码/笔记本的元数据，用于知识图谱展示）
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

// 采购报告单表
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

// 通知表
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // 'price_alert' | 'inventory_alert' | 'purchase_timing' | 'market_news' | 'system' | 'report_ready'
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  priority: varchar("priority", { length: 20 }).notNull().default("normal"), // 'high' | 'normal' | 'low'
  isRead: boolean("is_read").notNull().default(false),
  link: text("link"), // 点击通知后跳转的链接
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}), // 额外数据
  createdAt: timestamp("created_at").notNull().defaultNow(),
  readAt: timestamp("read_at"),
})

// 企业硫磺价格预测表
export const enterprisePricePredictions = pgTable("enterprise_price_predictions", {
  id: serial("id").primaryKey(),
  enterpriseName: varchar("enterprise_name", { length: 100 }).notNull(), // 企业名称
  enterpriseCode: varchar("enterprise_code", { length: 20 }).notNull(), // 企业代码 (yihua/luxi/jinzhengda)
  date: date("date").notNull(), // 日期
  actualPrice: decimal("actual_price", { precision: 10, scale: 2 }), // 实际价格
  predictedPrice: decimal("predicted_price", { precision: 10, scale: 2 }), // 预测价格
  lowerBound: decimal("lower_bound", { precision: 10, scale: 2 }), // 预测下限
  upperBound: decimal("upper_bound", { precision: 10, scale: 2 }), // 预测上限
  confidence: decimal("confidence", { precision: 5, scale: 2 }), // 置信度
  modelType: varchar("model_type", { length: 50 }), // 模型类型 (LSTM/ARIMA/EEMD-LSTM)
  unit: varchar("unit", { length: 20 }).default("元/吨"),
  createdAt: timestamp("created_at").defaultNow(),
})

// 多维度价格数据表（用于价格走势图分类展示）
export const multiDimensionalPrices = pgTable(
  "multi_dimensional_prices",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(), // 日期
    category: varchar("category", { length: 30 }).notNull(), // 分类: supply/demand/middle-east-cob/port-inventory/domestic/market-news
    categoryName: varchar("category_name", { length: 50 }).notNull(), // 分类名称
    price: varchar("price", { length: 20 }), // 价格
    value: varchar("value", { length: 20 }), // 数值（库存量万吨、价格指数等）
    changeValue: varchar("change_value", { length: 20 }), // 涨跌值
    changePercent: varchar("change_percent", { length: 20 }), // 涨跌幅百分比
    source: varchar("source", { length: 200 }), // 数据来源
    note: text("note"), // 备注
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [uniqueIndex("multi_dimensional_prices_date_category_uidx").on(t.date, t.category)],
)

// 企业信息表
export const enterprises = pgTable("enterprises", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // 企业代码
  name: varchar("name", { length: 100 }).notNull(), // 企业名称
  location: varchar("location", { length: 100 }), // 所在地区
  province: varchar("province", { length: 50 }), // 省份
  capacity: decimal("capacity", { precision: 10, scale: 2 }), // 产能（万吨/年）
  transportMode: varchar("transport_mode", { length: 20 }), // 运输方式: water/rail/road
  mainProducts: jsonb("main_products").$type<string[]>().default([]), // 主要产品
  customerRegions: jsonb("customer_regions").$type<string[]>().default([]), // 客户区域
  inventoryStrategy: varchar("inventory_strategy", { length: 20 }).default("moderate"), // 库存策略: aggressive/moderate/conservative
  description: text("description"), // 企业描述
  tailwindColor: varchar("tailwind_color", { length: 20 }).default("cyan"), // UI 颜色
  shortDescription: varchar("short_description", { length: 200 }), // 简短描述
  // 价格预测配置
  basePrice: decimal("base_price", { precision: 10, scale: 2 }), // 基准价格
  volatility: decimal("volatility", { precision: 10, scale: 2 }), // 波动幅度
  trend: decimal("trend", { precision: 5, scale: 2 }), // 趋势
  modelAccuracy: decimal("model_accuracy", { precision: 5, scale: 2 }), // 模型准确率
  // 库存信息
  currentStock: decimal("current_stock", { precision: 10, scale: 2 }), // 当前库存（吨）
  maxCapacity: decimal("max_capacity", { precision: 10, scale: 2 }), // 最大仓储能力（吨）
  safetyDays: integer("safety_days"), // 安全库存天数
  avgConsumption: decimal("avg_consumption", { precision: 10, scale: 2 }), // 日均消耗量（吨/天）
  turnoverRate: integer("turnover_rate"), // 年周转次数
  lastPurchaseDate: date("last_purchase_date"), // 上次采购日期
  nextPurchaseDate: date("next_purchase_date"), // 预计下次采购日期
  supplierCount: integer("supplier_count"), // 供应商数量
  portDistance: integer("port_distance"), // 距离最近港口距离（公里）
  // 状态
  isActive: boolean("is_active").notNull().default(true), // 是否启用
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
export type EnterprisePricePrediction = typeof enterprisePricePredictions.$inferSelect
export type NewEnterprisePricePrediction = typeof enterprisePricePredictions.$inferInsert
export type MultiDimensionalPrice = typeof multiDimensionalPrices.$inferSelect
export type NewMultiDimensionalPrice = typeof multiDimensionalPrices.$inferInsert
export type Enterprise = typeof enterprises.$inferSelect
export type NewEnterprise = typeof enterprises.$inferInsert

// API 相关表 - 从 schema-api 导入
export * from "./schema-api"

// Tracker Agent 相关表 - 从 schema-tracker 导入
export * from "./schema-tracker"
