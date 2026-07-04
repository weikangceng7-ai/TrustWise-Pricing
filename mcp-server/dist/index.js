/**
 * MCP Server 入口
 *
 * 支持三种传输模式（由 MCP_TRANSPORT 环境变量控制）：
 * - stdio（默认）：用于 Claude Desktop 等本地客户端
 * - http：用于 DeepSeek / 豆包等远程客户端
 * - both：同时启动两种传输（开发调试用）
 */
import { loadConfig } from "./config.js";
import { createClient } from "./client.js";
import { startStdioServer } from "./stdio-server.js";
import { startHttpServer } from "./http-server.js";
async function main() {
    const config = loadConfig();
    console.error(`[MCP] 配置加载完成: API_BASE_URL=${config.API_BASE_URL}, INDUSTRY_CODE=${config.INDUSTRY_CODE}, TRANSPORT=${config.MCP_TRANSPORT}, PORT=${config.MCP_PORT}`);
    const client = createClient(config);
    switch (config.MCP_TRANSPORT) {
        case "http":
            await startHttpServer(config, client);
            break;
        case "both":
            // 同时启动：先起 HTTP，再起 stdio
            await startHttpServer(config, client);
            await startStdioServer(config, client);
            break;
        case "stdio":
        default:
            await startStdioServer(config, client);
            break;
    }
}
main().catch((err) => {
    console.error("[MCP] 启动失败:", err.message || err);
    process.exit(1);
});
