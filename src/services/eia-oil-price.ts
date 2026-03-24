/**
 * EIA 原油价格数据服务
 * API 文档: https://www.eia.gov/opendata/v1/documentation
 */

// EIA API 配置
const EIA_API_KEY = "R0dpSMdgGXg6Je57FdVpyfX7db8lbyf52y3dtoeO"
const EIA_BASE_URL = "https://api.eia.gov/v2"

// 原油价格数据类型
export interface OilPriceData {
  date: string
  price: number
  unit: string
  series: "Brent" | "WTI"
}

export interface OilPriceResponse {
  response: {
    data: Array<{
      period: string
      value: string
      units: string
      series: string
    }>
  }
}

export interface OilPriceSummary {
  currentPrice: number
  previousPrice: number
  change: number
  changePercent: number
  high: number
  low: number
  avg: number
  dateRange: {
    start: string
    end: string
  }
  dataPoints: number
}

/**
 * 获取布伦特原油价格
 * @param days 获取最近多少天的数据，默认 30 天
 */
export async function fetchBrentOilPrice(days = 30): Promise<OilPriceData[]> {
  return fetchOilPrice("RBRTE", days)
}

/**
 * 获取 WTI 原油价格
 * @param days 获取最近多少天的数据，默认 30 天
 */
export async function fetchWTIOilPrice(days = 30): Promise<OilPriceData[]> {
  return fetchOilPrice("RWTC", days)
}

/**
 * 通用原油价格获取函数
 */
async function fetchOilPrice(series: string, days: number): Promise<OilPriceData[]> {
  const endDate = new Date().toISOString().split("T")[0]
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const url = new URL(`${EIA_BASE_URL}/petroleum/pri/spt/data/`)
  url.searchParams.set("api_key", EIA_API_KEY)
  url.searchParams.set("frequency", "daily")
  url.searchParams.set("facets[series][]", series)
  url.searchParams.set("start", startDate)
  url.searchParams.set("end", endDate)
  url.searchParams.set("sort[0][column]", "period")
  url.searchParams.set("sort[0][direction]", "desc")
  url.searchParams.set("length", String(days + 10)) // 多取几天防止非交易日

  try {
    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 }, // 缓存 1 小时
    })

    if (!response.ok) {
      throw new Error(`EIA API 请求失败: ${response.status}`)
    }

    const data: OilPriceResponse = await response.json()

    return data.response.data
      .filter((item) => item.value && item.period)
      .map((item) => ({
        date: item.period,
        price: parseFloat(item.value),
        unit: item.units || "USD/BBL",
        series: (series === "RBRTE" ? "Brent" : "WTI") as "Brent" | "WTI",
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  } catch (error) {
    console.error(`获取 ${series} 原油价格失败:`, error)
    return []
  }
}

/**
 * 获取原油价格摘要统计
 */
export async function getOilPriceSummary(
  type: "brent" | "wti" = "brent",
  days = 30
): Promise<OilPriceSummary | null> {
  const data =
    type === "brent" ? await fetchBrentOilPrice(days) : await fetchWTIOilPrice(days)

  if (data.length === 0) {
    return null
  }

  const prices = data.map((d) => d.price)
  const currentPrice = prices[prices.length - 1]
  const previousPrice = prices.length > 1 ? prices[prices.length - 2] : currentPrice
  const change = currentPrice - previousPrice
  const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0

  return {
    currentPrice,
    previousPrice,
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    high: Math.max(...prices),
    low: Math.min(...prices),
    avg: parseFloat((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)),
    dateRange: {
      start: data[0].date,
      end: data[data.length - 1].date,
    },
    dataPoints: data.length,
  }
}

/**
 * 获取两种原油价格的对比数据
 */
export async function getOilPriceComparison(days = 30): Promise<{
  brent: OilPriceData[]
  wti: OilPriceData[]
  spread: Array<{ date: string; spread: number }>
}> {
  const [brent, wti] = await Promise.all([fetchBrentOilPrice(days), fetchWTIOilPrice(days)])

  // 计算价差
  const brentMap = new Map(brent.map((d) => [d.date, d.price]))
  const spread: Array<{ date: string; spread: number }> = []

  for (const wtiData of wti) {
    const brentPrice = brentMap.get(wtiData.date)
    if (brentPrice !== undefined) {
      spread.push({
        date: wtiData.date,
        spread: parseFloat((brentPrice - wtiData.price).toFixed(2)),
      })
    }
  }

  return { brent, wti, spread }
}

/**
 * 原油价格对硫磺价格的影响分析
 * 原油价格与硫磺价格存在一定相关性，主要通过以下路径传导：
 * 1. 原油 -> 炼厂开工率 -> 硫磺产量 -> 硫磺供给
 * 2. 原油 -> 运输成本 -> 硫磺进口成本
 */
export function analyzeOilSulfurCorrelation(
  oilPrice: number,
  prevOilPrice: number
): {
  trend: "up" | "down" | "stable"
  sulfurImpact: string
  confidence: "high" | "medium" | "low"
} {
  const changePercent = ((oilPrice - prevOilPrice) / prevOilPrice) * 100

  let trend: "up" | "down" | "stable"
  let sulfurImpact: string
  let confidence: "high" | "medium" | "low"

  if (changePercent > 5) {
    trend = "up"
    sulfurImpact = "原油大幅上涨可能推高运输成本，硫磺进口价格可能上涨；炼厂开工率可能提升，硫磺供给增加"
    confidence = "medium"
  } else if (changePercent > 2) {
    trend = "up"
    sulfurImpact = "原油上涨对硫磺价格有温和支撑，运输成本小幅上升"
    confidence = "medium"
  } else if (changePercent < -5) {
    trend = "down"
    sulfurImpact = "原油大幅下跌可能降低运输成本，硫磺进口价格可能下降；炼厂开工率可能下降，硫磺供给减少"
    confidence = "medium"
  } else if (changePercent < -2) {
    trend = "down"
    sulfurImpact = "原油下跌对硫磺价格有一定压制，运输成本小幅下降"
    confidence = "medium"
  } else {
    trend = "stable"
    sulfurImpact = "原油价格稳定，对硫磺价格影响中性"
    confidence = "high"
  }

  return { trend, sulfurImpact, confidence }
}