import { NextRequest, NextResponse } from 'next/server'
import {
  predictPrices,
  getTrendAnalysis,
  getPurchaseDecision,
  checkPredictionServiceHealth,
  formatPredictionAsText,
  formatDecisionAsText,
} from '@/services/prediction'

export const maxDuration = 60

/**
 * GET /api/prediction/health
 * 检查预测服务健康状态
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  try {
    switch (action) {
      case 'health':
        const health = await checkPredictionServiceHealth()
        return NextResponse.json(health)

      case 'trend':
        const days = parseInt(searchParams.get('days') || '30', 10)
        const trendResult = await getTrendAnalysis(days)
        return NextResponse.json(trendResult)

      default:
        // 默认返回预测
        const predictDays = parseInt(searchParams.get('days') || '7', 10)
        const result = await predictPrices(predictDays)
        return NextResponse.json(result)
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '预测服务调用失败',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/prediction
 * 执行预测或获取决策建议
 *
 * Body:
 * - action: 'predict' | 'decision' | 'trend'
 * - days: number
 * - current_inventory?: number
 * - daily_consumption?: number
 * - safety_days?: number
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action = 'predict', days = 7, current_inventory, daily_consumption, safety_days } = body

    switch (action) {
      case 'predict':
        const predictResult = await predictPrices(days)
        return NextResponse.json(predictResult)

      case 'trend':
        const trendResult = await getTrendAnalysis(days)
        return NextResponse.json(trendResult)

      case 'decision':
        const decisionResult = await getPurchaseDecision({
          days,
          current_inventory,
          daily_consumption,
          safety_days,
        })
        return NextResponse.json(decisionResult)

      case 'format':
        // 返回格式化的预测文本
        const prediction = await predictPrices(days)
        if (prediction.success && prediction.data) {
          return NextResponse.json({
            success: true,
            text: formatPredictionAsText(prediction.data),
          })
        }
        return NextResponse.json({
          success: false,
          error: prediction.error || '预测失败',
        })

      case 'format-decision':
        // 返回格式化的决策文本
        const decision = await getPurchaseDecision({
          days,
          current_inventory,
          daily_consumption,
          safety_days,
        })
        if (decision.success && decision.data) {
          return NextResponse.json({
            success: true,
            text: formatDecisionAsText(decision.data),
          })
        }
        return NextResponse.json({
          success: false,
          error: decision.error || '决策分析失败',
        })

      default:
        return NextResponse.json(
          { success: false, error: '未知的操作类型' },
          { status: 400 }
        )
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '预测服务调用失败',
      },
      { status: 500 }
    )
  }
}