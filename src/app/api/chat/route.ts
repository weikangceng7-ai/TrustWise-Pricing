import OpenAI from "openai"
import { generateSystemPromptWithContext } from "@/lib/system-prompt"
import { getPrices, getInventory } from "@/services/prices"

export const maxDuration = 60

// 创建 OpenAI 实例 (使用 qnaigc API)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.qnaigc.com/v1",
})

// 格式化价格数据为文本
function formatPricesData(prices: Awaited<ReturnType<typeof getPrices>>): string {
  if (!prices || prices.length === 0) return "暂无价格数据"

  const headers = "| 日期 | 产品 | 市场 | 规格 | 主流价 | 涨跌 |\n|------|------|------|------|--------|------|\n"
  const rows = prices.slice(0, 10).map(p => {
    const change = p.changeValue ? `${Number(p.changeValue) > 0 ? '+' : ''}${p.changeValue}` : '-'
    return `| ${p.date} | ${p.productName || '-'} | ${p.market || '-'} | ${p.specification || '-'} | ${p.mainPrice || '-'} | ${change} |`
  }).join('\n')

  return headers + rows
}

// 格式化库存数据为文本
function formatInventoryData(inventory: Awaited<ReturnType<typeof getInventory>>): string {
  if (!inventory || inventory.length === 0) return "暂无库存数据"

  const headers = "| 日期 | 库存量(万吨) | 价格(元/吨) |\n|------|-------------|------------|\n"
  const rows = inventory.slice(0, 5).map(i => {
    return `| ${i.date} | ${i.inventory || '-'} | ${i.price || '-'} |`
  }).join('\n')

  return headers + rows
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

    // 获取实时数据
    let pricesContext = ""
    let inventoryContext = ""

    try {
      const [prices, inventory] = await Promise.all([
        getPrices(10),
        getInventory(5),
      ])

      if (prices && prices.length > 0) {
        pricesContext = formatPricesData(prices)
      }

      if (inventory && inventory.length > 0) {
        inventoryContext = formatInventoryData(inventory)
      }
    } catch (dataError) {
      console.error("Failed to fetch context data:", dataError)
      // 即使数据获取失败，也继续处理请求
    }

    // 生成带上下文的系统提示
    const systemPrompt = generateSystemPromptWithContext({
      prices: pricesContext || undefined,
      inventory: inventoryContext || undefined,
      date: new Date().toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      }),
    })

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
      { role: "system" as const, content: systemPrompt },
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