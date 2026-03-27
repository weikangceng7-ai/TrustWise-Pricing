import { db } from "@/db"
import { purchaseReports, type PurchaseReport, type NewPurchaseReport } from "@/db/schema"
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

const mockReports: PurchaseReport[] = [
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
    title: "2026年2月第四周硫磺采购分析报告",
    reportDate: "2026-02-24",
    summary: "【市场概况】春节后市场逐步恢复，硫磺价格稳中有升。国内硫磺均价报1168元/吨，较节前上涨1.5%。【供需分析】供应端：进口硫磺到港逐步恢复正常，本周到货约25万吨。需求端：下游企业陆续复工，采购需求逐步释放。【价格走势】中东FOB报价$124-128/吨；国内港口现货价格1160-1175元/吨。【库存情况】主要港口库存约52万吨，节日期间有所累积。【后市研判】3月份随着需求恢复，价格有望继续小幅上涨，建议提前规划采购。",
    recommendation: "适当备库",
    priceTrend: "小幅上涨",
    riskLevel: "低",
    createdAt: new Date("2026-02-24"),
  },
  {
    id: 6,
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
    id: 7,
    title: "2026年2月库存预警专项报告",
    reportDate: "2026-02-15",
    summary: "【预警级别】黄色预警-需关注。【库存现状】当前港口库存约45万吨，较安全库存线50万吨低10%。主要港口库存分布：青岛港18万吨、日照港12万吨、连云港8万吨、其他7万吨。【原因分析】1.春节前采购量减少；2.部分船期延迟；3.下游提前备货消耗。【影响评估】若不及时补充，可能影响2月下旬至3月上旬的生产供应。【应对建议】1.紧急联系供应商追加订单；2.协调港口优先卸货；3.与下游协商调整生产计划。",
    recommendation: "紧急采购",
    priceTrend: "上涨",
    riskLevel: "高",
    createdAt: new Date("2026-02-15"),
  },
  {
    id: 8,
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
    id: 9,
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
  {
    id: 10,
    title: "2025年年度采购总结报告",
    reportDate: "2025-12-31",
    summary: "【年度概况】2025年硫磺采购总量约1450万吨，同比增加5.2%；采购均价1128元/吨，同比下降4.3%。【成本分析】全年采购总成本约163.6亿元，同比下降2.1%，节约成本约3.5亿元。【供应商表现】前五大供应商采购占比78%，供应商集中度较去年提高3个百分点。【价格波动】年内最高价1220元/吨（3月），最低价1050元/吨（8月），波动幅度16.2%。【库存管理】平均库存周转天数13.5天，较去年缩短1.2天。【改进建议】1.优化供应商结构，降低集中度风险；2.加强价格预测能力，把握采购时机；3.完善库存预警机制。",
    recommendation: "按需采购",
    priceTrend: "稳定",
    riskLevel: "低",
    createdAt: new Date("2025-12-31"),
  },
  {
    id: 11,
    title: "2026年一季度采购策略报告",
    reportDate: "2026-03-18",
    summary: "【策略背景】一季度为传统需求旺季，春耕备肥需求集中释放，需提前做好采购规划。【市场预判】预计一季度硫磺价格区间1150-1220元/吨，均价约1180元/吨，较去年四季度上涨3-5%。【采购计划】1月：按需采购，维持正常库存；2月：春节前适当增加库存至55万吨；3月：根据春耕需求启动情况灵活调整。【供应商策略】维持与主要供应商的合作，同时开发1-2家新供应商作为备选。【风险控制】设置价格预警线1200元/吨，超过预警线需重新评估采购策略。",
    recommendation: "适当备库",
    priceTrend: "小幅上涨",
    riskLevel: "中等",
    createdAt: new Date("2026-03-18"),
  },
  {
    id: 12,
    title: "国际硫磺市场周报（3月第三周）",
    reportDate: "2026-03-19",
    summary: "【国际市场】本周国际硫磺市场整体偏强。中东地区：沙特FOB报价$130-134/吨，阿联酋FOB报价$128-132/吨，均较上周上涨$2-3。北美地区：美国海湾FOB报价$125-130/吨，需求稳定。欧洲地区：西北欧FOB报价$120-125/吨，市场清淡。【运费动态】中东至中国运费$30-35/吨，较上周上涨$2；美湾至中国运费$45-50/吨。【汇率影响】人民币汇率7.25，较上周贬值0.3%，对进口成本有一定支撑。【贸易流向】本周中国进口硫磺主要来源：沙特35%、阿联酋25%、卡塔尔15%、其他25%。",
    recommendation: "按需采购",
    priceTrend: "震荡",
    riskLevel: "中等",
    createdAt: new Date("2026-03-19"),
  },
]

export async function getReports(filters?: ReportFilters): Promise<PurchaseReport[]> {
  let reports = [...mockReports]

  if (filters) {
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase()
      reports = reports.filter(
        (r) =>
          r.title.toLowerCase().includes(keyword) ||
          r.summary.toLowerCase().includes(keyword)
      )
    }

    if (filters.startDate) {
      reports = reports.filter((r) => r.reportDate >= filters.startDate!)
    }

    if (filters.endDate) {
      reports = reports.filter((r) => r.reportDate <= filters.endDate!)
    }

    if (filters.trend) {
      reports = reports.filter((r) => r.priceTrend === filters.trend)
    }

    if (filters.risk) {
      reports = reports.filter((r) => r.riskLevel === filters.risk)
    }
  }

  return reports.sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())
}

export async function getReportById(id: number): Promise<PurchaseReport | null> {
  return mockReports.find((r) => r.id === id) || null
}

export async function getReportStats(): Promise<ReportStats> {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1)

  const byType: Record<string, number> = {
    weekly: 0,
    monthly: 0,
    supplier: 0,
    inventory: 0,
    special: 0,
  }

  const byTrend: Record<string, number> = {}

  mockReports.forEach((r) => {
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
    total: mockReports.length,
    thisWeek: mockReports.filter((r) => new Date(r.reportDate) >= weekAgo).length,
    thisMonth: mockReports.filter((r) => new Date(r.reportDate) >= monthAgo).length,
    pending: 2,
    byType,
    byTrend,
  }
}

export async function createReport(report: Omit<NewPurchaseReport, "id" | "createdAt">): Promise<PurchaseReport> {
  const newReport: PurchaseReport = {
    id: Math.max(...mockReports.map((r) => r.id)) + 1,
    title: report.title,
    reportDate: report.reportDate,
    summary: report.summary,
    recommendation: report.recommendation ?? null,
    priceTrend: report.priceTrend ?? null,
    riskLevel: report.riskLevel ?? null,
    createdAt: new Date(),
  }
  mockReports.push(newReport)
  return newReport
}

export async function deleteReport(id: number): Promise<boolean> {
  const index = mockReports.findIndex((r) => r.id === id)
  if (index === -1) return false
  mockReports.splice(index, 1)
  return true
}