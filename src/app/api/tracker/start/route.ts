/**
 * Tracker 手动启动 API
 *
 * POST - 手动启动追踪任务
 */

import { NextRequest, NextResponse } from "next/server"
import { authenticateTracker } from "@/lib/api-middleware"
import { getSubscription, getActiveSubscriptions } from "@/services/tracker/SubscriptionManager"
import { trackerAgent } from "@/services/tracker/TrackerAgent"

/**
 * POST /api/tracker/start
 * 手动启动追踪任务
 *
 * Body:
 * - subscriptionId?: 指定订阅ID（可选）
 * - immediate: 是否立即执行（默认 true）
 * - frequency?: 指定频率类型（hourly/daily/weekly）
 *
 * Response:
 * - taskId: 任务ID
 * - status: 任务状态
 * - results: 执行结果
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateTracker(request)
    if (!authResult.authenticated) return authResult.response
    const userId = authResult.userId
    if (!userId) return authResult.response

    const body = await request.json()
    const { subscriptionId, immediate = true, frequency } = body

    // 如果指定了订阅ID，只执行该订阅
    if (subscriptionId) {
      const subscription = await getSubscription(subscriptionId, userId)

      if (!subscription) {
        return NextResponse.json(
          { success: false, error: "订阅不存在或无权限访问" },
          { status: 404 }
        )
      }

      if (!subscription.isActive) {
        return NextResponse.json(
          { success: false, error: "订阅已停用，请先激活" },
          { status: 400 }
        )
      }

      // 执行追踪任务
      const record = await trackerAgent.executeTracking(subscription)

      return NextResponse.json({
        success: true,
        data: {
          taskId: `task-${Date.now()}`,
          status: record?.status || "failed",
          recordId: record?.id,
          executedAt: new Date(),
        },
        message: "追踪任务执行完成",
      })
    }

    // 如果没有指定订阅ID，执行指定频率的所有活跃订阅
    const subscriptions = await getActiveSubscriptions({ frequency })

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          taskId: `task-${Date.now()}`,
          status: "no_tasks",
          message: "没有符合条件的活跃订阅",
        },
      })
    }

    // 执行所有订阅
    const records = await trackerAgent.executeAll(subscriptions)

    const successCount = records.filter((r) => r.status === "success").length
    const failedCount = records.filter((r) => r.status === "failed").length

    return NextResponse.json({
      success: true,
      data: {
        taskId: `task-${Date.now()}`,
        status: "completed",
        totalExecuted: records.length,
        successCount,
        failedCount,
        executedAt: new Date(),
      },
      message: `追踪任务执行完成：成功 ${successCount}，失败 ${failedCount}`,
    })
  } catch (error) {
    console.error("手动启动追踪任务失败:", error)
    return NextResponse.json(
      { success: false, error: "手动启动追踪任务失败" },
      { status: 500 }
    )
  }
}