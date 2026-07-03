"use strict";
/**
 * Stdio Server Transport
 *
 * 用于 Claude Desktop 等本地客户端，通过 stdin/stdout 通信。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startStdioServer = startStdioServer;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
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
 * 创建并启动 Stdio MCP 服务器
 */
async function startStdioServer(config, client) {
    const server = new mcp_js_1.McpServer({
        name: "sulfur-tracker-agent",
        version: "0.1.0",
    });
    (0, prices_js_1.registerGetPrices)(server, config, client);
    (0, inventory_js_1.registerGetInventory)(server, config, client);
    (0, news_js_1.registerGetNews)(server, config, client);
    (0, prediction_js_1.registerPredictPrices)(server, config, client);
    (0, subscriptions_js_1.registerSubscriptionTools)(server, config, client);
    (0, report_js_1.registerGenerateReport)(server, config, client);
    (0, status_js_1.registerGetTrackerStatus)(server, config, client);
    (0, knowledge_graph_js_1.registerQueryKnowledgeGraph)(server, config, client);
    console.error("[MCP] 所有工具注册完成，开始启动 stdio transport...");
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("[MCP] stdio 服务器已启动，等待客户端连接...");
}
