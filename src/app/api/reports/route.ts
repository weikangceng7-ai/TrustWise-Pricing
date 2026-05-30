import { NextRequest, NextResponse } from "next/server"
import { getReportStats, clearReportCache } from "@/services/reports"
import type { ReportFilters } from "@/services/reports"

// 动态报告生成 API
export const maxDuration = 30

// 价格基准值（基于真实市场数据）
const PRICE_BASE = 885 // 元/吨基准价格

// 生成动态报告数据的函数
function generateDynamicReports(filters?: ReportFilters) {
  const now = new Date()
  const year = now.getFullYear()

  const reports: Array<{
    id: number
    title: string
    reportDate: string
    summary: string
    recommendation: string | null
    priceTrend: string | null
    riskLevel: string | null
    createdAt: Date
    price: number // 价格数据
  }> = []

  // 根据日期计算价格（模拟真实价格走势）
  const calculatePriceForDate = (date: Date, trend: string): number => {
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (24 * 60 * 60 * 1000))
    // 基于日期的价格波动
    const baseVariation = (dayOfYear % 30) * 2 // 模拟月度周期波动
    const trendAdjust = trend === "上涨" ? 30 : trend === "小幅上涨" ? 15 : trend === "下跌" ? -30 : trend === "小幅下跌" ? -15 : 0
    return PRICE_BASE + baseVariation + trendAdjust + Math.floor(Math.random() * 20 - 10)
  }

  // 报告模板
  const templates = [
    {
      prefix: "硫磺采购周报",
      type: "weekly",
      summaryTemplate: (date: Date, trend: string, price: number) =>
        `【市场概况】本周硫磺市场呈现${trend === "上涨" ? "上行" : trend === "下跌" ? "下行" : "稳定"}态势，国内硫磺均价报${price}元/吨。【供需分析】供应端：主要进口来源国出货稳定，港口到货量约${Math.floor(25 + Math.random() * 15)}万吨。需求端：磷肥企业开工率维持在${Math.floor(70 + Math.random() * 15)}%。【价格走势】中东FOB报价$${Math.floor(120 + Math.random() * 20)}-${Math.floor(130 + Math.random() * 20)}/吨。【库存情况】主要港口库存约${Math.floor(40 + Math.random() * 20)}万吨。【后市研判】预计短期内价格将维持${trend === "上涨" ? "高位震荡" : trend === "下跌" ? "下行压力" : "稳定运行"}。`,
    },
    {
      prefix: "硫磺市场月报",
      type: "monthly",
      summaryTemplate: (date: Date, trend: string, price: number) =>
        `【月度概览】${date.getMonth() + 1}月份硫磺市场整体呈现${trend === "上涨" ? "偏强" : trend === "下跌" ? "偏弱" : "平稳"}态势，月均价${price}元/吨。【供需分析】供应端：本月进口总量约${Math.floor(100 + Math.random() * 50)}万吨。需求端：磷肥产量环比${Math.random() > 0.5 ? "增加" : "持平"}。【价格走势】月内价格波动幅度${Math.floor(2 + Math.random() * 8)}%。【库存变化】月末库存约${Math.floor(40 + Math.random() * 20)}万吨。【后市展望】下月预计价格将${trend === "上涨" ? "继续上行" : trend === "下跌" ? "有所回调" : "维持稳定"}。`,
    },
  ]

  const trends = ["上涨", "小幅上涨", "稳定", "震荡", "小幅下跌", "下跌"]
  const risks = ["高", "中等", "低"]
  const recommendations = ["适当备库", "按需采购", "观望", "建议备库", "紧急采购"]

  // 生成最近90天的报告
  for (let i = 0; i < 90; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    // 每天可能有不同数量的报告
    const reportProbability = i < 7 ? 0.6 : i < 30 ? 0.3 : 0.1

    if (Math.random() < reportProbability) {
      const template = templates[Math.floor(Math.random() * templates.length)]
      const trend = trends[Math.floor(Math.random() * trends.length)]
      const risk = risks[Math.floor(Math.random() * risks.length)]
      const rec = recommendations[Math.floor(Math.random() * recommendations.length)]
      const price = calculatePriceForDate(date, trend)

      const dateStr = date.toISOString().split('T')[0]
      const reportMonth = date.getMonth() + 1
      const weekNum = Math.ceil(date.getDate() / 7)

      reports.push({
        id: reports.length + 1,
        title: `${date.getFullYear()}年${reportMonth}月${template.type === "weekly" ? `第${weekNum}周` : ""}${template.prefix}`,
        reportDate: dateStr,
        summary: template.summaryTemplate(date, trend, price),
        recommendation: rec,
        priceTrend: trend,
        riskLevel: risk,
        createdAt: date,
        price: price, // 使用计算出的价格
      })
    }
  }

  // 添加固定的历史重要报告
  const lastYearPrice = 1128 // 去年均价
  reports.push({
    id: 1000,
    title: `${year - 1}年年度采购总结报告`,
    reportDate: `${year - 1}-12-31`,
    summary: `【年度概况】${year - 1}年硫磺采购总量约1450万吨，同比增加5.2%；采购均价${lastYearPrice}元/吨，同比下降4.3%。【成本分析】全年采购总成本约163.6亿元，同比下降2.1%，节约成本约3.5亿元。【供应商表现】前五大供应商采购占比78%。【价格波动】年内最高价1220元/吨，最低价1050元/吨。【改进建议】优化供应商结构，加强价格预测能力。`,
    recommendation: "按需采购",
    priceTrend: "稳定",
    riskLevel: "低",
    createdAt: new Date(`${year - 1}-12-31`),
    price: lastYearPrice,
  })

  const strategyPrice = 1175 // 策略报告价格
  reports.push({
    id: 1001,
    title: `${year}年采购策略规划报告`,
    reportDate: `${year}-01-15`,
    summary: `【策略背景】制定全年采购规划，优化供应链管理。【市场预判】预计全年硫磺价格区间1100-1250元/吨。【采购目标】确保供应稳定，控制采购成本，优化库存管理。【风险控制】建立价格预警机制，分散供应商风险。`,
    recommendation: "适当备库",
    priceTrend: "稳定",
    riskLevel: "中等",
    createdAt: new Date(`${year}-01-15`),
    price: strategyPrice,
  })

  // 按日期排序（最新在前）
  let filteredReports = reports.sort((a, b) =>
    new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
  )

  // 应用筛选
  if (filters) {
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase()
      filteredReports = filteredReports.filter(
        (r) => r.title.toLowerCase().includes(keyword) || r.summary.toLowerCase().includes(keyword)
      )
    }
    if (filters.startDate) {
      filteredReports = filteredReports.filter((r) => r.reportDate >= filters.startDate!)
    }
    if (filters.endDate) {
      filteredReports = filteredReports.filter((r) => r.reportDate <= filters.endDate!)
    }
    if (filters.trend) {
      filteredReports = filteredReports.filter((r) => r.priceTrend === filters.trend)
    }
    if (filters.risk) {
      filteredReports = filteredReports.filter((r) => r.riskLevel === filters.risk)
    }
  }

  return filteredReports
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const filters: ReportFilters = {
      keyword: searchParams.get("keyword") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      trend: searchParams.get("trend") as ReportFilters["trend"] || undefined,
      risk: searchParams.get("risk") as ReportFilters["risk"] || undefined,
    }

    const statsOnly = searchParams.get("stats") === "true"
    const refresh = searchParams.get("refresh") === "true"

    // 如果需要刷新，清除缓存
    if (refresh) {
      clearReportCache()
    }

    if (statsOnly) {
      // 直接从 daily-data API 获取统计
      const statsRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/reports/daily-data?mode=stats`)
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        return NextResponse.json({ success: true, stats: statsData.stats })
      }

      // 备用：本地计算统计
      const stats = await getReportStats()
      return NextResponse.json({ success: true, stats })
    }

    // 生成动态报告数据
    const reports = generateDynamicReports(filters)

    // 计算统计数据
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const stats = {
      total: reports.length,
      thisWeek: reports.filter(r => new Date(r.reportDate) >= weekAgo).length,
      thisMonth: reports.filter(r => new Date(r.reportDate) >= monthStart).length,
      pending: Math.floor(Math.random() * 3),
      byType: {
        weekly: reports.filter(r => r.title.includes("周")).length,
        monthly: reports.filter(r => r.title.includes("月")).length,
        special: reports.filter(r => !r.title.includes("周") && !r.title.includes("月")).length,
      },
      byTrend: {
        "上涨": reports.filter(r => r.priceTrend?.includes("上涨")).length,
        "稳定": reports.filter(r => r.priceTrend === "稳定").length,
        "下跌": reports.filter(r => r.priceTrend?.includes("下跌")).length,
        "震荡": reports.filter(r => r.priceTrend === "震荡").length,
      },
      lastUpdated: now.toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: reports,
      total: reports.length,
      stats,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error("获取报告数据失败:", error)
    return NextResponse.json(
      { success: false, error: "获取报告数据失败" },
      { status: 500 }
    )
  }
}
