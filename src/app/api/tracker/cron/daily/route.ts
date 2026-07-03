/**
 * Tracker Agent 每日定时任务端点
 *
 * Vercel Cron 配置：
 * 在 vercel.json 中配置 cron: "0 9 * * *"（每天 9:00 执行）
 */

import { NextResponse } from "next/server"
import { getPendingSubscriptions } from "@/services/tracker/SubscriptionManager"
import { trackerAgent } from "@/services/tracker/TrackerAgent"

export const maxDuration = 60

// Vercel Cron 授权头验证
function isVercelCron(request: Request): boolean {
  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(request: Request) {
  // 验证是否来自 Vercel Cron
  const isCron = isVercelCron(request)
  const isLocalDev = process.env.NODE_ENV === "development"

  if (!isCron && !isLocalDev) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("[TrackerCron] 开始执行每日追踪任务")

    // 获取需要执行的订阅（daily 类型）
    const subscriptions = await getPendingSubscriptions()
    const dailySubscriptions = subscriptions.filter(
      (s) => s.frequency === "daily" && s.isActive
    )

    if (dailySubscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "当前无每日订阅需要执行",
        timestamp: new Date().toISOString(),
      })
    }

    // 执行追踪任务
    const results = await trackerAgent.executeAll(dailySubscriptions)

    const successCount = results.filter((r) => r?.status === "success").length
    const failedCount = results.filter((r) => r?.status === "failed").length

    console.log(
      `[TrackerCron] 每日任务完成，成功: ${successCount}, 失败: ${failedCount}`
    )

    return NextResponse.json({
      success: true,
      message: `每日追踪任务完成`,
      executed: dailySubscriptions.length,
      successCount,
      failedCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[TrackerCron] 每日任务执行失败:", error)
    return NextResponse.json(
      {
        success: false,
        error: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}