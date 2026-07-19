/**
 * predict_with_transformer + get_combined_prediction MCP 工具
 *
 * Transformer 深度学习时间序列预测 + ARIMA+XGBoost+Transformer 组合预测
 * PatchTST 模型提供基于注意力机制的高精度价格预测
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { McpConfig } from "../config.js"
import type { createClient } from "../client.js"
import { z } from "zod"
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js"
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js"

const COMMODITY_CODES = ["sulfur", "phosphate", "potash", "urea"] as const

export function registerTransformerTools(
  server: McpServer,
  config: McpConfig,
  client: ReturnType<typeof createClient>
) {
  // ========== predict_with_transformer ==========
  server.tool(
    "predict_with_transformer",
    `当用户询问AI预测、深度学习预测、高级预测、Transformer预测、用最新技术预测价格时使用。使用 Transformer 深度学习模型（PatchTST）预测${config.INDUSTRY_CODE === "sulfur" ? "硫磺" : "大宗原料"}未来价格走势，擅长捕捉长期依赖和复杂模式。如需传统统计模型预测用 predict_prices，综合预测用 get_combined_prediction`,
    {
      days: z.number().optional().describe("预测天数，默认 7 天"),
      commodityCode: z.enum(COMMODITY_CODES).optional().describe("品种代码，默认使用环境变量中的 INDUSTRY_CODE"),
    },
    async (
      { days, commodityCode },
      _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
    ) => {
      const daysCount = days || 7
      const code = commodityCode || config.INDUSTRY_CODE
      try {
        const result = await client.predictWithTransformer(daysCount, code)

        if (!result.success || !result.data) {
          return {
            content: [
              { type: "text", text: `Transformer 预测失败：${result.error?.message || "未知错误"}。请确认 Python 预测服务是否已启动并加载了 PatchTST 模型。` },
            ],
          }
        }

        const data = result.data as Record<string, unknown>
        const predictions = data.predictions as Array<Record<string, unknown>> | undefined
        const model = data.model as string || "patchtst"
        const metrics = data.metrics as Record<string, number> | undefined

        if (!predictions || predictions.length === 0) {
          return {
            content: [
              { type: "text", text: "Transformer 模型暂无预测结果，模型可能正在预热中。" },
            ],
          }
        }

        const lines = [
          `## 🤖 Transformer 模型预测 (${model})`,
          `预测品种: ${code} | 预测天数: ${daysCount}`,
          "",
          "| 日期 | 预测价格 | 置信区间 | 置信度 |",
          "|:-----|:--------:|:--------:|:------:|",
        ]
        for (const p of predictions) {
          const price = p.predicted_price as number
          const lower = p.lower_bound as number
          const upper = p.upper_bound as number
          const confidence = ((p.confidence as number) || 0.9) * 100
          lines.push(`| ${p.date} | ¥${price.toFixed(0)} | ¥${lower.toFixed(0)}-¥${upper.toFixed(0)} | ${confidence.toFixed(0)}% |`)
        }

        if (metrics?.mape != null) {
          lines.push("")
          lines.push(`**模型精度**: MAPE ${metrics.mape}%, MAE ¥${metrics.mae || "N/A"}, RMSE ¥${metrics.rmse || "N/A"}`)
        }

        lines.push("")
        lines.push("> Transformer 模型擅长捕捉价格的长期依赖和非线性模式，建议结合 ARIMA+XGBoost 结果综合判断。使用 `get_combined_prediction` 工具可获得两个模型的加权融合预测。")

        return {
          content: [{ type: "text", text: lines.join("\n") }],
        }
      } catch (error) {
        return {
          content: [
            { type: "text", text: `Transformer 预测异常：${error instanceof Error ? error.message : "未知错误"}` },
          ],
        }
      }
    }
  )

  // ========== get_combined_prediction ==========
  server.tool(
    "get_combined_prediction",
    `当用户询问综合预测、融合预测、多模型预测、哪个模型更准、综合判断未来价格时使用。获取 ARIMA+XGBoost 与 Transformer 模型的加权融合预测结果（权重 60%:40%），比单一模型更稳健`,
    {
      days: z.number().optional().describe("预测天数，默认 7 天"),
      commodityCode: z.enum(COMMODITY_CODES).optional().describe("品种代码，默认使用环境变量中的 INDUSTRY_CODE"),
    },
    async (
      { days, commodityCode },
      _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
    ) => {
      const daysCount = days || 7
      const code = commodityCode || config.INDUSTRY_CODE
      try {
        const result = await client.getCombinedPrediction(daysCount, code)

        if (!result.success || !result.data) {
          return {
            content: [
              { type: "text", text: `组合预测失败：${result.error?.message || "未知错误"}。两个预测服务可能均不可用。` },
            ],
          }
        }

        const data = result.data as Record<string, unknown>
        const predictions = data.predictions as Array<Record<string, unknown>> | undefined

        if (!predictions || predictions.length === 0) {
          return {
            content: [
              { type: "text", text: "暂无组合预测数据，请稍后重试。" },
            ],
          }
        }

        const prices = predictions.map((p) => p.combined_price as number)
        const minPrice = Math.min(...prices).toFixed(0)
        const maxPrice = Math.max(...prices).toFixed(0)
        const avgPrice = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(0)
        const firstPrice = prices[0].toFixed(0)
        const lastPrice = prices[prices.length - 1].toFixed(0)
        const trend = parseFloat(lastPrice) >= parseFloat(firstPrice) ? "📈 上涨" : "📉 下跌"

        const lines = [
          `## 🔬 双模型融合预测报告`,
          `预测品种: ${code} | 预测天数: ${daysCount}`,
          `模型组合: ARIMA+XGBoost (60%) + Transformer/PatchTST (40%)`,
          "",
          `**价格区间**: ¥${minPrice} ~ ¥${maxPrice} /吨`,
          `**平均预测**: ¥${avgPrice} /吨`,
          `**趋势**: ${trend}`,
          "",
          "| 日期 | 融合价格 | ARIMA+XGB | Transformer | 置信区间 |",
          "|:-----|:--------:|:---------:|:-----------:|:--------:|",
        ]
        for (const p of predictions) {
          lines.push(
            `| ${p.date} | ¥${(p.combined_price as number).toFixed(0)} | ¥${(p.arima_xgb_price as number).toFixed(0)} | ¥${(p.transformer_price as number).toFixed(0)} | ¥${(p.lower_bound as number).toFixed(0)}-¥${(p.upper_bound as number).toFixed(0)} |`
          )
        }

        lines.push("")
        lines.push("> 融合预测综合了两个模型的优势：ARIMA+XGBoost 擅长线性趋势，Transformer 擅长捕捉非线性模式。建议将此融合结果作为采购决策的核心参考依据。")

        return {
          content: [{ type: "text", text: lines.join("\n") }],
        }
      } catch (error) {
        return {
          content: [
            { type: "text", text: `组合预测异常：${error instanceof Error ? error.message : "未知错误"}` },
          ],
        }
      }
    }
  )
}
