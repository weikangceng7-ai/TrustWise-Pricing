/**
 * get_success_cases MCP 工具
 *
 * 查询客户成功案例，展示 SulfurAI 为企业带来的可量化价值和实际成效
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpConfig } from "../config.js";
import type { createClient } from "../client.js";
export declare function registerSuccessCasesTools(server: McpServer, _config: McpConfig, client: ReturnType<typeof createClient>): void;
