/**
 * Tracker 单个异动事件操作 API
 *
 * GET    - 获取异动详情
 * PATCH  - 更新异动状态（已读/已处理）
 */

import { NextRequest, NextResponse } from "next/server"
import { authenticateTracker } from "@/lib/api-middleware"
import { markAlertAsRead, markAlertAsHandled, getAlertById } from "@/services/tracker/SubscriptionManager"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/tracker/alerts/[id]
 * 获取异动详情
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
    const alertId = parseInt(id, 10)

    if (isNaN(alertId)) {
      return NextResponse.json(
        { success: false, error: "无效的异动 ID" },
        { status: 400 }
      )
    }

    const alert = await getAlertById(alertId, userId)

    if (!alert) {
      return NextResponse.json(
        { success: false, error: "异动不存在或无权限访问" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: alert,
    })
  } catch (error) {
    console.error("获取异动详情失败:", error)
    return NextResponse.json(
      { success: false, error: "获取异动详情失败" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/tracker/alerts/[id]
 * 更新异动处理状态
 *
 * Body:
 * - isRead?: 标记已读
 * - isHandled?: 标记已处理
 * - handleNote?: 处理备注
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
    const alertId = parseInt(id, 10)

    if (isNaN(alertId)) {
      return NextResponse.json(
        { success: false, error: "无效的异动 ID" },
        { status: 400 }
      )
    }

    const body = await request.json()

    // 标记已读
    if (body.isRead === true) {
      const alert = await markAlertAsRead(alertId, userId)

      if (!alert) {
        return NextResponse.json(
          { success: false, error: "异动不存在或无权限访问" },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: alert,
        message: "已标记为已读",
      })
    }

    // 标记已处理
    if (body.isHandled === true) {
      const alert = await markAlertAsHandled(alertId, userId, body.handleNote)

      if (!alert) {
        return NextResponse.json(
          { success: false, error: "异动不存在或无权限访问" },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: alert,
        message: "已标记为已处理",
      })
    }

    return NextResponse.json(
      { success: false, error: "无效的操作" },
      { status: 400 }
    )
  } catch (error) {
    console.error("更新异动状态失败:", error)
    return NextResponse.json(
      { success: false, error: "更新异动状态失败" },
      { status: 500 }
    )
  }
}