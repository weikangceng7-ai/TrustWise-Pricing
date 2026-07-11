/**
 * HTTP Streamable Server Transport
 *
 * 使用 Node.js 原生 http 模块 + MCP SDK StreamableHTTPServerTransport
 * 创建 HTTP 服务器，支持 Cherry Studio / DeepSeek / 豆包等远程 MCP 客户端接入。
 *
 * 每个 HTTP 请求创建新的 server + transport 实例，
 * 避免多客户端冲突和 "Already connected" 错误。
 */

import http from "node:http"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import type { McpConfig } from "./config.js"
import type { createClient } from "./client.js"

// 工具注册
import { registerGetPrices } from "./tools/prices.js"
import { registerGetInventory } from "./tools/inventory.js"
import { registerGetNews } from "./tools/news.js"
import { registerPredictPrices } from "./tools/prediction.js"
import { registerSubscriptionTools } from "./tools/subscriptions.js"
import { registerGenerateReport } from "./tools/report.js"
import { registerGetTrackerStatus } from "./tools/status.js"
import { registerQueryKnowledgeGraph } from "./tools/knowledge-graph.js"
import { registerCommodityTools } from "./tools/commodities.js"
import { registerAccuracyTools } from "./tools/accuracy.js"
import { registerSuccessCasesTools } from "./tools/success-cases.js"
import { registerTransformerTools } from "./tools/transformer.js"
import { registerCrossCommodityTools } from "./tools/cross-commodity.js"

/**
 * 创建并启动 HTTP MCP 服务器
 *
 * 每个请求创建全新的 server + transport 实例，
 * 确保无状态、无 session 冲突。
 */
export async function startHttpServer(
  config: McpConfig,
  client: ReturnType<typeof createClient>
): Promise<http.Server> {
  const httpServer = http.createServer(async (req, res) => {
    // CORS 头：允许浏览器、MCP 浏览器插件等跨域访问
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, Cache-Control, X-Session-Id")
    res.setHeader("Access-Control-Expose-Headers", "Content-Type")

    // 处理 OPTIONS 预检请求
    if (req.method === "OPTIONS") {
      res.writeHead(204)
      res.end()
      return
    }

    const url = new URL(req.url || "/", `http://${req.headers.host}`)

    // 健康检查
    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ status: "ok", version: "0.3.0" }))
      return
    }

    if (url.pathname !== "/mcp") {
      res.writeHead(404, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "Not found. MCP endpoint is at /mcp" }))
      return
    }

    try {
      // 每次请求创建新的 server + transport（无状态模式）
      const server = new McpServer({
        name: "sulfur-tracker-agent",
        version: "0.3.0",
      })

      registerGetPrices(server, config, client)
      registerGetInventory(server, config, client)
      registerGetNews(server, config, client)
      registerPredictPrices(server, config, client)
      registerSubscriptionTools(server, config, client)
      registerGenerateReport(server, config, client)
      registerGetTrackerStatus(server, config, client)
      registerQueryKnowledgeGraph(server, config, client)
      // v0.3 新增工具
      registerCommodityTools(server, config, client)
      registerAccuracyTools(server, config, client)
      registerSuccessCasesTools(server, config, client)
      registerTransformerTools(server, config, client)
      registerCrossCommodityTools(server, config, client)

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      })

      await server.connect(transport)
      await transport.handleRequest(req, res)
    } catch (error) {
      console.error("[MCP HTTP] Request handling error:", error)
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: "Internal server error" }))
      }
    }
  })

  return new Promise<http.Server>((resolve, reject) => {
    httpServer.listen(config.MCP_PORT, "0.0.0.0", () => {
      console.error(`[MCP HTTP] 服务器已启动，监听端口 ${config.MCP_PORT}`)
      console.error(`[MCP HTTP] MCP 端点: http://0.0.0.0:${config.MCP_PORT}/mcp`)
      console.error(`[MCP HTTP] 使用无状态模式，支持多客户端接入`)
      resolve(httpServer)
    })
    httpServer.on("error", (err) => {
      console.error("[MCP HTTP] 服务器启动失败:", err)
      reject(err)
    })
  })
}
