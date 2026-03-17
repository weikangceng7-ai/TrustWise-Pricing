import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import type { SupportedChatModel } from "./chat-models"

// 创建 OpenRouter 实例
let openRouterInstance: ReturnType<typeof createOpenRouter> | null = null

/**
 * 获取 OpenRouter provider
 * @throws 如果 API Key 未配置
 */
export function getOpenRouterProvider() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set")
  }

  if (!openRouterInstance) {
    openRouterInstance = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    })
  }

  return (modelId: SupportedChatModel) => openRouterInstance!(modelId)
}

/**
 * 检查 OpenRouter 是否已配置
 */
export function isOpenRouterConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY
}
