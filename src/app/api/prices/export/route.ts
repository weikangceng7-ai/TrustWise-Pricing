/**
 * 价格数据导出 API
 * GET /api/prices/export?commodity=sulfur&format=json
 *
 * 从 PostgreSQL 导出历史价格数据，供 Python 训练服务使用。
 * format=json 返回 JSON（默认），format=excel 返回 Excel 二进制。
 */
import { NextResponse } from "next/server"
import { getPrices } from "@/services/prices"

export const maxDuration = 30

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const commodity = searchParams.get("commodity") || "sulfur"
  const format = searchParams.get("format") || "json"

  try {
    const prices = await getPrices(undefined, commodity)
    if (prices.length === 0) {
      return NextResponse.json(
        { success: false, error: `无 ${commodity} 价格数据` },
        { status: 404 }
      )
    }

    // 按日期升序排列（训练需要时间递增）
    const sorted = [...prices].reverse()

    if (format === "excel") {
      // 动态导入 xlsx 避免增大 bundle
      const XLSX = await import("xlsx")
      const rows = sorted.map((p) => ({
        日期: p.date,
        长江港硫磺现货价: Number(p.mainPrice),
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1")
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

      return new NextResponse(buf, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="price_history_${commodity}.xlsx"`,
        },
      })
    }

    // 默认 JSON 格式
    const data = sorted.map((p) => ({
      date: p.date,
      price: Number(p.mainPrice),
    }))

    return NextResponse.json({
      success: true,
      commodity,
      count: data.length,
      dateRange: {
        start: data[0]?.date || null,
        end: data[data.length - 1]?.date || null,
      },
      data,
    })
  } catch (error) {
    console.error("价格数据导出失败:", error)
    return NextResponse.json(
      { success: false, error: "导出失败" },
      { status: 500 }
    )
  }
}
