/**
 * 价格预测服务
 * 调用 Python 预测服务 API
 */

const DEFAULT_PREDICTION_SERVICE_URL = process.env.PREDICTION_SERVICE_URL || 'http://localhost:5001'
const PREDICTION_CACHE_TTL = 30 * 60 // 30 minutes

/**
 * 获取预测服务 URL
 * @param customUrl 用户自定义的 URL（优先使用）
 */
function getServiceUrl(customUrl?: string): string {
  if (customUrl && customUrl.trim()) {
    return customUrl.trim()
  }
  return DEFAULT_PREDICTION_SERVICE_URL
}

/**
 * 构建请求头（包含 API Key 认证）
 * @param apiKey 可选的 API 密钥
 */
function buildHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey && apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`
  }
  return headers
}

/**
 * 从 Redis 获取缓存的预测结果
 */
async function getCachedPrediction(days: number): Promise<PredictionResponse | null> {
  try {
    const { getRedis } = await import('@/lib/redis')
    const redis = getRedis()
    if (!redis) return null
    const cached = await redis.get(`prediction:${days}`)
    if (cached) return JSON.parse(cached) as PredictionResponse
  } catch {
    // Redis 不可用时跳过缓存
  }
  return null
}

/**
 * 将预测结果写入 Redis 缓存
 */
async function setCachedPrediction(days: number, result: PredictionResponse): Promise<void> {
  try {
    const { getRedis } = await import('@/lib/redis')
    const redis = getRedis()
    if (redis) {
      await redis.set(`prediction:${days}`, JSON.stringify(result), 'EX', PREDICTION_CACHE_TTL)
    }
  } catch {
    // Redis 写入失败不影响主流程
  }
}

export interface PredictionResult {
  date: string
  predicted_price: number
  arima_component: number
  xgb_residual: number
  lower_bound?: number
  upper_bound?: number
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
    regime?: string
    risk_adjustment?: number
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
  regime?: string
  risk_adjustment?: number
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
 * @param days 预测天数
 * @param serviceUrl 可选的自定义服务地址
 * @param apiKey 可选的 API 密钥
 */
export async function predictPrices(days: number = 7, serviceUrl?: string, apiKey?: string): Promise<PredictionResponse> {
  // 先检查缓存
  const cached = await getCachedPrediction(days)
  if (cached) return cached

  const url = getServiceUrl(serviceUrl)
  try {
    const response = await fetch(`${url}/predict`, {
      method: 'POST',
      headers: buildHeaders(apiKey),
      body: JSON.stringify({ days }),
      signal: AbortSignal.timeout(30000), // 30秒超时
    })

    if (!response.ok) {
      throw new Error(`预测服务返回 ${response.status}`)
    }

    const result = await response.json()
    // 写入缓存
    await setCachedPrediction(days, result)
    return result
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
 * @param days 分析天数
 * @param serviceUrl 可选的自定义服务地址
 * @param apiKey 可选的 API 密钥
 */
export async function getTrendAnalysis(days: number = 30, serviceUrl?: string, apiKey?: string): Promise<{
  success: boolean
  data?: TrendAnalysis
  error?: string
}> {
  const url = getServiceUrl(serviceUrl)
  try {
    const response = await fetch(`${url}/trend?days=${days}`, {
      method: 'GET',
      headers: buildHeaders(apiKey),
      signal: AbortSignal.timeout(30000), // 30秒超时
    })
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
 * @param params 决策参数
 * @param serviceUrl 可选的自定义服务地址
 * @param apiKey 可选的 API 密钥
 */
export async function getPurchaseDecision(params: {
  days?: number
  current_inventory?: number
  daily_consumption?: number
  safety_days?: number
}, serviceUrl?: string, apiKey?: string): Promise<DecisionResponse> {
  const url = getServiceUrl(serviceUrl)
  try {
    const response = await fetch(`${url}/decision`, {
      method: 'POST',
      headers: buildHeaders(apiKey),
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(30000), // 30秒超时
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
 * @param testRatio 测试数据比例
 * @param serviceUrl 可选的自定义服务地址
 * @param apiKey 可选的 API 密钥
 */
export async function trainModel(testRatio: number = 0.1, serviceUrl?: string, apiKey?: string): Promise<{
  success: boolean
  message?: string
  metrics?: Record<string, unknown>
  error?: string
}> {
  const url = getServiceUrl(serviceUrl)
  try {
    const response = await fetch(`${url}/train`, {
      method: 'POST',
      headers: buildHeaders(apiKey),
      body: JSON.stringify({ test_ratio: testRatio }),
      signal: AbortSignal.timeout(60000), // 60秒超时，训练需要更长时间
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
 * 回测模型：调用 Python /backtest 获取真实预测 vs 实际的逐点对比与精度指标
 * @param testRatio 测试数据比例
 * @param serviceUrl 可选的自定义服务地址
 * @param apiKey 可选的 API 密钥
 */
export async function backtestModel(testRatio: number = 0.1, serviceUrl?: string, apiKey?: string): Promise<{
  success: boolean
  data_source?: string
  price_count?: number
  metrics?: {
    mae: number
    rmse: number
    mape: number
    r2: number
    r2_changes?: number
    direction_accuracy?: number
    train_size: number
    test_size: number
    model_type: string
  }
  predictions?: Array<{ date: string; actual: number; predicted: number }>
  error?: string
}> {
  const url = getServiceUrl(serviceUrl)
  try {
    const response = await fetch(`${url}/backtest`, {
      method: 'POST',
      headers: buildHeaders(apiKey),
      body: JSON.stringify({ test_ratio: testRatio }),
      signal: AbortSignal.timeout(15000), // 15秒超时，训练 ARIMA+XGBoost 需要时间
    })

    return await response.json()
  } catch (error) {
    console.error('回测服务调用失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '回测服务调用失败',
    }
  }
}

/**
 * 检查预测服务健康状态
 * @param serviceUrl 可选的自定义服务地址
 * @param apiKey 可选的 API 密钥
 */
export async function checkPredictionServiceHealth(serviceUrl?: string, apiKey?: string): Promise<{
  healthy: boolean
  message: string
}> {
  const url = getServiceUrl(serviceUrl)
  try {
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      headers: buildHeaders(apiKey),
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
  ]

  // 新增：波动率状态和风险调整
  if (prediction.regime) {
    const regimeText = {
      'low': '低波动（适合稳定采购）',
      'normal': '正常波动',
      'high': '高波动（建议谨慎操作）'
    }[prediction.regime] || prediction.regime
    lines.push(`**市场状态**: ${regimeText}`)
  }
  if (prediction.risk_adjustment) {
    lines.push(`**风险系数**: ${prediction.risk_adjustment}`)
  }

  lines.push(``)
  lines.push(`### 未来 ${prediction.prediction_days} 天价格预测`)
  lines.push(``)

  // 检查是否有置信区间
  const hasConfidenceInterval = prediction.predictions.some(p => p.lower_bound && p.upper_bound)

  if (hasConfidenceInterval) {
    lines.push(`| 日期 | 预测价格(元/吨) | 置信下界 | 置信上界 | ARIMA预测 | XGBoost残差 |`)
    lines.push(`|------|----------------|----------|----------|-----------|-------------|`)
    for (const p of prediction.predictions) {
      const lower = p.lower_bound !== undefined ? p.lower_bound.toFixed(2) : '-'
      const upper = p.upper_bound !== undefined ? p.upper_bound.toFixed(2) : '-'
      lines.push(`| ${p.date} | ${p.predicted_price} | ${lower} | ${upper} | ${p.arima_component} | ${p.xgb_residual} |`)
    }
  } else {
    lines.push(`| 日期 | 预测价格(元/吨) | ARIMA预测 | XGBoost残差 |`)
    lines.push(`|------|----------------|-----------|-------------|`)
    for (const p of prediction.predictions) {
      lines.push(`| ${p.date} | ${p.predicted_price} | ${p.arima_component} | ${p.xgb_residual} |`)
    }
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
  ]

  // 新增：波动率状态和风险调整
  if (decision.prediction.regime) {
    const regimeText = {
      'low': '低波动（适合稳定采购）',
      'normal': '正常波动',
      'high': '高波动（建议谨慎操作）'
    }[decision.prediction.regime] || decision.prediction.regime
    lines.push(`- **市场状态**: ${regimeText}`)
  }
  if (decision.prediction.risk_adjustment) {
    lines.push(`- **风险系数**: ${decision.prediction.risk_adjustment}`)
  }
  lines.push(``)

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