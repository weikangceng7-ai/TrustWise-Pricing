/**
 * HTTP Streamable Server Transport
 *
 * 使用 Node.js 原生 http 模块 + MCP SDK StreamableHTTPServerTransport
 * 创建 HTTP 服务器，支持 DeepSeek / 豆包等远程 MCP 客户端接入。
 *
 * 无需 Express 等额外依赖。
 */
import http from "node:http";
import type { McpConfig } from "./config.js";
import type { createClient } from "./client.js";
/**
 * 创建并启动 HTTP MCP 服务器
 *
 * 单个 McpServer + 单个 StreamableHTTPServerTransport 处理所有请求，
 * 由 transport 内部根据 session ID 路由消息。
 */
export declare function startHttpServer(config: McpConfig, client: ReturnType<typeof createClient>): Promise<http.Server>;
