/**
 * list_commodities + get_commodity_analysis MCP 工具
 *
 * 多品种大宗原料数据查询，支持硫磺、磷矿、钾肥、尿素
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpConfig } from "../config.js";
import type { createClient } from "../client.js";
export declare function registerCommodityTools(server: McpServer, config: McpConfig, client: ReturnType<typeof createClient>): void;
