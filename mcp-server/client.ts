/**
 * MCP Server HTTP 客户端
 *
 * 封装所有对 API Server 的 HTTP 调用。
 * 统一处理认证、错误解析、中文错误消息。
 */

import type { McpConfig } from "./config.js"

/**
 * 通用 API 响应类型
 */
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
  message?: string
}

/**
 * 创建 HTTP 客户端实例
 */
export function createClient(config: McpConfig) {
  /**
   * 内部请求辅助方法
   */
  async function request<T>(
    path: string,
    options: { method?: string; body?: unknown } = {}
  ): Promise<ApiResponse<T>> {
    // DEMO 模式：返回示例数据
    if (config.DEMO_MODE) {
      return { success: true, data: null as T, message: "DEMO 模式：此为示例数据" }
    }

    const { method = "GET", body } = options
    const url = `${config.API_BASE_URL}${path}`

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.API_KEY}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })

    const json = (await res.json()) as ApiResponse<T>
    return json
  }

  return {
    /** GET /api/v1/prices */
    async getPrices(days: number = 7, region?: string, market?: string) {
      const params = new URLSearchParams()
      params.set("limit", String(days))
      if (region) params.set("region", region)
      if (market) params.set("market", market)
      return request(`/api/v1/prices?${params.toString()}`)
    },

    /** GET /api/v1/data/inventory */
    async getInventory(limit: number = 2) {
      return request(`/api/v1/data/inventory?limit=${limit}`)
    },

    /** GET /api/v1/data/news */
    async getNews(limit: number = 10, category?: string) {
      const params = new URLSearchParams()
      params.set("limit", String(limit))
      if (category) params.set("category", category)
      return request(`/api/v1/data/news?${params.toString()}`)
    },

    /** POST /api/prediction */
    async predictPrices(days: number = 7) {
      return request("/api/prediction", {
        method: "POST",
        body: { days },
      })
    },

    /** POST /api/tracker/subscriptions */
    async createSubscription(body: {
      name: string
      targetType: string
      frequency: string
      alertRules?: unknown[]
      reportEnabled?: boolean
      reportType?: string
      notificationChannels?: Record<string, boolean>
      targetRegion?: string
      targetMarket?: string
      scheduleTime?: string
    }) {
      return request("/api/tracker/subscriptions", {
        method: "POST",
        body,
      })
    },

    /** GET /api/tracker/subscriptions */
    async getSubscriptions(activeOnly: boolean = true) {
      return request(`/api/tracker/subscriptions?activeOnly=${activeOnly}`)
    },

    /** DELETE /api/tracker/subscriptions/:id */
    async deleteSubscription(id: number) {
      return request(`/api/tracker/subscriptions/${id}`, { method: "DELETE" })
    },

    /** PATCH /api/tracker/subscriptions/:id */
    async updateSubscription(id: number, body: Record<string, unknown>) {
      return request(`/api/tracker/subscriptions/${id}`, {
        method: "PATCH",
        body,
      })
    },

    /** POST /api/tracker/start */
    async startTracking(body: { subscriptionId?: string; frequency?: string }) {
      return request("/api/tracker/start", {
        method: "POST",
        body,
      })
    },

    /** GET /api/tracker/status */
    async getTrackerStatus() {
      return request("/api/tracker/status")
    },

    /** GET /api/tracker/alerts */
    async getAlerts(limit: number = 10) {
      return request(`/api/tracker/alerts?limit=${limit}`)
    },

    /** POST /api/neo4j?action=query */
    async queryKnowledgeGraph(query: string) {
      return request("/api/neo4j?action=query", {
        method: "POST",
        body: { query },
      })
    },

    // ========== 多品种相关 ==========

    /** GET /api/commodities */
    async listCommodities() {
      return request("/api/commodities")
    },

    /** GET /api/commodities/:code/analysis */
    async getCommodityAnalysis(code: string) {
      return request(`/api/commodities/${code}/analysis`)
    },

    /** GET /api/commodities/cross-analysis */
    async crossCommodityAnalysis() {
      return request("/api/commodities/cross-analysis")
    },

    // ========== 精度评估 ==========

    /** GET /api/accuracy */
    async getAccuracyMetrics(enterpriseCode?: string) {
      const params = enterpriseCode ? `?enterprise=${enterpriseCode}` : ""
      return request(`/api/accuracy${params}`)
    },

    // ========== 成功案例 ==========

    /** GET /api/success-cases */
    async getSuccessCases(industry?: string) {
      const params = industry ? `?industry=${encodeURIComponent(industry)}` : ""
      return request(`/api/success-cases${params}`)
    },

    // ========== Transformer 预测 ==========

    /** POST /api/prediction/transformer */
    async predictWithTransformer(days: number, commodityCode: string) {
      return request("/api/prediction/transformer", {
        method: "POST",
        body: { days, commodity_code: commodityCode },
      })
    },

    /** POST /api/prediction/combined */
    async getCombinedPrediction(days: number, commodityCode: string) {
      return request("/api/prediction/combined", {
        method: "POST",
        body: { days, commodity_code: commodityCode },
      })
    },
  }
}
