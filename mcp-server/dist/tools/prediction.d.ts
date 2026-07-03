/**
 * predict_prices MCP 工具
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpConfig } from "../config.js";
import type { createClient } from "../client.js";
export declare function registerPredictPrices(server: McpServer, config: McpConfig, client: ReturnType<typeof createClient>): void;
