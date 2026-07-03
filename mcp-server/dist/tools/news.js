"use strict";
/**
 * get_news MCP 工具
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGetNews = registerGetNews;
const zod_1 = require("zod");
function registerGetNews(server, config, client) {
    server.tool("get_news", `获取${config.INDUSTRY_CODE === "sulfur" ? "硫磺" : "行业"}市场新闻和行业动态`, {
        limit: zod_1.z.number().optional(),
        category: zod_1.z.string().optional(),
    }, async ({ limit, category }, _extra) => {
        const limitCount = limit || 10;
        try {
            const result = await client.getNews(limitCount, category);
            if (!result.success || !result.data) {
                return {
                    content: [
                        { type: "text", text: `获取新闻数据失败：${result.error?.message || "未知错误"}` },
                    ],
                };
            }
            const news = result.data?.data?.news || result.data?.news || [];
            if (!news || news.length === 0) {
                return {
                    content: [
                        { type: "text", text: "暂无相关新闻" },
                    ],
                };
            }
            const lines = [`最近${news.length}条市场动态：`, ""];
            for (const item of news.slice(0, 10)) {
                const sentimentIcon = item.sentiment === "positive" ? "[看涨]" : item.sentiment === "negative" ? "[看跌]" : "[中性]";
                lines.push(`${sentimentIcon} **${item.title}** — ${item.source || "未知来源"}`);
                if (item.date) {
                    lines.push(`   发布时间：${item.date}`);
                }
                lines.push("");
            }
            return {
                content: [{ type: "text", text: lines.join("\n") }],
            };
        }
        catch (error) {
            return {
                content: [
                    { type: "text", text: `获取新闻数据异常：${error instanceof Error ? error.message : "未知错误"}` },
                ],
            };
        }
    });
}
