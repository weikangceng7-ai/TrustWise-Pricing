import { NextRequest, NextResponse } from 'next/server'
import { getCombinedPrediction } from '@/services/transformer-prediction'

export const maxDuration = 60

/**
 * POST /api/prediction/combined
 * 双模型融合预测（ARIMA+XGBoost + Transformer）
 *
 * Body:
 * - days: number (默认 7)
 * - commodity_code: string (默认 sulfur)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { days = 7, commodity_code = 'sulfur' } = body

    const result = await getCombinedPrediction(days, commodity_code)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || '组合预测失败',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '组合预测服务调用失败',
      },
      { status: 500 }
    )
  }
}
