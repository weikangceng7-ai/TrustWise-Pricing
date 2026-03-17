/**
 * 支持的聊天模型配置
 */

// 默认使用的聊天模型
export const DEFAULT_CHAT_MODEL = "deepseek/deepseek-chat-v3-0324:free"

// 支持的聊天模型列表
export const SUPPORTED_CHAT_MODELS = [
  "deepseek/deepseek-chat-v3-0324:free",
  "deepseek/deepseek-chat:free",
  "google/gemma-3-27b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
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
    "deepseek/deepseek-chat-v3-0324:free": "DeepSeek V3",
    "deepseek/deepseek-chat:free": "DeepSeek Chat",
    "google/gemma-3-27b-it:free": "Google Gemma 3",
    "meta-llama/llama-3.3-70b-instruct:free": "Meta Llama 3.3",
  }
  return modelMap[modelId] || modelId
}
