import { NextResponse } from "next/server"
import {
  fetchCommoditySpot,
  fetchBDI,
  fetchAllCommodities,
  type CommodityDataResponse,
} from "@/lib/akshare-client"
import {
  fetchSulfurSpot,
  fetchPotashSpot,
  fetchUreaSpot,
  fetchPhosphateSpot,
  fetchBDIIndex,
  fetchAllCommoditiesDirect,
} from "@/lib/commodity-scraper"
import { DATA_SOURCE_CONFIG } from "@/lib/constants"
import { fetchWithRetry } from "@/lib/external-fetch"
import { getExternalDataCache, setExternalDataCache, isCacheFresh } from "@/lib/external-data-cache"

/**
 * AkShare 数据 API
 * 文档：https://akshare.akfamily.xyz/
 *
 * 数据来源:
 * - 汇率: Frankfurter API (欧洲央行数据)
 * - 原油: FRED API (美联储经济数据)
 * - BDI: AKShare Python 服务 或 模拟数据
 * - 大宗商品现货: AKShare Python 服务（生意社）
 * - 新闻: GDELT API
 */

export const maxDuration = 30

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "oil"

  try {
    // 汇率使用实时 API
    if (type === "usdcny") {
      return await fetchRealtimeExchangeRate()
    }

    // WTI 原油使用 FRED API
    if (type === "oil") {
      return await fetchRealtimeFredPrice("oil", "DCOILWTICO", "WTI原油现货", "oil")
    }

    // 布伦特原油使用 FRED API
    if (type === "brent") {
      return await fetchRealtimeFredPrice("brent", "DCOILBRENTEU", "布伦特原油现货", "brent")
    }

    // BDI 指数（从 Python AKShare 服务获取，不可用时 fallback）
    if (type === "bdi") {
      return await fetchRealtimeBDIFromService()
    }

    // 大宗商品现货价格（从 Python AKShare 服务获取）
    if (type === "sulfur_spot" || type === "phosphate" || type === "potash" || type === "urea") {
      const code = type === "sulfur_spot" ? "sulfur" : type
      return await fetchCommoditySpotFromService(code)
    }

    // 所有品种批量获取
    if (type === "commodity_all") {
      return await fetchAllCommoditiesFromService()
    }

    // 其他指标使用模拟数据
    const mockData = getMockData(type)

    return NextResponse.json({
      success: true,
      isMock: true,
      isStale: false,
      tier: "mock",
      source: "AkShare",
      type: type,
      data: mockData,
      timestamp: new Date().toISOString(),
      note: "模拟数据，实际部署需配置 Python 环境调用 AkShare"
    })
  } catch (error) {
    console.error("AkShare API error:", error)
    return NextResponse.json(
      { success: false, error: "获取数据失败" },
      { status: 500 }
    )
  }
}

// 行情时序数据统一结构（汇率/原油/布伦特共用）
interface PriceSeriesData {
  name: string
  unit: string
  latest: { date: string; value: number; change: number; changePercent: number }
  history: Array<{ date: string; value: number; change: number; changePercent: number }>
}

type DataTier = "realtime" | "backup" | "fresh-cache" | "stale-cache" | "mock"

function priceSeriesResponse(
  data: PriceSeriesData,
  type: string,
  tier: DataTier,
  source: string,
  note: string,
  cachedAt?: string
) {
  return {
    success: true,
    isMock: tier === "mock",
    isStale: tier === "stale-cache",
    tier,
    source,
    type,
    data,
    timestamp: new Date().toISOString(),
    note,
    ...(cachedAt ? { cachedAt } : {}),
  }
}

/**
 * 从 Frankfurter API 获取汇率（欧洲央行数据），转成统一结构
 */
async function fetchFrankfurterRate(timeoutMs: number): Promise<PriceSeriesData | null> {
  const start = new Date()
  start.setDate(start.getDate() - 31)
  const startStr = start.toISOString().split('T')[0]
  const url = `https://api.frankfurter.dev/v1/${startStr}..?from=USD&to=CNY`

  const res = await fetchWithRetry(url, { timeoutMs })
  if (!res) return null

  try {
    const data = await res.json()
    const rates = data.rates as Record<string, { CNY: number }>
    const dates = Object.keys(rates).sort().slice(-30)
    if (dates.length === 0) return null

    const history = dates.map((date, i) => {
      const value = rates[date].CNY
      const prevValue = i > 0 ? rates[dates[i - 1]].CNY : value
      return {
        date,
        value: Number(value.toFixed(4)),
        change: Number((value - prevValue).toFixed(4)),
        changePercent: Number((((value - prevValue) / prevValue) * 100).toFixed(2)),
      }
    })

    return {
      name: "美元人民币汇率",
      unit: "人民币/美元",
      latest: history[history.length - 1],
      history,
    }
  } catch (error) {
    console.warn("解析 Frankfurter 汇率数据失败:", error)
    return null
  }
}

/**
 * 从 FRED 获取 DEXCHUS 汇率（备用源，需 FRED_API_KEY）
 */
async function fetchFredExchangeRate(timeoutMs: number): Promise<PriceSeriesData | null> {
  const apiKey = process.env.FRED_API_KEY
  if (!apiKey) return null

  const start = new Date()
  start.setDate(start.getDate() - 40)
  const url =
    `https://api.stlouisfed.org/fred/series/observations?series_id=DEXCHUS&api_key=${apiKey}` +
    `&file_type=json&observation_start=${start.toISOString().split('T')[0]}&sort_order=desc&limit=40`

  const res = await fetchWithRetry(url, { timeoutMs })
  if (!res) return null

  try {
    const json = await res.json()
    const obs = (json.observations || [])
      .filter((o: { value: string }) => o.value !== ".")
      .map((o: { date: string; value: string }) => ({ date: o.date, value: parseFloat(o.value) }))
      .sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date))

    if (obs.length < 2) return null

    const history = obs.slice(-30).map((o: { date: string; value: number }, i: number, arr: { value: number }[]) => {
      const prevValue = i > 0 ? arr[i - 1].value : o.value
      return {
        date: o.date,
        value: Number(o.value.toFixed(4)),
        change: Number((o.value - prevValue).toFixed(4)),
        changePercent: Number((((o.value - prevValue) / prevValue) * 100).toFixed(2)),
      }
    })

    return {
      name: "美元人民币汇率",
      unit: "人民币/美元",
      latest: history[history.length - 1],
      history,
    }
  } catch (error) {
    console.warn("解析 FRED 汇率数据失败:", error)
    return null
  }
}

/**
 * 获取实时汇率 - 降级链：Frankfurter → FRED DEXCHUS → Redis 缓存 → 模拟
 */
async function fetchRealtimeExchangeRate() {
  const cacheKey = "usdcny"
  const { timeoutMs, cacheTtlSeconds } = DATA_SOURCE_CONFIG.usdcny

  // 新鲜缓存命中：直接返回，跳过外部 API 调用
  const cached = await getExternalDataCache<ReturnType<typeof priceSeriesResponse>>(cacheKey)
  if (cached && isCacheFresh(cached)) {
    return NextResponse.json(
      priceSeriesResponse(
        cached.data.data,
        "usdcny",
        "fresh-cache",
        cached.data.source,
        "缓存数据（新鲜期内）",
        new Date(cached.cachedAt).toISOString()
      )
    )
  }

  // L0 主源：Frankfurter
  const frankfurter = await fetchFrankfurterRate(timeoutMs)
  if (frankfurter) {
    const payload = priceSeriesResponse(frankfurter, "usdcny", "realtime", "Frankfurter API (欧洲央行)", "实时数据 - 欧洲央行官方汇率")
    await setExternalDataCache(cacheKey, payload, cacheTtlSeconds)
    return NextResponse.json(payload)
  }

  // L1 备用源：FRED DEXCHUS
  const fred = await fetchFredExchangeRate(timeoutMs)
  if (fred) {
    const payload = priceSeriesResponse(fred, "usdcny", "backup", "FRED DEXCHUS", "备用数据源 - 美联储经济数据")
    await setExternalDataCache(cacheKey, payload, cacheTtlSeconds)
    return NextResponse.json(payload)
  }

  // L3 过期缓存兜底（实时源全部失败，返回最后可用值）
  if (cached) {
    return NextResponse.json(
      priceSeriesResponse(
        cached.data.data,
        "usdcny",
        "stale-cache",
        cached.data.source,
        "实时数据源不可用，返回缓存数据",
        new Date(cached.cachedAt).toISOString()
      )
    )
  }

  // L4 兜底：模拟数据
  const mockData = getMockData("usdcny")
  return NextResponse.json(
    priceSeriesResponse(mockData, "usdcny", "mock", "AkShare (模拟)", "实时 API 不可用，使用模拟数据")
  )
}

/**
 * 获取实时原油/布伦特价格 - 降级链：FRED → Redis 缓存 → 模拟
 */
async function fetchRealtimeFredPrice(
  type: "oil" | "brent",
  seriesId: string,
  name: string,
  cacheKey: string
) {
  const { timeoutMs, cacheTtlSeconds } = DATA_SOURCE_CONFIG[type]
  const apiKey = process.env.FRED_API_KEY

  // 新鲜缓存命中
  const cached = await getExternalDataCache<ReturnType<typeof priceSeriesResponse>>(cacheKey)
  if (cached && isCacheFresh(cached)) {
    return NextResponse.json(
      priceSeriesResponse(
        cached.data.data,
        type,
        "fresh-cache",
        cached.data.source,
        "缓存数据（新鲜期内）",
        new Date(cached.cachedAt).toISOString()
      )
    )
  }

  // L0 主源：FRED
  if (apiKey) {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=2025-01-01`
    const response = await fetchWithRetry(url, { timeoutMs })

    if (response) {
      try {
        const data = await response.json()
        const validData = (data.observations || [])
          .filter((o: { value: string }) => o.value !== "." && o.value !== "NaN")
          .slice(-30)

        if (validData.length >= 2) {
          const history = validData.map((o: { date: string; value: string }, i: number, arr: { value: string }[]) => {
            const val = parseFloat(o.value)
            const prevVal = i > 0 ? parseFloat(arr[i - 1].value) : val
            return {
              date: o.date,
              value: val,
              change: Number((val - prevVal).toFixed(2)),
              changePercent: Number((((val - prevVal) / prevVal) * 100).toFixed(2)),
            }
          })

          const payload = priceSeriesResponse(
            { name, unit: "美元/桶", latest: history[history.length - 1], history },
            type,
            "realtime",
            "FRED API",
            "实时数据 - 美联储经济数据(FRED)官方数据"
          )
          await setExternalDataCache(cacheKey, payload, cacheTtlSeconds)
          return NextResponse.json(payload)
        }
      } catch (error) {
        console.warn(`解析 FRED ${seriesId} 数据失败:`, error)
      }
    }
  }

  // L3 过期缓存兜底
  if (cached) {
    return NextResponse.json(
      priceSeriesResponse(
        cached.data.data,
        type,
        "stale-cache",
        cached.data.source,
        apiKey ? "FRED API 调用失败，返回缓存数据" : "未配置 FRED_API_KEY，返回缓存数据",
        new Date(cached.cachedAt).toISOString()
      )
    )
  }

  // L4 兜底：模拟数据
  const mockData = getMockData(type)
  return NextResponse.json(
    priceSeriesResponse(
      mockData,
      type,
      "mock",
      "FRED (模拟)",
      apiKey ? "API 调用失败，使用模拟数据" : "未配置 FRED_API_KEY，使用模拟数据"
    )
  )
}

/**
 * 获取实时 BDI 指数
 */
async function fetchRealtimeBDI() {
  try {
    // BDI 数据较难获取免费 API，使用模拟数据
    // 实际部署可接入 Bloomberg、Reuters 或付费数据源
    const baseValue = 1500 + (Math.random() - 0.5) * 500 // 1250-1750 范围

    const now = new Date()
    const history: Array<{
      date: string
      value: number
      change: number
      changePercent: number
    }> = []

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      // 跳过周末
      if (date.getDay() === 0 || date.getDay() === 6) continue

      const value = baseValue + (Math.random() - 0.5) * 100
      const prevValue: number = history.length > 0 ? history[history.length - 1].value : value

      history.push({
        date: dateStr,
        value: Number(value.toFixed(0)),
        change: Number((value - prevValue).toFixed(0)),
        changePercent: Number((((value - prevValue) / prevValue) * 100).toFixed(2))
      })
    }

    const latest = history[history.length - 1]

    return NextResponse.json({
      success: true,
      isMock: true,
      isStale: false,
      tier: "mock",
      source: "BDI (模拟)",
      type: "bdi",
      data: {
        name: "波罗的海干散货指数",
        unit: "点",
        latest: {
          date: latest.date,
          value: latest.value,
          change: latest.change,
          changePercent: latest.changePercent
        },
        history: history.slice(-30)
      },
      timestamp: new Date().toISOString(),
      note: "模拟数据，实际部署需接入专业数据源"
    })
  } catch (error) {
    console.error("获取BDI指数失败:", error)
    const mockData = getMockData("bdi")
    return NextResponse.json({
      success: true,
      isMock: true,
      isStale: false,
      tier: "mock",
      source: "AkShare (模拟)",
      type: "bdi",
      data: mockData,
      timestamp: new Date().toISOString(),
      note: "使用模拟数据"
    })
  }
}

/** 把 BDI 记录转成统一行情结构（补齐 latest，与原油/汇率形状一致） */
function buildBdiPriceSeries(records: Array<{ date: string; price: number }>): PriceSeriesData {
  const history = records.map((d, i) => {
    const prev = i > 0 ? records[i - 1].price : d.price
    return {
      date: d.date,
      value: d.price,
      change: Number((d.price - prev).toFixed(2)),
      changePercent: Number((((d.price - prev) / prev) * 100).toFixed(2)),
    }
  })
  const latest = history[history.length - 1] || { date: "", value: 0, change: 0, changePercent: 0 }
  return { name: "波罗的海干散货指数", unit: "指数", latest, history }
}

/**
 * 获取实时 BDI 指数 - 降级链：新浪直连 → Python AKShare → Redis 缓存 → 模拟
 */
async function fetchRealtimeBDIFromService() {
  const cacheKey = "bdi"
  const { cacheTtlSeconds } = DATA_SOURCE_CONFIG.bdi

  // 新鲜缓存命中
  const cached = await getExternalDataCache<ReturnType<typeof priceSeriesResponse>>(cacheKey)
  if (cached && isCacheFresh(cached)) {
    return NextResponse.json(
      priceSeriesResponse(
        cached.data.data,
        "bdi",
        "fresh-cache",
        cached.data.source,
        "缓存数据（新鲜期内）",
        new Date(cached.cachedAt).toISOString()
      )
    )
  }

  // 先尝试 TypeScript 直连新浪财经
  try {
    const direct = await fetchBDIIndex()
    if (direct && direct.data.length > 0 && !direct.source.includes("模拟")) {
      const payload = priceSeriesResponse(
        buildBdiPriceSeries(direct.data),
        "bdi",
        "realtime",
        direct.source,
        "实时数据 - Baltic Exchange"
      )
      await setExternalDataCache(cacheKey, payload, cacheTtlSeconds)
      return NextResponse.json(payload)
    }
  } catch (e) {
    console.warn("Direct BDI scraper failed:", e)
  }

  // Fallback 到 Python 服务
  try {
    const data = await fetchBDI()
    if (data && data.data.length > 0) {
      const isMock = data.source.includes("模拟")
      const payload = priceSeriesResponse(
        buildBdiPriceSeries(data.data),
        "bdi",
        isMock ? "mock" : "backup",
        data.source,
        data.note || "实时数据 - AKShare (Baltic Exchange)"
      )
      if (!isMock) await setExternalDataCache(cacheKey, payload, cacheTtlSeconds)
      return NextResponse.json(payload)
    }
  } catch (e) {
    console.warn("Python AKShare BDI 服务不可用, fallback 到模拟数据")
  }

  // 过期缓存兜底
  if (cached) {
    return NextResponse.json(
      priceSeriesResponse(
        cached.data.data,
        "bdi",
        "stale-cache",
        cached.data.source,
        "实时数据源不可用，返回缓存数据",
        new Date(cached.cachedAt).toISOString()
      )
    )
  }

  return await fetchRealtimeBDI()
}

/**
 * 获取大宗商品现货价格
 * 优先使用 TypeScript 直连生意社，不可用时 fallback 到 Python 服务
 */
async function fetchCommoditySpotFromService(code: string) {
  const cacheKey = `spot:${code}`
  const { cacheTtlSeconds } = DATA_SOURCE_CONFIG.spot
  const nameMap: Record<string, string> = {
    sulfur: "硫磺", phosphate: "磷矿石", potash: "钾肥", urea: "尿素",
  }
  const name = nameMap[code] || code

  type SpotData = { name: string; unit: string; history: Array<{ date: string; value: number; changePercent: number | null }> }

  // 新鲜缓存命中
  const cached = await getExternalDataCache<{ source: string; data: SpotData }>(cacheKey)
  if (cached && isCacheFresh(cached)) {
    return NextResponse.json({
      success: true,
      isMock: false,
      isStale: false,
      tier: "fresh-cache",
      source: cached.data.source,
      type: code,
      data: cached.data.data,
      timestamp: new Date().toISOString(),
      note: "缓存数据（新鲜期内）",
      cachedAt: new Date(cached.cachedAt).toISOString(),
    })
  }

  // 先尝试 TypeScript 直连
  try {
    const scraperMap: Record<string, () => Promise<CommodityDataResponse>> = {
      sulfur: () => fetchSulfurSpot(90),
      phosphate: () => fetchPhosphateSpot(90),
      potash: () => fetchPotashSpot(90),
      urea: () => fetchUreaSpot(90),
    }
    const directFn = scraperMap[code]
    if (directFn) {
      const direct = await directFn()
      if (direct && direct.data.length > 0 && !direct.source.includes("模拟")) {
        const spotData: SpotData = {
          name,
          unit: "元/吨",
          history: direct.data.map((d) => ({
            date: d.date,
            value: d.price,
            changePercent: d.change_percent ?? null,
          })),
        }
        await setExternalDataCache(cacheKey, { source: direct.source, data: spotData }, cacheTtlSeconds)
        return NextResponse.json({
          success: true,
          isMock: false,
          isStale: false,
          tier: "realtime",
          source: direct.source,
          type: code,
          data: spotData,
          timestamp: new Date().toISOString(),
          note: `实时数据 - ${direct.source}`,
        })
      }
    }
  } catch (e) {
    console.warn(`Direct scraper failed for ${code}:`, e)
  }

  // Fallback 到 Python 服务
  try {
    const data = await fetchCommoditySpot(code)
    if (data && data.data.length > 0) {
      const isMock = data.source.includes("模拟")
      const spotData: SpotData = {
        name,
        unit: "元/吨",
        history: data.data.map((d) => ({
          date: d.date,
          value: d.price,
          changePercent: d.change_percent ?? null,
        })),
      }
      if (!isMock) await setExternalDataCache(cacheKey, { source: data.source, data: spotData }, cacheTtlSeconds)
      return NextResponse.json({
        success: true,
        isMock,
        isStale: false,
        tier: isMock ? "mock" : "backup",
        source: data.source,
        type: code,
        data: spotData,
        timestamp: new Date().toISOString(),
        note: data.note || `实时数据 - ${data.source}`,
      })
    }
  } catch (e) {
    console.warn(`Python AKShare 服务不可用 (${code}), fallback 到模拟数据`)
  }

  // 过期缓存兜底
  if (cached) {
    return NextResponse.json({
      success: true,
      isMock: false,
      isStale: true,
      tier: "stale-cache",
      source: cached.data.source,
      type: code,
      data: cached.data.data,
      timestamp: new Date().toISOString(),
      note: "实时数据源不可用，返回缓存数据",
      cachedAt: new Date(cached.cachedAt).toISOString(),
    })
  }

  const mockData = getMockData(code)
  return NextResponse.json({
    success: true,
    isMock: true,
    isStale: false,
    tier: "mock",
    source: "AKShare (模拟)",
    type: code,
    data: mockData,
    timestamp: new Date().toISOString(),
    note: "Python AKShare 服务不可达，使用模拟数据",
  })
}

/**
 * 批量获取所有大宗商品数据
 * 优先使用 TypeScript 直连，不可用时 fallback 到 Python 服务
 */
async function fetchAllCommoditiesFromService() {
  // 先尝试 TypeScript 直连
  try {
    const direct = await fetchAllCommoditiesDirect(30)
    const mockCount = Object.values(direct).filter((r) =>
      r.source.includes("模拟")
    ).length
    if (mockCount < Object.keys(direct).length) {
      return NextResponse.json({
        success: true,
        source: "生意社 (100ppi.com)",
        type: "commodity_all",
        data: direct,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (e) {
    console.warn("Direct scraper batch failed:", e)
  }

  // Fallback 到 Python 服务
  try {
    const allData = await fetchAllCommodities()
    if (allData) {
      return NextResponse.json({
        success: true,
        source: "AKShare (生意社)",
        type: "commodity_all",
        data: allData,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (e) {
    console.warn("Python AKShare 服务不可用, 无法批量获取")
  }

  return NextResponse.json({
    success: false,
    error: "Python AKShare 服务不可达",
    note: "请启动 python-service 后重试",
  }, { status: 503 })
}

function getMockData(type: string) {
  const basePrice = {
    oil: 75.5,      // WTI 原油
    brent: 79.2,    // 布伦特原油
    usdcny: 7.24,   // 美元人民币汇率
    bdi: 1650,      // 波罗的海干散货指数
  }

  const now = new Date()
  const data = []

  // 生成最近30天的模拟数据
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    const baseValue = basePrice[type as keyof typeof basePrice] || 100
    const fluctuation = (Math.random() - 0.5) * baseValue * 0.1

    data.push({
      date: date.toISOString().split("T")[0],
      value: Number((baseValue + fluctuation).toFixed(2)),
      change: Number(((Math.random() - 0.5) * 5).toFixed(2)),
      changePercent: Number(((Math.random() - 0.5) * 3).toFixed(2))
    })
  }

  return {
    name: getTypeName(type),
    unit: getUnit(type),
    latest: data[data.length - 1],
    history: data
  }
}

function getTypeName(type: string): string {
  const names: Record<string, string> = {
    oil: "WTI原油期货",
    brent: "布伦特原油期货",
    usdcny: "美元人民币汇率",
    bdi: "波罗的海干散货指数"
  }
  return names[type] || type
}

function getUnit(type: string): string {
  const units: Record<string, string> = {
    oil: "美元/桶",
    brent: "美元/桶",
    usdcny: "人民币/美元",
    bdi: "点"
  }
  return units[type] || ""
}