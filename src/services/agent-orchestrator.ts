/**
 * 多 Agent 协作编排服务
 *
 * 协调 PriceAgent、InventoryAgent、RiskAgent、ProcurementAgent 的分析
 */

import { getInventoryAnalysis, getInventoryRecommendation } from "./inventory-analysis"
import { getTrendAnalysis } from "./prediction"

// ==================== Agent 类型定义 ====================

export interface AgentOutput {
  agent: "price" | "inventory" | "risk" | "procurement"
  analysis: string
  confidence: number
  recommendation: string
  data: Record<string, any>
}

export interface OrchestrationResult {
  question: string
  agents: AgentOutput[]
  finalRecommendation: string
  reasoning: string
}

// ==================== Agent 角色实现 ====================

/** PriceAgent - 价格走势预测 */
async function runPriceAgent(enterpriseCode: string, context: any): Promise<AgentOutput> {
  try {
    const trendResult = await getTrendAnalysis(7)
    const trend = trendResult?.data
    const currentPrice = trend?.current_price || 0
    const trendDirection = trend?.trend_7d || "stable"
    const changePercent = trend?.change_7d_percent || 0
    const regime = trend?.regime || "normal"
    const riskAdjustment = trend?.risk_adjustment || 1.0

    // 根据 regime 动态调整决策阈值
    // high: 高波动，更敏感（2%即触发建议）
    // low: 低波动，更宽容（5%才触发）
    // normal: 标准（3%）
    const threshold = regime === "high" ? 2 : regime === "low" ? 5 : 3

    let analysis = `当前硫磺价格${currentPrice}元/吨，`
    if (trendDirection === "up") {
      analysis += `近7日呈上涨趋势，涨幅${changePercent}%。`
    } else if (trendDirection === "down") {
      analysis += `近7日呈下跌趋势，跌幅${Math.abs(changePercent)}%。`
    } else {
      analysis += `近7日价格平稳。`
    }

    // 补充 regime 信息
    const regimeLabel = regime === "high" ? "高波动" : regime === "low" ? "低波动" : "正常"
    analysis += `市场波动状态：${regimeLabel}`
    if (riskAdjustment !== 1.0) {
      analysis += `（风险系数 ${riskAdjustment.toFixed(2)}）`
    }
    analysis += `。`

    let recommendation = ""
    if (regime === "high") {
      // 高波动：无论涨跌，优先提示风险
      recommendation = "市场波动较大，建议谨慎操作，控制采购节奏"
      if (trendDirection === "up" && changePercent > threshold) {
        recommendation = "高波动下价格快速上涨，建议分批采购降低风险"
      } else if (trendDirection === "down" && Math.abs(changePercent) > threshold) {
        recommendation = "高波动下价格下跌，可等待企稳后择机采购"
      }
    } else if (trendDirection === "up" && changePercent > threshold) {
      recommendation = "价格快速上涨，建议尽快采购锁定成本"
    } else if (trendDirection === "down" && Math.abs(changePercent) > threshold) {
      recommendation = "价格持续下跌，建议等待价格企稳后再采购"
    } else {
      recommendation = "价格波动正常，可按计划采购"
    }

    return {
      agent: "price",
      analysis,
      confidence: 0.85,
      recommendation,
      data: { currentPrice, trendDirection, changePercent, regime, riskAdjustment },
    }
  } catch (error) {
    return {
      agent: "price",
      analysis: "价格预测服务暂时不可用",
      confidence: 0.5,
      recommendation: "建议手动查询最新价格",
      data: {},
    }
  }
}

/** InventoryAgent - 库存水位分析 */
async function runInventoryAgent(enterpriseCode: string, context: any): Promise<AgentOutput> {
  try {
    const analysis = await getInventoryAnalysis(enterpriseCode)
    if (!analysis) {
      return {
        agent: "inventory",
        analysis: "未找到企业库存数据",
        confidence: 0.3,
        recommendation: "请先配置企业库存信息",
        data: {},
      }
    }

    const { daysOfCover, healthScore, stagnantRisk, fillPercent } = analysis
    const recommendation = getInventoryRecommendation({
      currentStock: analysis.currentStock,
      maxCapacity: analysis.maxCapacity,
      safetyDays: analysis.safetyDays,
      avgConsumption: analysis.avgConsumption,
      priceTrend: context.priceTrend,
    })

    let analysisText = `库存可用${daysOfCover}天，健康度${healthScore}分，填充率${fillPercent.toFixed(1)}%。`
    if (stagnantRisk.riskLevel === "high") {
      analysisText += `存在呆滞风险：${stagnantRisk.reason}`
    }

    return {
      agent: "inventory",
      analysis: analysisText,
      confidence: 0.9,
      recommendation: recommendation.message,
      data: {
        daysOfCover,
        healthScore,
        stagnantRisk: stagnantRisk.riskLevel,
        fillPercent,
        action: recommendation.action,
        suggestedQuantity: recommendation.suggestedQuantity,
      },
    }
  } catch (error) {
    return {
      agent: "inventory",
      analysis: "库存分析服务暂时不可用",
      confidence: 0.5,
      recommendation: "请检查企业库存配置",
      data: {},
    }
  }
}

/** RiskAgent - 供应链风险监测（模块已移除，返回占位数据） */
async function runRiskAgent(enterpriseCode: string, context: any): Promise<AgentOutput> {
  return {
    agent: "risk",
    analysis: "供应链风险监测模块暂未启用",
    confidence: 0.5,
    recommendation: "建议手动检查供应商状态",
    data: { activeRiskCount: 0, risks: [], supplierSummary: { avgOnTimeRate: 0, avgQualityScore: 0 } },
  }
}

/** ProcurementAgent - 综合采购方案 */
async function runProcurementAgent(
  enterpriseCode: string,
  context: any,
  agentOutputs: AgentOutput[]
): Promise<AgentOutput> {
  try {
    const priceOutput = agentOutputs.find(o => o.agent === "price")
    const inventoryOutput = agentOutputs.find(o => o.agent === "inventory")
    const riskOutput = agentOutputs.find(o => o.agent === "risk")

    const priceTrend = priceOutput?.data.trendDirection || "stable"
    const inventoryAction = inventoryOutput?.data.action || "wait"
    const riskCount = riskOutput?.data.activeRiskCount || 0

    let analysis = "综合分析："
    if (priceTrend === "up" && inventoryAction === "buy_now") {
      analysis += "价格上涨且库存不足，建议立即采购。"
    } else if (priceTrend === "down" && inventoryAction === "wait") {
      analysis += "价格下跌且库存充足，建议等待更优时机。"
    } else if (riskCount > 0) {
      analysis += "存在供应风险，建议分散采购并关注替代供应商。"
    } else {
      analysis += "市场平稳，可按常规节奏采购。"
    }

    return {
      agent: "procurement",
      analysis,
      confidence: 0.85,
      recommendation: generateFinalRecommendation(priceTrend, inventoryAction, riskCount, 1.0),
      data: {
        priceTrend,
        inventoryAction,
        riskCount,
        demandMultiplier: 1.0,
      },
    }
  } catch (error) {
    return {
      agent: "procurement",
      analysis: "采购决策服务暂时不可用",
      confidence: 0.5,
      recommendation: "建议综合各 Agent 分析自行决策",
      data: {},
    }
  }
}

/** 生成最终建议 */
function generateFinalRecommendation(
  priceTrend: string,
  inventoryAction: string,
  riskCount: number,
  demandMultiplier: number
): string {
  if (inventoryAction === "buy_now" && priceTrend === "up") {
    return "立即采购：库存不足且价格上涨，建议尽快锁定成本"
  }
  if (inventoryAction === "buy_now" && riskCount > 0) {
    return "紧急采购：库存不足且存在供应风险，建议立即采购并关注替代供应商"
  }
  if (inventoryAction === "wait" && priceTrend === "down") {
    return "暂缓采购：库存充足且价格下跌，建议等待价格企稳"
  }
  if (demandMultiplier >= 1.2 && inventoryAction !== "buy_now") {
    return "旺季备货：需求旺盛期即将到来，建议提前备货"
  }
  if (inventoryAction === "buy_soon") {
    return "近期采购：库存偏低，建议1-2周内完成采购"
  }
  return "正常采购：按常规节奏执行采购计划"
}

// ==================== 编排主函数 ====================

/** 编排多 Agent 分析 */
export async function orchestrateAnalysis(
  question: string,
  enterpriseCode: string
): Promise<OrchestrationResult> {
  const context: any = {}

  // 第一阶段：先运行 PriceAgent 获取价格走势（串行）
  const priceOutput = await runPriceAgent(enterpriseCode, context)

  // 提取价格走势供后续 Agent 使用
  context.priceTrend = priceOutput.data.trendDirection

  // 第二阶段：并行运行 InventoryAgent 和 RiskAgent（此时 context.priceTrend 已有值）
  const [inventoryOutput, riskOutput] = await Promise.all([
    runInventoryAgent(enterpriseCode, context),
    runRiskAgent(enterpriseCode, context),
  ])

  // ProcurementAgent 综合前三者输出
  const procurementOutput = await runProcurementAgent(enterpriseCode, context, [
    priceOutput,
    inventoryOutput,
    riskOutput,
  ])

  const agents = [priceOutput, inventoryOutput, riskOutput, procurementOutput]

  return {
    question,
    agents,
    finalRecommendation: procurementOutput.recommendation,
    reasoning: procurementOutput.analysis,
  }
}

/** 判断是否需要多 Agent 分析 */
export function needsMultiAgentAnalysis(question: string): boolean {
  const keywords = [
    "采购建议",
    "要不要买",
    "采购时机",
    "综合分析",
    "全面分析",
    "多Agent",
    "协作分析",
  ]
  return keywords.some(kw => question.includes(kw))
}
