import { NextResponse } from "next/server"
import { getPrices, getInventory } from "@/services/prices"

/**
 * 每日报告数据生成 API
 * 用于生成动态的报告统计数据（基于真实价格和库存数据）
 */

export const maxDuration = 30

type ReportEntry = {
  id: number
  title: string
  reportDate: string
  summary: string
  recommendation: string
  priceTrend: string
  riskLevel: string
  createdAt: Date
  type: string
  price: number
}

// 基于数据库真实数据生成报告
async function generateDailyReports(): Promise<ReportEntry[]> {
  try {
    const [prices, inventory] = await Promise.all([
      getPrices(90),
      getInventory(30),
    ])

    if (prices.length === 0) return []

    const reports: ReportEntry[] = []
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    // 计算真实趋势
    const latestPrice = Number(prices[0].mainPrice || 0)
    const weekAgoPrice = prices.length >= 7 ? Number(prices[6].mainPrice || 0) : latestPrice
    const monthAgoPrice = prices.length >= 30 ? Number(prices[29].mainPrice || 0) : latestPrice
    const weeklyChange = latestPrice - weekAgoPrice
    const monthlyChange = latestPrice - monthAgoPrice
    const weeklyChangePercent = weekAgoPrice > 0 ? (weeklyChange / weekAgoPrice) * 100 : 0
    const monthlyChangePercent = monthAgoPrice > 0 ? (monthlyChange / monthAgoPrice) * 100 : 0

    const weeklyTrend = weeklyChangePercent > 1 ? "上涨" : weeklyChangePercent < -1 ? "下跌" : weeklyChangePercent > 0.3 ? "小幅上涨" : weeklyChangePercent < -0.3 ? "小幅下跌" : "稳定"
    const monthlyTrend = monthlyChangePercent > 2 ? "上涨" : monthlyChangePercent < -2 ? "下跌" : monthlyChangePercent > 0.5 ? "小幅上涨" : monthlyChangePercent < -0.5 ? "小幅下跌" : "稳定"
    const riskLevel = Math.abs(weeklyChangePercent) > 5 ? "高" : Math.abs(weeklyChangePercent) > 2 ? "中等" : "低"
    const recommendation = weeklyTrend.includes("涨") ? "适当备库" : weeklyTrend.includes("跌") ? "观望" : "按需采购"

    const latestInv = inventory.length > 0 ? Number(inventory[0].inventory || 0) : null
    const invText = latestInv ? `港口库存约${latestInv.toFixed(1)}万吨` : "库存数据暂缺"

    // 周报（最近）
    reports.push({
      id: 1,
      title: `${year}年${month}月硫磺采购分析周报`,
      reportDate: prices[0].date?.toString() || now.toISOString().split("T")[0],
      summary: `【市场概况】最新硫磺均价${latestPrice}元/吨，周环比${weeklyChangePercent >= 0 ? "+" : ""}${weeklyChangePercent.toFixed(1)}%，呈现${weeklyTrend}态势。【价格走势】近7日价格区间${Math.min(latestPrice, weekAgoPrice)}-${Math.max(latestPrice, weekAgoPrice)}元/吨。【库存情况】${invText}。【后市研判】基于近期价格走势，预计短期内将维持${weeklyTrend}态势。`,
      recommendation,
      priceTrend: weeklyTrend,
      riskLevel,
      createdAt: new Date(prices[0].date || now),
      type: "weekly",
      price: latestPrice,
    })

    // 月报
    if (prices.length >= 14) {
      const monthPrices = prices.slice(0, 30).map(p => Number(p.mainPrice || 0)).filter(p => p > 0)
      const monthAvg = monthPrices.length > 0 ? monthPrices.reduce((a, b) => a + b, 0) / monthPrices.length : latestPrice
      reports.push({
        id: 2,
        title: `${year}年${month}月硫磺市场月度分析`,
        reportDate: now.toISOString().split("T")[0],
        summary: `【月度概览】本月硫磺市场呈现${monthlyTrend}态势，月均价${monthAvg.toFixed(0)}元/吨，环比${monthlyChangePercent >= 0 ? "+" : ""}${monthlyChangePercent.toFixed(1)}%。【价格走势】月内价格波动，最新报${latestPrice}元/吨。【库存情况】${invText}。【后市展望】下月预计价格将${monthlyTrend.includes("涨") ? "继续关注上行空间" : monthlyTrend.includes("跌") ? "注意下行风险" : "维持稳定运行"}。`,
        recommendation: monthlyTrend.includes("跌") ? "观望" : "按需采购",
        priceTrend: monthlyTrend,
        riskLevel: Math.abs(monthlyChangePercent) > 5 ? "中等" : "低",
        createdAt: now,
        type: "monthly",
        price: monthAvg,
      })
    }

    // 库存预警报告（当库存异常时）
    if (latestInv && latestInv < 200000) {
      reports.push({
        id: 3,
        title: `${year}年${month}月库存预警专项报告`,
        reportDate: now.toISOString().split("T")[0],
        summary: `【预警级别】黄色预警-需关注。【库存现状】当前港口库存约${latestInv.toFixed(1)}万吨，处于偏低水平。【当前价格】硫磺均价${latestPrice}元/吨。【影响评估】库存偏低可能影响后续生产供应。【应对建议】建议关注补库时机，适当增加采购量。`,
        recommendation: "适当备库",
        priceTrend: weeklyTrend,
        riskLevel: "中等",
        createdAt: now,
        type: "inventory",
        price: latestPrice,
      })
    }

    return reports.sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())
  } catch (error) {
    console.error("从数据库生成报告失败:", error)
    return []
  }
}

// 计算统计数据
function calculateStats(reports: ReportEntry[], baseDate: Date = new Date()) {
  const now = new Date(baseDate)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const byType: Record<string, number> = {
    weekly: 0,
    monthly: 0,
    supplier: 0,
    inventory: 0,
    special: 0,
  }

  const byTrend: Record<string, number> = {}

  reports.forEach((r) => {
    byType[r.type] = (byType[r.type] || 0) + 1
    if (r.priceTrend) {
      byTrend[r.priceTrend] = (byTrend[r.priceTrend] || 0) + 1
    }
  })

  const thisWeekReports = reports.filter((r) => new Date(r.reportDate) >= weekAgo)
  const thisMonthReports = reports.filter((r) => new Date(r.reportDate) >= monthStart)

  return {
    total: reports.length,
    thisWeek: thisWeekReports.length,
    thisMonth: thisMonthReports.length,
    pending: Math.floor(Math.random() * 3), // 随机生成待处理报告数
    byType,
    byTrend,
    lastUpdated: now.toISOString(),
    thisWeekTrend: thisWeekReports.length > 5 ? "up" : thisWeekReports.length < 3 ? "down" : "neutral",
    thisMonthTrend: thisMonthReports.length > 15 ? "up" : thisMonthReports.length < 10 ? "down" : "neutral",
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("mode") || "reports"
  const days = parseInt(searchParams.get("days") || "90", 10)

  try {
    // 获取外部数据（可选）
    let externalData = null
    if (searchParams.get("includeExternal") === "true") {
      // 可以调用 FRED API 获取原油价格等数据
      try {
        const fredRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/external-data/fred?series_id=DCOILWTICO`)
        if (fredRes.ok) {
          externalData = await fredRes.json()
        }
      } catch {
        // 外部数据获取失败不影响报告生成
      }
    }

    const reports = await generateDailyReports()
    const stats = calculateStats(reports)

    if (mode === "stats") {
      return NextResponse.json({
        success: true,
        stats,
        timestamp: new Date().toISOString(),
        externalData: externalData ? {
          oilPrice: externalData.data?.latest?.value || null,
          source: "FRED"
        } : null,
      })
    }

    // 只返回指定天数内的报告
    const filteredReports = reports.slice(0, Math.min(days, reports.length))

    return NextResponse.json({
      success: true,
      data: filteredReports,
      stats,
      timestamp: new Date().toISOString(),
      total: filteredReports.length,
    })
  } catch (error) {
    console.error("生成每日报告数据失败:", error)
    return NextResponse.json({
      success: false,
      error: "生成每日报告数据失败",
    }, { status: 500 })
  }
}

// 用于定时任务调用的 POST 接口
export async function POST() {
  try {
    const reports = await generateDailyReports()
    const stats = calculateStats(reports)

    // 这里可以将数据存入数据库
    // 目前返回生成结果供前端使用

    return NextResponse.json({
      success: true,
      message: "每日报告数据已生成",
      stats,
      generatedCount: reports.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("生成每日报告失败:", error)
    return NextResponse.json({
      success: false,
      error: "生成每日报告失败",
    }, { status: 500 })
  }
}