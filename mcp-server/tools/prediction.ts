/**
 * predict_prices MCP 工具
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { McpConfig } from "../config.js"
import type { createClient } from "../client.js"
import { z } from "zod"
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js"
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js"

export function registerPredictPrices(
  server: McpServer,
  config: McpConfig,
  client: ReturnType<typeof createClient>
) {
  server.tool(
    "predict_prices",
    `预测${config.INDUSTRY_CODE === "sulfur" ? "硫磺" : "行业"}未来价格走势，基于 ARIMA + XGBoost 混合模型`,
    {
      days: z.number().optional(),
    },
    async (
      { days },
      _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
    ) => {
      const daysCount = days || 7
      try {
        const result = await client.predictPrices(daysCount)

        if (!result.success || !result.data) {
          return {
            content: [
              { type: "text", text: `价格预测失败：${result.error?.message || "未知错误"}` },
            ],
          }
        }

        const data = result.data as Record<string, unknown>
        const predictions = data.predictions as Array<Record<string, unknown>> | undefined
        const currentPrice = data.current_price as number
        const trend = data.trend as string
        const confidence = data.confidence as string

        if (!predictions || predictions.length === 0) {
          return {
            content: [
              { type: "text", text: "暂无预测数据，请稍后重试" },
            ],
          }
        }

        const prices = predictions.map((p) => p.predicted_price as number)
        const minPrice = Math.min(...prices).toFixed(0)
        const maxPrice = Math.max(...prices).toFixed(0)
        const avgPrice = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(0)

        const summary = `未来${daysCount}天${config.INDUSTRY_CODE === "sulfur" ? "硫磺" : "行业"}价格预测：\n` +
          `当前价格：${currentPrice} 元/吨\n` +
          `预测趋势：${trend}\n` +
          `置信度：${confidence}\n` +
          `预计价格区间：${minPrice} ~ ${maxPrice} 元/吨\n` +
          `平均预测价格：${avgPrice} 元/吨`

        return {
          content: [{ type: "text", text: summary }],
        }
      } catch (error) {
        return {
          content: [
            { type: "text", text: `预测数据异常：${error instanceof Error ? error.message : "未知错误"}` },
          ],
        }
      }
    }
  )
}
