/**
 * get_news MCP 工具
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { McpConfig } from "../config.js"
import type { createClient } from "../client.js"
import { z } from "zod"
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js"
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js"

export function registerGetNews(
  server: McpServer,
  config: McpConfig,
  client: ReturnType<typeof createClient>
) {
  server.tool(
    "get_news",
    `当用户询问市场新闻、行业动态、最新消息、突发事件、政策影响时使用。获取${config.INDUSTRY_CODE === "sulfur" ? "硫磺" : "行业"}市场新闻和行业动态，标注情绪倾向（利好/利空/中性）`,
    {
      limit: z.number().optional().describe("返回条数，默认10条"),
      category: z.string().optional().describe("新闻分类：market（市场动态）、policy（政策）、supply（供应）、demand（需求）"),
    },
    async (
      { limit, category },
      _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
    ) => {
      const limitCount = limit || 10
      try {
        const result = await client.getNews(limitCount, category)

        if (!result.success || !result.data) {
          return {
            content: [
              { type: "text", text: `获取新闻数据失败：${result.error?.message || "未知错误"}` },
            ],
          }
        }

        const news = (result.data as any)?.data?.news || (result.data as any)?.news || []
        if (!news || news.length === 0) {
          return {
            content: [
              { type: "text", text: "暂无相关新闻" },
            ],
          }
        }

        const lines = [`最近${news.length}条市场动态：`, ""]
        for (const item of news.slice(0, 10)) {
          const sentimentIcon = item.sentiment === "positive" ? "[看涨]" : item.sentiment === "negative" ? "[看跌]" : "[中性]"
          lines.push(`${sentimentIcon} **${item.title}** — ${item.source || "未知来源"}`)
          if (item.date) {
            lines.push(`   发布时间：${item.date}`)
          }
          lines.push("")
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
        }
      } catch (error) {
        return {
          content: [
            { type: "text", text: `获取新闻数据异常：${error instanceof Error ? error.message : "未知错误"}` },
          ],
        }
      }
    }
  )
}
