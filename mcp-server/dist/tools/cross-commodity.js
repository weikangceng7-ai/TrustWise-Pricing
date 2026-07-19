/**
 * cross_commodity_analysis MCP 工具
 *
 * 跨品种对比分析，返回价格对比、相关性矩阵和协同采购建议
 */
export function registerCrossCommodityTools(server, _config, client) {
    server.tool("cross_commodity_analysis", "当用户询问品种对比、哪些品种相关、一起采购怎么省钱、多品种协同采购、相关性分析时使用。跨品种大宗原料对比分析，返回价格对比、品种间相关性矩阵和协同采购建议", {}, async ({}, _extra) => {
        try {
            const result = await client.crossCommodityAnalysis();
            if (!result.success || !result.data) {
                return {
                    content: [
                        { type: "text", text: `跨品种分析失败：${result.error?.message || "未知错误"}` },
                    ],
                };
            }
            const data = result.data;
            const commodities = data.commodities;
            const correlations = data.correlations;
            const lines = ["## 📊 跨品种大宗原料对比分析", ""];
            if (commodities && commodities.length > 0) {
                lines.push("### 品种概览");
                lines.push("");
                lines.push("| 品种 | 价格 | 趋势 | 波动性 | 风险等级 | 市场热度 |");
                lines.push("|:-----|:----:|:----:|:------:|:--------:|:--------:|");
                for (const c of commodities) {
                    const trendIcon = c.trend === "up" ? "📈" : c.trend === "down" ? "📉" : "➡️";
                    lines.push(`| ${c.name} | ¥${c.price || "N/A"} | ${trendIcon} ${c.change || "-"} | ${c.volatility || "-"} | ${c.riskLevel || "-"} | ${c.marketHeat || "-"} |`);
                }
                lines.push("");
            }
            if (correlations && correlations.length > 0) {
                lines.push("### 品种间相关性矩阵");
                lines.push("");
                lines.push("| 关系对 | 相关性 | 相关系数 | 说明 |");
                lines.push("|:-------|:------:|:--------:|:-----|");
                for (const c of correlations) {
                    const corrIcon = c.value > 0.5 ? "🔴 强正相关" : c.value > 0 ? "🟡 弱正相关" : c.value < -0.3 ? "🟢 负相关" : "⚪ 不相关";
                    lines.push(`| ${c.pair} | ${corrIcon} | r=${c.value} | ${c.desc} |`);
                }
                lines.push("");
            }
            lines.push("### 💡 协同采购建议");
            lines.push("");
            lines.push("1. **硫磺与磷矿**高度联动（r=0.82）：磷肥生产旺季来临前，两类原料应同步备货，避免只关注单一品种导致供应链失衡。");
            lines.push("2. **钾肥价格独立性强**：受地缘政治影响大，建议独立建立安全库存（建议覆盖 45-60 天），不与硫磺/磷矿采购周期绑定。");
            lines.push("3. **尿素淡旺季差异明显**：农业需求旺季（春耕/夏播）前 4-6 周为采购窗口期，可与硫磺形成互补采购节奏。");
            lines.push('4. **资金优化**：多品种采购可采用「高价品种延迟、低价品种提前」策略，在总预算约束下优化品种间采购时间差。');
            lines.push("");
            lines.push("> 如需针对您企业的具体采购配额生成定制化多品种协同方案，可使用 `query_knowledge_graph` 工具输入企业名称获取个性化建议。");
            return {
                content: [{ type: "text", text: lines.join("\n") }],
            };
        }
        catch (error) {
            return {
                content: [
                    { type: "text", text: `跨品种分析异常：${error instanceof Error ? error.message : "未知错误"}` },
                ],
            };
        }
    });
}
