"use strict";
/**
 * MCP Server 入口
 *
 * 支持三种传输模式（由 MCP_TRANSPORT 环境变量控制）：
 * - stdio（默认）：用于 Claude Desktop 等本地客户端
 * - http：用于 DeepSeek / 豆包等远程客户端
 * - both：同时启动两种传输（开发调试用）
 */
Object.defineProperty(exports, "__esModule", { value: true });
const config_js_1 = require("./config.js");
const client_js_1 = require("./client.js");
const stdio_server_js_1 = require("./stdio-server.js");
const http_server_js_1 = require("./http-server.js");
async function main() {
    const config = (0, config_js_1.loadConfig)();
    console.error(`[MCP] 配置加载完成: API_BASE_URL=${config.API_BASE_URL}, INDUSTRY_CODE=${config.INDUSTRY_CODE}, TRANSPORT=${config.MCP_TRANSPORT}, PORT=${config.MCP_PORT}`);
    const client = (0, client_js_1.createClient)(config);
    switch (config.MCP_TRANSPORT) {
        case "http":
            await (0, http_server_js_1.startHttpServer)(config, client);
            break;
        case "both":
            // 同时启动：先起 HTTP，再起 stdio
            await (0, http_server_js_1.startHttpServer)(config, client);
            await (0, stdio_server_js_1.startStdioServer)(config, client);
            break;
        case "stdio":
        default:
            await (0, stdio_server_js_1.startStdioServer)(config, client);
            break;
    }
}
main().catch((err) => {
    console.error("[MCP] 启动失败:", err.message || err);
    process.exit(1);
});
