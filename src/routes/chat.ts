import { convertToModelMessages, streamText, type UIMessage } from "ai"
import { Hono } from "hono"
import { DEFAULT_CHAT_MODEL, isSupportedChatModel } from "@/lib/chat-models"
import { getOpenRouterProvider } from "@/lib/openrouter"
import { requireAuth, type AuthContext } from "@/middleware/auth"

const chatRoutes = new Hono<{
  Variables: AuthContext
}>()

// 系统提示词 - 硫磺采购决策专家
const SYSTEM_PROMPT = `你是硫磺采购决策助手，一位专业的化工原料市场分析师。

你的职责：
1. 分析硫磺市场价格趋势
2. 提供采购时机建议
3. 解读国际市场动态（特别是中东地区）
4. 评估库存风险和备库策略

你的知识领域：
- 国际硫磺市场价格走势
- 中东地区运费变化
- 国内磷肥行业需求
- 供应链风险管理
- 库存优化策略

回答风格：
- 专业、简洁、数据驱动
- 提供具体数字和百分比
- 给出明确的行动建议
- 提醒潜在风险

当前市场背景（模拟数据）：
- 当前现货价格：约 900 元/吨
- 近期趋势：稳步上涨
- 主要影响因素：中东运费波动、国内需求增加

请用中文回答所有问题。`

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
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
  })
})

export { chatRoutes }
