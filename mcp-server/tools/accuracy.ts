/**
 * get_accuracy_metrics MCP 工具
 *
 * 模型精度评估数据查询，返回 MAPE、MAE、RMSE、R² 等核心指标
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { McpConfig } from "../config.js"
import type { createClient } from "../client.js"
import { z } from "zod"
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js"
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js"

export function registerAccuracyTools(
  server: McpServer,
  config: McpConfig,
  client: ReturnType<typeof createClient>
) {
  server.tool(
    "get_accuracy_metrics",
    `获取${config.INDUSTRY_CODE === "sulfur" ? "硫磺" : "行业"}价格预测模型的精度评估数据，包括 MAPE、MAE、RMSE、R² 等核心指标，以及精度趋势和各企业精度分布`,
    {
      enterpriseCode: z.string().optional().describe("可选，指定企业代码（如 yihua、luxi）筛选精度数据"),
    },
    async (
      { enterpriseCode },
      _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
    ) => {
      try {
        const result = await client.getAccuracyMetrics(enterpriseCode)

        if (!result.success || !result.data) {
          return {
            content: [
              { type: "text", text: `获取精度数据失败：${result.error?.message || "未知错误"}` },
            ],
          }
        }

        const data = result.data as Record<string, unknown>
        const overview = data.overview as Record<string, number> | undefined
        const byEnterprise = data.byEnterprise as Array<Record<string, unknown>> | undefined

        if (!overview) {
          return {
            content: [
              { type: "text", text: "暂无模型精度数据" },
            ],
          }
        }

        const mapeLevel = overview.mape < 3 ? "🟢 优秀" : overview.mape < 5 ? "🟡 良好" : "🔴 需优化"
        const r2Level = overview.r2 > 0.9 ? "🟢 优秀" : overview.r2 > 0.8 ? "🟡 良好" : "🔴 需优化"

        const lines = [
          `## 模型精度评估报告`,
          "",
          `**总预测次数**: ${overview.totalPredictions || "N/A"} 次`,
          "",
          "### 核心指标",
          `- **MAPE**（平均绝对百分比误差）: ${overview.mape || "N/A"}%  ${mapeLevel}`,
          `- **MAE**（平均绝对误差）: ¥${overview.mae || "N/A"} /吨`,
          `- **RMSE**（均方根误差）: ¥${overview.rmse || "N/A"}`,
          `- **R²**（决定系数）: ${overview.r2 || "N/A"}  ${r2Level}`,
          "",
          "> MAPE 越低越好（<3% 优秀，3-5% 良好）；R² 越接近 1 越好（>0.9 优秀）",
        ]

        if (byEnterprise && byEnterprise.length > 0) {
          lines.push("")
          lines.push("### 各企业精度分布")
          for (const e of byEnterprise) {
            const level = (e.mape as number) < 3.5 ? "⭐ 优秀" : (e.mape as number) < 4 ? "✅ 良好" : "⚠️ 合格"
            lines.push(`- **${e.name}** (${e.code}): MAPE ${e.mape}%, MAE ¥${e.mae}, ${e.predictionCount}次预测 ${level}`)
          }
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
        }
      } catch (error) {
        return {
          content: [
            { type: "text", text: `获取精度数据异常：${error instanceof Error ? error.message : "未知错误"}` },
          ],
        }
      }
    }
  )
}
