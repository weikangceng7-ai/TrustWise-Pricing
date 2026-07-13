import { NextRequest, NextResponse } from "next/server"
import { getInventorySummary } from "@/services/prices"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const commodity = searchParams.get("commodity") || undefined
    const data = await getInventorySummary(commodity)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("获取库存摘要失败:", error)
    return NextResponse.json(
      { success: false, error: "获取库存摘要失败" },
      { status: 500 },
    )
  }
}
