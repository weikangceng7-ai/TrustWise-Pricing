"use strict";
/**
 * query_knowledge_graph MCP 工具
 *
 * 根据用户自然语言问题，查询知识图谱返回价格影响因子、供应链影响链、洞察与采购建议。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerQueryKnowledgeGraph = registerQueryKnowledgeGraph;
const zod_1 = require("zod");
function registerQueryKnowledgeGraph(server, config, client) {
    server.tool("query_knowledge_graph", `查询${config.INDUSTRY_CODE === "sulfur" ? "硫磺" : "行业"}价格影响因子及其关系网络，返回供应链影响链、市场洞察与采购建议`, {
        query: zod_1.z.string().describe("用户关于硫磺市场、价格、企业采购的自然语言问题，例如'宜化集团采购硫磺需要注意什么'或'价格趋势如何'"),
    }, async ({ query }, _extra) => {
        const res = await client.queryKnowledgeGraph(query);
        if (!res.success) {
            return {
                content: [
                    {
                        type: "text",
                        text: `知识图谱查询失败：${res.error?.message || "未知错误"}`,
                    },
                ],
            };
        }
        // API 返回 structured JSON（{ data: string }），将其作为文本输出
        const result = res.data;
        return {
            content: [
                {
                    type: "text",
                    text: result || "知识图谱当前无可用数据，请检查 Neo4j 连接状态。",
                },
            ],
        };
    });
}
