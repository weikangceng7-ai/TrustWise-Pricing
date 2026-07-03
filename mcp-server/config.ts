/**
 * MCP Server 配置
 *
 * 从环境变量读取配置，MCP Server 启动时加载。
 * 环境变量由 Claude Desktop 配置注入。
 */

export interface McpConfig {
  /** API Server 地址，如 https://sulfur-agent-web.vercel.app */
  API_BASE_URL: string
  /** 用户的 API Key，用于调用所有端点 */
  API_KEY: string
  /** 行业代码，默认 sulfur */
  INDUSTRY_CODE: string
  /** 传输方式：stdio | http | both */
  MCP_TRANSPORT: string
  /** HTTP 监听端口，默认 3100 */
  MCP_PORT: number
}

/**
 * 从环境变量加载配置
 */
export function loadConfig(): McpConfig {
  const API_BASE_URL = process.env.API_BASE_URL?.trim()
  const API_KEY = process.env.API_KEY?.trim()
  const INDUSTRY_CODE = process.env.INDUSTRY_CODE?.trim() || "sulfur"
  const MCP_TRANSPORT = process.env.MCP_TRANSPORT?.trim() || "stdio"
  const MCP_PORT = Number(process.env.MCP_PORT) || 3100

  if (!API_BASE_URL) {
    throw new Error("缺少环境变量 API_BASE_URL")
  }
  if (!API_KEY) {
    throw new Error("缺少环境变量 API_KEY")
  }

  // 标准化 API_BASE_URL（去除末尾斜杠）
  const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, "")

  return {
    API_BASE_URL: normalizedBaseUrl,
    API_KEY,
    INDUSTRY_CODE,
    MCP_TRANSPORT,
    MCP_PORT,
  }
}
