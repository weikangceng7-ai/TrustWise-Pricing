import { NextResponse } from "next/server"
import { savePriceData, saveInventoryData } from "@/services/realtime-data"

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, data } = body

    if (type === "price") {
      await savePriceData(data)
      return NextResponse.json({ success: true, message: "价格数据已保存" })
    }

    if (type === "inventory") {
      await saveInventoryData(data)
      return NextResponse.json({ success: true, message: "库存数据已保存" })
    }

    return NextResponse.json({ success: false, error: "未知数据类型" }, { status: 400 })
  } catch (error) {
    console.error("数据采集失败:", error)
    return NextResponse.json(
      { success: false, error: "数据采集失败" },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "数据采集 API",
    usage: {
      method: "POST",
      body: {
        type: "price | inventory",
        data: {
          date: "2026-03-22",
          region: "华东地区",
          market: "镇江港",
          specification: "颗粒",
          minPrice: 1150,
          maxPrice: 1180,
          mainPrice: 1165,
          changeValue: 15,
          source: "手动录入",
        },
      },
    },
  })
}
