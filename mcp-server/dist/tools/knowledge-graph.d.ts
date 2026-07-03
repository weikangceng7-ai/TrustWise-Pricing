/**
 * query_knowledge_graph MCP 工具
 *
 * 根据用户自然语言问题，查询知识图谱返回价格影响因子、供应链影响链、洞察与采购建议。
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpConfig } from "../config.js";
import type { createClient } from "../client.js";
export declare function registerQueryKnowledgeGraph(server: McpServer, config: McpConfig, client: ReturnType<typeof createClient>): void;
