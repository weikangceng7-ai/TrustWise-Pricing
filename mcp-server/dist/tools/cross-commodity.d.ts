/**
 * cross_commodity_analysis MCP 工具
 *
 * 跨品种对比分析，返回价格对比、相关性矩阵和协同采购建议
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpConfig } from "../config.js";
import type { createClient } from "../client.js";
export declare function registerCrossCommodityTools(server: McpServer, _config: McpConfig, client: ReturnType<typeof createClient>): void;
