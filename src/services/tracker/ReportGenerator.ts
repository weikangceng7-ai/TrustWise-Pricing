/**
 * Tracker Agent 报告生成服务
 *
 * 主要职责：
 * 1. 根据追踪记录生成日/周/月报内容
 * 2. 分析价格趋势、库存水平、新闻动态、预测结果
 * 3. 提供采购建议和风险提示
 */

import { db } from "@/db"
import {
  trackerRecords,
  trackerAlerts,
  trackerReports,
  type TrackerSubscription,
  type TrackerRecord,
  type TrackerAlert,
  type PriceSnapshot,
  type InventorySnapshot,
  type NewsSnapshot,
  type PredictionSnapshot,
  type NewTrackerReport,
} from "@/db/schema-tracker"
import { eq, desc, and, gte, lte } from "drizzle-orm"
import { createReport } from "./SubscriptionManager"

// ==================== 报告生成器类 ====================

export class ReportGenerator {
  /**
   * 生成追踪报告
   * @param subscription 订阅配置
   * @param record 当前追踪记录
   */
  async generate(
    subscription: TrackerSubscription,
    record: TrackerRecord
  ): Promise<void> {
    if (!db) {
      console.error("[ReportGenerator] 数据库未初始化")
      return
    }

    const reportType = subscription.reportType || "daily"

    try {
      // 根据报告类型确定数据范围
      const dataRange = this.getDataRange(reportType)

      // 获取相关数据
      const records = await this.fetchRecords(subscription.id, dataRange)
      const alerts = await this.fetchAlerts(subscription.id, dataRange)

      // 分析各维度数据
      const priceAnalysis = this.analyzePriceData(records)
      const inventoryAnalysis = this.analyzeInventoryData(records)
      const newsAnalysis = this.analyzeNewsData(records)
      const predictionAnalysis = this.analyzePredictionData(records)

      // 生成摘要和建议
      const summary = this.generateSummary(priceAnalysis, inventoryAnalysis, newsAnalysis, predictionAnalysis)
      const recommendation = this.generateRecommendation(
        priceAnalysis,
        inventoryAnalysis,
        predictionAnalysis,
        alerts
      )

      // 创建报告
      const reportInput: NewTrackerReport = {
        subscriptionId: subscription.id,
        reportType,
        reportDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        title: `${subscription.name} - ${this.getReportTitle(reportType)}报告`,
        summary,
        priceAnalysis,
        inventoryAnalysis,
        newsAnalysis,
        predictionAnalysis,
        recommendation,
        dataRangeStart: dataRange.start.toISOString().split('T')[0],
        dataRangeEnd: dataRange.end.toISOString().split('T')[0],
        status: "generated",
      }

      await createReport(reportInput)

      console.log(`[ReportGenerator] 报告生成成功，订阅ID: ${subscription.id}, 报告类型: ${reportType}`)
    } catch (error) {
      console.error(`[ReportGenerator] 报告生成失败，订阅ID: ${subscription.id}`, error)
    }
  }

  // ==================== 数据获取方法 ====================

  /**
   * 获取数据范围
   */
  private getDataRange(reportType: string): { start: Date; end: Date } {
    const end = new Date()
    const start = new Date()

    switch (reportType) {
      case "daily":
        start.setDate(start.getDate() - 1)
        break
      case "weekly":
        start.setDate(start.getDate() - 7)
        break
      case "monthly":
        start.setMonth(start.getMonth() - 1)
        break
      default:
        start.setDate(start.getDate() - 1)
    }

    return { start, end }
  }

  /**
   * 获取追踪记录
   */
  private async fetchRecords(
    subscriptionId: number,
    dataRange: { start: Date; end: Date }
  ): Promise<TrackerRecord[]> {
    if (!db) {
      return []
    }

    return db
      .select()
      .from(trackerRecords)
      .where(
        and(
          eq(trackerRecords.subscriptionId, subscriptionId),
          gte(trackerRecords.runAt, dataRange.start),
          lte(trackerRecords.runAt, dataRange.end)
        )
      )
      .orderBy(desc(trackerRecords.runAt))
  }

  /**
   * 获取异动事件
   */
  private async fetchAlerts(
    subscriptionId: number,
    dataRange: { start: Date; end: Date }
  ): Promise<TrackerAlert[]> {
    if (!db) {
      return []
    }

    return db
      .select()
      .from(trackerAlerts)
      .where(
        and(
          eq(trackerAlerts.subscriptionId, subscriptionId),
          gte(trackerAlerts.createdAt, dataRange.start),
          lte(trackerAlerts.createdAt, dataRange.end)
        )
      )
      .orderBy(desc(trackerAlerts.createdAt))
  }

  // ==================== 分析方法 ====================

  /**
   * 分析价格数据
   */
  private analyzePriceData(records: TrackerRecord[]): string {
    const priceDataList = records
      .filter((r) => r.priceData)
      .map((r) => r.priceData as PriceSnapshot)

    if (priceDataList.length === 0) {
      return "无价格数据"
    }

    const latest = priceDataList[0]
    const prices = priceDataList.map((p) => p.currentPrice)
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
    const maxPrice = Math.max(...prices)
    const minPrice = Math.min(...prices)

    let trend = "稳定"
    if (latest.changePercent > 2) {
      trend = "上涨"
    } else if (latest.changePercent < -2) {
      trend = "下跌"
    }

    return `当前价格：${latest.currentPrice.toFixed(2)}元/吨，较上期变化${latest.changePercent > 0 ? "+" : ""}${latest.changePercent.toFixed(2)}%，趋势：${trend}。区间内最高价${maxPrice.toFixed(2)}元/吨，最低价${minPrice.toFixed(2)}元/吨，均价${avgPrice.toFixed(2)}元/吨。`
  }

  /**
   * 分析库存数据
   */
  private analyzeInventoryData(records: TrackerRecord[]): string {
    const inventoryDataList = records
      .filter((r) => r.inventoryData)
      .map((r) => r.inventoryData as InventorySnapshot)

    if (inventoryDataList.length === 0) {
      return "无库存数据"
    }

    const latest = inventoryDataList[0]
    const inventories = inventoryDataList.map((i) => i.currentInventory)
    const avgInventory = inventories.reduce((a, b) => a + b, 0) / inventories.length

    let levelDesc = "适中"
    if (avgInventory > 100000) {
      levelDesc = "较高"
    } else if (avgInventory < 50000) {
      levelDesc = "偏低"
    }

    return `当前库存：${latest.currentInventory.toFixed(0)}吨，较上期变化${latest.changePercent > 0 ? "+" : ""}${latest.changePercent.toFixed(2)}%，库存水平：${levelDesc}。区间内平均库存${avgInventory.toFixed(0)}吨。`
  }

  /**
   * 分析新闻数据
   */
  private analyzeNewsData(records: TrackerRecord[]): string {
    const newsDataList = records
      .filter((r) => r.newsData)
      .flatMap((r) => r.newsData as NewsSnapshot[])

    if (newsDataList.length === 0) {
      return "无相关新闻数据"
    }

    // 按情感分类统计
    const positiveCount = newsDataList.filter((n) => n.sentiment === "positive").length
    const negativeCount = newsDataList.filter((n) => n.sentiment === "negative").length
    const neutralCount = newsDataList.filter((n) => n.sentiment === "neutral").length

    // 取前3条重要新闻标题
    const topNews = newsDataList
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3)
      .map((n) => n.title)

    let sentimentSummary = "市场情绪中性"
    if (positiveCount > negativeCount + 2) {
      sentimentSummary = "市场情绪偏乐观"
    } else if (negativeCount > positiveCount + 2) {
      sentimentSummary = "市场情绪偏谨慎"
    }

    return `${sentimentSummary}。近期关注新闻：${topNews.join("；") || "无"}。共收录${newsDataList.length}条相关新闻，其中正面${positiveCount}条，负面${negativeCount}条，中性${neutralCount}条。`
  }

  /**
   * 分析预测数据
   */
  private analyzePredictionData(records: TrackerRecord[]): string {
    const predictionDataList = records
      .filter((r) => r.predictionResult)
      .map((r) => r.predictionResult as PredictionSnapshot)

    if (predictionDataList.length === 0) {
      return "无预测数据"
    }

    const latest = predictionDataList[0]

    return `未来${latest.predictionDays}天预测均价：${latest.predictedPrice.toFixed(2)}元/吨，趋势判断：${latest.trend}，置信度：${latest.confidence}。预测价格区间：${latest.priceRange.min.toFixed(2)}-${latest.priceRange.max.toFixed(2)}元/吨。`
  }

  // ==================== 汇总和建议 ====================

  /**
   * 生成报告摘要
   */
  private generateSummary(
    priceAnalysis: string,
    inventoryAnalysis: string,
    newsAnalysis: string,
    predictionAnalysis: string
  ): string {
    return `【硫磺市场追踪报告摘要】\n\n价格方面：${priceAnalysis.split("。")[0]}。\n库存方面：${inventoryAnalysis.split("。")[0]}。\n新闻动态：${newsAnalysis.split("。")[0]}。\n预测展望：${predictionAnalysis.split("。")[0]}。`
  }

  /**
   * 生成采购建议
   */
  private generateRecommendation(
    priceAnalysis: string,
    inventoryAnalysis: string,
    predictionAnalysis: string,
    alerts: TrackerAlert[]
  ): string {
    // 提取关键信息
    const priceTrend = priceAnalysis.includes("上涨") ? "up" : priceAnalysis.includes("下跌") ? "down" : "stable"
    const inventoryLevel = inventoryAnalysis.includes("偏高") ? "high" : inventoryAnalysis.includes("偏低") ? "low" : "normal"
    const predictionTrend = predictionAnalysis.includes("上涨") || predictionAnalysis.includes("up") ? "up" : "down"

    // 生成建议
    let recommendation = ""

    if (priceTrend === "up" && predictionTrend === "up") {
      recommendation = "当前价格呈上涨趋势，预测短期内仍将维持上涨态势。建议：1）如有即时采购需求，可考虑尽快锁定当前价格；2）关注库存水平，避免因价格上涨导致采购成本增加。"
    } else if (priceTrend === "down" && predictionTrend === "down") {
      recommendation = "当前价格呈下跌趋势，预测短期内仍将下行。建议：1）如库存充足，可暂缓采购，等待更低价格；2）如库存偏低，可分批采购，降低平均成本。"
    } else if (inventoryLevel === "low") {
      recommendation = "当前库存水平偏低，需关注供应风险。建议：1）评估企业库存需求，制定补库计划；2）与供应商保持沟通，确保供应渠道稳定。"
    } else if (inventoryLevel === "high") {
      recommendation = "当前库存水平较高，采购压力相对较小。建议：1）可维持正常采购节奏；2）关注价格变化，择机优化采购成本。"
    } else {
      recommendation = "当前市场态势相对平稳。建议：1）维持正常采购节奏；2）关注异动事件，及时调整采购策略。"
    }

    // 加入异动风险提示
    if (alerts.length > 0) {
      const highUrgencyAlerts = alerts.filter((a) => a.urgency === "high")
      if (highUrgencyAlerts.length > 0) {
        recommendation += `\n\n【风险提示】监测期内发生${alerts.length}个异动事件，其中${highUrgencyAlerts.length}个为高紧急度事件，请重点关注：${highUrgencyAlerts.map((a) => a.title).join("、")}。`
      } else {
        recommendation += `\n\n【风险提示】监测期内发生${alerts.length}个异动事件，请关注相关变化。`
      }
    }

    return recommendation
  }

  /**
   * 获取报告标题
   */
  private getReportTitle(reportType: string): string {
    switch (reportType) {
      case "daily":
        return "日"
      case "weekly":
        return "周"
      case "monthly":
        return "月"
      default:
        return "日"
    }
  }
}

// ==================== 导出实例 ====================

export const reportGenerator = new ReportGenerator()