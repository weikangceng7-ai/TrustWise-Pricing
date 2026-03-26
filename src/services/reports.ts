import { db } from "@/db"
import { purchaseReports, sulfurPrices, portInventory, type PurchaseReport, type NewPurchaseReport } from "@/db/schema"
import { desc, eq, and, gte, lte, or, like, sql, count } from "drizzle-orm"

export type ReportType = "weekly" | "monthly" | "supplier" | "inventory" | "special"
export type PriceTrend = "上涨" | "下跌" | "稳定" | "震荡" | "小幅上涨" | "小幅下跌"
export type RiskLevel = "高" | "中等" | "低"
export type Recommendation = "建议备库" | "观望" | "按需采购" | "适当备库" | "紧急采购"

export interface ReportFilters {
  type?: ReportType
  startDate?: string
  endDate?: string
  keyword?: string
  trend?: PriceTrend
  risk?: RiskLevel
}

export interface ReportStats {
  total: number
  thisWeek: number
  thisMonth: number
  pending: number
  byType: Record<string, number>
  byTrend: Record<string, number>
}

const fallbackReports: PurchaseReport[] = [
  {
    id: 1,
    title: "2026年3月第四周硫磺采购分析报告",
    reportDate: new Date().toISOString().split('T')[0],
    summary: "【市场概况】本周硫磺市场整体稳定，国内硫磺均价报1180元/吨，与上周基本持平。【供需分析】供应端：主要进口来源国出货稳定，港口到货量约32万吨。需求端：磷肥企业开工率维持在78%，硫酸需求平稳。【价格走势】中东FOB报价$128-132/吨；国内港口现货价格1175-1185元/吨。【库存情况】主要港口库存约48万吨，库存消费比12.5天。【后市研判】预计短期内价格将维持稳定，建议关注春耕需求启动情况。",
    recommendation: "按需采购",
    priceTrend: "稳定",
    riskLevel: "低",
    createdAt: new Date(),
  },
  {
    id: 2,
    title: "2026年3月第三周硫磺采购分析报告",
    reportDate: "2026-03-17",
    summary: "【市场概况】本周硫磺市场呈现震荡上行态势，国内硫磺均价报1185元/吨，较上周上涨2.3%。【供需分析】供应端：主要进口来源国沙特、阿联酋出货稳定，港口到货量约32万吨，环比增加5%。需求端：磷肥企业开工率维持在78%，硫酸需求平稳。【价格走势】中东FOB报价$128-132/吨，较上周上涨$3；国内港口现货价格1180-1200元/吨。【库存情况】主要港口库存约48万吨，较上周下降6%，库存消费比降至12.5天。【后市研判】预计短期内价格将维持高位震荡，建议关注4月春耕需求启动情况。",
    recommendation: "适当备库",
    priceTrend: "小幅上涨",
    riskLevel: "中等",
    createdAt: new Date("2026-03-17"),
  },
  {
    id: 3,
    title: "2026年3月第二周硫磺采购分析报告",
    reportDate: "2026-03-10",
    summary: "【市场概况】本周硫磺价格小幅回调，市场观望情绪浓厚。国内硫磺均价报1158元/吨，较上周下跌1.2%。【供需分析】供应端：进口硫磺到港量约30万吨，与上周基本持平。需求端：下游磷肥企业采购意愿偏弱，以消耗库存为主。【价格走势】中东FOB报价$125-129/吨；国内港口现货价格1150-1170元/吨，成交清淡。【库存情况】主要港口库存约51万吨，较上周增加3%，库存消费比13.2天。【后市研判】预计短期内价格仍有下行压力，建议等待更好的采购窗口。",
    recommendation: "观望",
    priceTrend: "小幅下跌",
    riskLevel: "低",
    createdAt: new Date("2026-03-10"),
  },
  {
    id: 4,
    title: "2026年3月第一周硫磺采购分析报告",
    reportDate: "2026-03-03",
    summary: "【市场概况】本周硫磺市场整体稳定，价格波动较小。国内硫磺均价报1172元/吨，与上周基本持平。【供需分析】供应端：主要供应商出货正常，港口到货量约29万吨。需求端：春耕备肥需求逐步启动，下游采购积极性有所提升。【价格走势】中东FOB报价$126-130/吨；国内港口现货价格1165-1180元/吨。【库存情况】主要港口库存约49万吨，库存消费比12.8天，处于合理区间。【后市研判】随着春耕需求释放，预计3月中下旬价格有望小幅上涨。",
    recommendation: "按需采购",
    priceTrend: "稳定",
    riskLevel: "低",
    createdAt: new Date("2026-03-03"),
  },
  {
    id: 5,
    title: "2026年2月供应商综合评估报告",
    reportDate: "2026-02-20",
    summary: "【评估概述】本报告对主要硫磺供应商进行了综合评估，涵盖价格竞争力、供货稳定性、服务质量、信用状况四个维度。【评估结果】TOP3供应商：1.沙特阿美-综合评分92分，价格优势明显，供货稳定；2.阿联酋ADNOC-综合评分89分，服务响应及时，质量稳定；3.卡塔尔QP-综合评分86分，价格适中，信用良好。【价格对比】三家主要供应商报价区间$122-135/吨，价差约10%。【建议措施】建议增加与沙特阿美的合作份额，同时开发1-2家备用供应商以分散风险。",
    recommendation: "按需采购",
    priceTrend: "稳定",
    riskLevel: "低",
    createdAt: new Date("2026-02-20"),
  },
]

export async function getReports(filters?: ReportFilters): Promise<PurchaseReport[]> {
  try {
    if (!db) {
      throw new Error("Database not available")
    }
    let query = db.select().from(purchaseReports)
    
    const conditions = []
    
    if (filters?.startDate) {
      conditions.push(gte(purchaseReports.reportDate, filters.startDate))
    }
    
    if (filters?.endDate) {
      conditions.push(lte(purchaseReports.reportDate, filters.endDate))
    }
    
    if (filters?.trend) {
      conditions.push(eq(purchaseReports.priceTrend, filters.trend))
    }
    
    if (filters?.risk) {
      conditions.push(eq(purchaseReports.riskLevel, filters.risk))
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any
    }
    
    let reports = await query.orderBy(desc(purchaseReports.reportDate))
    
    if (filters?.keyword) {
      const keyword = filters.keyword.toLowerCase()
      reports = reports.filter(
        (r) =>
          r.title.toLowerCase().includes(keyword) ||
          r.summary.toLowerCase().includes(keyword)
      )
    }
    
    return reports
  } catch (error) {
    console.error("从数据库获取报告失败，使用备用数据:", error)
    let reports = [...fallbackReports]
    
    if (filters?.keyword) {
      const keyword = filters.keyword.toLowerCase()
      reports = reports.filter(
        (r) =>
          r.title.toLowerCase().includes(keyword) ||
          r.summary.toLowerCase().includes(keyword)
      )
    }
    
    if (filters?.startDate) {
      reports = reports.filter((r) => r.reportDate >= filters.startDate!)
    }
    
    if (filters?.endDate) {
      reports = reports.filter((r) => r.reportDate <= filters.endDate!)
    }
    
    if (filters?.trend) {
      reports = reports.filter((r) => r.priceTrend === filters.trend)
    }
    
    if (filters?.risk) {
      reports = reports.filter((r) => r.riskLevel === filters.risk)
    }
    
    return reports.sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())
  }
}

export async function getReportById(id: number): Promise<PurchaseReport | null> {
  try {
    if (!db) {
      throw new Error("Database not available")
    }
    const reports = await db
      .select()
      .from(purchaseReports)
      .where(eq(purchaseReports.id, id))
      .limit(1)

    return reports[0] || null
  } catch (error) {
    console.error("获取报告详情失败，使用备用数据:", error)
    return fallbackReports.find((r) => r.id === id) || null
  }
}

export async function getReportStats(): Promise<ReportStats> {
  try {
    if (!db) {
      throw new Error("Database not available")
    }
    const allReports = await db.select().from(purchaseReports)
    
    const now = new Date()
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
    
    allReports.forEach((r) => {
      if (r.title.includes("周")) byType.weekly++
      else if (r.title.includes("月")) byType.monthly++
      else if (r.title.includes("供应商")) byType.supplier++
      else if (r.title.includes("库存")) byType.inventory++
      else byType.special++
      
      if (r.priceTrend) {
        byTrend[r.priceTrend] = (byTrend[r.priceTrend] || 0) + 1
      }
    })
    
    return {
      total: allReports.length,
      thisWeek: allReports.filter((r) => new Date(r.reportDate) >= weekAgo).length,
      thisMonth: allReports.filter((r) => new Date(r.reportDate) >= monthStart).length,
      pending: 0,
      byType,
      byTrend,
    }
  } catch (error) {
    console.error("获取报告统计失败，使用备用数据:", error)
    const now = new Date()
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
    
    fallbackReports.forEach((r) => {
      if (r.title.includes("周")) byType.weekly++
      else if (r.title.includes("月")) byType.monthly++
      else if (r.title.includes("供应商")) byType.supplier++
      else if (r.title.includes("库存")) byType.inventory++
      else byType.special++
      
      if (r.priceTrend) {
        byTrend[r.priceTrend] = (byTrend[r.priceTrend] || 0) + 1
      }
    })
    
    return {
      total: fallbackReports.length,
      thisWeek: fallbackReports.filter((r) => new Date(r.reportDate) >= weekAgo).length,
      thisMonth: fallbackReports.filter((r) => new Date(r.reportDate) >= monthStart).length,
      pending: 0,
      byType,
      byTrend,
    }
  }
}

export async function createReport(report: Omit<NewPurchaseReport, "id" | "createdAt">): Promise<PurchaseReport> {
  try {
    if (!db) {
      throw new Error("Database not available")
    }
    const [newReport] = await db
      .insert(purchaseReports)
      .values({
        title: report.title,
        reportDate: report.reportDate,
        summary: report.summary,
        recommendation: report.recommendation ?? null,
        priceTrend: report.priceTrend ?? null,
        riskLevel: report.riskLevel ?? null,
      })
      .returning()
    
    return newReport
  } catch (error) {
    console.error("创建报告失败:", error)
    const newReport: PurchaseReport = {
      id: Math.max(...fallbackReports.map((r) => r.id)) + 1,
      title: report.title,
      reportDate: report.reportDate,
      summary: report.summary,
      recommendation: report.recommendation ?? null,
      priceTrend: report.priceTrend ?? null,
      riskLevel: report.riskLevel ?? null,
      createdAt: new Date(),
    }
    fallbackReports.push(newReport)
    return newReport
  }
}

export async function deleteReport(id: number): Promise<boolean> {
  try {
    if (!db) {
      throw new Error("Database not available")
    }
    const result = await db
      .delete(purchaseReports)
      .where(eq(purchaseReports.id, id))
      .returning()

    return result.length > 0
  } catch (error) {
    console.error("删除报告失败:", error)
    const index = fallbackReports.findIndex((r) => r.id === id)
    if (index === -1) return false
    fallbackReports.splice(index, 1)
    return true
  }
}

export async function generateWeeklyReport(): Promise<NewPurchaseReport | null> {
  try {
    if (!db) {
      throw new Error("Database not available")
    }
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const dateStr = now.toISOString().split('T')[0]

    const prices = await db
      .select()
      .from(sulfurPrices)
      .where(gte(sulfurPrices.date, weekAgo.toISOString().split('T')[0]))
      .orderBy(desc(sulfurPrices.date))
      .limit(7)
    
    const inventory = await db
      .select()
      .from(portInventory)
      .where(gte(portInventory.date, weekAgo.toISOString().split('T')[0]))
      .orderBy(desc(portInventory.date))
      .limit(7)
    
    if (prices.length === 0) {
      return null
    }
    
    const latestPrice = prices[0]
    const prevPrice = prices.length > 1 ? prices[prices.length - 1] : prices[0]
    
    const currentPrice = Number(latestPrice.mainPrice) || 0
    const previousPrice = Number(prevPrice.mainPrice) || currentPrice
    const priceChange = currentPrice - previousPrice
    const priceChangePercent = previousPrice > 0 ? ((priceChange / previousPrice) * 100).toFixed(1) : "0"
    
    let priceTrend: PriceTrend = "稳定"
    if (priceChange > 0) {
      priceTrend = Math.abs(Number(priceChangePercent)) > 2 ? "上涨" : "小幅上涨"
    } else if (priceChange < 0) {
      priceTrend = Math.abs(Number(priceChangePercent)) > 2 ? "下跌" : "小幅下跌"
    }
    
    let riskLevel: RiskLevel = "低"
    if (Math.abs(Number(priceChangePercent)) > 5) {
      riskLevel = "高"
    } else if (Math.abs(Number(priceChangePercent)) > 2) {
      riskLevel = "中等"
    }
    
    let recommendation: Recommendation = "按需采购"
    if (priceTrend === "下跌" || priceTrend === "小幅下跌") {
      recommendation = "观望"
    } else if (priceTrend === "上涨") {
      recommendation = "适当备库"
    } else if (riskLevel === "高" && priceTrend.includes("上涨")) {
      recommendation = "建议备库"
    }
    
    const weekNumber = Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7)
    const title = `${now.getFullYear()}年${now.getMonth() + 1}月第${weekNumber}周硫磺采购分析报告`
    
    const avgPrice = prices.reduce((sum, p) => sum + (Number(p.mainPrice) || 0), 0) / prices.length
    const latestInventory = inventory[0]
    const inventoryValue = latestInventory ? Number(latestInventory.inventory) : 0
    
    const summary = `【市场概况】本周硫磺市场${priceTrend === "稳定" ? "整体稳定" : priceTrend.includes("上涨") ? "呈现上涨态势" : "呈现下跌态势"}，国内硫磺均价报${currentPrice.toFixed(0)}元/吨，较上周${priceChange >= 0 ? "上涨" : "下跌"}${Math.abs(Number(priceChangePercent))}%。【供需分析】供应端：主要进口来源国出货${prices.length >= 5 ? "稳定" : "一般"}，港口到货量正常。需求端：磷肥企业开工率维持正常水平，硫酸需求平稳。【价格走势】本周价格区间${Math.min(...prices.map(p => Number(p.mainPrice) || 0)).toFixed(0)}-${Math.max(...prices.map(p => Number(p.mainPrice) || 0)).toFixed(0)}元/吨，周均价${avgPrice.toFixed(0)}元/吨。【库存情况】主要港口库存约${inventoryValue.toFixed(0)}万吨，库存消费比处于${inventoryValue > 50 ? "合理" : inventoryValue > 40 ? "偏低" : "紧张"}区间。【后市研判】预计短期内价格将${priceTrend === "稳定" ? "维持稳定" : priceTrend.includes("上涨") ? "继续震荡上行" : "仍有下行空间"}，建议关注下游需求变化。`
    
    return {
      title,
      reportDate: dateStr,
      summary,
      recommendation,
      priceTrend,
      riskLevel,
    }
  } catch (error) {
    console.error("生成周报失败:", error)
    return null
  }
}
