import { NextResponse } from "next/server"
import { predictPrices, getTrendAnalysis } from "@/services/prediction"

interface CombinedPrediction {
  date: string
  predicted_price: number
  lower_bound: number
  upper_bound: number
  confidence: number
  arima_component: number
  transformer_component: number
}

interface CombinedPredictionData {
  commodity_code: string
  current_price: number
  trend: string
  change_percent: number
  regime: string
  risk_adjustment: number
  predictions: CombinedPrediction[]
  weights: {
    arima_xgb: number
    transformer: number
  }
  model_metrics: {
    arima_mape: number
    transformer_mape: number
  }
  prediction_days: number
  generated_at: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { days = 7, commodity_code = "sulfur", force_retrain = false } = body

    // 调用 Python 服务的 /combined-predict 端点
    const predictionServiceUrl = process.env.PREDICTION_SERVICE_URL || "http://localhost:5001"
    const response = await fetch(`${predictionServiceUrl}/combined-predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        days,
        commodity_code,
        force_retrain,
      }),
      cache: "no-store",
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[Combined Prediction] Python 服务返回错误:", errorText)
      return NextResponse.json(
        { success: false, error: "预测服务返回错误" },
        { status: response.status }
      )
    }

    const result = await response.json()

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "预测失败" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data as CombinedPredictionData,
    })
  } catch (error) {
    console.error("[Combined Prediction] 处理失败:", error)
    return NextResponse.json(
      { success: false, error: "预测服务不可用" },
      { status: 503 }
    )
  }
}
