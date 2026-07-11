/**
 * get_success_cases MCP 工具
 *
 * 查询客户成功案例，展示 SulfurAI 为企业带来的可量化价值和实际成效
 */
import { z } from "zod";
export function registerSuccessCasesTools(server, _config, client) {
    server.tool("get_success_cases", "获取 SulfurAI 平台的客户成功案例，包括实施前后对比、可量化价值（成本节约、效率提升）以及行业最佳实践。适用于向客户展示产品价值或进行竞品对比分析。", {
        industry: z.string().optional().describe("可选筛选行业：磷化工、化肥制造、复合肥"),
    }, async ({ industry }, _extra) => {
        try {
            const result = await client.getSuccessCases(industry);
            if (!result.success || !result.data) {
                return {
                    content: [
                        { type: "text", text: `获取案例数据失败：${result.error?.message || "未知错误"}` },
                    ],
                };
            }
            const cases = result.data?.cases || result.data?.data || [];
            if (!cases || cases.length === 0) {
                return {
                    content: [
                        { type: "text", text: industry ? `暂无「${industry}」行业的成功案例` : "暂无成功案例数据" },
                    ],
                };
            }
            const lines = [`## 🏆 客户成功案例（共 ${cases.length} 个）`, ""];
            for (const c of cases) {
                lines.push(`### ${c.name}（${c.industry}）`);
                lines.push(`> ${c.highlight || ""}`);
                lines.push("");
                lines.push(`**挑战**: ${c.challenge}`);
                lines.push(`**解决方案**: ${c.solution}`);
                lines.push("");
                lines.push("**实施成果**:");
                if (c.results && c.results.length > 0) {
                    for (const r of c.results) {
                        lines.push(`- ${r.label}: **${r.value}**`);
                    }
                }
                lines.push("");
                lines.push("---");
                lines.push("");
            }
            lines.push("> 这些案例展示了 SulfurAI 在不同类型化工企业中的实际应用成效。如需了解与贵企业类似的案例详情，可预约产品演示。");
            return {
                content: [{ type: "text", text: lines.join("\n") }],
            };
        }
        catch (error) {
            return {
                content: [
                    { type: "text", text: `获取案例数据异常：${error instanceof Error ? error.message : "未知错误"}` },
                ],
            };
        }
    });
}
