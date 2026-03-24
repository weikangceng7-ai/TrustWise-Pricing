import OpenAI from "openai"
import { generateSystemPromptWithContext } from "@/lib/system-prompt"
import { getPrices, getInventory } from "@/services/prices"

export const maxDuration = 60

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.qnaigc.com/v1",
})

interface TextContent {
  type: "text"
  text: string
}

interface ImageContent {
  type: "image_url"
  imageUrl: {
    url: string
  }
}

type MessageContent = string | (TextContent | ImageContent)[]

interface ChatMessage {
  role: string
  content: MessageContent
}

// 检测消息中是否包含图片
function hasImageInMessages(messages: ChatMessage[]): boolean {
  return messages.some((msg) => {
    if (Array.isArray(msg.content)) {
      return msg.content.some((item) => item.type === "image_url")
    }
    return false
  })
}

// 生成图片分析专用系统提示
function generateImageAnalysisPrompt(): string {
  return `你是一个专业的硫磺采购决策助手，具备强大的图像分析能力。当用户上传图片时，请仔细分析图片内容。

## 图片分析指南

当用户上传图片时，请按以下步骤进行分析：

### 1. 图片内容识别
- 准确识别图片中的文字、数字、图表、表格等关键信息
- 如果是数据图表，请提取具体数值和趋势
- 如果是文档或报告，请总结关键内容
- 如果是产品图片，请描述产品特征

### 2. 硫磺行业相关分析
如果图片与硫磺采购、价格、库存相关，请：
- 分析价格走势和波动原因
- 评估库存水平和供需关系
- 提供采购建议和风险提示
- 对比历史数据和市场行情

### 3. 回答要求
- 直接回答用户的问题，不要回避
- 如果图片内容不清晰，请诚实说明
- 提供具体、可操作的建议
- 使用清晰的格式组织回答（表格、列表等）

### 4. 输出格式
- 使用 Markdown 格式
- 重要数据用**粗体**标注
- 使用表格展示对比数据
- 使用列表展示要点

请用中文回答，保持专业、准确、实用。`
}

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
    const { messages } = await req.json() as { messages: ChatMessage[] }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "请提供有效的消息" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 检测是否包含图片
    const containsImage = hasImageInMessages(messages)

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
    }

    // 根据是否有图片选择系统提示和模型
    let systemPrompt: string
    let model: string

    if (containsImage) {
      // 图片分析模式：使用支持视觉的模型
      systemPrompt = generateImageAnalysisPrompt()
      // 尝试使用 gpt-4o-mini (支持视觉且更可能可用)
      model = "gpt-4o-mini"
    } else {
      // 普通对话模式
      systemPrompt = generateSystemPromptWithContext({
        prices: pricesContext || undefined,
        inventory: inventoryContext || undefined,
        date: new Date().toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long'
        }),
      })
      model = "deepseek-v3-0324"
    }

    // 转换消息格式，支持图片
    const formattedMessages = messages.map((msg) => {
      const role = msg.role === "agent" ? "assistant" : msg.role as "user" | "assistant" | "system"
      
      // 处理图片消息
      if (Array.isArray(msg.content)) {
        const content = msg.content.map((item) => {
          if (item.type === "image_url") {
            return {
              type: "image_url" as const,
              image_url: {
                url: item.imageUrl.url,
              },
            }
          }
          return item
        })
        return { role, content }
      }
      
      return { role, content: msg.content }
    })

    const messagesWithSystem = [
      { role: "system" as const, content: systemPrompt },
      ...formattedMessages,
    ]

    const stream = await openai.chat.completions.create({
      model,
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