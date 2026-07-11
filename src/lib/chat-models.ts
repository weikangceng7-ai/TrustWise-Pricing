/**
 * 支持的聊天模型配置（多层级）
 */

// 免费模型（开发/测试用）
export const FREE_CHAT_MODELS = [
  "stepfun/step-3.5-flash:free",
  "google/gemma-2-9b-it:free",
  "qwen/qwen-2.5-72b-instruct:free",
] as const

// 付费模型（生产/高质量分析用）
export const PREMIUM_CHAT_MODELS = [
  "deepseek/deepseek-chat",
  "qwen/qwen-max",
  "anthropic/claude-sonnet-4-20250514",
  "meta-llama/llama-4-maverick:free",
] as const

export const ALL_CHAT_MODELS = [...FREE_CHAT_MODELS, ...PREMIUM_CHAT_MODELS] as const

// 默认使用的聊天模型
export const DEFAULT_CHAT_MODEL = "stepfun/step-3.5-flash:free"

// 推荐用于采购决策分析的模型
export const RECOMMENDED_DECISION_MODEL = "deepseek/deepseek-chat"

// 支持的聊天模型类型
export type SupportedChatModel = (typeof ALL_CHAT_MODELS)[number]

/**
 * 检查模型是否被支持
 */
export function isSupportedChatModel(modelId: string): modelId is SupportedChatModel {
  return (ALL_CHAT_MODELS as readonly string[]).includes(modelId)
}

/**
 * 获取模型显示名称
 */
export function getModelDisplayName(modelId: string): string {
  const modelMap: Record<string, string> = {
    "stepfun/step-3.5-flash:free": "Step 3.5 Flash (免费)",
    "google/gemma-2-9b-it:free": "Google Gemma 2 (免费)",
    "qwen/qwen-2.5-72b-instruct:free": "Qwen 2.5 72B (免费)",
    "deepseek/deepseek-chat": "DeepSeek V3 (推荐)",
    "qwen/qwen-max": "通义千问 Max",
    "anthropic/claude-sonnet-4-20250514": "Claude Sonnet 4",
    "meta-llama/llama-4-maverick:free": "Llama 4 Maverick (免费)",
  }
  return modelMap[modelId] || modelId
}

/**
 * Transformer 模型（时间序列预测）配置
 */
export const TRANSFORMER_PREDICTION_MODELS = {
  default: "patchtst",
  models: ["patchtst", "timesfm-1.0", "lag-llama", "granite-timeseries"] as const,
} as const

export type TransformerPredictionModel = (typeof TRANSFORMER_PREDICTION_MODELS.models)[number]

