// src/app/api/v1/chat/route.ts
import { NextRequest } from "next/server"
import { withApiAuth, apiSuccessResponse, apiErrorResponse } from "@/lib/api-middleware"
import OpenAI from "openai"
import { generateSystemPromptWithContext } from "@/lib/system-prompt"
import { getPrices, getInventory } from "@/services/prices"
import { searchKnowledge, formatKnowledgeContext } from "@/services/rag-search"
import type { ApiKey, ApiQuota } from "@/db/schema"

export const maxDuration = 60

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.qnaigc.com/v1",
})

/**
 * POST /api/v1/chat
 * AI 聊天问答
 *
 * Body:
 * - message: 用户消息
 * - conversationId: 会话 ID (可选，用于多轮对话)
 * - history: 历史消息 (可选，多轮对话时提供)
 */
export async function POST(request: NextRequest) {
  return withApiAuth(request, async (apiKey: ApiKey, quota: ApiQuota) => {
    try {
      const body = await request.json()
      const { message, history } = body

      if (!message) {
        return apiErrorResponse(
          "INVALID_REQUEST",
          "请提供消息内容",
          400,
          quota
        )
      }

      // 获取上下文数据（价格、库存、知识库）
      const [prices, inventory, ragResults] = await Promise.all([
        getPrices(10),
        getInventory(5),
        searchKnowledge(message, 3).catch(() => []),
      ])

      const knowledgeContext = ragResults.length > 0
        ? formatKnowledgeContext(ragResults)
        : undefined

      const systemPrompt = generateSystemPromptWithContext({
        prices: prices && prices.length > 0 ? formatPrices(prices) : undefined,
        inventory: inventory && inventory.length > 0 ? formatInventory(inventory) : undefined,
        knowledgeContext,
        date: new Date().toLocaleDateString("zh-CN"),
      })

      // 构建消息
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
      ]

      // 添加历史消息
      if (history && Array.isArray(history)) {
        for (const msg of history) {
          messages.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content,
          })
        }
      }

      // 添加当前消息
      messages.push({ role: "user", content: message })

      const completion = await openai.chat.completions.create({
        model: "deepseek-v3-0324",
        messages,
        stream: false,
      })

      const responseContent = completion.choices[0]?.message?.content || "抱歉，我暂时无法回答这个问题。"

      return apiSuccessResponse({
        message: responseContent,
        conversationId: body.conversationId || null,
      }, quota)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "聊天服务调用失败"

      if (errorMsg.includes("401") || errorMsg.includes("Unauthorized")) {
        return apiErrorResponse(
          "INTERNAL_ERROR",
          "AI 服务配置错误",
          500,
          quota
        )
      }

      return apiErrorResponse(
        "INTERNAL_ERROR",
        errorMsg,
        500,
        quota
      )
    }
  })
}

function formatPrices(prices: Awaited<ReturnType<typeof getPrices>>): string {
  if (!prices || prices.length === 0) return ""
  const headers = "| 日期 | 市场 | 规格 | 主流价 | 涨跌 |\n|------|------|------|--------|------|\n"
  const rows = prices.slice(0, 5).map(p => {
    const change = p.changeValue ? `${Number(p.changeValue) > 0 ? "+" : ""}${p.changeValue}` : "-"
    return `| ${p.date} | ${p.market || "-"} | ${p.specification || "-"} | ${p.mainPrice || "-"} | ${change} |`
  }).join("\n")
  return headers + rows
}

function formatInventory(inventory: Awaited<ReturnType<typeof getInventory>>): string {
  if (!inventory || inventory.length === 0) return ""
  const headers = "| 日期 | 库存(万吨) | 价格(元/吨) |\n|------|-----------|------------|\n"
  const rows = inventory.slice(0, 3).map(i => {
    return `| ${i.date} | ${i.inventory || "-"} | ${i.price || "-"} |`
  }).join("\n")
  return headers + rows
}