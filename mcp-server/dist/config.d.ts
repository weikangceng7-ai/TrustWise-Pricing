/**
 * MCP Server 配置
 *
 * 从环境变量读取配置，MCP Server 启动时加载。
 * 环境变量优先级：系统环境变量 > .env 文件 > 默认值。
 * 支持 .env 文件，避免不同终端（CMD/PowerShell/bash）语法差异问题。
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
    /** DEMO 模式：跳过 API_KEY 校验，返回示例数据 */
    DEMO_MODE: boolean;
    /** Python 预测服务地址（可选，直接调用绕过 Vercel） */
    PREDICTION_SERVICE_URL?: string;
}
/**
 * 从环境变量加载配置
 */
export declare function loadConfig(): McpConfig;
