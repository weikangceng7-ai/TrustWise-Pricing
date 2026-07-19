/**
 * MCP Server 配置
 *
 * 从环境变量读取配置，MCP Server 启动时加载。
 * 环境变量优先级：系统环境变量 > .env 文件 > 默认值。
 * 支持 .env 文件，避免不同终端（CMD/PowerShell/bash）语法差异问题。
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

/**
 * 从 .env 文件加载环境变量（仅在变量未设置时生效）
 * 支持 Windows CMD、PowerShell、bash 等所有终端：只需创建 .env 文件即可
 */
function loadEnvFile(): void {
  try {
    const envPath = resolve(process.cwd(), ".env")
    const content = readFileSync(envPath, "utf-8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eqIndex = trimmed.indexOf("=")
      if (eqIndex === -1) continue
      const key = trimmed.slice(0, eqIndex).trim()
      let val = trimmed.slice(eqIndex + 1).trim()
      // 去除引号
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      // 仅在未通过系统环境变量设置时生效
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  } catch {
    // .env 文件不存在或无法读取，使用已有环境变量
  }
}

// 启动时加载 .env 文件
loadEnvFile()

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
  /** DEMO 模式：跳过 API_KEY 校验，返回示例数据 */
  DEMO_MODE: boolean
}

/**
 * 从环境变量加载配置
 */
export function loadConfig(): McpConfig {
  const API_BASE_URL = process.env.API_BASE_URL?.trim() || "https://sulfur-agent-web.vercel.app"
  const API_KEY = process.env.API_KEY?.trim() || ""
  const DEMO_MODE = process.env.DEMO_MODE === "true"
  const INDUSTRY_CODE = process.env.INDUSTRY_CODE?.trim() || "sulfur"
  const MCP_TRANSPORT = process.env.MCP_TRANSPORT?.trim() || "stdio"
  const MCP_PORT = Number(process.env.MCP_PORT) || 3100

  if (!DEMO_MODE && !API_KEY) {
    throw new Error("缺少环境变量 API_KEY（或设置 DEMO_MODE=true 使用演示模式）")
  }

  // 标准化 API_BASE_URL（去除末尾斜杠）
  const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, "")

  return {
    API_BASE_URL: normalizedBaseUrl,
    API_KEY,
    INDUSTRY_CODE,
    MCP_TRANSPORT,
    MCP_PORT,
    DEMO_MODE,
  }
}
