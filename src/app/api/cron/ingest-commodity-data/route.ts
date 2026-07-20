import { NextResponse } from "next/server"
import { db } from "@/db"
import { sulfurPrices, portInventory, notifications } from "@/db/schema"
import { fetchAllCommodities, fetchCommoditySpot, fetchBDI, type CommodityDataResponse } from "@/lib/akshare-client"
import { fetchAllCommoditiesDirect } from "@/lib/commodity-scraper"
import { eq, and, desc } from "drizzle-orm"

export const maxDuration = 60 // AKShare 批量获取可能需要较长时间

function isVercelCron(request: Request): boolean {
  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(request: Request) {
  const isCron = isVercelCron(request)
  const isLocalDev = process.env.NODE_ENV === "development"

  if (!isCron && !isLocalDev) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)

  try {
    // 获取最新已有数据日期，避免重复入库
    const lastPrice = await getLatestDataDate()

    // 优先使用 TypeScript 直连爬取（Vercel serverless 可直接运行）
    let allData: Record<string, CommodityDataResponse> =
      await fetchAllCommoditiesDirect(90)

    // 如果有品种是模拟数据，尝试 Python 服务作为补充
    const mockCount = Object.values(allData).filter((r) =>
      r.source.includes("模拟")
    ).length
    if (mockCount > 0) {
      console.warn(
        `Direct scraper: ${mockCount}/5 commodities using mock data, trying Python service as fallback...`
      )
      const pythonData = await fetchAllCommodities(90)
      if (pythonData) {
        let replaced = 0
        for (const [code, response] of Object.entries(pythonData)) {
          if (
            !response.source.includes("模拟") &&
            allData[code]?.source.includes("模拟")
          ) {
            allData[code] = response
            replaced++
          }
        }
        if (replaced > 0) {
          console.log(`Python service supplemented ${replaced} commodities`)
        }
      }
    }

    const results: Record<string, { inserted: number; skipped: number }> = {}

    // 入库各品种数据
    for (const [code, response] of Object.entries(allData)) {
      if (!response?.data?.length) continue

      if (code === "bdi") {
        results[code] = await ingestBDIData(response)
      } else {
        results[code] = await ingestCommodityPrice(code, response, lastPrice)
      }
    }

    // 检查大幅价格波动，创建通知
    await checkPriceAlerts(allData)

    // 汇总
    const totalInserted = Object.values(results).reduce((sum, r) => sum + r.inserted, 0)
    const totalSkipped = Object.values(results).reduce((sum, r) => sum + r.skipped, 0)

    return NextResponse.json({
      success: true,
      message: `入库完成: 新增 ${totalInserted} 条, 跳过 ${totalSkipped} 条`,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("商品数据入库失败:", error)
    return NextResponse.json(
      { success: false, error: "入库失败" },
      { status: 500 }
    )
  }
}

async function getLatestDataDate(): Promise<string | null> {
  if (!db) return null
  try {
    const rows = await db
      .select({ date: sulfurPrices.date })
      .from(sulfurPrices)
      .orderBy(desc(sulfurPrices.date))
      .limit(1)

    return rows.length > 0 ? rows[0].date : null
  } catch {
    return null
  }
}

async function ingestCommodityPrice(
  code: string,
  response: CommodityDataResponse,
  lastDataDate: string | null
): Promise<{ inserted: number; skipped: number }> {
  if (!db) return { inserted: 0, skipped: 0 }

  let inserted = 0
  let skipped = 0

  for (const record of response.data) {
    // 跳过已有数据的日期
    if (lastDataDate && record.date <= lastDataDate) {
      skipped++
      continue
    }

    try {
      await db.insert(sulfurPrices).values({
        date: record.date,
        commodityCode: code,
        productName: code === "sulfur" ? "硫磺" : code === "phosphate" ? "磷矿石" : code === "potash" ? "钾肥" : "尿素",
        region: "全国",
        market: response.source || "生意社",
        specification: "现货",
        mainPrice: String(record.price),
        changePercent: record.change_percent != null ? String(record.change_percent) : null,
        unit: record.unit || "元/吨",
        source: response.source || "AKShare",
      }).onConflictDoNothing()

      inserted++
    } catch (e) {
      // 忽略重复键错误
      skipped++
    }
  }

  return { inserted, skipped }
}

async function ingestBDIData(response: CommodityDataResponse): Promise<{ inserted: number; skipped: number }> {
  // BDI 数据暂存入 port_inventory 表（后续可扩展到独立表）
  if (!db) return { inserted: 0, skipped: 0 }

  let inserted = 0
  let skipped = 0

  for (const record of response.data) {
    try {
      await db.insert(portInventory).values({
        date: record.date,
        commodityCode: "bdi",
        inventory: String(record.price),
        price: null,
        source: response.source || "AKShare",
      }).onConflictDoNothing()

      inserted++
    } catch {
      skipped++
    }
  }

  return { inserted, skipped }
}

/**
 * 检测大幅价格波动，创建通知
 */
async function checkPriceAlerts(allData: Record<string, CommodityDataResponse>) {
  if (!db) return

  for (const [code, response] of Object.entries(allData)) {
    if (!response?.data || response.data.length < 2) continue

    const nameMap: Record<string, string> = {
      sulfur: "硫磺", phosphate: "磷矿石", potash: "钾肥", urea: "尿素",
    }

    const latest = response.data[response.data.length - 1]
    const previous = response.data[response.data.length - 2]

    if (latest.change_percent && Math.abs(latest.change_percent) > 3) {
      const direction = latest.change_percent > 0 ? "上涨" : "下跌"
      const name = nameMap[code] || code

      try {
        await db.insert(notifications).values({
          id: crypto.randomUUID() as never,
          type: "price_alert",
          title: `${name}价格大幅${direction}`,
          content: `${name}当日价格 ${latest.price} 元/吨，${direction} ${Math.abs(latest.change_percent).toFixed(1)}%，请关注市场变化。`,
          createdAt: new Date(),
        } as never)
      } catch (e) {
        console.warn(`创建价格告警通知失败 (${code}):`, e)
      }
    }
  }
}
