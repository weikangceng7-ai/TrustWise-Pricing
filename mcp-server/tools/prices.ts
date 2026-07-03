/**
 * get_prices MCP 工具
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { McpConfig } from "../config.js"
import type { createClient } from "../client.js"
import { z } from "zod"
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js"
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js"

export function registerGetPrices(
  server: McpServer,
  config: McpConfig,
  client: ReturnType<typeof createClient>
) {
  server.tool(
    "get_prices",
    `获取${config.INDUSTRY_CODE === "sulfur" ? "硫磺" : "当前行业"}价格数据，包括近N天的价格走势和变化幅度`,
    {
      days: z.number().optional(),
      region: z.string().optional(),
      market: z.string().optional(),
    },
    async (
      { days, region, market },
      _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
    ) => {
      const daysCount = days || 7
      try {
        const result = await client.getPrices(daysCount, region, market)

        if (!result.success || !result.data) {
          return {
            content: [
              { type: "text", text: `获取价格数据失败：${result.error?.message || "未知错误"}` },
            ],
          }
        }

        const prices = (result.data as any)?.data?.prices || (result.data as any)?.prices || []
        if (!prices || prices.length === 0) {
          return {
            content: [
              { type: "text", text: `最近${daysCount}天暂无价格数据` },
            ],
          }
        }

        const latest = prices[0]
        const currentPrice = parseFloat(latest.mainPrice || latest.price || "0")
        let changeInfo = ""
        if (prices.length >= 2) {
          const prev = prices[1]
          const prevPrice = parseFloat(prev.mainPrice || prev.price || "0")
          if (prevPrice > 0) {
            const change = ((currentPrice - prevPrice) / prevPrice * 100).toFixed(1)
            changeInfo = `较上一周期${change.startsWith("-") ? "下降" : "上涨"}${Math.abs(parseFloat(change))}%`
          }
        }

        const summary = `当前${config.INDUSTRY_CODE === "sulfur" ? "硫磺" : "行业"}价格为 ${currentPrice} 元/吨，${changeInfo}。\n\n数据明细：\n\`\`\`json\n${JSON.stringify(prices.slice(0, 10), null, 2)}\n\`\`\``

        return {
          content: [{ type: "text", text: summary }],
        }
      } catch (error) {
        return {
          content: [
            { type: "text", text: `获取价格数据异常：${error instanceof Error ? error.message : "未知错误"}` },
          ],
        }
      }
    }
  )
}
