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
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
// 工具注册
import { registerGetPrices } from "./tools/prices.js";
import { registerGetInventory } from "./tools/inventory.js";
import { registerGetNews } from "./tools/news.js";
import { registerPredictPrices } from "./tools/prediction.js";
import { registerSubscriptionTools } from "./tools/subscriptions.js";
import { registerGenerateReport } from "./tools/report.js";
import { registerGetTrackerStatus } from "./tools/status.js";
import { registerQueryKnowledgeGraph } from "./tools/knowledge-graph.js";
/**
 * 创建并启动 HTTP MCP 服务器
 *
 * 每个请求创建全新的 server + transport 实例，
 * 确保无状态、无 session 冲突。
 */
export async function startHttpServer(config, client) {
    const httpServer = http.createServer(async (req, res) => {
        const url = new URL(req.url || "/", `http://${req.headers.host}`);
        // 健康检查
        if (url.pathname === "/health") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "ok", version: "0.2.0" }));
            return;
        }
        if (url.pathname !== "/mcp") {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Not found. MCP endpoint is at /mcp" }));
            return;
        }
        try {
            // 每次请求创建新的 server + transport（无状态模式）
            const server = new McpServer({
                name: "sulfur-tracker-agent",
                version: "0.2.0",
            });
            registerGetPrices(server, config, client);
            registerGetInventory(server, config, client);
            registerGetNews(server, config, client);
            registerPredictPrices(server, config, client);
            registerSubscriptionTools(server, config, client);
            registerGenerateReport(server, config, client);
            registerGetTrackerStatus(server, config, client);
            registerQueryKnowledgeGraph(server, config, client);
            const transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: undefined,
            });
            await server.connect(transport);
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
            console.error(`[MCP HTTP] 使用无状态模式，支持多客户端接入`);
            resolve(httpServer);
        });
        httpServer.on("error", (err) => {
            console.error("[MCP HTTP] 服务器启动失败:", err);
            reject(err);
        });
    });
}
