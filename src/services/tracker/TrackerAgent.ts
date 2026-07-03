/**
 * Tracker Agent 编排核心
 *
 * 主要职责：
 * 1. 协调数据采集（调用现有 API Server）
 * 2. 调用异动检测模块
 * 3. 调用报告生成模块
 * 4. 发送通知推送
 * 5. 更新订阅执行状态
 */

import { db } from "@/db"
import {
  trackerSubscriptions,
  trackerRecords,
  trackerAlerts,
  type TrackerSubscription,
  type TrackerRecord,
  type TrackerAlert,
  type NewTrackerRecord,
  type NewTrackerAlert,
  type PriceSnapshot,
  type InventorySnapshot,
  type NewsSnapshot,
  type PredictionSnapshot,
} from "@/db/schema-tracker"
import { eq } from "drizzle-orm"
import { AlertDetector } from "./AlertDetector"
import { updateRunStatus, createRecord } from "./SubscriptionManager"
import { reportGenerator } from "./ReportGenerator"
import { predictPrices, type PredictionResponse } from "@/services/prediction"

// ==================== 数据采集配置 ====================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

// ==================== Tracker Agent 类 ====================

export class TrackerAgent {
  private alertDetector: AlertDetector

  constructor() {
    this.alertDetector = new AlertDetector()
  }

  /**
   * 执行单次追踪任务
   * @param subscription 订阅配置
   */
  async executeTracking(subscription: TrackerSubscription): Promise<TrackerRecord | null> {
    if (!db) {
      console.error("[TrackerAgent] 数据库未初始化")
      return null
    }

    const startTime = Date.now()
    console.log(`[TrackerAgent] 开始执行追踪任务，订阅ID: ${subscription.id}`)

    try {
      // 1. 数据采集（并行执行）
      const [priceData, inventoryData, newsData, predictionResult] = await Promise.all([
        this.fetchPriceData(subscription),
        this.fetchInventoryData(subscription),
        this.fetchNewsData(subscription),
        this.fetchPrediction(subscription),
      ])

      // 2. 创建追踪记录
      const record = await createRecord({
        subscriptionId: subscription.id,
        runAt: new Date(),
        status: "success",
        priceData: priceData || undefined,
        inventoryData: inventoryData || undefined,
        newsData: newsData || undefined,
        predictionResult: predictionResult || undefined,
        durationMs: Date.now() - startTime,
        errorMessage: null,
      })

      if (!record) {
        console.error("[TrackerAgent] 创建追踪记录失败")
        return null
      }

      // 3. 异动检测
      const detectResult = await this.alertDetector.detect({
        subscription,
        record,
        priceData,
        inventoryData,
        newsData: newsData || [],
        predictionResult,
      })

      // 4. 保存异动事件并发送通知
      if (detectResult.hasAlerts) {
        await this.processAlerts(detectResult.alerts, subscription)
      }

      // 5. 生成报告（如果配置启用）
      if (subscription.reportEnabled && subscription.reportType) {
        await this.generateReport(subscription, record)
      }

      // 6. 更新订阅执行状态
      await updateRunStatus(subscription.id, "success", Date.now() - startTime)

      const duration = Date.now() - startTime
      console.log(`[TrackerAgent] 追踪任务完成，订阅ID: ${subscription.id}, 耗时: ${duration}ms, 异动数: ${detectResult.alerts.length}`)

      return record
    } catch (error) {
      console.error(`[TrackerAgent] 追踪任务失败，订阅ID: ${subscription.id}`, error)

      // 创建失败记录
      const record = await createRecord({
        subscriptionId: subscription.id,
        runAt: new Date(),
        status: "failed",
        durationMs: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : "未知错误",
      })

      // 更新订阅状态为失败
      await updateRunStatus(subscription.id, "failed", Date.now() - startTime, error instanceof Error ? error.message : "未知错误")

      return record
    }
  }

  /**
   * 执行多个订阅的追踪任务
   * @param subscriptions 订阅列表
   */
  async executeAll(subscriptions: TrackerSubscription[]): Promise<TrackerRecord[]> {
    const results: TrackerRecord[] = []

    // 并行执行（限制并发数）
    const batchSize = 5 // 每批最多 5 个订阅
    for (let i = 0; i < subscriptions.length; i += batchSize) {
      const batch = subscriptions.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map((subscription) => this.executeTracking(subscription))
      )
      results.push(...batchResults.filter((r) => r !== null) as TrackerRecord[])
    }

    return results
  }

  // ==================== 数据采集方法 ====================

  /**
   * 获取价格数据
   */
  private async fetchPriceData(
    subscription: TrackerSubscription
  ): Promise<PriceSnapshot | null> {
    try {
      // 调用现有 API Server
      const params = new URLSearchParams()
      params.append("limit", "2") // 获取最近 2 天数据用于对比

      if (subscription.targetRegion) {
        params.append("region", subscription.targetRegion)
      }
      if (subscription.targetMarket) {
        params.append("market", subscription.targetMarket)
      }

      // 内部调用（使用环境变量中的内部 API Key）
      const res = await fetch(`${API_BASE_URL}/api/v1/prices?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`,
        },
      })

      if (!res.ok) {
        console.error("[TrackerAgent] 获取价格数据失败:", res.status)
        return null
      }

      const data = await res.json()

      if (!data.success || !data.data?.prices || data.data.prices.length < 2) {
        return null
      }

      // 构建价格快照
      const prices = data.data.prices
      const current = prices[0]
      const previous = prices[1]

      const currentPrice = parseFloat(current.mainPrice || "0")
      const previousPrice = parseFloat(previous.mainPrice || "0")
      const changeValue = currentPrice - previousPrice
      const changePercent = previousPrice > 0 ? (changeValue / previousPrice) * 100 : 0

      return {
        currentPrice,
        previousPrice,
        changeValue,
        changePercent,
        date: current.date,
        market: current.market || subscription.targetMarket || "镇江港",
        region: current.region || subscription.targetRegion,
      }
    } catch (error) {
      console.error("[TrackerAgent] 获取价格数据异常:", error)
      return null
    }
  }

  /**
   * 获取库存数据
   */
  private async fetchInventoryData(
    subscription: TrackerSubscription
  ): Promise<InventorySnapshot | null> {
    try {
      const params = new URLSearchParams()
      params.append("limit", "2")

      const res = await fetch(`${API_BASE_URL}/api/v1/data/inventory?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`,
        },
      })

      if (!res.ok) {
        console.error("[TrackerAgent] 获取库存数据失败:", res.status)
        return null
      }

      const data = await res.json()

      if (!data.success || !data.data?.inventory || data.data.inventory.length < 2) {
        return null
      }

      const inventory = data.data.inventory
      const current = inventory[0]
      const previous = inventory[1]

      const currentInventory = parseFloat(current.inventory || "0")
      const previousInventory = parseFloat(previous.inventory || "0")
      const changeValue = currentInventory - previousInventory
      const changePercent = previousInventory > 0 ? (changeValue / previousInventory) * 100 : 0

      return {
        currentInventory,
        previousInventory,
        changeValue,
        changePercent,
        date: current.date,
        location: "主要港口",
      }
    } catch (error) {
      console.error("[TrackerAgent] 获取库存数据异常:", error)
      return null
    }
  }

  /**
   * 获取新闻数据
   */
  private async fetchNewsData(
    subscription: TrackerSubscription
  ): Promise<NewsSnapshot[] | null> {
    try {
      const params = new URLSearchParams()
      params.append("limit", "10")
      params.append("category", "sulfur")

      const res = await fetch(`${API_BASE_URL}/api/v1/data/news?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`,
        },
      })

      if (!res.ok) {
        console.error("[TrackerAgent] 获取新闻数据失败:", res.status)
        return null
      }

      const data = await res.json()

      if (!data.success || !data.data?.news) {
        return []
      }

      return data.data.news.map((item: any) => ({
        id: item.id || `news-${Date.now()}`,
        title: item.title,
        source: item.source || "未知来源",
        date: item.date || new Date().toISOString(),
        category: item.category || "市场动态",
        relevanceScore: item.relevanceScore || 0.8,
        sentiment: item.sentiment || "neutral",
      }))
    } catch (error) {
      console.error("[TrackerAgent] 获取新闻数据异常:", error)
      return null
    }
  }

  /**
   * 获取预测结果
   */
  private async fetchPrediction(
    subscription: TrackerSubscription
  ): Promise<PredictionSnapshot | null> {
    try {
      // 调用预测服务（7天预测）
      const response = await predictPrices(7)

      if (!response.success || !response.data) {
        return null
      }

      const prediction = response.data

      // 计算价格区间
      const prices = prediction.predictions.map((p) => p.predicted_price)
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length

      return {
        predictedPrice: avgPrice,
        trend: prediction.trend,
        confidence: prediction.confidence,
        predictionDays: prediction.prediction_days,
        priceRange: {
          min: minPrice,
          max: maxPrice,
        },
        generatedAt: prediction.generated_at,
      }
    } catch (error) {
      console.error("[TrackerAgent] 获取预测数据异常:", error)
      return null
    }
  }

  // ==================== 异动处理 ====================

  /**
   * 处理异动事件（保存 + 发送通知）
   */
  private async processAlerts(
    alertInputs: NewTrackerAlert[],
    subscription: TrackerSubscription
  ): Promise<TrackerAlert[]> {
    if (!db || alertInputs.length === 0) {
      return []
    }

    // 保存异动事件
    const alerts = await db.insert(trackerAlerts).values(alertInputs).returning()

    // 发送通知
    await this.alertDetector.sendNotifications(alerts, subscription)

    return alerts
  }

  // ==================== 报告生成 ====================

  /**
   * 生成追踪报告
   */
  private async generateReport(
    subscription: TrackerSubscription,
    record: TrackerRecord
  ): Promise<void> {
    await reportGenerator.generate(subscription, record)
  }
}

// ==================== 导出实例 ====================

export const trackerAgent = new TrackerAgent()