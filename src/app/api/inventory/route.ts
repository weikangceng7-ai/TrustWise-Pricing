import { NextRequest, NextResponse } from "next/server"
import { getInventory } from "@/services/prices"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined
    const data = await getInventory(limit)
    return NextResponse.json({
      success: true,
      data,
      total: data.length,
    })
  } catch (error) {
    console.error("获取库存数据失败:", error)
    return NextResponse.json(
      { success: false, error: "获取库存数据失败" },
      { status: 500 },
    )
  }
}
