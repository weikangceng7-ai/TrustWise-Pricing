/**
 * Stdio Server Transport
 *
 * 用于 Claude Desktop 等本地客户端，通过 stdin/stdout 通信。
 */
import type { McpConfig } from "./config.js";
import type { createClient } from "./client.js";
/**
 * 创建并启动 Stdio MCP 服务器
 */
export declare function startStdioServer(config: McpConfig, client: ReturnType<typeof createClient>): Promise<void>;
