"use strict";
/**
 * HTTP Streamable Server Transport
 *
 * 使用 Node.js 原生 http 模块 + MCP SDK StreamableHTTPServerTransport
 * 创建 HTTP 服务器，支持 DeepSeek / 豆包等远程 MCP 客户端接入。
 *
 * 无需 Express 等额外依赖。
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startHttpServer = startHttpServer;
const node_http_1 = __importDefault(require("node:http"));
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
// 工具注册
const prices_js_1 = require("./tools/prices.js");
const inventory_js_1 = require("./tools/inventory.js");
const news_js_1 = require("./tools/news.js");
const prediction_js_1 = require("./tools/prediction.js");
const subscriptions_js_1 = require("./tools/subscriptions.js");
const report_js_1 = require("./tools/report.js");
const status_js_1 = require("./tools/status.js");
const knowledge_graph_js_1 = require("./tools/knowledge-graph.js");
/**
 * 创建并启动 HTTP MCP 服务器
 *
 * 单个 McpServer + 单个 StreamableHTTPServerTransport 处理所有请求，
 * 由 transport 内部根据 session ID 路由消息。
 */
async function startHttpServer(config, client) {
    // 创建唯一的 MCP Server 实例
    const server = new mcp_js_1.McpServer({
        name: "sulfur-tracker-agent",
        version: "0.1.0",
    });
    // 注册所有工具
    (0, prices_js_1.registerGetPrices)(server, config, client);
    (0, inventory_js_1.registerGetInventory)(server, config, client);
    (0, news_js_1.registerGetNews)(server, config, client);
    (0, prediction_js_1.registerPredictPrices)(server, config, client);
    (0, subscriptions_js_1.registerSubscriptionTools)(server, config, client);
    (0, report_js_1.registerGenerateReport)(server, config, client);
    (0, status_js_1.registerGetTrackerStatus)(server, config, client);
    (0, knowledge_graph_js_1.registerQueryKnowledgeGraph)(server, config, client);
    // 创建唯一的 transport 实例（stateful 模式，支持会话管理）
    const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
    });
    // 将 server 连接到 transport
    await server.connect(transport);
    const httpServer = node_http_1.default.createServer(async (req, res) => {
        const url = new URL(req.url || "/", `http://${req.headers.host}`);
        if (url.pathname !== "/mcp") {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Not found. MCP endpoint is at /mcp" }));
            return;
        }
        try {
            await transport.handleRequest(req, res);
        }
        catch (error) {
            console.error("[MCP HTTP] Request handling error:", error);
            if (!res.headersSent) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Internal server error" }));
            }
        }
    });
    return new Promise((resolve, reject) => {
        httpServer.listen(config.MCP_PORT, "0.0.0.0", () => {
            console.error(`[MCP HTTP] 服务器已启动，监听端口 ${config.MCP_PORT}`);
            console.error(`[MCP HTTP] MCP 端点: http://0.0.0.0:${config.MCP_PORT}/mcp`);
            resolve(httpServer);
        });
        httpServer.on("error", (err) => {
            console.error("[MCP HTTP] 服务器启动失败:", err);
            reject(err);
        });
    });
}
