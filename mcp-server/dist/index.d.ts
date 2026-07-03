/**
 * MCP Server 入口
 *
 * 支持三种传输模式（由 MCP_TRANSPORT 环境变量控制）：
 * - stdio（默认）：用于 Claude Desktop 等本地客户端
 * - http：用于 DeepSeek / 豆包等远程客户端
 * - both：同时启动两种传输（开发调试用）
 */
export {};
