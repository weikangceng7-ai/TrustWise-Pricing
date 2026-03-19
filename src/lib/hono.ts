import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { getPrices, getPriceSummary, getInventory, getInventorySummary } from "@/services/prices"
import { getReports } from "@/services/reports"
import { getChatResponse, type ChatRequest, type ChatResponse } from "@/services/chat"
import { chatRoutes } from "@/routes/chat"

// 创建 Hono 应用实例
const app = new Hono()

// 中间件
app.use("*", logger())
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
)

// ==================== 价格接口 ====================

/**
 * GET /api/prices
 * 获取所有硫磺价格数据，按日期降序排列
 */
app.get("/prices", async (c) => {
  try {
    const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!) : undefined
    const prices = await getPrices(limit)
    return c.json({
      success: true,
      data: prices,
      total: prices.length,
    })
  } catch (error) {
    console.error("获取价格数据失败:", error)
    return c.json(
      {
        success: false,
        error: "获取价格数据失败",
      },
      500
    )
  }
})

/**
 * GET /api/prices/summary
 * 获取价格数据统计摘要
 */
app.get("/prices/summary", async (c) => {
  try {
    const summary = await getPriceSummary()
    return c.json({
      success: true,
      data: summary,
    })
  } catch (error) {
    console.error("获取价格摘要失败:", error)
    return c.json(
      {
        success: false,
        error: "获取价格摘要失败",
      },
      500
    )
  }
})

/**
 * GET /api/inventory
 * 获取港口库存数据
 */
app.get("/inventory", async (c) => {
  try {
    const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!) : undefined
    const inventory = await getInventory(limit)
    return c.json({
      success: true,
      data: inventory,
      total: inventory.length,
    })
  } catch (error) {
    console.error("获取库存数据失败:", error)
    return c.json(
      {
        success: false,
        error: "获取库存数据失败",
      },
      500
    )
  }
})

/**
 * GET /api/inventory/summary
 * 获取库存数据统计摘要
 */
app.get("/inventory/summary", async (c) => {
  try {
    const summary = await getInventorySummary()
    return c.json({
      success: true,
      data: summary,
    })
  } catch (error) {
    console.error("获取库存摘要失败:", error)
    return c.json(
      {
        success: false,
        error: "获取库存摘要失败",
      },
      500
    )
  }
})

// ==================== 报告接口 ====================

/**
 * GET /api/reports
 * 获取所有采购报告
 */
app.get("/reports", async (c) => {
  try {
    const reports = await getReports()
    return c.json({
      success: true,
      data: reports,
      total: reports.length,
    })
  } catch (error) {
    console.error("获取报告数据失败:", error)
    return c.json(
      {
        success: false,
        error: "获取报告数据失败",
      },
      500
    )
  }
})

// ==================== 聊天接口 ====================

/**
 * POST /api/chat
 * 接收用户提问，返回 AI 分析结果
 * Body: { question: string }
 */
app.post("/chat", async (c) => {
  try {
    const body = await c.req.json<ChatRequest>()

    if (!body.question || typeof body.question !== "string") {
      return c.json(
        {
          success: false,
          error: "请提供有效的问题",
        },
        400
      )
    }

    const answer = await getChatResponse(body.question)

    const response: ChatResponse = {
      answer,
      timestamp: new Date().toISOString(),
    }

    return c.json({
      success: true,
      data: response,
    })
  } catch (error) {
    console.error("处理聊天请求失败:", error)
    return c.json(
      {
        success: false,
        error: "处理请求失败，请稍后重试",
      },
      500
    )
  }
})

// ==================== 受保护的聊天接口 ====================

/**
 * POST /api/chat/v2
 * 受保护的聊天接口，需要认证
 * Body: { messages: UIMessage[], model?: string }
 */
app.route("/chat/v2", chatRoutes as any)

// ==================== 健康检查 ====================

/**
 * GET /api/health
 * 健康检查接口
 */
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  })
})

// 导出 Hono 应用
export default app
