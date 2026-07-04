/**
 * MCP Server 配置
 *
 * 从环境变量读取配置，MCP Server 启动时加载。
 * 环境变量由 Claude Desktop 配置注入。
 */
/**
 * 从环境变量加载配置
 */
export function loadConfig() {
    const API_BASE_URL = process.env.API_BASE_URL?.trim() || "https://sulfur-agent-web.vercel.app";
    const API_KEY = process.env.API_KEY?.trim() || "";
    const DEMO_MODE = process.env.DEMO_MODE === "true";
    const INDUSTRY_CODE = process.env.INDUSTRY_CODE?.trim() || "sulfur";
    const MCP_TRANSPORT = process.env.MCP_TRANSPORT?.trim() || "stdio";
    const MCP_PORT = Number(process.env.MCP_PORT) || 3100;
    if (!DEMO_MODE && !API_KEY) {
        throw new Error("缺少环境变量 API_KEY（或设置 DEMO_MODE=true 使用演示模式）");
    }
    // 标准化 API_BASE_URL（去除末尾斜杠）
    const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, "");
    return {
        API_BASE_URL: normalizedBaseUrl,
        API_KEY,
        INDUSTRY_CODE,
        MCP_TRANSPORT,
        MCP_PORT,
        DEMO_MODE,
    };
}
