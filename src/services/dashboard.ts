import { getPriceSummary, getInventorySummary } from "@/services/prices"
import { db } from "@/db"
import { sql } from "drizzle-orm"
import { getRedis } from "@/lib/redis"

// 仪表盘聚合数据缓存时长（秒）
const CACHE_TTL_SECONDS = 300
const cacheKey = (commodity: string) => `dashboard:${commodity}`

export interface DashboardData {
  priceSummary: ReturnType<typeof getPriceSummary> extends Promise<infer T> ? T : never
  inventorySummary: ReturnType<typeof getInventorySummary> extends Promise<infer T> ? T : never
  enterprisePredictions: Array<{
    id: string
    name: string
    price: string
    trend: string
    confidence: string | null
    predictedDate: string
    source: string
  }>
}

// 窗口函数查询返回的原始行（与 SQL 中 SELECT 的列一一对应）
type EnterprisePredictionRow = {
  enterprise_name: string
  enterprise_code: string
  date: string
  actual_price: string | null
  predicted_price: string | null
  lower_bound: string | null
  upper_bound: string | null
  confidence: string | null
  model_type: string | null
  rn: string | number
}

export async function fetchDashboardData(commodity: string = "sulfur"): Promise<DashboardData | null> {
  if (!db) return null

  // 优先读 Redis 缓存，降低窗口函数查询对数据库的压力
  const redis = getRedis()
  if (redis) {
    try {
      const cached = await redis.get(cacheKey(commodity))
      if (cached) return JSON.parse(cached) as DashboardData
    } catch (error) {
      console.error("读取仪表盘缓存失败:", error)
    }
  }

  try {
    const [priceSummary, inventorySummary, predictionsResult] = await Promise.all([
      getPriceSummary(commodity),
      getInventorySummary(commodity),
      db.execute<EnterprisePredictionRow>(sql`
        WITH latest AS (
          SELECT
            enterprise_name,
            enterprise_code,
            date,
            actual_price,
            predicted_price,
            lower_bound,
            upper_bound,
            confidence,
            model_type,
            ROW_NUMBER() OVER (
              PARTITION BY enterprise_code
              ORDER BY date DESC
            ) AS rn
          FROM enterprise_price_predictions
          WHERE commodity_code = ${commodity}
            AND predicted_price IS NOT NULL
        )
        SELECT * FROM latest WHERE rn = 1
        ORDER BY enterprise_name
      `),
    ])

    const enterprisePredictions = predictionsResult.map((row) => {
      const predictedPrice = Number(row.predicted_price || 0)
      const actualPrice = row.actual_price ? Number(row.actual_price) : null
      const changePercent = actualPrice
        ? ((predictedPrice - actualPrice) / actualPrice * 100)
        : 0

      return {
        id: row.enterprise_code,
        name: row.enterprise_name,
        price: `¥${predictedPrice.toLocaleString()}`,
        trend: changePercent > 0.5 ? "rise" : changePercent < -0.5 ? "down" : "stable",
        confidence: row.confidence ? Number(row.confidence).toFixed(1) : null,
        predictedDate: row.date,
        source: "AI 模型预测",
      }
    })

    const data: DashboardData = {
      priceSummary,
      inventorySummary,
      enterprisePredictions,
    }

    // 写缓存（异步，失败不影响主流程）
    if (redis) {
      redis.set(cacheKey(commodity), JSON.stringify(data), "EX", CACHE_TTL_SECONDS).catch((error) => {
        console.error("写入仪表盘缓存失败:", error)
      })
    }

    return data
  } catch (error) {
    console.error("fetchDashboardData 失败:", error)
    return null
  }
}
