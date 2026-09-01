import { NextRequest, NextResponse } from 'next/server'
import { predictWithTransformer } from '@/services/transformer-prediction'

export const maxDuration = 60

/**
 * POST /api/prediction/transformer
 * Transformer 深度学习预测（PatchTST）
 *
 * Body:
 * - days: number (默认 7)
 * - commodity_code: string (默认 sulfur)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { days = 7, commodity_code = 'sulfur' } = body

    const result = await predictWithTransformer(days, commodity_code)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Transformer 预测失败',
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
        error: error instanceof Error ? error.message : 'Transformer 预测服务调用失败',
      },
      { status: 500 }
    )
  }
}
