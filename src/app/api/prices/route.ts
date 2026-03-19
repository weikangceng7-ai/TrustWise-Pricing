import { NextRequest, NextResponse } from "next/server"
import { getPrices } from "@/services/prices"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined
    const prices = await getPrices(limit)

    return NextResponse.json({
      success: true,
      data: prices,
      total: prices.length,
    })
  } catch (error) {
    console.error("获取价格数据失败:", error)
    return NextResponse.json(
      {
        success: false,
        error: "获取价格数据失败",
      },
      { status: 500 }
    )
  }
}