/**
 * generate_report MCP 工具
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { McpConfig } from "../config.js"
import type { createClient } from "../client.js"
import { z } from "zod"
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js"
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js"

export function registerGenerateReport(
  server: McpServer,
  config: McpConfig,
  client: ReturnType<typeof createClient>
) {
  server.tool(
    "generate_report",
    `手动触发${config.INDUSTRY_CODE === "sulfur" ? "硫磺" : "行业"}追踪任务并生成报告`,
    {
      subscriptionId: z.string().optional(),
      frequency: z.enum(["hourly", "daily", "weekly"]).optional(),
    },
    async (
      { subscriptionId, frequency },
      _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
    ) => {
      try {
        const result = await client.startTracking({
          subscriptionId,
          frequency,
        })

        if (!result.success || !result.data) {
          return {
            content: [
              { type: "text", text: `触发报告生成失败：${result.error?.message || "未知错误"}` },
            ],
          }
        }

        const data = result.data as Record<string, unknown>
        if (data.totalExecuted !== undefined) {
          return {
            content: [
              { type: "text", text: `报告生成完成：共执行 ${data.totalExecuted} 个订阅，成功 ${data.successCount}，失败 ${data.failedCount}` },
            ],
          }
        }

        return {
          content: [{ type: "text", text: `追踪任务执行完成，状态：${data.status}` }],
        }
      } catch (error) {
        return {
          content: [
            { type: "text", text: `生成报告异常：${error instanceof Error ? error.message : "未知错误"}` },
          ],
        }
      }
    }
  )
}
