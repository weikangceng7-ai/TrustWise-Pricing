import { db } from "@/db"
import { sulfurPrices, portInventory, purchaseReports } from "@/db/schema"
import { desc, eq, and, gte, lte, sql } from "drizzle-orm"

export interface RealtimePriceData {
  date: string
  region: string
  market: string
  specification: string
  minPrice: number
  maxPrice: number
  mainPrice: number
  changeValue: number
  source: string
}

export interface RealtimeInventoryData {
  date: string
  inventory: number
  price: number
}

export async function savePriceData(data: RealtimePriceData) {
  if (!db) {
    throw new Error("数据库未连接")
  }

  const [inserted] = await db
    .insert(sulfurPrices)
    .values({
      date: data.date,
      region: data.region,
      market: data.market,
      specification: data.specification,
      minPrice: data.minPrice.toString(),
      maxPrice: data.maxPrice.toString(),
      mainPrice: data.mainPrice.toString(),
      changeValue: data.changeValue.toString(),
      source: data.source,
    })
    .returning()

  return inserted
}

export async function saveInventoryData(data: RealtimeInventoryData) {
  if (!db) {
    throw new Error("数据库未连接")
  }

  const [inserted] = await db
    .insert(portInventory)
    .values({
      date: data.date,
      inventory: data.inventory.toString(),
      price: data.price.toString(),
    })
    .returning()

  return inserted
}

export async function getLatestPrices(limit = 30) {
  if (!db) {
    return []
  }

  return db
    .select()
    .from(sulfurPrices)
    .orderBy(desc(sulfurPrices.date))
    .limit(limit)
}

export async function getLatestInventory(limit = 30) {
  if (!db) {
    return []
  }

  return db
    .select()
    .from(portInventory)
    .orderBy(desc(portInventory.date))
    .limit(limit)
}

export async function getPriceStats() {
  if (!db) {
    return null
  }

  const result = await db
    .select({
      avgPrice: sql<string>`AVG(main_price)`,
      minPrice: sql<string>`MIN(main_price)`,
      maxPrice: sql<string>`MAX(main_price)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(sulfurPrices)

  return result[0] || null
}

export async function getInventoryStats() {
  if (!db) {
    return null
  }

  const result = await db
    .select({
      avgInventory: sql<string>`AVG(inventory)`,
      minInventory: sql<string>`MIN(inventory)`,
      maxInventory: sql<string>`MAX(inventory)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(portInventory)

  return result[0] || null
}

export async function generateReportFromRealData(
  title: string,
  reportDate: string
) {
  if (!db) {
    throw new Error("数据库未连接")
  }

  const prices = await getLatestPrices(7)
  const inventory = await getLatestInventory(7)

  if (prices.length === 0) {
    throw new Error("没有足够的价格数据")
  }

  const latestPrice = parseFloat(prices[0].mainPrice || "0")
  const prevPrice = prices.length > 1 ? parseFloat(prices[1].mainPrice || "0") : latestPrice
  const changeValue = latestPrice - prevPrice
  const changePercent = prevPrice > 0 ? (changeValue / prevPrice) * 100 : 0

  const latestInventory = inventory.length > 0 ? parseFloat(inventory[0].inventory || "0") : 0

  let priceTrend: string
  if (changePercent > 2) priceTrend = "上涨"
  else if (changePercent > 0.5) priceTrend = "小幅上涨"
  else if (changePercent < -2) priceTrend = "下跌"
  else if (changePercent < -0.5) priceTrend = "小幅下跌"
  else priceTrend = "稳定"

  let riskLevel: string
  if (latestInventory < 40) riskLevel = "高"
  else if (latestInventory < 50) riskLevel = "中等"
  else riskLevel = "低"

  let recommendation: string
  if (riskLevel === "高" && priceTrend === "上涨") {
    recommendation = "紧急采购"
  } else if (riskLevel === "高") {
    recommendation = "建议备库"
  } else if (priceTrend === "下跌" || priceTrend === "小幅下跌") {
    recommendation = "观望"
  } else if (priceTrend === "稳定") {
    recommendation = "按需采购"
  } else {
    recommendation = "适当备库"
  }

  const summary = generateSummary(prices, inventory, priceTrend, riskLevel)

  const [report] = await db
    .insert(purchaseReports)
    .values({
      title,
      reportDate,
      summary,
      recommendation,
      priceTrend,
      riskLevel,
    })
    .returning()

  return report
}

function generateSummary(
  prices: any[],
  inventory: any[],
  trend: string,
  risk: string
): string {
  const latestPrice = prices[0]
  const latestInventory = inventory[0]

  const avgPrice =
    prices.reduce((sum, p) => sum + parseFloat(p.mainPrice || "0"), 0) /
    prices.length

  return `【市场概况】本周硫磺市场${trend === "稳定" ? "整体稳定" : `呈现${trend}态势`}，国内硫磺均价报${avgPrice.toFixed(0)}元/吨。` +
    `【供需分析】供应端：主要进口来源国出货${prices.length > 5 ? "稳定" : "正常"}，港口到货量保持平稳。` +
    `需求端：下游磷肥企业开工率维持正常水平，采购需求${trend === "上涨" ? "旺盛" : "平稳"}。` +
    `【价格走势】${latestPrice?.market || "主要港口"}现货价格${latestPrice?.minPrice || "-"}-${latestPrice?.maxPrice || "-"}元/吨。` +
    `【库存情况】主要港口库存约${latestInventory?.inventory || "-"}万吨，库存消费比处于${risk === "低" ? "健康" : risk === "中等" ? "合理" : "偏低"}水平。` +
    `【后市研判】预计短期内价格将维持${trend === "稳定" ? "稳定" : trend + "趋势"}，建议关注市场动态。`
}
