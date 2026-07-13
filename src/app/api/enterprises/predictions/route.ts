import { NextRequest, NextResponse } from "next/server"
import { db, enterprisePricePredictions } from "@/db"
import { sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ data: [] }, { status: 200 })
    }

    const { searchParams } = new URL(request.url)
    const commodity = searchParams.get("commodity") || "sulfur"

    // 获取每家企业的最新预测数据
    const predictions = await db.execute(sql`
      WITH latest AS (
        SELECT
          enterprise_name,
          enterprise_code,
          date,
          actual_price,
          predicted_price,
          lower_bound,
          upper_bound,
          confidence,
          model_type,
          ROW_NUMBER() OVER (
            PARTITION BY enterprise_code
            ORDER BY date DESC
          ) AS rn
        FROM enterprise_price_predictions
        WHERE commodity_code = ${commodity}
          AND predicted_price IS NOT NULL
      )
      SELECT * FROM latest WHERE rn = 1
      ORDER BY enterprise_name
    `)

    const data = (predictions as any[] || []).map((row: any) => {
      const predictedPrice = Number(row.predicted_price || 0)
      const actualPrice = row.actual_price ? Number(row.actual_price) : null
      const changePercent = actualPrice
        ? ((predictedPrice - actualPrice) / actualPrice * 100)
        : 0

      return {
        id: row.enterprise_code,
        name: row.enterprise_name,
        price: `¥${predictedPrice.toLocaleString()}`,
        trend: changePercent > 0.5 ? "rise" : changePercent < -0.5 ? "down" : "stable",
        confidence: row.confidence ? Number(row.confidence).toFixed(1) : null,
        predictedDate: row.date,
        source: "AI 模型预测",
      }
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error("获取企业预测数据失败:", error)
    return NextResponse.json({ data: [] }, { status: 500 })
  }
}
