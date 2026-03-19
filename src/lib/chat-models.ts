/**
 * 支持的聊天模型配置
 */

// 默认使用的聊天模型
export const DEFAULT_CHAT_MODEL = "stepfun/step-3.5-flash:free"

// 支持的聊天模型列表
export const SUPPORTED_CHAT_MODELS = [
  "stepfun/step-3.5-flash:free",
  "google/gemma-2-9b-it:free",
  "qwen/qwen-2.5-72b-instruct:free",
] as const

// 支持的聊天模型类型
export type SupportedChatModel = (typeof SUPPORTED_CHAT_MODELS)[number]

/**
 * 检查模型是否被支持
 */
export function isSupportedChatModel(modelId: string): modelId is SupportedChatModel {
  return SUPPORTED_CHAT_MODELS.includes(modelId as SupportedChatModel)
}

/**
 * 获取模型显示名称
 */
export function getModelDisplayName(modelId: string): string {
  const modelMap: Record<string, string> = {
    "stepfun/step-3.5-flash:free": "Step 3.5 Flash",
    "google/gemma-2-9b-it:free": "Google Gemma 2",
    "qwen/qwen-2.5-72b-instruct:free": "Qwen 2.5",
  }
  return modelMap[modelId] || modelId
}
