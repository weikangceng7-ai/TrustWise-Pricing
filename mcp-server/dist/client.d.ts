/**
 * MCP Server HTTP 客户端
 *
 * 封装所有对 API Server 的 HTTP 调用。
 * 统一处理认证、错误解析、中文错误消息。
 */
import type { McpConfig } from "./config.js";
/**
 * 通用 API 响应类型
 */
interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
    message?: string;
}
/**
 * 创建 HTTP 客户端实例
 */
export declare function createClient(config: McpConfig): {
    /** GET /api/v1/prices */
    getPrices(days?: number, region?: string, market?: string): Promise<ApiResponse<unknown>>;
    /** GET /api/v1/data/inventory */
    getInventory(limit?: number): Promise<ApiResponse<unknown>>;
    /** GET /api/v1/data/news */
    getNews(limit?: number, category?: string): Promise<ApiResponse<unknown>>;
    /** POST /api/prediction */
    predictPrices(days?: number): Promise<ApiResponse<unknown>>;
    /** POST /api/tracker/subscriptions */
    createSubscription(body: {
        name: string;
        targetType: string;
        frequency: string;
        alertRules?: unknown[];
        reportEnabled?: boolean;
        reportType?: string;
        notificationChannels?: Record<string, boolean>;
        targetRegion?: string;
        targetMarket?: string;
        scheduleTime?: string;
    }): Promise<ApiResponse<unknown>>;
    /** GET /api/tracker/subscriptions */
    getSubscriptions(activeOnly?: boolean): Promise<ApiResponse<unknown>>;
    /** DELETE /api/tracker/subscriptions/:id */
    deleteSubscription(id: number): Promise<ApiResponse<unknown>>;
    /** PATCH /api/tracker/subscriptions/:id */
    updateSubscription(id: number, body: Record<string, unknown>): Promise<ApiResponse<unknown>>;
    /** POST /api/tracker/start */
    startTracking(body: {
        subscriptionId?: string;
        frequency?: string;
    }): Promise<ApiResponse<unknown>>;
    /** GET /api/tracker/status */
    getTrackerStatus(): Promise<ApiResponse<unknown>>;
    /** GET /api/tracker/alerts */
    getAlerts(limit?: number): Promise<ApiResponse<unknown>>;
    /** POST /api/neo4j?action=query */
    queryKnowledgeGraph(query: string): Promise<ApiResponse<unknown>>;
    /** GET /api/commodities */
    listCommodities(): Promise<ApiResponse<unknown>>;
    /** GET /api/commodities/:code/analysis */
    getCommodityAnalysis(code: string): Promise<ApiResponse<unknown>>;
    /** GET /api/commodities/cross-analysis */
    crossCommodityAnalysis(): Promise<ApiResponse<unknown>>;
    /** GET /api/accuracy */
    getAccuracyMetrics(enterpriseCode?: string): Promise<ApiResponse<unknown>>;
    /** GET /api/success-cases */
    getSuccessCases(industry?: string): Promise<ApiResponse<unknown>>;
    /** POST /api/prediction/transformer */
    predictWithTransformer(days: number, commodityCode: string): Promise<ApiResponse<unknown>>;
    /** POST /api/prediction/combined */
    getCombinedPrediction(days: number, commodityCode: string): Promise<ApiResponse<unknown>>;
};
export {};
