/**
 * 库存分析服务
 *
 * 提供库存周转率计算、呆滞风险预测、健康度评分等功能
 */

import { db as dbInstance } from "@/db"
import { inventorySnapshots, inventoryAlerts, enterprises } from "@/db/schema"
import { eq, and, desc, sql } from "drizzle-orm"

const db = dbInstance!

// ==================== 库存周转率计算 ====================

/** 计算库存周转率 */
export function calculateTurnoverRate(annualConsumption: number, avgInventory: number): number {
  if (avgInventory === 0) return 0
  return Math.round((annualConsumption / avgInventory) * 100) / 100
}

/** 计算库存可用天数 */
export function calculateDaysOfCover(currentStock: number, dailyConsumption: number): number {
  if (dailyConsumption === 0) return 0
  return Math.round(currentStock / dailyConsumption)
}

// ==================== 库存健康度评分 ====================

/** 计算库存健康度评分 (0-100) */
export function calculateHealthScore(params: {
  currentStock: number
  maxCapacity: number
  safetyDays: number
  avgConsumption: number
  turnoverRate: number
}): number {
  const { currentStock, maxCapacity, safetyDays, avgConsumption, turnoverRate } = params

  const daysOfCover = calculateDaysOfCover(currentStock, avgConsumption)
  const fillPercent = (currentStock / maxCapacity) * 100

  // 周转率得分 (30分)
  let turnoverScore = 30
  if (turnoverRate < 4) turnoverScore = 10
  else if (turnoverRate < 6) turnoverScore = 20
  else if (turnoverRate < 8) turnoverScore = 25
  else if (turnoverRate >= 10) turnoverScore = 30

  // 填充率得分 (30分) - 40-70% 最佳
  let fillScore = 30
  if (fillPercent < 20) fillScore = 5
  else if (fillPercent < 40) fillScore = 15
  else if (fillPercent >= 40 && fillPercent <= 70) fillScore = 30
  else if (fillPercent > 70 && fillPercent <= 85) fillScore = 20
  else if (fillPercent > 85) fillScore = 10

  // 安全天数得分 (40分)
  let safetyScore = 40
  if (daysOfCover < safetyDays * 0.5) safetyScore = 5
  else if (daysOfCover < safetyDays * 0.8) safetyScore = 20
  else if (daysOfCover >= safetyDays * 0.8 && daysOfCover <= safetyDays * 1.5) safetyScore = 40
  else if (daysOfCover > safetyDays * 1.5 && daysOfCover <= safetyDays * 2) safetyScore = 25
  else if (daysOfCover > safetyDays * 2) safetyScore = 10

  return turnoverScore + fillScore + safetyScore
}

// ==================== 呆滞风险预测 ====================

/** 预测呆滞风险 */
export function predictStagnantRisk(params: {
  currentStock: number
  safetyDays: number
  avgConsumption: number
  priceTrend?: "up" | "down" | "stable"
}): { riskLevel: "low" | "medium" | "high"; reason: string } {
  const { currentStock, safetyDays, avgConsumption, priceTrend } = params
  const daysOfCover = calculateDaysOfCover(currentStock, avgConsumption)
  const safetyThreshold = safetyDays * 1.5

  // 库存远超安全天数
  if (daysOfCover > safetyThreshold * 2) {
    return {
      riskLevel: "high",
      reason: `库存可用天数(${daysOfCover}天)远超安全库存(${safetyDays}天)的2倍，存在严重呆滞风险`,
    }
  }

  if (daysOfCover > safetyThreshold) {
    // 价格下跌趋势加剧呆滞风险
    if (priceTrend === "down") {
      return {
        riskLevel: "high",
        reason: `库存偏高(${daysOfCover}天)且价格处于下跌趋势，建议延缓采购消耗存量`,
      }
    }
    return {
      riskLevel: "medium",
      reason: `库存可用天数(${daysOfCover}天)超过安全阈值(${Math.round(safetyThreshold)}天)，存在呆滞风险`,
    }
  }

  return {
    riskLevel: "low",
    reason: `库存水平正常(${daysOfCover}天)`,
  }
}

// ==================== 库存建议生成 ====================

/** 生成库存建议 */
export function getInventoryRecommendation(params: {
  currentStock: number
  maxCapacity: number
  safetyDays: number
  avgConsumption: number
  priceTrend?: "up" | "down" | "stable"
}): {
  action: "buy_now" | "buy_soon" | "wait" | "reduce"
  message: string
  urgency: "high" | "medium" | "low"
  suggestedQuantity?: number
} {
  const { currentStock, maxCapacity, safetyDays, avgConsumption, priceTrend } = params
  const daysOfCover = calculateDaysOfCover(currentStock, avgConsumption)
  const fillPercent = (currentStock / maxCapacity) * 100

  // 库存危急
  if (daysOfCover < safetyDays * 0.6) {
    return {
      action: "buy_now",
      message: `库存仅剩${daysOfCover}天用量，低于安全库存${safetyDays}天的60%，建议立即采购`,
      urgency: "high",
      suggestedQuantity: Math.round(avgConsumption * safetyDays * 1.2 - currentStock),
    }
  }

  // 库存偏低
  if (daysOfCover < safetyDays) {
    if (priceTrend === "up") {
      return {
        action: "buy_now",
        message: `库存偏低(${daysOfCover}天)且价格呈上涨趋势，建议立即备货`,
        urgency: "high",
        suggestedQuantity: Math.round(avgConsumption * safetyDays * 1.5 - currentStock),
      }
    }
    return {
      action: "buy_soon",
      message: `库存偏低(${daysOfCover}天)，建议近期采购`,
      urgency: "medium",
      suggestedQuantity: Math.round(avgConsumption * safetyDays - currentStock),
    }
  }

  // 库存充足
  if (daysOfCover >= safetyDays && daysOfCover <= safetyDays * 1.5) {
    if (priceTrend === "down") {
      return {
        action: "wait",
        message: `库存充足(${daysOfCover}天)且价格处于下跌趋势，建议等待价格进一步走低`,
        urgency: "low",
      }
    }
    return {
      action: "wait",
      message: `库存充足(${daysOfCover}天)，可维持现状`,
      urgency: "low",
    }
  }

  // 库存过高
  if (fillPercent > 80) {
    return {
      action: "reduce",
      message: `库存填充率${fillPercent.toFixed(1)}%过高，建议消耗存量后再采购`,
      urgency: "medium",
    }
  }

  return {
    action: "wait",
    message: `库存状态正常(${daysOfCover}天)`,
    urgency: "low",
  }
}

// ==================== 库存快照记录 ====================

/** 记录库存快照 */
export async function recordInventorySnapshot(data: {
  enterpriseCode: string
  date: string
  stockLevel: number
  dailyConsumption?: number
  turnoverRate?: number
  daysOfCover?: number
  healthScore?: number
  stagnantItems?: any[]
}) {
  const result = await db.insert(inventorySnapshots).values({
    enterpriseCode: data.enterpriseCode,
    date: data.date,
    stockLevel: data.stockLevel.toString(),
    dailyConsumption: data.dailyConsumption?.toString() ?? undefined,
    turnoverRate: data.turnoverRate?.toString() ?? undefined,
    daysOfCover: data.daysOfCover,
    healthScore: data.healthScore,
    stagnantItems: data.stagnantItems,
  }).returning()
  return result[0]
}

/** 获取企业库存快照历史 */
export async function getInventorySnapshots(enterpriseCode: string, days: number = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  return db
    .select()
    .from(inventorySnapshots)
    .where(
      and(
        eq(inventorySnapshots.enterpriseCode, enterpriseCode),
        sql`${inventorySnapshots.date} >= ${startDate.toISOString().split("T")[0]}`
      )
    )
    .orderBy(desc(inventorySnapshots.date))
}

// ==================== 库存预警 ====================

/** 生成库存预警 */
export async function generateInventoryAlerts(enterpriseCode: string) {
  const enterprise = await db
    .select()
    .from(enterprises)
    .where(eq(enterprises.code, enterpriseCode))
    .limit(1)

  if (!enterprise[0]) return []

  const e = enterprise[0]
  const alerts: any[] = []

  const currentStock = Number(e.currentStock || 0)
  const maxCapacity = Number(e.maxCapacity || 1)
  const safetyDays = e.safetyDays || 20
  const avgConsumption = Number(e.avgConsumption || 1)
  const daysOfCover = calculateDaysOfCover(currentStock, avgConsumption)
  const fillPercent = (currentStock / maxCapacity) * 100

  // 库存不足预警
  if (daysOfCover < safetyDays * 0.6) {
    alerts.push({
      enterpriseCode,
      alertType: "stockout",
      severity: "critical",
      message: `库存仅剩${daysOfCover}天用量，严重低于安全库存${safetyDays}天`,
      metadata: { currentStock, threshold: safetyDays * avgConsumption, daysOfCover },
    })
  } else if (daysOfCover < safetyDays) {
    alerts.push({
      enterpriseCode,
      alertType: "stockout",
      severity: "high",
      message: `库存偏低(${daysOfCover}天)，低于安全库存${safetyDays}天`,
      metadata: { currentStock, threshold: safetyDays * avgConsumption, daysOfCover },
    })
  }

  // 库存过高预警
  if (fillPercent > 85) {
    alerts.push({
      enterpriseCode,
      alertType: "overstock",
      severity: "high",
      message: `库存填充率${fillPercent.toFixed(1)}%过高，存在呆滞风险`,
      metadata: { currentStock, threshold: maxCapacity * 0.85, daysOfCover },
    })
  }

  // 呆滞预警
  if (daysOfCover > safetyDays * 1.5) {
    alerts.push({
      enterpriseCode,
      alertType: "stagnant",
      severity: "medium",
      message: `库存可用天数(${daysOfCover}天)远超安全阈值(${Math.round(safetyDays * 1.5)}天)`,
      metadata: { currentStock, daysOfCover, stagnantRisk: "high" },
    })
  }

  // 周转率过低预警
  const turnoverRate = e.turnoverRate || 0
  if (turnoverRate < 4) {
    alerts.push({
      enterpriseCode,
      alertType: "turnover_low",
      severity: "medium",
      message: `库存周转率(${turnoverRate}次/年)偏低，资金占用成本高`,
      metadata: { turnoverRate, threshold: 4 },
    })
  }

  // 保存预警
  for (const alert of alerts) {
    await db.insert(inventoryAlerts).values(alert)
  }

  return alerts
}

/** 获取企业库存预警 */
export async function getInventoryAlerts(enterpriseCode: string, isHandled?: boolean) {
  const conditions = [eq(inventoryAlerts.enterpriseCode, enterpriseCode)]
  if (isHandled !== undefined) {
    conditions.push(eq(inventoryAlerts.isHandled, isHandled))
  }

  return db
    .select()
    .from(inventoryAlerts)
    .where(and(...conditions))
    .orderBy(desc(inventoryAlerts.createdAt))
}

/** 处理库存预警 */
export async function handleInventoryAlert(id: number, note?: string) {
  const result = await db
    .update(inventoryAlerts)
    .set({
      isHandled: true,
      handledAt: new Date(),
      handleNote: note,
    })
    .where(eq(inventoryAlerts.id, id))
    .returning()
  return result[0]
}

// ==================== 库存分析聚合 ====================

/** 获取企业库存分析数据 */
export async function getInventoryAnalysis(enterpriseCode: string) {
  const enterprise = await db
    .select()
    .from(enterprises)
    .where(eq(enterprises.code, enterpriseCode))
    .limit(1)

  if (!enterprise[0]) return null

  const e = enterprise[0]
  const currentStock = Number(e.currentStock || 0)
  const maxCapacity = Number(e.maxCapacity || 1)
  const safetyDays = e.safetyDays || 20
  const avgConsumption = Number(e.avgConsumption || 1)
  const turnoverRate = e.turnoverRate || 0

  const daysOfCover = calculateDaysOfCover(currentStock, avgConsumption)
  const healthScore = calculateHealthScore({
    currentStock,
    maxCapacity,
    safetyDays,
    avgConsumption,
    turnoverRate,
  })

  const stagnantRisk = predictStagnantRisk({
    currentStock,
    safetyDays,
    avgConsumption,
  })

  return {
    enterpriseCode,
    currentStock,
    maxCapacity,
    safetyDays,
    avgConsumption,
    turnoverRate,
    daysOfCover,
    healthScore,
    stagnantRisk,
    fillPercent: (currentStock / maxCapacity) * 100,
  }
}
