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
    summary: `【市场概况】本周硫磺市场整体稳定，国内硫磺均价报1180元/吨，与上周基本持平。国际市场方面，中东地区出货稳定，美湾地区受炼厂检修影响供应略有收紧。

【供需分析】
• 供应端：主要进口来源国出货稳定，港口到货量约32万吨。其中沙特到货15万吨，阿联酋到货10万吨，卡塔尔到货7万吨。
• 需求端：磷肥企业开工率维持在78%，硫酸需求平稳。春耕备肥需求逐步释放，下游采购积极性有所提升。

【价格走势】
• 中东FOB报价：$128-132/吨（较上周持平）
• 国内港口现货价格：1175-1185元/吨
• 港口CFR价格：$135-140/吨

【库存情况】
• 主要港口库存约48万吨，较上周下降2%
• 库存消费比12.5天，处于合理区间
• 南京港库存15万吨，青岛港库存18万吨，钦州港库存15万吨

【后市研判】预计短期内价格将维持稳定，建议关注春耕需求启动情况及国际油价走势。建议按需采购，避免过度囤货。`,
    recommendation: "按需采购",
    priceTrend: "稳定",
    riskLevel: "低",
    createdAt: new Date(),
  },
  {
    id: 2,
    title: "2026年3月第三周硫磺采购分析报告",
    reportDate: "2026-03-17",
    summary: `【市场概况】本周硫磺市场呈现震荡上行态势，国内硫磺均价报1185元/吨，较上周上涨2.3%。受国际油价上涨及下游需求回暖影响，价格走势偏强。

【供需分析】
• 供应端：主要进口来源国沙特、阿联酋出货稳定，港口到货量约32万吨，环比增加5%。卡塔尔方面因设备检修，出货量略有下降。
• 需求端：磷肥企业开工率维持在78%，硫酸需求平稳。复合肥企业采购意愿增强，市场成交活跃度提升。

【价格走势】
• 中东FOB报价：$128-132/吨（较上周上涨$3）
• 国内港口现货价格：1180-1200元/吨
• 长单签约价格：1160-1170元/吨

【库存情况】
• 主要港口库存约48万吨，较上周下降6%
• 库存消费比降至12.5天，略低于安全库存
• 华东地区库存偏紧，华南地区相对充裕

【后市研判】预计短期内价格将维持高位震荡，建议关注4月春耕需求启动情况。建议适当备库，锁定部分远期货源。`,
    recommendation: "适当备库",
    priceTrend: "小幅上涨",
    riskLevel: "中等",
    createdAt: new Date("2026-03-17"),
  },
  {
    id: 3,
    title: "2026年3月第二周硫磺采购分析报告",
    reportDate: "2026-03-10",
    summary: `【市场概况】本周硫磺价格小幅回调，市场观望情绪浓厚。国内硫磺均价报1158元/吨，较上周下跌1.2%。下游采购意愿偏弱，以消耗库存为主。

【供需分析】
• 供应端：进口硫磺到港量约30万吨，与上周基本持平。新增两船沙特货源到港，港口供应充裕。
• 需求端：下游磷肥企业采购意愿偏弱，以消耗库存为主。硫酸市场供需平衡，价格稳定。

【价格走势】
• 中东FOB报价：$125-129/吨
• 国内港口现货价格：1150-1170元/吨，成交清淡
• 液硫价格：1050-1080元/吨

【库存情况】
• 主要港口库存约51万吨，较上周增加3%
• 库存消费比13.2天，处于较高水平
• 部分港口出现压港现象

【后市研判】预计短期内价格仍有下行压力，建议等待更好的采购窗口。若库存持续累积，价格可能进一步下探。`,
    recommendation: "观望",
    priceTrend: "小幅下跌",
    riskLevel: "低",
    createdAt: new Date("2026-03-10"),
  },
  {
    id: 4,
    title: "2026年3月第一周硫磺采购分析报告",
    reportDate: "2026-03-03",
    summary: `【市场概况】本周硫磺市场整体稳定，价格波动较小。国内硫磺均价报1172元/吨，与上周基本持平。市场处于节后恢复期，交投氛围平稳。

【供需分析】
• 供应端：主要供应商出货正常，港口到货量约29万吨。沙特阿美本月合同货正常执行，新增现货供应有限。
• 需求端：春耕备肥需求逐步启动，下游采购积极性有所提升。磷肥企业开工率稳步回升至75%。

【价格走势】
• 中东FOB报价：$126-130/吨
• 国内港口现货价格：1165-1180元/吨
• 月度长单价格：1150-1165元/吨

【库存情况】
• 主要港口库存约49万吨，库存消费比12.8天
• 处于合理区间，无明显压力
• 各港口库存分布较为均匀

【后市研判】随着春耕需求释放，预计3月中下旬价格有望小幅上涨。建议按需采购，关注市场动态。`,
    recommendation: "按需采购",
    priceTrend: "稳定",
    riskLevel: "低",
    createdAt: new Date("2026-03-03"),
  },
  {
    id: 5,
    title: "2026年2月供应商综合评估报告",
    reportDate: "2026-02-20",
    summary: `【评估概述】本报告对主要硫磺供应商进行了综合评估，涵盖价格竞争力、供货稳定性、服务质量、信用状况四个维度。评估周期为2025年全年。

【评估结果】TOP3供应商：
1. 沙特阿美 - 综合评分92分
   • 价格优势明显，年度均价低于市场$3-5/吨
   • 供货稳定性优秀，准时交付率99.2%
   • 服务响应及时，问题处理效率高

2. 阿联酋ADNOC - 综合评分89分
   • 服务响应及时，质量稳定
   • 灵活性强，可接受小批量订单
   • 信用状况良好，结算条件优惠

3. 卡塔尔QP - 综合评分86分
   • 价格适中，信用良好
   • 货源稳定，品质优良
   • 对长期客户有额外优惠

【价格对比】三家主要供应商报价区间$122-135/吨，价差约10%。沙特阿美报价最具竞争力，卡塔尔QP次之。

【建议措施】建议增加与沙特阿美的合作份额，同时开发1-2家备用供应商以分散风险。可考虑与伊朗、俄罗斯供应商建立联系。`,
    recommendation: "按需采购",
    priceTrend: "稳定",
    riskLevel: "低",
    createdAt: new Date("2026-02-20"),
  },
  {
    id: 6,
    title: "2026年2月港口库存分析报告",
    reportDate: "2026-02-15",
    summary: `【报告概述】本报告对国内主要硫磺港口库存情况进行分析，为采购决策提供参考。

【库存概况】截至2026年2月15日，主要港口硫磺库存总量约52万吨，环比增加8%。受春节假期影响，下游需求减弱，库存有所累积。

【分港口库存】
• 青岛港：18万吨（占比35%）- 华东地区主要集散地
• 南京港：16万吨（占比31%）- 服务周边磷肥企业
• 钦州港：12万吨（占比23%）- 华南地区枢纽港
• 其他港口：6万吨（占比11%）

【库存周转】
• 平均周转天数：13.5天
• 较上月增加1.5天
• 处于季节性高位

【风险提示】
• 库存偏高需关注仓储成本
• 部分港口出现压港现象
• 天气回暖后需求将逐步释放

【建议】建议暂缓大批量采购，等待库存消化后再做安排。`,
    recommendation: "观望",
    priceTrend: "稳定",
    riskLevel: "低",
    createdAt: new Date("2026-02-15"),
  },
  {
    id: 7,
    title: "2026年1月月度采购总结报告",
    reportDate: "2026-01-31",
    summary: `【报告概述】2026年1月硫磺采购工作总结，包括采购量、价格、成本分析及下月计划。

【采购执行情况】
• 月度计划采购量：35,000吨
• 实际采购量：34,500吨（完成率98.6%）
• 其中长单执行28,000吨，现货采购6,500吨

【价格分析】
• 长单均价：1,158元/吨
• 现货均价：1,172元/吨
• 综合采购成本：1,161元/吨
• 较市场均价节省约8元/吨

【成本分析】
• 采购总成本：约4,006万元
• 运输成本：约210万元
• 港杂费：约85万元
• 综合成本：约4,301万元

【供应商履约情况】
• 沙特阿美：准时交付率100%，质量合格率100%
• 阿联酋ADNOC：准时交付率98%，质量合格率100%
• 卡塔尔QP：准时交付率99%，质量合格率99.5%

【下月计划】
• 计划采购量：38,000吨
• 建议增加现货采购比例，把握价格波动机会
• 持续跟踪春耕需求启动情况`,
    recommendation: "按需采购",
    priceTrend: "稳定",
    riskLevel: "低",
    createdAt: new Date("2026-01-31"),
  },
  {
    id: 8,
    title: "2026年国际硫磺市场趋势分析报告",
    reportDate: "2026-01-20",
    summary: `【报告概述】对2026年国际硫磺市场趋势进行深度分析，为年度采购策略提供参考。

【全球供需格局】
• 全球硫磺产量预计约7,000万吨/年
• 主要生产国：中国、美国、俄罗斯、沙特、加拿大
• 主要消费国：中国、印度、摩洛哥、美国
• 中国进口依赖度约35%

【价格走势预测】
• 预计2026年硫磺价格区间：$120-145/吨（FOB）
• 上半年价格偏强，下半年可能回落
• 主要影响因素：原油产量、磷肥需求、环保政策

【主要供应国分析】
• 中东地区：产量稳定，品质优良，是中国主要进口来源
• 北美地区：受炼厂开工率影响，供应波动较大
• 俄罗斯：价格有优势，但物流风险较高

【风险因素】
• 地缘政治风险：中东局势、俄乌冲突
• 汇率风险：美元波动影响采购成本
• 物流风险：海运费波动、港口拥堵

【采购建议】
• 建议签订年度长单锁定60%需求
• 保留40%现货采购空间，灵活应对市场变化
• 开发多元化供应渠道，降低单一供应商依赖`,
    recommendation: "建议备库",
    priceTrend: "震荡",
    riskLevel: "中等",
    createdAt: new Date("2026-01-20"),
  },
]

// 获取备用报告数据（支持筛选）
function getFallbackReports(filters?: ReportFilters): PurchaseReport[] {
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

    // 如果数据库为空，使用备用数据
    if (reports.length === 0) {
      console.log("数据库报告为空，使用备用数据")
      return getFallbackReports(filters)
    }

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
