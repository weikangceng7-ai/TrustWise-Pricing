/**
 * Tracker 单个订阅操作 API
 *
 * GET    - 获取单个订阅详情
 * PATCH  - 更新订阅配置
 * DELETE - 删除订阅
 */

import { NextRequest, NextResponse } from "next/server"
import { authenticateTracker } from "@/lib/api-middleware"
import {
  getSubscription,
  updateSubscription,
  deleteSubscription,
  toggleSubscription,
} from "@/services/tracker/SubscriptionManager"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/tracker/subscriptions/[id]
 * 获取单个订阅详情
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const authResult = await authenticateTracker(request)
    if (!authResult.authenticated) return authResult.response
    const userId = authResult.userId
    if (!userId) return authResult.response

    const { id } = await context.params
    const subscriptionId = parseInt(id, 10)

    if (isNaN(subscriptionId)) {
      return NextResponse.json(
        { success: false, error: "无效的订阅 ID" },
        { status: 400 }
      )
    }

    const subscription = await getSubscription(subscriptionId, userId)

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: "订阅不存在或无权限访问" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: subscription,
    })
  } catch (error) {
    console.error("获取订阅详情失败:", error)
    return NextResponse.json(
      { success: false, error: "获取订阅详情失败" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/tracker/subscriptions/[id]
 * 更新订阅配置
 *
 * Body: 需要更新的字段
 * - name?: 订阅名称
 * - targetType?: 追踪类型
 * - frequency?: 执行频率
 * - scheduleTime?: 执行时间
 * - alertRules?: 阈值规则
 * - reportEnabled?: 是否启用报告
 * - reportType?: 报告类型
 * - notificationChannels?: 通知渠道
 * - isActive?: 是否激活
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const authResult = await authenticateTracker(request)
    if (!authResult.authenticated) return authResult.response
    const userId = authResult.userId
    if (!userId) return authResult.response

    const { id } = await context.params
    const subscriptionId = parseInt(id, 10)

    if (isNaN(subscriptionId)) {
      return NextResponse.json(
        { success: false, error: "无效的订阅 ID" },
        { status: 400 }
      )
    }

    const body = await request.json()

    // 验证现有订阅
    const existing = await getSubscription(subscriptionId, userId)
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "订阅不存在或无权限访问" },
        { status: 404 }
      )
    }

    // 处理激活/停用操作
    if (body.isActive !== undefined && typeof body.isActive === "boolean") {
      const subscription = await toggleSubscription(subscriptionId, userId, body.isActive)
      return NextResponse.json({
        success: true,
        data: subscription,
        message: body.isActive ? "订阅已激活" : "订阅已停用",
      })
    }

    // 更新其他配置
    const subscription = await updateSubscription(subscriptionId, userId, body)

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: "更新订阅失败" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: subscription,
      message: "订阅更新成功",
    })
  } catch (error) {
    console.error("更新订阅失败:", error)
    return NextResponse.json(
      { success: false, error: "更新订阅失败" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/tracker/subscriptions/[id]
 * 删除订阅
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const authResult = await authenticateTracker(request)
    if (!authResult.authenticated) return authResult.response
    const userId = authResult.userId
    if (!userId) return authResult.response

    const { id } = await context.params
    const subscriptionId = parseInt(id, 10)

    if (isNaN(subscriptionId)) {
      return NextResponse.json(
        { success: false, error: "无效的订阅 ID" },
        { status: 400 }
      )
    }

    const deleted = await deleteSubscription(subscriptionId, userId)

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "订阅不存在或无权限删除" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "订阅已删除",
    })
  } catch (error) {
    console.error("删除订阅失败:", error)
    return NextResponse.json(
      { success: false, error: "删除订阅失败" },
      { status: 500 }
    )
  }
}