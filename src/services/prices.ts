import { db } from "@/db"
import { sulfurPrices, portInventory, type SulfurPrice, type PortInventory } from "@/db/schema"
import { desc } from "drizzle-orm"

/**
 * 获取所有硫磺价格数据
 */
export async function getPrices(limit?: number): Promise<SulfurPrice[]> {
  if (db) {
    const query = db.select().from(sulfurPrices).orderBy(desc(sulfurPrices.date))
    if (limit) {
      return await query.limit(limit)
    }
    return await query
  }
  return []
}

/**
 * 获取价格数据统计摘要
 */
export async function getPriceSummary() {
  if (!db) return null

  const prices = await db.select().from(sulfurPrices).orderBy(desc(sulfurPrices.date)).limit(30)

  if (prices.length === 0) return null

  const latestPrice = prices[0]
  const avgPrice = prices.reduce((sum, p) => sum + Number(p.mainPrice || 0), 0) / prices.length

  return {
    currentPrice: latestPrice.mainPrice,
    minPrice: latestPrice.minPrice,
    maxPrice: latestPrice.maxPrice,
    avgPrice: avgPrice.toFixed(2),
    changeValue: latestPrice.changeValue,
    changePercent: latestPrice.changePercent,
    date: latestPrice.date,
    market: latestPrice.market,
    specification: latestPrice.specification,
  }
}

/**
 * 获取港口库存数据
 */
export async function getInventory(limit?: number): Promise<PortInventory[]> {
  if (db) {
    const query = db.select().from(portInventory).orderBy(desc(portInventory.date))
    if (limit) {
      return await query.limit(limit)
    }
    return await query
  }
  return []
}

/**
 * 获取库存数据统计摘要
 */
export async function getInventorySummary() {
  if (!db) return null

  const inventory = await db.select().from(portInventory).orderBy(desc(portInventory.date)).limit(30)

  if (inventory.length === 0) return null

  const latest = inventory[0]
  const avgInventory = inventory.reduce((sum, i) => sum + Number(i.inventory || 0), 0) / inventory.length

  return {
    currentInventory: latest.inventory,
    avgInventory: avgInventory.toFixed(2),
    currentPrice: latest.price,
    date: latest.date,
  }
}
