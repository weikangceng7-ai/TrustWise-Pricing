"use strict";
/**
 * MCP Server HTTP 客户端
 *
 * 封装所有对 API Server 的 HTTP 调用。
 * 统一处理认证、错误解析、中文错误消息。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
/**
 * 创建 HTTP 客户端实例
 */
function createClient(config) {
    /**
     * 内部请求辅助方法
     */
    async function request(path, options = {}) {
        const { method = "GET", body } = options;
        const url = `${config.API_BASE_URL}${path}`;
        const res = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${config.API_KEY}`,
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const json = (await res.json());
        return json;
    }
    return {
        /** GET /api/v1/prices */
        async getPrices(days = 7, region, market) {
            const params = new URLSearchParams();
            params.set("limit", String(days));
            if (region)
                params.set("region", region);
            if (market)
                params.set("market", market);
            return request(`/api/v1/prices?${params.toString()}`);
        },
        /** GET /api/v1/data/inventory */
        async getInventory(limit = 2) {
            return request(`/api/v1/data/inventory?limit=${limit}`);
        },
        /** GET /api/v1/data/news */
        async getNews(limit = 10, category) {
            const params = new URLSearchParams();
            params.set("limit", String(limit));
            if (category)
                params.set("category", category);
            return request(`/api/v1/data/news?${params.toString()}`);
        },
        /** POST /api/prediction */
        async predictPrices(days = 7) {
            return request("/api/prediction", {
                method: "POST",
                body: { days },
            });
        },
        /** POST /api/tracker/subscriptions */
        async createSubscription(body) {
            return request("/api/tracker/subscriptions", {
                method: "POST",
                body,
            });
        },
        /** GET /api/tracker/subscriptions */
        async getSubscriptions(activeOnly = true) {
            return request(`/api/tracker/subscriptions?activeOnly=${activeOnly}`);
        },
        /** DELETE /api/tracker/subscriptions/:id */
        async deleteSubscription(id) {
            return request(`/api/tracker/subscriptions/${id}`, { method: "DELETE" });
        },
        /** PATCH /api/tracker/subscriptions/:id */
        async updateSubscription(id, body) {
            return request(`/api/tracker/subscriptions/${id}`, {
                method: "PATCH",
                body,
            });
        },
        /** POST /api/tracker/start */
        async startTracking(body) {
            return request("/api/tracker/start", {
                method: "POST",
                body,
            });
        },
        /** GET /api/tracker/status */
        async getTrackerStatus() {
            return request("/api/tracker/status");
        },
        /** GET /api/tracker/alerts */
        async getAlerts(limit = 10) {
            return request(`/api/tracker/alerts?limit=${limit}`);
        },
        /** POST /api/neo4j?action=query */
        async queryKnowledgeGraph(query) {
            return request("/api/neo4j?action=query", {
                method: "POST",
                body: { query },
            });
        },
    };
}
