import { OpenRouter } from "@openrouter/sdk"
import { SYSTEM_PROMPT } from "@/lib/system-prompt"

export const maxDuration = 60

// 创建 OpenRouter 实例
function getOpenRouter() {
  return new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY || "",
  })
}

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

    // 使用 OpenRouter SDK 调用模型
    const openrouter = getOpenRouter()
    const stream = await openrouter.chat.send({
      chatGenerationParams: {
        model: "stepfun/step-3.5-flash:free",
        messages: messagesWithSystem,
        stream: true,
      },
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