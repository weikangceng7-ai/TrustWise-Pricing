/**
 * 价格预测服务
 * 调用 Python 预测服务 API
 */

const PREDICTION_SERVICE_URL = process.env.PREDICTION_SERVICE_URL || 'http://localhost:5001'

export interface PredictionResult {
  date: string
  predicted_price: number
  arima_component: number
  xgb_residual: number
}

export interface PredictionResponse {
  success: boolean
  data: {
    predictions: PredictionResult[]
    current_price: number
    prediction_days: number
    trend: string
    change_percent: number
    model_type: string
    confidence: string
    generated_at: string
  }
  error?: string
}

export interface TrendAnalysis {
  current_price: number
  ma_7: number
  ma_30: number
  volatility: number
  trend_7d: string
  trend_30d: string
  change_7d_percent: number
  change_30d_percent: number
  analysis: string
}

export interface DecisionResponse {
  success: boolean
  data: {
    prediction: PredictionResponse['data']
    trend_analysis: TrendAnalysis
    inventory_analysis: {
      current_inventory: number
      daily_consumption: number
      inventory_days: number
      safety_inventory: number
      status: string
    } | null
    decision: {
      suggestion: string
      urgency: string
      suggested_quantity: number
      best_purchase_date: string
      expected_best_price: number
      avg_predicted_price: number
      price_range: {
        min: number
        max: number
      }
    }
  }
  error?: string
}

/**
 * 预测未来价格
 */
export async function predictPrices(days: number = 7): Promise<PredictionResponse> {
  try {
    const response = await fetch(`${PREDICTION_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days }),
    })

    return await response.json()
  } catch (error) {
    console.error('预测服务调用失败:', error)
    return {
      success: false,
      data: {
        predictions: [],
        current_price: 0,
        prediction_days: days,
        trend: '未知',
        change_percent: 0,
        model_type: 'Hybrid ARIMA + XGBoost',
        confidence: '低',
        generated_at: new Date().toISOString(),
      },
      error: error instanceof Error ? error.message : '预测服务调用失败',
    }
  }
}

/**
 * 获取趋势分析
 */
export async function getTrendAnalysis(days: number = 30): Promise<{
  success: boolean
  data?: TrendAnalysis
  error?: string
}> {
  try {
    const response = await fetch(`${PREDICTION_SERVICE_URL}/trend?days=${days}`)
    return await response.json()
  } catch (error) {
    console.error('趋势分析服务调用失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '趋势分析服务调用失败',
    }
  }
}

/**
 * 获取采购决策建议
 */
export async function getPurchaseDecision(params: {
  days?: number
  current_inventory?: number
  daily_consumption?: number
  safety_days?: number
}): Promise<DecisionResponse> {
  try {
    const response = await fetch(`${PREDICTION_SERVICE_URL}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    return await response.json()
  } catch (error) {
    console.error('决策服务调用失败:', error)
    return {
      success: false,
      data: {
        prediction: {
          predictions: [],
          current_price: 0,
          prediction_days: params.days || 7,
          trend: '未知',
          change_percent: 0,
          model_type: 'Hybrid ARIMA + XGBoost',
          confidence: '低',
          generated_at: new Date().toISOString(),
        },
        trend_analysis: {
          current_price: 0,
          ma_7: 0,
          ma_30: 0,
          volatility: 0,
          trend_7d: '未知',
          trend_30d: '未知',
          change_7d_percent: 0,
          change_30d_percent: 0,
          analysis: '决策服务暂时不可用',
        },
        inventory_analysis: null,
        decision: {
          suggestion: '预测服务暂时不可用，请稍后重试',
          urgency: '未知',
          suggested_quantity: 0,
          best_purchase_date: '',
          expected_best_price: 0,
          avg_predicted_price: 0,
          price_range: { min: 0, max: 0 },
        },
      },
      error: error instanceof Error ? error.message : '决策服务调用失败',
    }
  }
}

/**
 * 训练模型
 */
export async function trainModel(testRatio: number = 0.1): Promise<{
  success: boolean
  message?: string
  metrics?: Record<string, unknown>
  error?: string
}> {
  try {
    const response = await fetch(`${PREDICTION_SERVICE_URL}/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_ratio: testRatio }),
    })

    return await response.json()
  } catch (error) {
    console.error('模型训练服务调用失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '模型训练服务调用失败',
    }
  }
}

/**
 * 检查预测服务健康状态
 */
export async function checkPredictionServiceHealth(): Promise<{
  healthy: boolean
  message: string
}> {
  try {
    const response = await fetch(`${PREDICTION_SERVICE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5秒超时
    })

    if (response.ok) {
      return { healthy: true, message: '预测服务运行正常' }
    }
    return { healthy: false, message: `预测服务响应异常: ${response.status}` }
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : '预测服务不可用',
    }
  }
}

/**
 * 格式化预测结果为文本
 */
export function formatPredictionAsText(prediction: PredictionResponse['data']): string {
  if (!prediction.predictions || prediction.predictions.length === 0) {
    return '暂无预测数据'
  }

  const lines: string[] = [
    `## 硫磺价格预测结果`,
    ``,
    `**当前价格**: ${prediction.current_price} 元/吨`,
    `**预测趋势**: ${prediction.trend} (${prediction.change_percent > 0 ? '+' : ''}${prediction.change_percent}%)`,
    `**预测置信度**: ${prediction.confidence}`,
    `**预测模型**: ${prediction.model_type}`,
    ``,
    `### 未来 ${prediction.prediction_days} 天价格预测`,
    ``,
    `| 日期 | 预测价格(元/吨) | ARIMA预测 | XGBoost残差修正 |`,
    `|------|----------------|-----------|----------------|`,
  ]

  for (const p of prediction.predictions) {
    lines.push(`| ${p.date} | ${p.predicted_price} | ${p.arima_component} | ${p.xgb_residual} |`)
  }

  lines.push(``)
  lines.push(`*预测生成时间: ${new Date(prediction.generated_at).toLocaleString('zh-CN')}*`)

  return lines.join('\n')
}

/**
 * 格式化决策建议为文本
 */
export function formatDecisionAsText(decision: DecisionResponse['data']): string {
  const lines: string[] = [
    `## 采购决策建议`,
    ``,
    `### 价格预测`,
    `- **当前价格**: ${decision.prediction.current_price} 元/吨`,
    `- **预测趋势**: ${decision.prediction.trend}`,
    `- **预测变化**: ${decision.prediction.change_percent > 0 ? '+' : ''}${decision.prediction.change_percent}%`,
    `- **置信度**: ${decision.prediction.confidence}`,
    ``,
  ]

  if (decision.inventory_analysis) {
    lines.push(`### 库存分析`)
    lines.push(`- **当前库存**: ${decision.inventory_analysis.current_inventory} 吨`)
    lines.push(`- **日均消耗**: ${decision.inventory_analysis.daily_consumption} 吨`)
    lines.push(`- **库存天数**: ${decision.inventory_analysis.inventory_days} 天`)
    lines.push(`- **库存状态**: ${decision.inventory_analysis.status}`)
    lines.push(``)
  }

  lines.push(`### 采购建议`)
  lines.push(`- **建议**: ${decision.decision.suggestion}`)
  lines.push(`- **紧急程度**: ${decision.decision.urgency}`)
  lines.push(`- **建议采购量**: ${decision.decision.suggested_quantity} 吨`)
  lines.push(`- **最佳采购日期**: ${decision.decision.best_purchase_date || '随时'}`)
  lines.push(`- **预期最佳价格**: ${decision.decision.expected_best_price} 元/吨`)
  lines.push(`- **平均预测价格**: ${decision.decision.avg_predicted_price} 元/吨`)
  lines.push(``)

  lines.push(`### 价格区间`)
  lines.push(`- 最低: ${decision.decision.price_range.min} 元/吨`)
  lines.push(`- 最高: ${decision.decision.price_range.max} 元/吨`)

  return lines.join('\n')
}