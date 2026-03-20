import { NextResponse } from "next/server"
import { getInventorySummary } from "@/services/prices"

export async function GET() {
  try {
    const data = await getInventorySummary()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("获取库存摘要失败:", error)
    return NextResponse.json(
      { success: false, error: "获取库存摘要失败" },
      { status: 500 },
    )
  }
}
