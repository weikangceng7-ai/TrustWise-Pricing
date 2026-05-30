import { NextRequest, NextResponse } from "next/server"
import { db, multiDimensionalPrices } from "@/db"
import { desc, eq, and, gte, lte } from "drizzle-orm"

// 获取多维度价格数据
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "数据库连接失败" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") // 分类: supply/demand/middle-east-cob/port-inventory/domestic/market-news
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const limit = searchParams.get("limit")

    // 构建查询条件
    const conditions = []

    if (category) {
      conditions.push(eq(multiDimensionalPrices.category, category))
    }

    if (startDate) {
      conditions.push(gte(multiDimensionalPrices.date, startDate))
    }

    if (endDate) {
      conditions.push(lte(multiDimensionalPrices.date, endDate))
    }

    // 查询数据
    let query = db
      .select()
      .from(multiDimensionalPrices)
      .$dynamic()

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query
    }

    // 按日期排序，限制数量
    const limitNum = limit ? parseInt(limit) : 90
    const rawData = await query
      .orderBy(desc(multiDimensionalPrices.date))
      .limit(limitNum)

    // 如果没有数据，返回空数组
    if (!rawData || rawData.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "暂无多维度价格数据",
      })
    }

    // 格式化数据（price 现在是 varchar）
    const formattedData = rawData.map((item) => ({
      id: item.id,
      date: item.date,
      category: item.category,
      categoryName: item.categoryName,
      price: item.price ? parseFloat(item.price) : null,
      value: item.value ? parseFloat(item.value) : null,
      changeValue: item.changeValue ? parseFloat(item.changeValue) : null,
      changePercent: item.changePercent ? parseFloat(item.changePercent) : null,
      source: item.source,
      note: item.note,
      createdAt: item.createdAt,
    }))

    // 按日期正序排列（图表需要从早到晚）
    const data = formattedData.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    return NextResponse.json({
      success: true,
      data,
      category: category || null,
      count: data.length,
    })
  } catch (error) {
    console.error("获取多维度价格数据失败:", error)
    return NextResponse.json(
      { error: "获取多维度价格数据失败", details: String(error) },
      { status: 500 }
    )
  }
}