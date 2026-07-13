import { NextResponse } from "next/server"
import { getPrices } from "@/services/prices"

export const maxDuration = 30

export async function GET() {
  try {
    const prices = await getPrices(60)

    if (prices.length === 0) {
      return NextResponse.json({ success: true, data: [], source: "database" })
    }

    const chartData = prices
      .map((p) => ({
        date: String(p.date).split("T")[0],
        actualPrice: p.mainPrice ? Number(p.mainPrice) : null,
        predictedPrice: null,
      }))
      .filter((d) => d.date && d.actualPrice != null)
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      success: true,
      data: chartData,
      source: "database",
    })
  } catch (error) {
    console.error("获取价格图表数据失败:", error)
    return NextResponse.json({ success: false, data: [], error: "获取数据失败" }, { status: 500 })
  }
}
