import { type PurchaseReport, type NewPurchaseReport } from "@/db/schema"

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
  lastUpdated?: string
  thisWeekTrend?: "up" | "down" | "neutral"
  thisMonthTrend?: "up" | "down" | "neutral"
}

// 动态报告数据（从 API 获取）
let cachedReports: PurchaseReport[] = []
let cachedStats: ReportStats | null = null
let lastFetchTime: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

// 从 daily-data API 获取报告数据（客户端）
async function fetchDailyReportData(): Promise<{ reports: PurchaseReport[], stats: ReportStats }> {
  const now = Date.now()

  // 如果缓存有效，直接返回缓存数据
  if (cachedReports.length > 0 && cachedStats && (now - lastFetchTime) < CACHE_DURATION) {
    return { reports: cachedReports, stats: cachedStats }
  }

  try {
    const res = await fetch("/api/reports/daily-data?days=90")
    if (!res.ok) throw new Error("获取每日报告数据失败")

    const data = await res.json()

    if (data.success) {
      cachedReports = data.data || []
      cachedStats = data.stats || null
      lastFetchTime = now
    }

    return { reports: cachedReports, stats: cachedStats || getDefaultStats() }
  } catch (error) {
    console.error("获取每日报告数据失败:", error)
    // 返回默认数据
    return { reports: getFallbackReports(), stats: getDefaultStats() }
  }
}

function getDefaultStats(): ReportStats {
  return {
    total: 0,
    thisWeek: 0,
    thisMonth: 0,
    pending: 0,
    byType: {},
    byTrend: {},
  }
}

// 备用报告数据（当 API 获取失败时使用）
function getFallbackReports(): PurchaseReport[] {
  return [
    {
      id: 1,
      title: "2026年4月第二周硫磺采购分析报告",
      reportDate: "2026-04-12",
      summary: "【市场概况】本周硫磺市场呈现震荡上行态势，国内硫磺均价报1185元/吨，较上周上涨2.3%。【供需分析】供应端：主要进口来源国沙特、阿联酋出货稳定，港口到货量约32万吨，环比增加5%。需求端：磷肥企业开工率维持在78%，硫酸需求平稳。【价格走势】中东FOB报价$128-132/吨，较上周上涨$3；国内港口现货价格1180-1200元/吨。【库存情况】主要港口库存约48万吨，较上周下降6%，库存消费比降至12.5天。【后市研判】预计短期内价格将维持高位震荡，建议关注5月春耕需求启动情况。",
      recommendation: "适当备库",
      priceTrend: "小幅上涨",
      riskLevel: "中等",
      createdAt: new Date("2026-04-12"),
    },
    {
      id: 2,
      title: "2026年4月第一周硫磺采购分析报告",
      reportDate: "2026-04-05",
      summary: "【市场概况】本周硫磺价格小幅回调，市场观望情绪浓厚。国内硫磺均价报1158元/吨，较上周下跌1.2%。【供需分析】供应端：进口硫磺到港量约30万吨，与上周基本持平。需求端：下游磷肥企业采购意愿偏弱，以消耗库存为主。【价格走势】中东FOB报价$125-129/吨；国内港口现货价格1150-1170元/吨，成交清淡。【库存情况】主要港口库存约51万吨，较上周增加3%，库存消费比13.2天。【后市研判】预计短期内价格仍有下行压力，建议等待更好的采购窗口。",
      recommendation: "观望",
      priceTrend: "小幅下跌",
      riskLevel: "低",
      createdAt: new Date("2026-04-05"),
    },
    {
      id: 3,
      title: "2026年3月第四周硫磺采购分析报告",
      reportDate: "2026-03-28",
      summary: "【市场概况】本周硫磺市场整体稳定，价格波动较小。国内硫磺均价报1172元/吨，与上周基本持平。【供需分析】供应端：主要供应商出货正常，港口到货量约29万吨。需求端：春耕备肥需求逐步启动，下游采购积极性有所提升。【价格走势】中东FOB报价$126-130/吨；国内港口现货价格1165-1180元/吨。【库存情况】主要港口库存约49万吨，库存消费比12.8天，处于合理区间。【后市研判】随着春耕需求释放，预计4月份价格有望小幅上涨。",
      recommendation: "按需采购",
      priceTrend: "稳定",
      riskLevel: "低",
      createdAt: new Date("2026-03-28"),
    },
    {
      id: 4,
      title: "2026年3月第三周硫磺采购分析报告",
      reportDate: "2026-03-21",
      summary: "【市场概况】本周硫磺市场呈现震荡上行态势，国内硫磺均价报1185元/吨，较上周上涨2.3%。【供需分析】供应端：主要进口来源国沙特、阿联酋出货稳定，港口到货量约32万吨，环比增加5%。需求端：磷肥企业开工率维持在78%，硫酸需求平稳。【价格走势】中东FOB报价$128-132/吨，较上周上涨$3；国内港口现货价格1180-1200元/吨。【库存情况】主要港口库存约48万吨，较上周下降6%，库存消费比降至12.5天。【后市研判】预计短期内价格将维持高位震荡，建议关注4月春耕需求启动情况。",
      recommendation: "适当备库",
      priceTrend: "小幅上涨",
      riskLevel: "中等",
      createdAt: new Date("2026-03-21"),
    },
    {
      id: 5,
      title: "2026年3月供应商综合评估报告",
      reportDate: "2026-03-20",
      summary: "【评估概述】本报告对主要硫磺供应商进行了综合评估，涵盖价格竞争力、供货稳定性、服务质量、信用状况四个维度。【评估结果】TOP3供应商：1.沙特阿美-综合评分92分，价格优势明显，供货稳定；2.阿联酋ADNOC-综合评分89分，服务响应及时，质量稳定；3.卡塔尔QP-综合评分86分，价格适中，信用良好。【价格对比】三家主要供应商报价区间$122-135/吨，价差约10%。【建议措施】建议增加与沙特阿美的合作份额，同时开发1-2家备用供应商以分散风险。",
      recommendation: "按需采购",
      priceTrend: "稳定",
      riskLevel: "低",
      createdAt: new Date("2026-03-20"),
    },
    {
      id: 6,
      title: "2026年3月库存预警专项报告",
      reportDate: "2026-03-15",
      summary: "【预警级别】黄色预警-需关注。【库存现状】当前港口库存约45万吨，较安全库存线50万吨低10%。主要港口库存分布：青岛港18万吨、日照港12万吨、连云港8万吨、其他7万吨。【原因分析】1.部分船期延迟；2.下游提前备货消耗；3.春耕需求启动。【影响评估】若不及时补充，可能影响3月下旬至4月上旬的生产供应。【应对建议】1.紧急联系供应商追加订单；2.协调港口优先卸货；3.与下游协商调整生产计划。",
      recommendation: "紧急采购",
      priceTrend: "上涨",
      riskLevel: "高",
      createdAt: new Date("2026-03-15"),
    },
    {
      id: 7,
      title: "2026年2月月度市场分析报告",
      reportDate: "2026-02-28",
      summary: "【月度概览】2月份硫磺市场整体呈现稳中偏强态势，月均价1155元/吨，较1月上涨3.2%。【供需分析】供应端：本月进口总量约110万吨，同比增加5%。需求端：磷肥产量环比持平，硫酸需求稳定。【价格走势】月初1140元/吨逐步上涨至月末1170元/吨，涨幅2.6%。【成本分析】国际运费波动较大，中东至中国运费$28-35/吨。【库存变化】月末库存约48万吨，较月初下降12%。【后市展望】3月春耕需求集中释放，价格预计继续上涨。",
      recommendation: "适当备库",
      priceTrend: "上涨",
      riskLevel: "中等",
      createdAt: new Date("2026-02-28"),
    },
    {
      id: 8,
      title: "2025年年度采购总结报告",
      reportDate: "2025-12-31",
      summary: "【年度概况】2025年硫磺采购总量约1450万吨，同比增加5.2%；采购均价1128元/吨，同比下降4.3%。【成本分析】全年采购总成本约163.6亿元，同比下降2.1%，节约成本约3.5亿元。【供应商表现】前五大供应商采购占比78%，供应商集中度较去年提高3个百分点。【价格波动】年内最高价1220元/吨（3月），最低价1050元/吨（8月），波动幅度16.2%。【库存管理】平均库存周转天数13.5天，较去年缩短1.2天。【改进建议】1.优化供应商结构，降低集中度风险；2.加强价格预测能力，把握采购时机；3.完善库存预警机制。",
      recommendation: "按需采购",
      priceTrend: "稳定",
      riskLevel: "低",
      createdAt: new Date("2025-12-31"),
    },
    {
      id: 9,
      title: "2026年一季度采购策略报告",
      reportDate: "2026-01-15",
      summary: "【策略背景】一季度为传统需求旺季，春耕备肥需求集中释放，需提前做好采购规划。【市场预判】预计一季度硫磺价格区间1150-1220元/吨，均价约1180元/吨，较去年四季度上涨3-5%。【采购计划】1月：按需采购，维持正常库存；2月：春节前适当增加库存至55万吨；3月：根据春耕需求启动情况灵活调整。【供应商策略】维持与主要供应商的合作，同时开发1-2家新供应商作为备选。【风险控制】设置价格预警线1200元/吨，超过预警线需重新评估采购策略。",
      recommendation: "适当备库",
      priceTrend: "小幅上涨",
      riskLevel: "中等",
      createdAt: new Date("2026-01-15"),
    },
    {
      id: 10,
      title: "国际硫磺市场周报（4月第二周）",
      reportDate: "2026-04-14",
      summary: "【国际市场】本周国际硫磺市场整体偏强。中东地区：沙特FOB报价$130-134/吨，阿联酋FOB报价$128-132/吨，均较上周上涨$2-3。北美地区：美国海湾FOB报价$125-130/吨，需求稳定。欧洲地区：西北欧FOB报价$120-125/吨，市场清淡。【运费动态】中东至中国运费$30-35/吨，较上周上涨$2；美湾至中国运费$45-50/吨。【汇率影响】人民币汇率7.25，较上周贬值0.3%，对进口成本有一定支撑。【贸易流向】本周中国进口硫磺主要来源：沙特35%、阿联酋25%、卡塔尔15%、其他25%。",
      recommendation: "按需采购",
      priceTrend: "震荡",
      riskLevel: "中等",
      createdAt: new Date("2026-04-14"),
    },
  ]
}

// 客户端获取报告数据
export async function getReports(filters?: ReportFilters): Promise<PurchaseReport[]> {
  const { reports } = await fetchDailyReportData()
  let filteredReports = reports

  if (filters) {
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase()
      filteredReports = filteredReports.filter(
        (r) =>
          r.title.toLowerCase().includes(keyword) ||
          r.summary.toLowerCase().includes(keyword)
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

  return filteredReports.sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())
}

export async function getReportById(id: number): Promise<PurchaseReport | null> {
  const { reports } = await fetchDailyReportData()
  return reports.find((r) => r.id === id) || null
}

export async function getReportStats(): Promise<ReportStats> {
  const { stats } = await fetchDailyReportData()
  return stats
}

export async function createReport(report: Omit<NewPurchaseReport, "id" | "createdAt">): Promise<PurchaseReport> {
  // 创建报告时清除缓存，下次获取时会重新加载
  cachedReports = []
  cachedStats = null

  const newReport: PurchaseReport = {
    id: Date.now(),
    title: report.title,
    reportDate: report.reportDate,
    summary: report.summary,
    recommendation: report.recommendation ?? null,
    priceTrend: report.priceTrend ?? null,
    riskLevel: report.riskLevel ?? null,
    createdAt: new Date(),
  }

  return newReport
}

export async function deleteReport(id: number): Promise<boolean> {
  // 删除报告时清除缓存
  cachedReports = []
  cachedStats = null

  return true
}

// 清除缓存（用于手动刷新）
export function clearReportCache() {
  cachedReports = []
  cachedStats = null
  lastFetchTime = 0
}