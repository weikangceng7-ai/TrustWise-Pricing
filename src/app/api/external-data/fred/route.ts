import { NextResponse } from "next/server"

/**
 * FRED (Federal Reserve Economic Data) API
 * 文档：https://fred.stlouisfed.org/docs/api/fred/
 * 需要申请 API Key: https://fred.stlouisfed.org/docs/api/api_key.html
 */

export const maxDuration = 30

const FRED_API_BASE = "https://api.stlouisfed.org/fred"

// 常用经济指标 ID
const ECONOMIC_INDICATORS = {
  // 利率
  FED_FUNDS_RATE: "FEDFUNDS",           // 联邦基金利率
  DGS10: "DGS10",                        // 10年期国债收益率

  // 通胀
  CPI: "CPIAUCSL",                       // 消费者物价指数
  CORE_CPI: "CPILFESL",                  // 核心CPI
  PCE: "PCEPI",                          // 个人消费支出物价指数

  // 就业
  UNEMPLOYMENT_RATE: "UNRATE",           // 失业率
  NONFARM_PAYROLLS: "PAYEMS",            // 非农就业人数

  // GDP
  GDP: "GDP",                            // 国内生产总值
  REAL_GDP: "GDPC1",                     // 实际GDP

  // 汇率相关
  DEXCHUS: "DEXCHUS",                    // 人民币兑美元汇率
  DEXUSEU: "DEXUSEU",                    // 欧元兑美元汇率

  // 商品
  OIL_PRICE: "DCOILWTICO",               // WTI原油价格
  NATURAL_GAS: "DHHNGSP",                // 天然气价格
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const seriesId = searchParams.get("series_id") || "DCOILWTICO"
  const apiKey = process.env.FRED_API_KEY

  if (!apiKey) {
    // 返回模拟数据
    return NextResponse.json({
      success: true,
      source: "FRED",
      series_id: seriesId,
      data: getMockSeriesData(seriesId),
      timestamp: new Date().toISOString(),
      note: "模拟数据，请配置 FRED_API_KEY 环境变量获取真实数据"
    })
  }

  try {
    const url = `${FRED_API_BASE}/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=2024-01-01`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`FRED API returned ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      source: "FRED",
      series_id: seriesId,
      series_info: {
        title: data.title || getSeriesTitle(seriesId),
        units: data.units || "",
        frequency: data.frequency || ""
      },
      data: parseObservations(data.observations),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("FRED API error:", error)
    return NextResponse.json({
      success: true,
      source: "FRED",
      series_id: seriesId,
      data: getMockSeriesData(seriesId),
      timestamp: new Date().toISOString(),
      note: "使用模拟数据，FRED API 调用失败"
    })
  }
}

function parseObservations(observations: any[]) {
  if (!Array.isArray(observations)) return []

  return observations
    .filter(obs => obs.value !== ".")
    .map(obs => ({
      date: obs.date,
      value: parseFloat(obs.value)
    }))
    .slice(-90) // 最近90天
}

function getMockSeriesData(seriesId: string) {
  const config = {
    DCOILWTICO: { name: "WTI原油价格", unit: "美元/桶", base: 75 },
    DHHNGSP: { name: "天然气价格", unit: "美元/百万英热", base: 2.5 },
    DEXCHUS: { name: "人民币兑美元汇率", unit: "人民币/美元", base: 7.24 },
    FEDFUNDS: { name: "联邦基金利率", unit: "%", base: 5.25 },
    UNRATE: { name: "失业率", unit: "%", base: 4.0 },
    CPIAUCSL: { name: "消费者物价指数", unit: "指数", base: 310 },
    GDP: { name: "GDP", unit: "十亿美元", base: 27000 },
  }

  const info = config[seriesId as keyof typeof config] || { name: seriesId, unit: "", base: 100 }
  const now = new Date()
  const data = []

  for (let i = 89; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    const fluctuation = (Math.random() - 0.5) * info.base * 0.05

    data.push({
      date: date.toISOString().split("T")[0],
      value: Number((info.base + fluctuation).toFixed(2))
    })
  }

  return {
    name: info.name,
    unit: info.unit,
    observations: data
  }
}

function getSeriesTitle(seriesId: string): string {
  const titles: Record<string, string> = {
    DCOILWTICO: "WTI原油现货价格",
    DHHNGSP: "亨利枢纽天然气现货价格",
    DEXCHUS: "人民币兑美元汇率",
    FEDFUNDS: "联邦基金有效利率",
    UNRATE: "失业率",
    CPIAUCSL: "消费者物价指数",
    CPILFESL: "核心消费者物价指数",
    GDP: "国内生产总值",
    GDPC1: "实际国内生产总值",
  }
  return titles[seriesId] || seriesId
}

// 导出指标 ID 供前端使用
export { ECONOMIC_INDICATORS }