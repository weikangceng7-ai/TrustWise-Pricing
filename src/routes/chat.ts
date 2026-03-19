import { convertToModelMessages, streamText, type UIMessage } from "ai"
import { Hono } from "hono"
import { DEFAULT_CHAT_MODEL, isSupportedChatModel } from "@/lib/chat-models"
import { getOpenRouterProvider } from "@/lib/openrouter"
import { requireAuth, type AuthContext } from "@/middleware/auth"

// Hono 泛型参数顺序: <Env, Schema, Variables>
// 使用 Hono 基础实例，不指定泛型
const chatRoutes = new Hono()

// 使用要求登录的中间件保护路由
chatRoutes.use("*", requireAuth)

chatRoutes.post("/", async (c) => {
  const body = await c.req.json<{
    messages?: UIMessage[]
    model?: string
  }>()

  // 1. 提取并校验 messages
  const messages = Array.isArray(body?.messages) ? body.messages : null
  if (!messages) {
    return c.json({ error: "messages are required" }, 400)
  }

  // 2. 提取并校验 model
  const modelId =
    typeof body?.model === "string" && body.model.length > 0
      ? body.model
      : DEFAULT_CHAT_MODEL

  if (!isSupportedChatModel(modelId)) {
    return c.json({ error: "Unsupported model" }, 400)
  }

  // 3. 获取 OpenRouter 服务
  let provider
  try {
    provider = getOpenRouterProvider()
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Chat provider is not configured"
    return c.json({ error: message }, 500)
  }

  // 4. 调用 AI 生成流式文本
  const result = streamText({
    model: provider(modelId),
    system:
      "You are a concise, helpful assistant for a tutorial app. Prefer direct answers and runnable code when relevant.",
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
  })
})

export { chatRoutes }
