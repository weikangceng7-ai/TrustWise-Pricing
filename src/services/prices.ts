import { db } from "@/db"
import { sulfurPrices, portInventory, type SulfurPrice, type PortInventory } from "@/db/schema"
import { desc, eq } from "drizzle-orm"

/**
 * 获取所有价格数据（支持品种筛选）
 */
export async function getPrices(limit?: number, commodityCode?: string): Promise<SulfurPrice[]> {
  if (db) {
    let query = db.select().from(sulfurPrices).$dynamic()
    if (commodityCode) {
      query = query.where(eq(sulfurPrices.commodityCode, commodityCode))
    }
    query = query.orderBy(desc(sulfurPrices.date))
    if (limit) {
      return await query.limit(limit)
    }
    return await query
  }
  return []
}

/**
 * 获取价格数据统计摘要（支持品种筛选）
 */
export async function getPriceSummary(commodityCode?: string) {
  if (!db) return null

  let query = db.select().from(sulfurPrices).$dynamic()
  if (commodityCode) {
    query = query.where(eq(sulfurPrices.commodityCode, commodityCode))
  }
  const prices = await query.orderBy(desc(sulfurPrices.date)).limit(30)

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
    source: latestPrice.source,
  }
}

/**
 * 获取港口库存数据（支持品种筛选）
 */
export async function getInventory(limit?: number, commodityCode?: string): Promise<PortInventory[]> {
  if (db) {
    let query = db.select().from(portInventory).$dynamic()
    if (commodityCode) {
      query = query.where(eq(portInventory.commodityCode, commodityCode))
    }
    query = query.orderBy(desc(portInventory.date))
    if (limit) {
      return await query.limit(limit)
    }
    return await query
  }
  return []
}

/**
 * 获取库存数据统计摘要（支持品种筛选）
 */
export async function getInventorySummary(commodityCode?: string) {
  if (!db) return null

  let query = db.select().from(portInventory).$dynamic()
  if (commodityCode) {
    query = query.where(eq(portInventory.commodityCode, commodityCode))
  }
  const inventory = await query.orderBy(desc(portInventory.date)).limit(30)

  if (inventory.length === 0) return null

  const latest = inventory[0]
  const avgInventory = inventory.reduce((sum, i) => sum + Number(i.inventory || 0), 0) / inventory.length

  return {
    currentInventory: latest.inventory,
    avgInventory: avgInventory.toFixed(2),
    currentPrice: latest.price,
    date: latest.date,
    source: latest.source,
  }
}

/**
 * 通用函数：找到最接近目标日期的记录
 */
function findClosestByDate<T extends { date: string | Date }>(
  records: T[],
  targetDate: string
): T | null {
  if (records.length === 0) return null

  const target = new Date(targetDate)
  let closest = records[0]
  let minDiff = Infinity

  for (const r of records) {
    const diff = Math.abs(new Date(r.date).getTime() - target.getTime())
    if (diff < minDiff) {
      minDiff = diff
      closest = r
    }
  }

  return closest
}

/**
 * 获取指定日期的价格数据（支持品种筛选）
 */
export async function getPriceByDate(targetDate: string, commodityCode?: string) {
  if (!db) return null

  try {
    let priceQuery = db.select().from(sulfurPrices).$dynamic()
    if (commodityCode) {
      priceQuery = priceQuery.where(eq(sulfurPrices.commodityCode, commodityCode))
    }
    const prices = await priceQuery.orderBy(desc(sulfurPrices.date)).limit(60)
    const closestPrice = findClosestByDate(prices, targetDate)

    if (!closestPrice) return null

    // Calculate average price from available data
    const avgPrice = prices.length > 0
      ? (prices.reduce((sum, p) => sum + Number(p.mainPrice || 0), 0) / prices.length).toFixed(2)
      : null

    return {
      currentPrice: closestPrice.mainPrice,
      minPrice: closestPrice.minPrice,
      maxPrice: closestPrice.maxPrice,
      avgPrice,
      changeValue: closestPrice.changeValue,
      changePercent: closestPrice.changePercent,
      date: closestPrice.date,
      market: closestPrice.market,
      specification: closestPrice.specification,
    }
  } catch (error) {
    console.error("获取指定日期价格失败:", error)
    return null
  }
}

/**
 * 获取指定日期的库存数据（支持品种筛选）
 */
export async function getInventoryByDate(targetDate: string, commodityCode?: string) {
  if (!db) return null

  try {
    let invQuery = db.select().from(portInventory).$dynamic()
    if (commodityCode) {
      invQuery = invQuery.where(eq(portInventory.commodityCode, commodityCode))
    }
    const inventory = await invQuery.orderBy(desc(portInventory.date)).limit(60)
    const closestInventory = findClosestByDate(inventory, targetDate)

    if (!closestInventory) return null

    // 计算该日期前30天的平均库存
    const target = new Date(targetDate)
    const relevantInventory = inventory.filter(i => new Date(i.date) <= target)
    const avgInventory = relevantInventory.length > 0
      ? relevantInventory.slice(0, 30).reduce((sum, i) => sum + Number(i.inventory || 0), 0) / Math.min(relevantInventory.length, 30)
      : Number(closestInventory.inventory)

    return {
      currentInventory: closestInventory.inventory,
      avgInventory: avgInventory.toFixed(2),
      currentPrice: closestInventory.price,
      date: closestInventory.date,
    }
  } catch (error) {
    console.error("获取指定日期库存失败:", error)
    return null
  }
}
