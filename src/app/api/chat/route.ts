import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { streamText } from "ai"

// 创建 OpenRouter 实例
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || "",
})

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

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "请提供有效的消息" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 检查 API Key
    if (!process.env.OPENROUTER_API_KEY) {
      // 如果没有配置 API Key，返回模拟响应
      return new Response(
        JSON.stringify({
          error: "OpenRouter API Key 未配置，请设置 OPENROUTER_API_KEY 环境变量",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // 转换消息格式为 AI SDK 格式
    const formattedMessages = messages.map((msg: { role: string; content: string }) => {
      const role = msg.role === "agent" ? "assistant" : msg.role as "user" | "assistant"
      return {
        role,
        content: msg.content,
      }
    })

    // 使用 OpenRouter 调用模型
    const result = streamText({
      model: openrouter("deepseek/deepseek-chat-v3-0324:free"),
      system: SYSTEM_PROMPT,
      messages: formattedMessages,
    })

    // 返回流式响应
    return result.toTextStreamResponse()
  } catch (error) {
    console.error("Chat API error:", error)
    return new Response(
      JSON.stringify({
        error: "处理请求失败，请稍后重试",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
