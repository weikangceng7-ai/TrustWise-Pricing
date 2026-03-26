import { NextResponse } from "next/server"
import { db, enterprisePricePredictions } from "@/db"
import { desc, eq, and, gte, lte, sql, inArray } from "drizzle-orm"

// 企业代码常量
const ENTERPRISE_CODES = ["yihua", "luxi", "jinzhengda"] as const

export async function GET(request: Request) {
  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const enterprise = searchParams.get("enterprise") // yihua, luxi, jinzhengda
    const days = parseInt(searchParams.get("days") || "30")

    // 计算日期范围
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    if (enterprise) {
      // 获取特定企业的数据
      const data = await db
        .select()
        .from(enterprisePricePredictions)
        .where(
          and(
            eq(enterprisePricePredictions.enterpriseCode, enterprise),
            gte(enterprisePricePredictions.date, startDate.toISOString().split("T")[0])
          )
        )
        .orderBy(enterprisePricePredictions.date)

      return NextResponse.json({
        success: true,
        enterprise: enterprise,
        data: data,
      })
    }

    // 获取所有企业的最新数据
    const latestData = await db
      .select({
        enterpriseCode: enterprisePricePredictions.enterpriseCode,
        enterpriseName: enterprisePricePredictions.enterpriseName,
        latestDate: sql<string>`MAX(${enterprisePricePredictions.date})`,
        latestPrice: sql<string>`(SELECT actual_price FROM enterprise_price_predictions ep2 WHERE ep2.enterprise_code = enterprise_price_predictions.enterprise_code ORDER BY date DESC LIMIT 1)`,
        predictedPrice: sql<string>`(SELECT predicted_price FROM enterprise_price_predictions ep3 WHERE ep3.enterprise_code = enterprise_price_predictions.enterprise_code AND predicted_price IS NOT NULL ORDER BY date DESC LIMIT 1)`,
        modelType: sql<string>`(SELECT model_type FROM enterprise_price_predictions ep4 WHERE ep4.enterprise_code = enterprise_price_predictions.enterprise_code ORDER BY date DESC LIMIT 1)`,
        confidence: sql<string>`(SELECT confidence FROM enterprise_price_predictions ep5 WHERE ep5.enterprise_code = enterprise_price_predictions.enterprise_code ORDER BY date DESC LIMIT 1)`,
      })
      .from(enterprisePricePredictions)
      .groupBy(enterprisePricePredictions.enterpriseCode, enterprisePricePredictions.enterpriseName)

    // 优化：一次性获取所有企业的历史数据，避免 N+1 查询
    const allRecords = await db
      .select()
      .from(enterprisePricePredictions)
      .where(
        and(
          inArray(enterprisePricePredictions.enterpriseCode, [...ENTERPRISE_CODES]),
          gte(enterprisePricePredictions.date, startDate.toISOString().split("T")[0])
        )
      )
      .orderBy(enterprisePricePredictions.date)

    // 按企业代码分组
    const allData: Record<string, typeof enterprisePricePredictions.$inferSelect[]> = {}
    for (const code of ENTERPRISE_CODES) {
      allData[code] = allRecords.filter(record => record.enterpriseCode === code)
    }

    return NextResponse.json({
      success: true,
      summary: latestData,
      history: allData,
    })
  } catch (error) {
    console.error("获取企业价格预测数据失败:", error)
    return NextResponse.json({ error: "获取数据失败" }, { status: 500 })
  }
}