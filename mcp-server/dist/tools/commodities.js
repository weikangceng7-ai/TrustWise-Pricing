/**
 * list_commodities + get_commodity_analysis MCP 工具
 *
 * 多品种大宗原料数据查询，支持硫磺、磷矿、钾肥、尿素
 */
import { z } from "zod";
const COMMODITY_CODES = ["sulfur", "phosphate", "potash", "urea"];
export function registerCommodityTools(server, config, client) {
    // ========== list_commodities ==========
    server.tool("list_commodities", "当用户询问有哪些品种、支持哪些大宗商品、所有原料的概览、各品种对比时使用。列出系统支持的所有大宗原料品种（硫磺、磷矿、钾肥、尿素），返回当前价格、趋势、波动性和风险等级。如需单个品种深入分析用 get_commodity_analysis，跨品种对比用 cross_commodity_analysis", {}, async ({}, _extra) => {
        try {
            const result = await client.listCommodities();
            if (!result.success || !result.data) {
                return {
                    content: [
                        { type: "text", text: `获取品种列表失败：${result.error?.message || "未知错误"}` },
                    ],
                };
            }
            const commodities = result.data?.commodities || result.data?.data || [];
            if (!commodities || commodities.length === 0) {
                return {
                    content: [
                        { type: "text", text: "暂无品种数据，请检查数据库是否已初始化品种信息。" },
                    ],
                };
            }
            const lines = [`系统支持 ${commodities.length} 个大宗原料品种：`, ""];
            for (const c of commodities) {
                const trendIcon = c.trend === "up" ? "📈" : c.trend === "down" ? "📉" : "➡️";
                lines.push(`${trendIcon} **${c.name}** (${c.englishName})`);
                lines.push(`   代码: \`${c.code}\` | 类别: ${c.category} | 单位: ${c.unit}`);
                if (c.price)
                    lines.push(`   当前价格: ¥${c.price} | 涨跌: ${c.change || "持平"}`);
                lines.push(`   波动性: ${c.volatility || "N/A"} | 风险等级: ${c.riskLevel || "N/A"} | 市场热度: ${c.marketHeat || "N/A"}`);
                if (c.outlook)
                    lines.push(`   展望: ${c.outlook}`);
                lines.push("");
            }
            return {
                content: [{ type: "text", text: lines.join("\n") }],
            };
        }
        catch (error) {
            return {
                content: [
                    { type: "text", text: `获取品种列表异常：${error instanceof Error ? error.message : "未知错误"}` },
                ],
            };
        }
    });
    // ========== get_commodity_analysis ==========
    server.tool("get_commodity_analysis", "当用户询问某个具体品种的详细分析、磷矿行情、钾肥走势、尿素价格、某品种的驱动因素和市场展望时使用。获取指定品种的详细分析，包括关键驱动因素、市场展望、品种间相关性和行业对比", {
        commodityCode: z.enum(COMMODITY_CODES).describe("品种代码：sulfur（硫磺）、phosphate（磷矿）、potash（钾肥）、urea（尿素）"),
    }, async ({ commodityCode }, _extra) => {
        try {
            const result = await client.getCommodityAnalysis(commodityCode);
            if (!result.success || !result.data) {
                return {
                    content: [
                        { type: "text", text: `获取品种分析失败：${result.error?.message || "未知错误"}` },
                    ],
                };
            }
            const analysis = result.data?.analysis || result.data;
            if (!analysis) {
                return {
                    content: [
                        { type: "text", text: `品种 "${commodityCode}" 暂无分析数据` },
                    ],
                };
            }
            const lines = [
                `## ${analysis.name || commodityCode} 市场分析`,
                "",
                `**当前价格**: ${analysis.price || "N/A"}`,
                `**价格趋势**: ${analysis.trend || "N/A"} | 涨跌幅: ${analysis.change || "N/A"}`,
                `**波动性**: ${analysis.volatility || "N/A"} | **风险等级**: ${analysis.riskLevel || "N/A"}`,
                "",
                "### 关键驱动因素",
            ];
            if (analysis.keyDrivers && analysis.keyDrivers.length > 0) {
                for (const d of analysis.keyDrivers) {
                    lines.push(`- ${d}`);
                }
            }
            else {
                lines.push("- 暂无数据");
            }
            lines.push("");
            lines.push(`### 市场展望\n${analysis.outlook || "暂无展望信息"}`);
            if (analysis.correlations && analysis.correlations.length > 0) {
                lines.push("");
                lines.push("### 品种相关性");
                for (const corr of analysis.correlations) {
                    const corrIcon = corr.value > 0.5 ? "🔴" : corr.value > 0 ? "🟡" : "🟢";
                    lines.push(`${corrIcon} ${corr.pair}: ${corr.correlation} (r=${corr.value}) — ${corr.desc}`);
                }
            }
            return {
                content: [{ type: "text", text: lines.join("\n") }],
            };
        }
        catch (error) {
            return {
                content: [
                    { type: "text", text: `获取品种分析异常：${error instanceof Error ? error.message : "未知错误"}` },
                ],
            };
        }
    });
}
