/**
 * get_accuracy_metrics MCP 工具
 *
 * 模型精度评估数据查询，返回 MAPE、MAE、RMSE、R² 等核心指标
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpConfig } from "../config.js";
import type { createClient } from "../client.js";
export declare function registerAccuracyTools(server: McpServer, config: McpConfig, client: ReturnType<typeof createClient>): void;
