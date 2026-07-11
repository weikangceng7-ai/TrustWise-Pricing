/**
 * Stdio Server Transport
 *
 * 用于 Claude Desktop 等本地客户端，通过 stdin/stdout 通信。
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// 工具注册
import { registerGetPrices } from "./tools/prices.js";
import { registerGetInventory } from "./tools/inventory.js";
import { registerGetNews } from "./tools/news.js";
import { registerPredictPrices } from "./tools/prediction.js";
import { registerSubscriptionTools } from "./tools/subscriptions.js";
import { registerGenerateReport } from "./tools/report.js";
import { registerGetTrackerStatus } from "./tools/status.js";
import { registerQueryKnowledgeGraph } from "./tools/knowledge-graph.js";
import { registerCommodityTools } from "./tools/commodities.js";
import { registerAccuracyTools } from "./tools/accuracy.js";
import { registerSuccessCasesTools } from "./tools/success-cases.js";
import { registerTransformerTools } from "./tools/transformer.js";
import { registerCrossCommodityTools } from "./tools/cross-commodity.js";
/**
 * 创建并启动 Stdio MCP 服务器
 */
export async function startStdioServer(config, client) {
    const server = new McpServer({
        name: "sulfur-tracker-agent",
        version: "0.3.0",
    });
    registerGetPrices(server, config, client);
    registerGetInventory(server, config, client);
    registerGetNews(server, config, client);
    registerPredictPrices(server, config, client);
    registerSubscriptionTools(server, config, client);
    registerGenerateReport(server, config, client);
    registerGetTrackerStatus(server, config, client);
    registerQueryKnowledgeGraph(server, config, client);
    // v0.3 新增工具
    registerCommodityTools(server, config, client);
    registerAccuracyTools(server, config, client);
    registerSuccessCasesTools(server, config, client);
    registerTransformerTools(server, config, client);
    registerCrossCommodityTools(server, config, client);
    console.error("[MCP] 所有工具注册完成，开始启动 stdio transport...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[MCP] stdio 服务器已启动，等待客户端连接...");
}
