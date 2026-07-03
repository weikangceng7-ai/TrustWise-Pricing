/**
 * Tracker 异动事件 API
 *
 * GET  - 获取异动事件列表
 * PATCH - 更新异动处理状态
 */

import { NextRequest, NextResponse } from "next/server"
import { authenticateTracker } from "@/lib/api-middleware"
import { getAlerts, markAlertAsRead, markAlertAsHandled, markAllAlertsAsRead, markAllAlertsAsHandled } from "@/services/tracker/SubscriptionManager"

/**
 * GET /api/tracker/alerts
 * 获取异动事件列表
 *
 * Query params:
 * - subscriptionId: 筛选特定订阅
 * - alertType: 筛选异动类型
 * - urgency: 筛选紧急程度
 * - isRead: 筛选是否已读
 * - isHandled: 筛选是否已处理
 * - limit: 分页限制
 * - offset: 分页偏移
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateTracker(request)
    if (!authResult.authenticated) return authResult.response
    const userId = authResult.userId
    if (!userId) return authResult.response

    const { searchParams } = new URL(request.url)

    const options = {
      subscriptionId: searchParams.get("subscriptionId") ? parseInt(searchParams.get("subscriptionId")!) : undefined,
      alertType: searchParams.get("alertType") ?? undefined,
      urgency: (searchParams.get("urgency") as "high" | "normal" | "low" | undefined) ?? undefined,
      isRead: searchParams.get("isRead") === "true" ? true : searchParams.get("isRead") === "false" ? false : undefined,
      isHandled: searchParams.get("isHandled") === "true" ? true : searchParams.get("isHandled") === "false" ? false : undefined,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 20,
      offset: searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0,
    }

    const result = await getAlerts(userId, options)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("获取异动事件列表失败:", error)
    return NextResponse.json(
      { success: false, error: "获取异动事件列表失败" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/tracker/alerts
 * 批量更新异动状态
 *
 * Body:
 * - action: markAllRead | markAllHandled
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authenticateTracker(request)
    if (!authResult.authenticated) return authResult.response
    const userId = authResult.userId
    if (!userId) return authResult.response

    const body = await request.json()

    let count = 0
    if (body.markAllAsRead === true) {
      count = await markAllAlertsAsRead(userId)
    } else if (body.markAllHandled === true) {
      count = await markAllAlertsAsHandled(userId)
    }

    return NextResponse.json({
      success: true,
      message: "批量操作完成",
      updatedCount: count,
    })
  } catch (error) {
    console.error("批量更新异动状态失败:", error)
    return NextResponse.json(
      { success: false, error: "批量更新异动状态失败" },
      { status: 500 }
    )
  }
}