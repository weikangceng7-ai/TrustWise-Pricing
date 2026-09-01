/**
 * Tracker 订阅管理 API
 *
 * GET  - 获取用户订阅列表
 * POST - 创建新订阅
 */

import { NextRequest, NextResponse } from "next/server"
import { authenticateTracker } from "@/lib/api-middleware"
import {
  createSubscription,
  getSubscriptions,
  getTrackerStatus,
} from "@/services/tracker/SubscriptionManager"
import { trackerAgent } from "@/services/tracker/TrackerAgent"
import type { NewTrackerSubscription, AlertRuleConfig, NotificationChannelConfig } from "@/db/schema-tracker"

/**
 * GET /api/tracker/subscriptions
 * 获取用户的订阅列表
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateTracker(request)
    if (!authResult.authenticated) return authResult.response
    const userId = authResult.userId
    if (!userId) return authResult.response

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get("activeOnly") === "true"
    const includeStatus = searchParams.get("includeStatus") === "true"

    const subscriptions = await getSubscriptions(userId, { activeOnly })

    // 可选包含统计状态
    let status = null
    if (includeStatus) {
      status = await getTrackerStatus(userId)
    }

    return NextResponse.json({
      success: true,
      data: {
        subscriptions,
        total: subscriptions.length,
        status,
      },
    })
  } catch (error) {
    console.error("获取订阅列表失败:", error)
    return NextResponse.json(
      { success: false, error: "获取订阅列表失败" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tracker/subscriptions
 * 创建新订阅
 *
 * Body:
 * - name: 订阅名称
 * - targetType: 追踪类型 (price/inventory/news/all)
 * - targetRegion?: 目标地区
 * - targetMarket?: 目标市场
 * - frequency: 执行频率 (hourly/daily/weekly)
 * - scheduleTime?: 执行时间
 * - alertRules: 阈值规则配置
 * - reportEnabled?: 是否启用报告
 * - reportType?: 报告类型
 * - notificationChannels: 通知渠道配置
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateTracker(request)
    if (!authResult.authenticated) return authResult.response
    const userId = authResult.userId
    if (!userId) return authResult.response

    const body = await request.json()

    // 验证必填字段
    if (!body.name || !body.targetType || !body.frequency) {
      return NextResponse.json(
        { success: false, error: "缺少必填字段: name, targetType, frequency" },
        { status: 400 }
      )
    }

    // 验证 targetType
    const validTargetTypes = ["price", "inventory", "news", "all"]
    if (!validTargetTypes.includes(body.targetType)) {
      return NextResponse.json(
        { success: false, error: "无效的 targetType，必须是 price/inventory/news/all" },
        { status: 400 }
      )
    }

    // 验证 frequency
    const validFrequencies = ["hourly", "daily", "weekly"]
    if (!validFrequencies.includes(body.frequency)) {
      return NextResponse.json(
        { success: false, error: "无效的 frequency，必须是 hourly/daily/weekly" },
        { status: 400 }
      )
    }

    // 构建订阅数据
    const subscriptionData: NewTrackerSubscription = {
      userId,
      name: body.name,
      description: body.description || null,
      targetType: body.targetType,
      targetRegion: body.targetRegion || null,
      targetMarket: body.targetMarket || null,
      frequency: body.frequency,
      scheduleTime: body.scheduleTime || "09:00",
      alertRules: body.alertRules || [] as AlertRuleConfig[],
      reportEnabled: body.reportEnabled !== false, // 默认启用
      reportType: body.reportType || "daily",
      notificationChannels: body.notificationChannels || {
        email: true,
        inApp: true,
        sms: false,
      } as NotificationChannelConfig,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const subscription = await createSubscription(userId, subscriptionData)

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: "创建订阅失败" },
        { status: 500 }
      )
    }

    // 创建后立即执行一次追踪任务（解决本地开发无 cron 调度器的问题）
    let executionResult = null
    try {
      const record = await trackerAgent.executeTracking(subscription)
      executionResult = {
        status: record?.status || "failed",
        recordId: record?.id,
        message: record?.status === "success"
          ? "订阅创建成功并已执行首次追踪"
          : "订阅创建成功，但首次追踪执行失败",
      }
    } catch (execError) {
      console.error("首次追踪执行失败:", execError)
      executionResult = {
        status: "failed",
        message: "订阅创建成功，但首次追踪执行失败",
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        subscription,
        execution: executionResult,
        message: executionResult?.message || "订阅创建成功",
      },
    })
  } catch (error) {
    console.error("创建订阅失败:", error)
    return NextResponse.json(
      { success: false, error: "创建订阅失败" },
      { status: 500 }
    )
  }
}