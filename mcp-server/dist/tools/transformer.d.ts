/**
 * predict_with_transformer + get_combined_prediction MCP 工具
 *
 * Transformer 深度学习时间序列预测 + ARIMA+XGBoost+Transformer 组合预测
 * PatchTST 模型提供基于注意力机制的高精度价格预测
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpConfig } from "../config.js";
import type { createClient } from "../client.js";
export declare function registerTransformerTools(server: McpServer, config: McpConfig, client: ReturnType<typeof createClient>): void;
