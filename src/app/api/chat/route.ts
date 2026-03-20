import OpenAI from "openai"
import { SYSTEM_PROMPT } from "@/lib/system-prompt"

export const maxDuration = 60

// 创建 OpenAI 实例 (使用 qnaigc API)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-88df478c39ae4067df5bd6c5b2c72dcd63b944e0cb6ea5134a9564c21898ae12",
  baseURL: process.env.OPENAI_BASE_URL || "https://api.qnaigc.com/v1",
})

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "请提供有效的消息" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 转换消息格式
    const formattedMessages = messages.map((msg: { role: string; content: string }) => {
      const role = msg.role === "agent" ? "assistant" : msg.role as "user" | "assistant" | "system"
      return {
        role,
        content: msg.content,
      }
    })

    // 添加系统提示
    const messagesWithSystem = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...formattedMessages,
    ]

    // 使用 OpenAI API 调用模型
    const stream = await openai.chat.completions.create({
      model: "deepseek-v3-0324",
      messages: messagesWithSystem,
      stream: true,
    })

    // 创建流式响应
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              controller.enqueue(encoder.encode(content))
            }
          }
          controller.close()
        } catch (error) {
          console.error("Stream error:", error)
          controller.error(error)
        }
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    })
  } catch (error) {
    console.error("Chat API error:", error)

    const errorMessage = error instanceof Error ? error.message : "处理请求失败，请稍后重试"

    if (errorMessage.includes("401") || errorMessage.includes("Unauthorized") || errorMessage.includes("Invalid")) {
      return new Response(
        JSON.stringify({
          error: "API Key 无效或已过期，请联系管理员更新密钥。",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}