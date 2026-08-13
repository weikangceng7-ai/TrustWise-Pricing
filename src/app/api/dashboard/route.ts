import { NextRequest, NextResponse } from "next/server"
import { fetchDashboardData } from "@/services/dashboard"

export const maxDuration = 15

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const commodity = searchParams.get("commodity") || "sulfur"

    const data = await fetchDashboardData(commodity)

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("获取仪表盘数据失败:", error)
    return NextResponse.json(
      { success: false, error: "获取仪表盘数据失败" },
      { status: 500 }
    )
  }
}
