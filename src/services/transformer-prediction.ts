/**
 * Transformer 时间序列预测服务客户端
 *
 * 调用 Python 侧的 Transformer 模型端点（POST /transformer-predict）
 * 与 ARIMA+XGBoost 并行使用，生成组合预测结果
 */

import { TRANSFORMER_PREDICTION_MODELS, type TransformerPredictionModel } from "@/lib/chat-models"

const BASE_URL = process.env.PREDICTION_SERVICE_URL || "http://localhost:5001"

export interface TransformerPredictionResult {
  date: string
  predicted_price: number
  lower_bound: number
  upper_bound: number
  confidence: number
  attention_weights?: number[] // Transformer 注意力权重（可选）
}

export interface TransformerPredictionResponse {
  success: boolean
  model: string
  total_days: number
  predictions: TransformerPredictionResult[]
  metrics?: {
    mape?: number
    mae?: number
    rmse?: number
  }
  error?: string
}

export interface TransformerHealthResponse {
  success: boolean
  status: "healthy" | "unhealthy"
  model_loaded: string | null
  model_ready: boolean
  gpu_available: boolean
  error?: string
}

/**
 * 调用 Transformer 模型进行价格预测
 */
export async function predictWithTransformer(
  days: number = 7,
  commodityCode: string = "sulfur",
  model: TransformerPredictionModel = TRANSFORMER_PREDICTION_MODELS.default,
  serviceUrl?: string,
  apiKey?: string
): Promise<TransformerPredictionResponse> {
  try {
    const baseUrl = serviceUrl || BASE_URL
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`
    }

    const res = await fetch(`${baseUrl}/transformer-predict`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        days,
        commodity_code: commodityCode,
        model,
      }),
      signal: AbortSignal.timeout(60000), // Transformer 推理可能需要更长时间
    })

    if (!res.ok) {
      throw new Error(`Transformer service returned ${res.status}`)
    }

    return await res.json()
  } catch (error) {
    console.error("Transformer prediction failed:", error)
    return {
      success: false,
      model,
      total_days: 0,
      predictions: [],
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * 获取组合预测结果（ARIMA+XGBoost + Transformer 加权融合）
 */
export interface CombinedPrediction {
  date: string
  arima_xgb_price: number
  transformer_price: number
  combined_price: number // 加权平均
  confidence: number
  lower_bound: number
  upper_bound: number
}

export async function getCombinedPrediction(
  days: number = 7,
  commodityCode: string = "sulfur",
  serviceUrl?: string,
  apiKey?: string
): Promise<{
  success: boolean
  predictions: CombinedPrediction[]
  error?: string
}> {
  try {
    // 并行调用两个模型
    const baseUrl = serviceUrl || BASE_URL
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`
    }

    const [arimaRes, transformerRes] = await Promise.all([
      fetch(`${baseUrl}/predict`, {
        method: "POST",
        headers,
        body: JSON.stringify({ days, commodity_code: commodityCode }),
        signal: AbortSignal.timeout(30000),
      }).then((r) => r.json()),
      fetch(`${baseUrl}/transformer-predict`, {
        method: "POST",
        headers,
        body: JSON.stringify({ days, commodity_code: commodityCode, model: "patchtst" }),
        signal: AbortSignal.timeout(60000),
      }).then((r) => r.json()),
    ])

    // 融合两个模型的预测
    const predictions: CombinedPrediction[] = []
    const arimaResults = arimaRes?.data?.predictions || []
    const transformerResults = transformerRes?.predictions || []

    const count = Math.max(arimaResults.length, transformerResults.length)
    const transformerWeight = 0.4 // Transformer 权重 40%, ARIMA+XGBoost 60%

    for (let i = 0; i < count; i++) {
      const arima = arimaResults[i]
      const transformer = transformerResults[i]

      const arimaPrice = arima?.predicted_price ?? arimaResults[0]?.predicted_price ?? 0
      const transformerPrice = transformer?.predicted_price ?? transformerResults[0]?.predicted_price ?? 0

      predictions.push({
        date: arima?.date || transformer?.date || "",
        arima_xgb_price: arimaPrice,
        transformer_price: transformerPrice,
        combined_price:
          Math.round((arimaPrice * (1 - transformerWeight) + transformerPrice * transformerWeight) * 100) / 100,
        confidence: Math.round(Math.max(arima?.confidence || 0, transformer?.confidence || 0, 85) * 100) / 100,
        lower_bound: Math.min(arima?.lower_bound ?? arimaPrice - 30, transformer?.lower_bound ?? transformerPrice - 30),
        upper_bound: Math.max(arima?.upper_bound ?? arimaPrice + 30, transformer?.upper_bound ?? transformerPrice + 30),
      })
    }

    return { success: true, predictions }
  } catch (error) {
    console.error("Combined prediction failed:", error)
    return {
      success: false,
      predictions: [],
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Transformer 服务健康检查
 */
export async function getTransformerHealth(
  serviceUrl?: string
): Promise<TransformerHealthResponse> {
  try {
    const baseUrl = serviceUrl || BASE_URL
    const res = await fetch(`${baseUrl}/transformer-health`, {
      signal: AbortSignal.timeout(10000),
    })
    return await res.json()
  } catch {
    return {
      success: false,
      status: "unhealthy",
      model_loaded: null,
      model_ready: false,
      gpu_available: false,
      error: "Transformer service unavailable",
    }
  }
}

/**
 * 格式化 Transformer 预测结果为聊天上下文文本
 */
export function formatTransformerPredictionAsText(
  data: TransformerPredictionResponse
): string {
  if (!data.success || data.predictions.length === 0) return ""

  let text = `### 🤖 Transformer 模型预测 (${data.model})\n\n`
  text += "| 日期 | 预测价格 | 置信区间 | 置信度 |\n"
  text += "|:-----|:--------:|:--------:|:------:|\n"
  for (const p of data.predictions) {
    text += `| ${p.date} | ¥${p.predicted_price} | ¥${p.lower_bound}-¥${p.upper_bound} | ${p.confidence * 100}% |\n`
  }

  if (data.metrics?.mape != null) {
    text += `\n**模型精度**: MAPE ${data.metrics.mape}%, MAE ¥${data.metrics.mae || "N/A"}\n`
  }

  return text
}
