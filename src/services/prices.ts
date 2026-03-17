import { db } from "@/db"
import { sulfurPrices, type SulfurPrice } from "@/db/schema"
import { asc } from "drizzle-orm"

// Mock 价格数据（当数据库未配置时使用）
const mockPrices: SulfurPrice[] = [
  { id: 1, date: "2025-03-01", price: "850.00", unit: "元/吨", source: "中石化", createdAt: new Date("2025-03-01") },
  { id: 2, date: "2025-03-02", price: "855.00", unit: "元/吨", source: "中石化", createdAt: new Date("2025-03-02") },
  { id: 3, date: "2025-03-03", price: "860.00", unit: "元/吨", source: "中石化", createdAt: new Date("2025-03-03") },
  { id: 4, date: "2025-03-04", price: "858.00", unit: "元/吨", source: "中石化", createdAt: new Date("2025-03-04") },
  { id: 5, date: "2025-03-05", price: "865.00", unit: "元/吨", source: "中石化", createdAt: new Date("2025-03-05") },
  { id: 6, date: "2025-03-06", price: "870.00", unit: "元/吨", source: "中石油", createdAt: new Date("2025-03-06") },
  { id: 7, date: "2025-03-07", price: "875.00", unit: "元/吨", source: "中石油", createdAt: new Date("2025-03-07") },
  { id: 8, date: "2025-03-08", price: "872.00", unit: "元/吨", source: "中石油", createdAt: new Date("2025-03-08") },
  { id: 9, date: "2025-03-09", price: "880.00", unit: "元/吨", source: "中石油", createdAt: new Date("2025-03-09") },
  { id: 10, date: "2025-03-10", price: "885.00", unit: "元/吨", source: "进口", createdAt: new Date("2025-03-10") },
  { id: 11, date: "2025-03-11", price: "890.00", unit: "元/吨", source: "进口", createdAt: new Date("2025-03-11") },
  { id: 12, date: "2025-03-12", price: "888.00", unit: "元/吨", source: "进口", createdAt: new Date("2025-03-12") },
  { id: 13, date: "2025-03-13", price: "895.00", unit: "元/吨", source: "进口", createdAt: new Date("2025-03-13") },
  { id: 14, date: "2025-03-14", price: "900.00", unit: "元/吨", source: "进口", createdAt: new Date("2025-03-14") },
]

/**
 * 获取所有硫磺价格数据
 */
export async function getPrices(): Promise<SulfurPrice[]> {
  if (db) {
    return await db.select().from(sulfurPrices).orderBy(asc(sulfurPrices.date))
  }
  return mockPrices
}
