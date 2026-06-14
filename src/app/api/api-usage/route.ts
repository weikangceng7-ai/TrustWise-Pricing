import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getUserApiUsageStats, getRecentApiUsageLogs } from "@/services/api-usage"

/**
 * GET /api/api-usage
 * 获取用户 API 使用统计
 *
 * Query params:
 * - startDate: 开始日期 (可选)
 * - endDate: 结束日期 (可选)
 * - limit: 日志数量限制 (默认 50)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const limit = parseInt(searchParams.get("limit") || "50")

    const [stats, logs] = await Promise.all([
      getUserApiUsageStats(
        session.user.id,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      ),
      getRecentApiUsageLogs(session.user.id, limit),
    ])

    return NextResponse.json({
      success: true,
      data: {
        stats,
        logs,
      },
    })
  } catch (error) {
    console.error("获取使用统计失败:", error)
    return NextResponse.json(
      { success: false, error: "获取使用统计失败" },
      { status: 500 }
    )
  }
}