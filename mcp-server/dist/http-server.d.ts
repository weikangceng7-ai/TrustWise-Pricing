/**
 * HTTP Streamable Server Transport
 *
 * 使用 Node.js 原生 http 模块 + MCP SDK StreamableHTTPServerTransport
 * 创建 HTTP 服务器，支持 Cherry Studio / DeepSeek / 豆包等远程 MCP 客户端接入。
 *
 * 每个 HTTP 请求创建新的 server + transport 实例，
 * 避免多客户端冲突和 "Already connected" 错误。
 */
import http from "node:http";
import type { McpConfig } from "./config.js";
import type { createClient } from "./client.js";
/**
 * 创建并启动 HTTP MCP 服务器
 *
 * 每个请求创建全新的 server + transport 实例，
 * 确保无状态、无 session 冲突。
 */
export declare function startHttpServer(config: McpConfig, client: ReturnType<typeof createClient>): Promise<http.Server>;
