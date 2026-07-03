/**
 * HTTP Streamable Server Transport
 *
 * 使用 Node.js 原生 http 模块 + MCP SDK StreamableHTTPServerTransport
 * 创建 HTTP 服务器，支持 DeepSeek / 豆包等远程 MCP 客户端接入。
 *
 * 无需 Express 等额外依赖。
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

/**
 * 创建并启动 HTTP MCP 服务器
 *
 * 单个 McpServer + 单个 StreamableHTTPServerTransport 处理所有请求，
 * 由 transport 内部根据 session ID 路由消息。
 */
export async function startHttpServer(
  config: McpConfig,
  client: ReturnType<typeof createClient>
): Promise<http.Server> {
  // 创建唯一的 MCP Server 实例
  const server = new McpServer({
    name: "sulfur-tracker-agent",
    version: "0.1.0",
  })

  // 注册所有工具
  registerGetPrices(server, config, client)
  registerGetInventory(server, config, client)
  registerGetNews(server, config, client)
  registerPredictPrices(server, config, client)
  registerSubscriptionTools(server, config, client)
  registerGenerateReport(server, config, client)
  registerGetTrackerStatus(server, config, client)
  registerQueryKnowledgeGraph(server, config, client)

  // 创建唯一的 transport 实例（stateful 模式，支持会话管理）
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  })

  // 将 server 连接到 transport
  await server.connect(transport)

  const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`)

    if (url.pathname !== "/mcp") {
      res.writeHead(404, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "Not found. MCP endpoint is at /mcp" }))
      return
    }

    try {
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
      resolve(httpServer)
    })
    httpServer.on("error", (err) => {
      console.error("[MCP HTTP] 服务器启动失败:", err)
      reject(err)
    })
  })
}
