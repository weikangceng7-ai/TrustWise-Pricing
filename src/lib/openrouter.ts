import { createOpenRouter } from "@openrouter/ai-sdk-provider"

let provider: ReturnType<typeof createOpenRouter> | null = null

export function getOpenRouterProvider() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is missing")
  }

  if (!provider) {
    provider = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    })
  }

  return provider
}
