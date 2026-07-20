/**
 * 生意社大宗商品数据直连爬取模块
 *
 * 将 Python 端 CommodityDataFetcher 的核心爬取逻辑移植到 TypeScript，
 * 使 Vercel serverless 环境无需依赖外部 Python 服务即可直接获取数据。
 *
 * Python 端参考: python-service/app.py (CommodityDataFetcher class)
 */

import * as cheerio from "cheerio"

// ---- 数据结构（与 akshare-client.ts 保持一致） ----

export interface CommodityPriceRecord {
  date: string
  price: number
  change_percent?: number | null
  unit: string
}

export interface CommodityDataResponse {
  success: boolean
  source: string
  commodity_code: string
  data: CommodityPriceRecord[]
  count: number
  note?: string
}

// ---- 工具函数 ----

/** 转义正则特殊字符（等价于 Python re.escape） */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** 简单字符串 hash，用于确定性种子 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/** 确定性伪随机数生成器 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

// ---- HTTP 请求（替代 curl_cffi） ----

async function fetchWithBrowserHeaders(
  url: string,
  extraHeaders?: Record<string, string>
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Referer: "https://www.100ppi.com/",
        ...extraHeaders,
      },
    })
  } finally {
    clearTimeout(timer)
  }
}

// ---- 爬取：每日现货价格表 ----

/**
 * 从生意社获取当日现货价格表
 * 等价于 Python _fetch_100ppi_basis_table()
 * URL: https://www.100ppi.com/sf/day-YYYY-MM-DD.html
 */
async function fetchSpotTable(
  targetDate: Date = new Date()
): Promise<Record<string, number> | null> {
  const dateStr = targetDate.toISOString().split("T")[0]
  const url = `https://www.100ppi.com/sf/day-${dateStr}.html`

  try {
    const res = await fetchWithBrowserHeaders(url)
    if (res.status !== 200) return null

    const html = await res.text()
    const $ = cheerio.load(html)

    // 找最大的表格（>50 行），同 Python 端逻辑
    let dataTable: ReturnType<typeof $> | null = null
    $("table").each((_i, el) => {
      const rows = $(el).find("tr")
      if (rows.length > 50) {
        dataTable = $(el)
        return false
      }
    })
    if (!dataTable) return null

    const skipNames = new Set([
      "商品",
      "上海期货交易所",
      "郑州商品交易所",
      "大连商品交易所",
      "广州期货交易所",
    ])

    const result: Record<string, number> = {}
    dataTable.find("tr").each((_i, row) => {
      const cells = $(row).find("td")
      if (cells.length < 7) return

      const name = $(cells[0]).text().trim()
      if (!name || skipNames.has(name)) return

      const spotStr = $(cells[1]).text().trim()
      const price = parseFloat(spotStr.replace(/,/g, ""))
      if (!isNaN(price)) {
        result[name] = price
      }
    })

    return Object.keys(result).length > 0 ? result : null
  } catch (e) {
    console.warn("fetchSpotTable 失败:", e)
    return null
  }
}

// ---- 爬取：基准价新闻列表 ----

/**
 * 从生意社新闻列表页抓取基准价历史数据
 * 等价于 Python _fetch_100ppi_benchmark_news()
 * URL: https://chem.100ppi.com/news/list--{productId}-{page}.html
 *
 * 从标题 "X月X日生意社{name}基准价为XXXX.XX元/吨" 提取日期和价格
 */
async function fetchBenchmarkNews(
  productId: number,
  name: string,
  days: number
): Promise<CommodityPriceRecord[]> {
  const records: CommodityPriceRecord[] = []
  const seenDates = new Set<string>()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // 同 Python 正则: (\d{1,2})月(\d{1,2})日生意社{name}.*?基准价为([\d,]+\.?\d*)元/吨
  const pattern = new RegExp(
    `(\\d{1,2})月(\\d{1,2})日生意社${escapeRegex(name)}.*?基准价为([\\d,]+\\.?\\d*)元/吨`,
    "g"
  )

  for (let page = 1; page <= 20; page++) {
    const url = `https://chem.100ppi.com/news/list--${productId}-${page}.html`
    try {
      const res = await fetchWithBrowserHeaders(url)
      if (res.status !== 200) break

      const html = await res.text()
      const $ = cheerio.load(html)
      let pageHasData = false

      $("a").each((_i, el) => {
        const text = $(el).text().trim()
        // 对每个文本重置正则
        let match: RegExpExecArray | null
        while ((match = pattern.exec(text)) !== null) {
          pageHasData = true
          const month = parseInt(match[1], 10)
          const day = parseInt(match[2], 10)
          const priceStr = match[3].replace(/,/g, "")
          // 跨年处理：月份大于当前月说明是去年
          const year = month <= currentMonth ? currentYear : currentYear - 1
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`

          if (!seenDates.has(dateStr)) {
            seenDates.add(dateStr)
            records.push({
              date: dateStr,
              price: parseFloat(priceStr),
              unit: "元/吨",
            })
          }
        }
      })

      if (!pageHasData) break
      if (records.length >= days) break
    } catch (e) {
      console.warn(`fetchBenchmarkNews page ${page} 失败:`, e)
      break
    }
  }

  return records
}

// ---- 日涨跌幅计算 ----

function computeChangePercent(records: CommodityPriceRecord[]): void {
  for (let i = 1; i < records.length; i++) {
    const prev = records[i - 1]
    const curr = records[i]
    if (prev.price > 0) {
      curr.change_percent = parseFloat(
        (((curr.price - prev.price) / prev.price) * 100).toFixed(2)
      )
    }
  }
}

// ---- 模拟数据生成 ----

function generateMockData(
  code: string,
  name: string,
  days: number
): CommodityDataResponse {
  const basePrices: Record<string, number> = {
    sulfur: 900,
    phosphate: 1130,
    potash: 3570,
    urea: 1810,
  }
  const volatilityMap: Record<string, number> = {
    sulfur: 20,
    phosphate: 15,
    potash: 10,
    urea: 12,
  }

  const base = basePrices[code] ?? 1000
  const vol = volatilityMap[code] ?? 15
  const seed = hashString(code)

  const now = new Date()
  const records: CommodityPriceRecord[] = []
  let currentPrice = base

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    if (d.getDay() === 0 || d.getDay() === 6) continue

    const noise = seededRandom(seed + i) * vol * 2 - vol
    currentPrice = Math.max(base * 0.5, currentPrice + noise)

    records.push({
      date: d.toISOString().split("T")[0],
      price: Math.round(currentPrice * 100) / 100,
      unit: code === "bdi" ? "指数" : "元/吨",
    })
  }

  computeChangePercent(records)

  return {
    success: true,
    source: `模拟数据（${name}）`,
    commodity_code: code,
    data: records,
    count: records.length,
    note: "数据源不可用，使用模拟数据",
  }
}

// ---- 公开 API ----

/** 获取硫磺现货价格 — 生意社基准价新闻页 */
export async function fetchSulfurSpot(days = 90): Promise<CommodityDataResponse> {
  const records = await fetchBenchmarkNews(404, "硫磺", days)
  if (records.length >= 3) {
    records.sort((a, b) => a.date.localeCompare(b.date))
    computeChangePercent(records)
    return {
      success: true,
      source: "生意社硫磺基准价 (100ppi.com)",
      commodity_code: "sulfur",
      data: records.slice(-days),
      count: Math.min(records.length, days),
    }
  }
  return generateMockData("sulfur", "硫磺", days)
}

/** 获取钾肥(氯化钾)现货价格 — 生意社基准价新闻页 */
export async function fetchPotashSpot(days = 90): Promise<CommodityDataResponse> {
  const records = await fetchBenchmarkNews(927, "氯化钾", days)
  if (records.length >= 3) {
    records.sort((a, b) => a.date.localeCompare(b.date))
    computeChangePercent(records)
    return {
      success: true,
      source: "生意社氯化钾基准价 (100ppi.com)",
      commodity_code: "potash",
      data: records.slice(-days),
      count: Math.min(records.length, days),
    }
  }
  return generateMockData("potash", "钾肥", days)
}

/** 获取尿素现货价格 — 生意社每日现期表 */
export async function fetchUreaSpot(days = 90): Promise<CommodityDataResponse> {
  const now = new Date()
  const records: CommodityPriceRecord[] = []
  const maxAttempts = Math.min(days, 7) // 单次最多回溯 7 天满足日常 cron

  let offset = 0
  let attempts = 0
  while (records.length < maxAttempts && attempts < 14) {
    const d = new Date(now)
    d.setDate(d.getDate() - offset)
    offset++
    if (d.getDay() === 0 || d.getDay() === 6) continue
    attempts++

    const spotTable = await fetchSpotTable(d)
    if (spotTable && spotTable["尿素"] !== undefined) {
      records.push({
        date: d.toISOString().split("T")[0],
        price: spotTable["尿素"],
        unit: "元/吨",
      })
    }
  }

  if (records.length >= 3) {
    records.sort((a, b) => a.date.localeCompare(b.date))
    computeChangePercent(records)
    return {
      success: true,
      source: "生意社 (100ppi.com)",
      commodity_code: "urea",
      data: records,
      count: records.length,
    }
  }

  return generateMockData("urea", "尿素", days)
}

/** 获取磷矿石价格 — 基于尿素模型推算 */
export async function fetchPhosphateSpot(
  days = 90,
  preloadedUrea?: CommodityDataResponse
): Promise<CommodityDataResponse> {
  const ureaData = preloadedUrea ?? (await fetchUreaSpot(days))
  const ureaRecords = ureaData.data
  const hasRealUrea = ureaData.source.includes("100ppi")

  const paRecords = await fetchBenchmarkNews(558, "磷酸", days)

  if (hasRealUrea && ureaRecords.length >= 3) {
    const ureaByDate = new Map(ureaRecords.map((r) => [r.date, r.price]))
    const paByDate = new Map(paRecords.map((r) => [r.date, r.price]))
    const allDates = [
      ...new Set([...ureaByDate.keys(), ...paByDate.keys()]),
    ].sort()

    const records: CommodityPriceRecord[] = []
    for (const date of allDates) {
      const ureaPrice = ureaByDate.get(date)
      const paPrice = paByDate.get(date)

      if (ureaPrice !== undefined) {
        let estimated: number
        if (paPrice !== undefined) {
          const paEstimated = paPrice / 9.0
          estimated = ureaPrice * 0.56 * 0.4 + paEstimated * 0.6
        } else {
          estimated = ureaPrice * 0.56
        }
        const noise =
          (seededRandom(hashString(date)) - 0.5) * estimated * 0.03
        records.push({
          date,
          price: Math.round((estimated + noise) * 100) / 100,
          unit: "元/吨",
        })
      } else if (paPrice !== undefined && records.length > 0) {
        const prev = records[records.length - 1].price
        const paEstimated = paPrice / 9.0
        const estimated = prev * 0.5 + paEstimated * 0.5
        records.push({
          date,
          price: Math.round(estimated * 100) / 100,
          unit: "元/吨",
        })
      }
    }

    if (records.length >= 3) {
      computeChangePercent(records)
      const sourceParts = ["尿素现货价格"]
      if (paRecords.length > 0) sourceParts.push("磷酸基准价")
      return {
        success: true,
        source: `模型推算（基于${sourceParts.join("、")}）`,
        commodity_code: "phosphate",
        data: records.slice(-days),
        count: Math.min(records.length, days),
      }
    }
  }

  return generateMockData("phosphate", "磷矿石", days)
}

/** 获取 BDI 指数 — 新浪财经 API（AKShare 底层数据源） */
export async function fetchBDIIndex(): Promise<CommodityDataResponse> {
  try {
    const res = await fetchWithBrowserHeaders(
      "https://hq.sinajs.cn/list=f_BDI",
      { Referer: "https://finance.sina.com.cn/" }
    )
    if (res.ok) {
      const text = await res.text()
      // 新浪返回格式: var hq_str_f_BDI="数据,日期,指数,..."
      const match = text.match(/"([^"]+)"/)
      if (match) {
        const parts = match[1].split(",")
        if (parts.length >= 3) {
          const bdiValue = parseFloat(parts[2])
          if (!isNaN(bdiValue) && bdiValue > 0) {
            // 日期从 parts[1] 提取，格式可能为 YYYY-MM-DD
            const dateStr =
              /^\d{4}-\d{2}-\d{2}$/.test(parts[1])
                ? parts[1]
                : new Date().toISOString().split("T")[0]
            return {
              success: true,
              source: "新浪财经 (Baltic Exchange)",
              commodity_code: "bdi",
              data: [{ date: dateStr, price: bdiValue, unit: "指数" }],
              count: 1,
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn("BDI 新浪财经 API 失败:", e)
  }

  // 降级到模拟数据
  return {
    success: true,
    source: "模拟数据（BDI 数据源不可用）",
    commodity_code: "bdi",
    data: [],
    count: 0,
    note: "BDI 数据源不可用，使用模拟数据",
  }
}

/** 模拟 BDI 历史数据 */
function generateMockBDI(): CommodityDataResponse {
  const seed = 12345
  const now = new Date()
  const records: CommodityPriceRecord[] = []
  let currentValue = 1800

  for (let i = 89; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    if (d.getDay() === 0 || d.getDay() === 6) continue

    const noise = seededRandom(seed + i) * 50 - 25
    currentValue = Math.max(500, Math.min(5000, currentValue + noise))

    records.push({
      date: d.toISOString().split("T")[0],
      price: Math.round(currentValue),
      unit: "指数",
    })
  }

  return {
    success: true,
    source: "模拟数据（AKShare BDI 不可用）",
    commodity_code: "bdi",
    data: records,
    count: records.length,
    note: "BDI 数据源不可用，使用模拟数据",
  }
}

/** 批量获取所有品种数据（并行） */
export async function fetchAllCommoditiesDirect(
  days = 30
): Promise<Record<string, CommodityDataResponse>> {
  const [sulfur, potash, urea, bdiReal] = await Promise.all([
    fetchSulfurSpot(days),
    fetchPotashSpot(days),
    fetchUreaSpot(days),
    fetchBDIIndex(),
  ])

  const phosphate = await fetchPhosphateSpot(days, urea)

  // BDI 新浪 API 只返回当天数据时，用模拟历史数据补充（保证 DB 中有连续记录）
  const bdi: CommodityDataResponse =
    bdiReal.data.length >= 5 ? bdiReal : generateMockBDI()

  return { sulfur, phosphate, potash, urea, bdi }
}
