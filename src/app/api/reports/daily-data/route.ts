import { NextResponse } from "next/server"

/**
 * 每日报告数据生成 API
 * 用于生成动态的报告统计数据
 */

export const maxDuration = 30

// 价格基准值（与 route.ts 保持一致）
const PRICE_BASE = 885 // 元/吨基准价格

// 根据日期计算价格（模拟真实价格走势）
function calculatePriceForDate(date: Date, trend: string): number {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (24 * 60 * 60 * 1000))
  const baseVariation = (dayOfYear % 30) * 2
  const trendAdjust = trend === "上涨" ? 30 : trend === "小幅上涨" ? 15 : trend === "下跌" ? -30 : trend === "小幅下跌" ? -15 : 0
  return PRICE_BASE + baseVariation + trendAdjust + Math.floor(Math.random() * 20 - 10)
}

// 报告模板数据
const reportTemplates = [
  {
    titlePrefix: "硫磺采购分析周报",
    type: "weekly",
    generateSummary: (date: Date, priceTrend: string, riskLevel: string, price: number) => {
      return `【市场概况】本周硫磺市场呈现${priceTrend === "上涨" ? "上行" : priceTrend === "下跌" ? "下行" : "稳定"}态势。国内硫磺均价报${price}元/吨。【供需分析】供应端：主要进口来源国出货稳定，港口到货量约${Math.floor(25 + Math.random() * 15)}万吨。需求端：磷肥企业开工率维持在${Math.floor(70 + Math.random() * 15)}%。【价格走势】中东FOB报价$${Math.floor(120 + Math.random() * 20)}-${Math.floor(130 + Math.random() * 20)}/吨。【库存情况】主要港口库存约${Math.floor(40 + Math.random() * 20)}万吨。【后市研判】预计短期内价格将维持${priceTrend === "上涨" ? "高位震荡" : priceTrend === "下跌" ? "下行压力" : "稳定运行"}。`
    },
    recommendations: ["适当备库", "按需采购", "观望"],
    trends: ["上涨", "小幅上涨", "稳定", "震荡", "小幅下跌", "下跌"],
    risks: ["高", "中等", "低"],
  },
  {
    titlePrefix: "硫磺市场月度分析",
    type: "monthly",
    generateSummary: (date: Date, priceTrend: string, riskLevel: string, price: number) => {
      const month = date.getMonth() + 1
      return `【月度概览】${month}月份硫磺市场整体呈现${priceTrend === "上涨" ? "偏强" : priceTrend === "下跌" ? "偏弱" : "平稳"}态势，月均价${price}元/吨。【供需分析】供应端：本月进口总量约${Math.floor(100 + Math.random() * 50)}万吨。需求端：磷肥产量环比${Math.random() > 0.5 ? "增加" : "持平"}。【价格走势】月内价格波动幅度${Math.floor(2 + Math.random() * 8)}%。【成本分析】国际运费波动较大，中东至中国运费$${Math.floor(25 + Math.random() * 15)}-${Math.floor(30 + Math.random() * 20)}/吨。【库存变化】月末库存约${Math.floor(40 + Math.random() * 20)}万吨。【后市展望】下月预计价格将${priceTrend === "上涨" ? "继续上行" : priceTrend === "下跌" ? "有所回调" : "维持稳定"}。`
    },
    recommendations: ["适当备库", "按需采购", "建议备库"],
    trends: ["上涨", "稳定", "下跌"],
    risks: ["中等", "低"],
  },
  {
    titlePrefix: "供应商综合评估报告",
    type: "supplier",
    generateSummary: (date: Date, priceTrend: string, riskLevel: string, price: number) => {
      return `【评估概述】本报告对主要硫磺供应商进行了综合评估，涵盖价格竞争力、供货稳定性、服务质量、信用状况四个维度。【评估结果】TOP3供应商：1.沙特阿美-综合评分${Math.floor(85 + Math.random() * 10)}分；2.阿联酋ADNOC-综合评分${Math.floor(80 + Math.random() * 15)}分；3.卡塔尔QP-综合评分${Math.floor(75 + Math.random() * 15)}分。【价格对比】三家主要供应商报价区间$${Math.floor(120 + Math.random() * 10)}-${Math.floor(135 + Math.random() * 10)}/吨，折合人民币约${price}元/吨。【建议措施】建议优化供应商结构，分散采购风险。`
    },
    recommendations: ["按需采购"],
    trends: ["稳定"],
    risks: ["低"],
  },
  {
    titlePrefix: "库存预警专项报告",
    type: "inventory",
    generateSummary: (date: Date, priceTrend: string, riskLevel: string, price: number) => {
      const inventory = Math.floor(35 + Math.random() * 30)
      const safetyStock = 50
      const alertLevel = inventory < safetyStock ? "黄色预警" : "正常"
      return `【预警级别】${alertLevel}-需${inventory < safetyStock ? "关注" : "监控"}。【库存现状】当前港口库存约${inventory}万吨，较安全库存线${safetyStock}万吨${inventory < safetyStock ? "低" : "高"}${Math.abs(inventory - safetyStock)}万吨。【当前价格】硫磺均价${price}元/吨。【影响评估】${inventory < safetyStock ? "若不及时补充，可能影响后续生产供应" : "库存处于合理区间，可满足生产需求"}。【应对建议】${inventory < safetyStock ? "建议适当增加采购量" : "维持正常采购节奏"}。`
    },
    recommendations: ["适当备库", "按需采购", "紧急采购"],
    trends: ["稳定"],
    risks: ["高", "中等", "低"],
  },
]

// 根据日期生成报告数据
function generateDailyReports(baseDate: Date = new Date()): Array<{
  id: number
  title: string
  reportDate: string
  summary: string
  recommendation: string
  priceTrend: string
  riskLevel: string
  createdAt: Date
  type: string
  price: number // 价格数据
}> {
  const reports: Array<{
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
  }> = []

  const now = new Date(baseDate)
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // 生成本周报告（最近7天）
  for (let i = 0; i < 7; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    // 每天可能有1-2份报告
    const reportCount = Math.random() > 0.3 ? 1 : 0
    for (let j = 0; j < reportCount; j++) {
      const template = reportTemplates[Math.floor(Math.random() * reportTemplates.length)]
      const trend = template.trends[Math.floor(Math.random() * template.trends.length)]
      const risk = template.risks[Math.floor(Math.random() * template.risks.length)]
      const rec = template.recommendations[Math.floor(Math.random() * template.recommendations.length)]
      const price = calculatePriceForDate(date, trend)

      const dateStr = date.toISOString().split('T')[0]
      const weekNum = Math.ceil(date.getDate() / 7)

      reports.push({
        id: reports.length + 1,
        title: `${year}年${month}月${template.type === "weekly" ? `第${weekNum}周` : ""}${template.titlePrefix}`,
        reportDate: dateStr,
        summary: template.generateSummary(date, trend, risk, price),
        recommendation: rec,
        priceTrend: trend,
        riskLevel: risk,
        createdAt: date,
        type: template.type,
        price: price,
      })
    }
  }

  // 生成本月报告（最近30天）
  for (let i = 7; i < 30; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    // 每周大约2-3份报告
    if (Math.random() > 0.7) {
      const template = reportTemplates[Math.floor(Math.random() * reportTemplates.length)]
      const trend = template.trends[Math.floor(Math.random() * template.trends.length)]
      const risk = template.risks[Math.floor(Math.random() * template.risks.length)]
      const rec = template.recommendations[Math.floor(Math.random() * template.recommendations.length)]
      const price = calculatePriceForDate(date, trend)

      const dateStr = date.toISOString().split('T')[0]
      const weekNum = Math.ceil(date.getDate() / 7)
      const reportMonth = date.getMonth() + 1

      reports.push({
        id: reports.length + 1,
        title: `${date.getFullYear()}年${reportMonth}月${template.type === "weekly" ? `第${weekNum}周` : ""}${template.titlePrefix}`,
        reportDate: dateStr,
        summary: template.generateSummary(date, trend, risk, price),
        recommendation: rec,
        priceTrend: trend,
        riskLevel: risk,
        createdAt: date,
        type: template.type,
        price: price,
      })
    }
  }

  // 生成历史报告（最近90天）
  for (let i = 30; i < 90; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    // 每周大约1份报告
    if (Math.random() > 0.85) {
      const template = reportTemplates[Math.floor(Math.random() * reportTemplates.length)]
      const trend = template.trends[Math.floor(Math.random() * template.trends.length)]
      const risk = template.risks[Math.floor(Math.random() * template.risks.length)]
      const rec = template.recommendations[Math.floor(Math.random() * template.recommendations.length)]
      const price = calculatePriceForDate(date, trend)

      const dateStr = date.toISOString().split('T')[0]
      const reportMonth = date.getMonth() + 1

      reports.push({
        id: reports.length + 1,
        title: `${date.getFullYear()}年${reportMonth}月${template.titlePrefix}`,
        reportDate: dateStr,
        summary: template.generateSummary(date, trend, risk, price),
        recommendation: rec,
        priceTrend: trend,
        riskLevel: risk,
        createdAt: date,
        type: template.type,
        price: price,
      })
    }
  }

  // 添加固定的历史重要报告（使用统一价格）
  const lastYearPrice = 1128
  const strategyPrice = 1175
  const historicalReports = [
    {
      id: reports.length + 1,
      title: `${year - 1}年年度采购总结报告`,
      reportDate: `${year - 1}-12-31`,
      summary: `【年度概况】${year - 1}年硫磺采购总量约1450万吨，同比增加5.2%；采购均价${lastYearPrice}元/吨，同比下降4.3%。【成本分析】全年采购总成本约163.6亿元，同比下降2.1%，节约成本约3.5亿元。【供应商表现】前五大供应商采购占比78%。【价格波动】年内最高价1220元/吨，最低价1050元/吨。【改进建议】优化供应商结构，加强价格预测能力。`,
      recommendation: "按需采购",
      priceTrend: "稳定",
      riskLevel: "低",
      createdAt: new Date(`${year - 1}-12-31`),
      type: "special",
      price: lastYearPrice,
    },
    {
      id: reports.length + 2,
      title: `${year}年一季度采购策略报告`,
      reportDate: `${year}-01-15`,
      summary: `【策略背景】一季度为传统需求旺季，春耕备肥需求集中释放。【市场预判】预计一季度硫磺价格区间1150-1220元/吨。【采购计划】1月按需采购，2月春节前适当增加库存，3月根据春耕需求启动情况灵活调整。【当前价格】硫磺均价${strategyPrice}元/吨。【风险控制】设置价格预警线1200元/吨。`,
      recommendation: "适当备库",
      priceTrend: "小幅上涨",
      riskLevel: "中等",
      createdAt: new Date(`${year}-01-15`),
      type: "special",
      price: strategyPrice,
    },
  ]

  reports.push(...historicalReports)

  // 按日期排序（最新的在前）
  return reports.sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())
}

// 计算统计数据
function calculateStats(reports: ReturnType<typeof generateDailyReports>, baseDate: Date = new Date()) {
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

    const reports = generateDailyReports()
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
    const reports = generateDailyReports()
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