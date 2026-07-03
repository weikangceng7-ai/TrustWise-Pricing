/**
 * Tracker 状态查询 API
 *
 * GET - 获取 Tracker 状态统计
 */

import { NextRequest, NextResponse } from "next/server"
import { authenticateTracker } from "@/lib/api-middleware"
import { getTrackerStatus } from "@/services/tracker/SubscriptionManager"

/**
 * GET /api/tracker/status
 * 获取 Tracker 状态统计
 *
 * Response:
 * - activeSubscriptions: 活跃订阅数
 * - totalSubscriptions: 总订阅数
 * - runningTasks: 运行中任务数
 * - recentAlerts: 最近异动数
 * - unreadAlerts: 未读异动数
 * - lastRunTime: 最近执行时间
 * - nextScheduledRun: 下次调度时间
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateTracker(request)
    if (!authResult.authenticated) return authResult.response
    if (!authResult.userId) return authResult.response
    const userId = authResult.userId
    if (!userId) return authResult.response

    const status = await getTrackerStatus(userId)

    return NextResponse.json({
      success: true,
      data: status,
    })
  } catch (error) {
    console.error("获取 Tracker 状态失败:", error)
    return NextResponse.json(
      { success: false, error: "获取 Tracker 状态失败" },
      { status: 500 }
    )
  }
}