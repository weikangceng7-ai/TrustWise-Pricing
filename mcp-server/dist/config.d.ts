/**
 * MCP Server 配置
 *
 * 从环境变量读取配置，MCP Server 启动时加载。
 * 环境变量由 Claude Desktop 配置注入。
 */
export interface McpConfig {
    /** API Server 地址，如 https://sulfur-agent-web.vercel.app */
    API_BASE_URL: string;
    /** 用户的 API Key，用于调用所有端点 */
    API_KEY: string;
    /** 行业代码，默认 sulfur */
    INDUSTRY_CODE: string;
    /** 传输方式：stdio | http | both */
    MCP_TRANSPORT: string;
    /** HTTP 监听端口，默认 3100 */
    MCP_PORT: number;
}
/**
 * 从环境变量加载配置
 */
export declare function loadConfig(): McpConfig;
