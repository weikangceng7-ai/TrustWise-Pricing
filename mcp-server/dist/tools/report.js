"use strict";
/**
 * generate_report MCP 工具
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGenerateReport = registerGenerateReport;
const zod_1 = require("zod");
function registerGenerateReport(server, config, client) {
    server.tool("generate_report", `手动触发${config.INDUSTRY_CODE === "sulfur" ? "硫磺" : "行业"}追踪任务并生成报告`, {
        subscriptionId: zod_1.z.string().optional(),
        frequency: zod_1.z.enum(["hourly", "daily", "weekly"]).optional(),
    }, async ({ subscriptionId, frequency }, _extra) => {
        try {
            const result = await client.startTracking({
                subscriptionId,
                frequency,
            });
            if (!result.success || !result.data) {
                return {
                    content: [
                        { type: "text", text: `触发报告生成失败：${result.error?.message || "未知错误"}` },
                    ],
                };
            }
            const data = result.data;
            if (data.totalExecuted !== undefined) {
                return {
                    content: [
                        { type: "text", text: `报告生成完成：共执行 ${data.totalExecuted} 个订阅，成功 ${data.successCount}，失败 ${data.failedCount}` },
                    ],
                };
            }
            return {
                content: [{ type: "text", text: `追踪任务执行完成，状态：${data.status}` }],
            };
        }
        catch (error) {
            return {
                content: [
                    { type: "text", text: `生成报告异常：${error instanceof Error ? error.message : "未知错误"}` },
                ],
            };
        }
    });
}
