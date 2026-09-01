/**
 * Tracker Agent 异动检测服务
 *
 * 主要职责：
 * 1. 根据阈值规则检测价格/库存异动
 * 2. 分析预测结果判断风险等级
 * 3. 检测新闻关键词匹配
 * 4. 生成异动事件记录
 */

import { db } from "@/db"
import {
  trackerAlerts,
  type TrackerSubscription,
  type TrackerRecord,
  type TrackerAlert,
  type NewTrackerAlert,
  type AlertRuleConfig,
  type PriceSnapshot,
  type InventorySnapshot,
  type NewsSnapshot,
  type PredictionSnapshot,
} from "@/db/schema-tracker"
import { eq } from "drizzle-orm"
import { createNotification } from "@/services/notifications"

// ==================== 检测参数类型 ====================

export interface DetectParams {
  subscription: TrackerSubscription
  record: TrackerRecord
  priceData?: PriceSnapshot | null
  inventoryData?: InventorySnapshot | null
  newsData?: NewsSnapshot[]
  predictionResult?: PredictionSnapshot | null
}

export interface DetectResult {
  alerts: NewTrackerAlert[]
  hasAlerts: boolean
}

// ==================== 异动检测类 ====================

export class AlertDetector {
  /**
   * 执行异动检测
   * 根据订阅配置的阈值规则检测各类异动
   */
  async detect(params: DetectParams): Promise<DetectResult> {
    const { subscription, record, priceData, inventoryData, newsData, predictionResult } = params
    const alerts: NewTrackerAlert[] = []

    // 检测每条阈值规则
    for (const rule of subscription.alertRules) {
      const alert = this.checkRule(rule, params)
      if (alert) {
        alerts.push(alert)
      }
    }

    // 检测预测风险（如果有预测结果）
    if (predictionResult) {
      const predictionAlert = this.checkPredictionRisk(subscription, predictionResult, record)
      if (predictionAlert) {
        alerts.push(predictionAlert)
      }
    }

    // 检测新闻关键词（如果有新闻数据）
    if (newsData && newsData.length > 0) {
      for (const rule of subscription.alertRules) {
        if (rule.type === "news_keyword" && rule.newsKeywords) {
          const newsAlerts = this.checkNewsKeywords(subscription, newsData, rule, record)
          alerts.push(...newsAlerts)
        }
      }
    }

    return {
      alerts,
      hasAlerts: alerts.length > 0,
    }
  }

  /**
   * 检测单条阈值规则
   */
  private checkRule(
    rule: AlertRuleConfig,
    params: DetectParams
  ): NewTrackerAlert | null {
    const { subscription, record, priceData, inventoryData } = params

    switch (rule.type) {
      case "price_change":
        return this.checkPriceChange(subscription, priceData, rule, record)

      case "price_threshold":
        return this.checkPriceThreshold(subscription, priceData, rule, record)

      case "inventory_change":
        return this.checkInventoryChange(subscription, inventoryData, rule, record)

      case "inventory_threshold":
        return this.checkInventoryThreshold(subscription, inventoryData, rule, record)

      default:
        return null
    }
  }

  // ==================== 价格异动检测 ====================

  /**
   * 检测价格变化（百分比）
   */
  private checkPriceChange(
    subscription: TrackerSubscription,
    priceData: PriceSnapshot | null | undefined,
    rule: AlertRuleConfig,
    record: TrackerRecord
  ): NewTrackerAlert | null {
    if (!priceData || !rule.priceChangeThreshold) {
      return null
    }

    const changePercent = Math.abs(priceData.changePercent)
    const threshold = rule.priceChangeThreshold

    // 变化超过阈值
    if (changePercent >= threshold) {
      const direction = priceData.changePercent > 0 ? "上涨" : "下跌"
      const urgency = rule.urgency || (changePercent >= threshold * 2 ? "high" : "normal")

      return {
        subscriptionId: subscription.id,
        recordId: record.id,
        alertType: "price_change",
        title: `价格${direction}预警`,
        content: `硫磺价格${direction} ${changePercent.toFixed(2)}%，当前价格 ${priceData.currentPrice} 元/吨，超出预设阈值 ${threshold}%`,
        triggerValue: String(priceData.currentPrice),
        thresholdValue: String(threshold),
        changePercent: String(changePercent),
        urgency,
        notificationSent: false,
        isRead: false,
        isHandled: false,
        createdAt: new Date(),
      }
    }

    return null
  }

  /**
   * 检测价格阈值（绝对值）
   */
  private checkPriceThreshold(
    subscription: TrackerSubscription,
    priceData: PriceSnapshot | null | undefined,
    rule: AlertRuleConfig,
    record: TrackerRecord
  ): NewTrackerAlert | null {
    if (!priceData) {
      return null
    }

    const currentPrice = priceData.currentPrice

    // 检查上限
    if (rule.priceUpperThreshold && currentPrice >= rule.priceUpperThreshold) {
      return {
        subscriptionId: subscription.id,
        recordId: record.id,
        alertType: "price_threshold",
        title: "价格突破上限预警",
        content: `硫磺价格已突破预设上限 ${rule.priceUpperThreshold} 元/吨，当前价格 ${currentPrice} 元/吨，建议关注市场动态`,
        triggerValue: String(currentPrice),
        thresholdValue: String(rule.priceUpperThreshold),
        changePercent: String(priceData.changePercent),
        urgency: rule.urgency || "high",
        notificationSent: false,
        isRead: false,
        isHandled: false,
        createdAt: new Date(),
      }
    }

    // 检查下限
    if (rule.priceLowerThreshold && currentPrice <= rule.priceLowerThreshold) {
      return {
        subscriptionId: subscription.id,
        recordId: record.id,
        alertType: "price_threshold",
        title: "价格跌破下限预警",
        content: `硫磺价格已跌破预设下限 ${rule.priceLowerThreshold} 元/吨，当前价格 ${currentPrice} 元/吨，可能是较好的采购时机`,
        triggerValue: String(currentPrice),
        thresholdValue: String(rule.priceLowerThreshold),
        changePercent: String(priceData.changePercent),
        urgency: rule.urgency || "normal",
        notificationSent: false,
        isRead: false,
        isHandled: false,
        createdAt: new Date(),
      }
    }

    return null
  }

  // ==================== 库存异动检测 ====================

  /**
   * 检测库存变化（百分比）
   */
  private checkInventoryChange(
    subscription: TrackerSubscription,
    inventoryData: InventorySnapshot | null | undefined,
    rule: AlertRuleConfig,
    record: TrackerRecord
  ): NewTrackerAlert | null {
    if (!inventoryData || !rule.inventoryChangeThreshold) {
      return null
    }

    const changePercent = Math.abs(inventoryData.changePercent)
    const threshold = rule.inventoryChangeThreshold

    // 变化超过阈值
    if (changePercent >= threshold) {
      const direction = inventoryData.changePercent > 0 ? "增加" : "减少"
      const urgency = rule.urgency || (changePercent >= threshold * 2 ? "high" : "normal")

      return {
        subscriptionId: subscription.id,
        recordId: record.id,
        alertType: "inventory_change",
        title: `库存${direction}预警`,
        content: `港口库存${direction} ${changePercent.toFixed(2)}%，当前库存 ${inventoryData.currentInventory} 万吨，超出预设阈值 ${threshold}%`,
        triggerValue: String(inventoryData.currentInventory),
        thresholdValue: String(threshold),
        changePercent: String(changePercent),
        urgency,
        notificationSent: false,
        isRead: false,
        isHandled: false,
        createdAt: new Date(),
      }
    }

    return null
  }

  /**
   * 检测库存阈值（绝对值）
   */
  private checkInventoryThreshold(
    subscription: TrackerSubscription,
    inventoryData: InventorySnapshot | null | undefined,
    rule: AlertRuleConfig,
    record: TrackerRecord
  ): NewTrackerAlert | null {
    if (!inventoryData) {
      return null
    }

    const currentInventory = inventoryData.currentInventory

    // 检查上限（库存过高）
    if (rule.inventoryUpperThreshold && currentInventory >= rule.inventoryUpperThreshold) {
      return {
        subscriptionId: subscription.id,
        recordId: record.id,
        alertType: "inventory_threshold",
        title: "库存过高预警",
        content: `港口库存已超过预设上限 ${rule.inventoryUpperThreshold} 万吨，当前库存 ${currentInventory} 万吨，供应充足，价格可能承压`,
        triggerValue: String(currentInventory),
        thresholdValue: String(rule.inventoryUpperThreshold),
        changePercent: String(inventoryData.changePercent),
        urgency: rule.urgency || "low",
        notificationSent: false,
        isRead: false,
        isHandled: false,
        createdAt: new Date(),
      }
    }

    // 检查下限（库存过低）
    if (rule.inventoryLowerThreshold && currentInventory <= rule.inventoryLowerThreshold) {
      return {
        subscriptionId: subscription.id,
        recordId: record.id,
        alertType: "inventory_threshold",
        title: "库存过低预警",
        content: `港口库存已低于预设下限 ${rule.inventoryLowerThreshold} 万吨，当前库存 ${currentInventory} 万吨，供应紧张，价格可能上涨`,
        triggerValue: String(currentInventory),
        thresholdValue: String(rule.inventoryLowerThreshold),
        changePercent: String(inventoryData.changePercent),
        urgency: rule.urgency || "high",
        notificationSent: false,
        isRead: false,
        isHandled: false,
        createdAt: new Date(),
      }
    }

    return null
  }

  // ==================== 新闻关键词检测 ====================

  /**
   * 检测新闻关键词匹配
   */
  private checkNewsKeywords(
    subscription: TrackerSubscription,
    newsData: NewsSnapshot[],
    rule: AlertRuleConfig,
    record: TrackerRecord
  ): NewTrackerAlert[] {
    if (!rule.newsKeywords || rule.newsKeywords.length === 0) {
      return []
    }

    const alerts: NewTrackerAlert[] = []
    const matchedNews: NewsSnapshot[] = []

    // 查找匹配的新闻
    for (const news of newsData) {
      for (const keyword of rule.newsKeywords) {
        if (news.title.toLowerCase().includes(keyword.toLowerCase())) {
          matchedNews.push(news)
          break
        }
      }
    }

    // 生成异动事件（最多合并为一条）
    if (matchedNews.length > 0) {
      const titles = matchedNews.map((n) => n.title).slice(0, 3).join("; ")
      const urgency = rule.urgency || "normal"

      // 如果有负面情绪的新闻，提高紧急程度
      const hasNegative = matchedNews.some((n) => n.sentiment === "negative")
      const finalUrgency = hasNegative ? "high" : urgency

      alerts.push({
        subscriptionId: subscription.id,
        recordId: record.id,
        alertType: "news_keyword",
        title: `关注新闻匹配`,
        content: `检测到 ${matchedNews.length} 条相关新闻：${titles}${matchedNews.length > 3 ? "..." : ""}`,
        triggerValue: String(matchedNews.length),
        thresholdValue: "1",
        changePercent: "0",
        urgency: finalUrgency,
        notificationSent: false,
        isRead: false,
        isHandled: false,
        createdAt: new Date(),
      })
    }

    return alerts
  }

  // ==================== 预测风险检测 ====================

  /**
   * 检测预测风险
   * 根据预测结果判断未来价格风险等级
   */
  private checkPredictionRisk(
    subscription: TrackerSubscription,
    prediction: PredictionSnapshot,
    record: TrackerRecord
  ): NewTrackerAlert | null {
    // 判断高风险条件：
    // 1. 预测价格上涨超过 5%
    // 2. 置信度较低（低或中）
    // 3. 价格区间波动较大
    // 4. regime 为 high 时降低阈值（更敏感）

    const priceRangeWidth = prediction.priceRange.max - prediction.priceRange.min
    const avgPrice = prediction.predictedPrice
    const rangePercent = avgPrice > 0 ? (priceRangeWidth / avgPrice) * 100 : 0

    // 根据 regime 动态调整风险检测阈值
    const isHighRegime = prediction.regime === "high"
    const highThreshold = isHighRegime ? 3 : 5
    const mediumThreshold = isHighRegime ? 2 : 3

    // 高风险判断
    const isHighRisk =
      (prediction.trend === "上涨" && rangePercent > highThreshold) ||
      prediction.confidence === "低" ||
      rangePercent > (isHighRegime ? 8 : 10) ||
      isHighRegime  // 高波动 regime 本身即为高风险

    // 中风险判断
    const isMediumRisk =
      (prediction.trend === "上涨" && rangePercent > mediumThreshold) ||
      prediction.confidence === "中" ||
      rangePercent > (isHighRegime ? 5 : 5)

    // 构建 regime 提示文本
    const regimeHint = isHighRegime ? "当前市场处于高波动状态，风险系数 " + (prediction.riskAdjustment?.toFixed(2) || "1.0") + "。" : ""

    if (isHighRisk) {
      return {
        subscriptionId: subscription.id,
        recordId: record.id,
        alertType: "prediction_risk",
        title: "价格预测高风险预警",
        content: `AI预测显示硫磺价格存在较高不确定性。${regimeHint}预测趋势：${prediction.trend}，价格区间：${prediction.priceRange.min}-${prediction.priceRange.max} 元/吨，置信度：${prediction.confidence}。建议提前做好采购规划。`,
        triggerValue: String(avgPrice),
        thresholdValue: "0",
        changePercent: String(rangePercent),
        urgency: "high",
        notificationSent: false,
        isRead: false,
        isHandled: false,
        createdAt: new Date(),
      }
    }

    if (isMediumRisk) {
      return {
        subscriptionId: subscription.id,
        recordId: record.id,
        alertType: "prediction_risk",
        title: "价格预测中等风险预警",
        content: `AI预测显示硫磺价格存在一定波动可能。${regimeHint}预测趋势：${prediction.trend}，价格区间：${prediction.priceRange.min}-${prediction.priceRange.max} 元/吨，置信度：${prediction.confidence}。建议关注市场变化。`,
        triggerValue: String(avgPrice),
        thresholdValue: "0",
        changePercent: String(rangePercent),
        urgency: "normal",
        notificationSent: false,
        isRead: false,
        isHandled: false,
        createdAt: new Date(),
      }
    }

    return null
  }

  // ==================== 通知发送 ====================

  /**
   * 发送异动通知
   * 根据订阅配置的通知渠道发送通知
   */
  async sendNotifications(
    alerts: TrackerAlert[],
    subscription: TrackerSubscription
  ): Promise<void> {
    if (!db || alerts.length === 0) {
      return
    }

    const channels = subscription.notificationChannels

    for (const alert of alerts) {
      const channelsUsed: string[] = []

      // 应用内通知
      if (channels.inApp) {
        await this.sendInAppNotification(alert, subscription)
        channelsUsed.push("inApp")
      }

      // 邮件通知
      if (channels.email) {
        await this.sendEmailNotification(alert, subscription)
        channelsUsed.push("email")
      }

      // 更新通知发送状态
      await db
        .update(trackerAlerts)
        .set({
          notificationSent: true,
          notificationSentAt: new Date(),
          notificationChannelsUsed: channelsUsed,
        })
        .where(eq(trackerAlerts.id, alert.id))
    }
  }

  /**
   * 发送应用内通知
   */
  private async sendInAppNotification(
    alert: TrackerAlert,
    subscription: TrackerSubscription
  ): Promise<void> {
    await createNotification({
      userId: subscription.userId,
      type: "price_alert", // 可以根据 alert.alertType 细化
      title: alert.title,
      content: alert.content,
      priority: (alert.urgency === "high" ? "high" : alert.urgency === "low" ? "low" : "normal"),
      link: `/tracker/alerts/${alert.id}`,
      metadata: {
        subscriptionId: subscription.id,
        alertType: alert.alertType,
        triggerValue: alert.triggerValue,
        thresholdValue: alert.thresholdValue,
      },
    })
  }

  /**
   * 发送邮件通知
   * TODO: 需要配置邮件服务（Resend 或 nodemailer）
   */
  private async sendEmailNotification(
    alert: TrackerAlert,
    subscription: TrackerSubscription
  ): Promise<void> {
    // 预留邮件发送逻辑
    // 需要先获取用户的邮箱地址
    console.log(`[AlertDetector] 预留邮件发送: ${alert.title} -> 用户 ${subscription.userId}`)
  }
}

// ==================== 导出实例 ====================

export const alertDetector = new AlertDetector()