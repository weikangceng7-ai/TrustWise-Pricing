import { NextResponse } from "next/server"
import { getYihuaAnalytics } from "@/services/yihua-knowledge"

export async function GET() {
  try {
    const data = await getYihuaAnalytics()
    return NextResponse.json({ success: true, data })
  } catch (e) {
    console.error("yihua knowledge analytics:", e)
    return NextResponse.json(
      { success: false, error: "获取宜化知识库分析失败" },
      { status: 500 },
    )
  }
}
