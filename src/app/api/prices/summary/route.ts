import { NextRequest, NextResponse } from "next/server"
import { getPriceSummary } from "@/services/prices"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const commodity = searchParams.get("commodity") || undefined
    const summary = await getPriceSummary(commodity)

    return NextResponse.json({
      success: true,
      data: summary,
    })
  } catch (error) {
    console.error("获取价格摘要失败:", error)
    return NextResponse.json(
      {
        success: false,
        error: "获取价格摘要失败",
      },
      { status: 500 }
    )
  }
}