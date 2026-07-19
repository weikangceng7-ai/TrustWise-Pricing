/**
 * query_knowledge_graph MCP 工具
 *
 * 根据用户自然语言问题，查询知识图谱返回价格影响因子、供应链影响链、洞察与采购建议。
 */
import { z } from "zod";
export function registerQueryKnowledgeGraph(server, config, client) {
    server.tool("query_knowledge_graph", `当用户询问价格影响因素、为什么涨价/跌价、供应链分析、企业采购建议、中东局势/地缘政治对价格的影响、某个企业该如何采购时使用。查询${config.INDUSTRY_CODE === "sulfur" ? "硫磺" : "行业"}价格影响因子及关系网络，返回供应链影响链、市场洞察与采购建议`, {
        query: z.string().describe("用户关于市场分析、价格影响、企业采购的自然语言问题，例如'中东局势对硫磺价格的影响'、'宜化集团采购硫磺需要注意什么'、'磷肥需求旺季硫磺会涨价吗'"),
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
