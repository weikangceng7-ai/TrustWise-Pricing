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

    /** POST /api/prediction 或直接调用 Python */
    async predictPrices(days: number = 7): Promise<ApiResponse> {
      // 如果配置了 Python 服务地址，直接调用（绕过 Vercel）
      if (config.PREDICTION_SERVICE_URL) {
        try {
          const res = await fetch(`${config.PREDICTION_SERVICE_URL}/predict`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${config.API_KEY}`,
            },
            body: JSON.stringify({ days }),
          })
          const json = await res.json()
          return { success: true, data: json }
        } catch (error) {
          return {
            success: false,
            error: { code: "PREDICTION_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
          }
        }
      }
      // 否则走 Vercel API
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

    /** POST /api/prediction/transformer 或直接调用 Python */
    async predictWithTransformer(days: number, commodityCode: string): Promise<ApiResponse> {
      // 如果配置了 Python 服务地址，直接调用（绕过 Vercel）
      if (config.PREDICTION_SERVICE_URL) {
        try {
          const res = await fetch(`${config.PREDICTION_SERVICE_URL}/transformer-predict`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${config.API_KEY}`,
            },
            body: JSON.stringify({ days, commodity_code: commodityCode }),
          })
          const json = await res.json()
          return { success: true, data: json }
        } catch (error) {
          return {
            success: false,
            error: { code: "TRANSFORMER_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
          }
        }
      }
      // 否则走 Vercel API
      return request("/api/prediction/transformer", {
        method: "POST",
        body: { days, commodity_code: commodityCode },
      })
    },

    /** POST /api/prediction/combined 或直接调用 Python */
    async getCombinedPrediction(days: number, commodityCode: string): Promise<ApiResponse> {
      // 如果配置了 Python 服务地址，直接调用（绕过 Vercel）
      if (config.PREDICTION_SERVICE_URL) {
        try {
          const baseUrl = config.PREDICTION_SERVICE_URL
          const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.API_KEY}`,
          }

          const [arimaRes, transformerRes] = await Promise.all([
            fetch(`${baseUrl}/predict`, {
              method: "POST",
              headers,
              body: JSON.stringify({ days, commodity_code: commodityCode }),
            }).then(r => r.json()),
            fetch(`${baseUrl}/transformer-predict`, {
              method: "POST",
              headers,
              body: JSON.stringify({ days, commodity_code: commodityCode, model: "patchtst" }),
            }).then(r => r.json()),
          ])

          // 融合两个模型
          const predictions = []
          const arimaResults = arimaRes?.data?.predictions || []
          const transformerResults = transformerRes?.predictions || []
          const count = Math.max(arimaResults.length, transformerResults.length)
          const transformerWeight = 0.4

          for (let i = 0; i < count; i++) {
            const arima = arimaResults[i]
            const transformer = transformerResults[i]
            const arimaPrice = arima?.predicted_price ?? arimaResults[0]?.predicted_price ?? 0
            const transformerPrice = transformer?.predicted_price ?? transformerResults[0]?.predicted_price ?? 0

            predictions.push({
              date: arima?.date || transformer?.date || "",
              arima_xgb_price: arimaPrice,
              transformer_price: transformerPrice,
              combined_price: Math.round((arimaPrice * 0.6 + transformerPrice * transformerWeight) * 100) / 100,
              confidence: 0.85,
              lower_bound: Math.min(arima?.lower_bound ?? arimaPrice - 30, transformer?.lower_bound ?? transformerPrice - 30),
              upper_bound: Math.max(arima?.upper_bound ?? arimaPrice + 30, transformer?.upper_bound ?? transformerPrice + 30),
            })
          }

          return { success: true, data: { predictions } }
        } catch (error) {
          return {
            success: false,
            error: { code: "COMBINED_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
          }
        }
      }
      // 否则走 Vercel API
      return request("/api/prediction/combined", {
        method: "POST",
        body: { days, commodity_code: commodityCode },
      })
    },
  }
}
