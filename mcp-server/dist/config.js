"use strict";
/**
 * MCP Server 配置
 *
 * 从环境变量读取配置，MCP Server 启动时加载。
 * 环境变量由 Claude Desktop 配置注入。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
/**
 * 从环境变量加载配置
 */
function loadConfig() {
    const API_BASE_URL = process.env.API_BASE_URL?.trim();
    const API_KEY = process.env.API_KEY?.trim();
    const INDUSTRY_CODE = process.env.INDUSTRY_CODE?.trim() || "sulfur";
    const MCP_TRANSPORT = process.env.MCP_TRANSPORT?.trim() || "stdio";
    const MCP_PORT = Number(process.env.MCP_PORT) || 3100;
    if (!API_BASE_URL) {
        throw new Error("缺少环境变量 API_BASE_URL");
    }
    if (!API_KEY) {
        throw new Error("缺少环境变量 API_KEY");
    }
    // 标准化 API_BASE_URL（去除末尾斜杠）
    const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, "");
    return {
        API_BASE_URL: normalizedBaseUrl,
        API_KEY,
        INDUSTRY_CODE,
        MCP_TRANSPORT,
        MCP_PORT,
    };
}
