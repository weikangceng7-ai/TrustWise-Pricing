import { pgTable, serial, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core"

// 品种元数据表
export const commodities = pgTable("commodities", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  englishName: varchar("english_name", { length: 100 }),
  category: varchar("category", { length: 50 }).notNull(), // 化工原料 / 矿产原料 / 化肥原料 / 化肥产品
  unit: varchar("unit", { length: 20 }).default("元/吨"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
})

// 预置品种常量
export const COMMODITY_CODES = {
  SULFUR: "sulfur",
  PHOSPHATE: "phosphate",
  POTASH: "potash",
  UREA: "urea",
} as const

export type CommodityCode = (typeof COMMODITY_CODES)[keyof typeof COMMODITY_CODES]

export const COMMODITY_INFO: Record<CommodityCode, { name: string; englishName: string; category: string; unit: string }> = {
  [COMMODITY_CODES.SULFUR]: { name: "硫磺", englishName: "Sulfur", category: "化工原料", unit: "元/吨" },
  [COMMODITY_CODES.PHOSPHATE]: { name: "磷矿", englishName: "Phosphate Rock", category: "矿产原料", unit: "元/吨" },
  [COMMODITY_CODES.POTASH]: { name: "钾肥", englishName: "Potash", category: "化肥原料", unit: "元/吨" },
  [COMMODITY_CODES.UREA]: { name: "尿素", englishName: "Urea", category: "化肥产品", unit: "元/吨" },
}

export function getCommodityName(code: CommodityCode | string): string {
  return COMMODITY_INFO[code as CommodityCode]?.name ?? code
}

// 类型导出
export type Commodity = typeof commodities.$inferSelect
export type NewCommodity = typeof commodities.$inferInsert
