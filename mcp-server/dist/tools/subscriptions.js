/**
 * subscribe_alert + list_subscriptions + update_subscription MCP 工具
 */
import { z } from "zod";
const SUBSCRIPTION_TYPES = ["price", "inventory", "news", "all"];
export function registerSubscriptionTools(server, config, client) {
    // ========== subscribe_alert ==========
    server.tool("subscribe_alert", `当用户要设置价格预警、价格监控、自动提醒、价格达到某阈值时通知我时使用。订阅${config.INDUSTRY_CODE === "sulfur" ? "硫磺" : "行业"}价格预警，当价格达到阈值或触发规则时自动通知`, {
        name: z.string().optional().describe("订阅名称，如'硫磺价格上限预警'"),
        threshold: z.number().describe("触发阈值，单位：元/吨"),
        direction: z.enum(["above", "below"]).describe("触发方向：above=价格超过阈值时通知，below=价格低于阈值时通知"),
        frequency: z.enum(["hourly", "daily", "weekly"]).optional().describe("检查频率，默认daily"),
        targetType: z.enum(SUBSCRIPTION_TYPES).optional().describe("监控类型：price/price_threshold/inventory/news/all"),
        reportEnabled: z.boolean().optional().describe("是否生成追踪报告，默认true"),
    }, async ({ name, threshold, direction, frequency, targetType, reportEnabled }, _extra) => {
        try {
            const result = await client.createSubscription({
                name: name || `${config.INDUSTRY_CODE}价格预警${threshold}`,
                targetType: targetType || "price",
                frequency: frequency || "daily",
                alertRules: [{
                        type: "price_threshold",
                        threshold,
                        direction,
                    }],
                reportEnabled: reportEnabled !== false,
                reportType: "daily",
                notificationChannels: { inApp: true, email: true, sms: false },
            });
            if (!result.success || !result.data) {
                return {
                    content: [
                        { type: "text", text: `创建订阅失败：${result.error?.message || "未知错误"}` },
                    ],
                };
            }
            const sub = result.data.subscription || result.data;
            return {
                content: [
                    { type: "text", text: `已成功创建订阅「${sub.name || name}」，频率为${sub.frequency || frequency || "daily"}。当价格${direction === "above" ? "超过" : "低于"}${threshold}元/吨时会发送通知。` },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    { type: "text", text: `创建订阅异常：${error instanceof Error ? error.message : "未知错误"}` },
                ],
            };
        }
    });
    // ========== list_subscriptions ==========
    server.tool("list_subscriptions", "当用户要查看已有的订阅、我有哪些预警、管理订阅时使用。列出当前用户的所有追踪订阅", {
        activeOnly: z.boolean().optional().describe("是否只显示活跃订阅，默认true"),
    }, async ({ activeOnly }, _extra) => {
        try {
            const result = await client.getSubscriptions(activeOnly !== false);
            if (!result.success || !result.data) {
                return {
                    content: [
                        { type: "text", text: `获取订阅列表失败：${result.error?.message || "未知错误"}` },
                    ],
                };
            }
            const subs = result.data.subscriptions || [];
            if (!subs || subs.length === 0) {
                return {
                    content: [
                        { type: "text", text: "当前没有订阅。可以使用 subscribe_alert 工具创建新的订阅。" },
                    ],
                };
            }
            const lines = [`当前共有 ${subs.length} 个订阅：`, ""];
            for (const sub of subs) {
                const status = sub.isActive ? "活跃" : "已停用";
                lines.push(`- **${sub.name}** (${status}) — 类型：${sub.targetType}，频率：${sub.frequency}${sub.lastRunAt ? `，上次运行：${sub.lastRunAt}` : ""}`);
            }
            return {
                content: [{ type: "text", text: lines.join("\n") }],
            };
        }
        catch (error) {
            return {
                content: [
                    { type: "text", text: `获取订阅异常：${error instanceof Error ? error.message : "未知错误"}` },
                ],
            };
        }
    });
    // ========== update_subscription ==========
    server.tool("update_subscription", "当用户要修改订阅、停用/启用预警、删除订阅时使用。更新或删除已有的订阅", {
        subscriptionId: z.number().describe("订阅ID，从 list_subscriptions 获取"),
        action: z.enum(["update", "delete"]).describe("操作类型：update=修改，delete=删除"),
        isActive: z.boolean().optional().describe("是否启用该订阅"),
        name: z.string().optional().describe("新的订阅名称"),
    }, async ({ subscriptionId, action, isActive, name }, _extra) => {
        try {
            if (action === "delete") {
                const result = await client.deleteSubscription(subscriptionId);
                if (!result.success) {
                    return {
                        content: [
                            { type: "text", text: `删除订阅失败：${result.error?.message || "未知错误"}` },
                        ],
                    };
                }
                return {
                    content: [
                        { type: "text", text: `已删除订阅 ID=${subscriptionId}` },
                    ],
                };
            }
            const updateBody = {};
            if (isActive !== undefined)
                updateBody.isActive = isActive;
            if (name !== undefined)
                updateBody.name = name;
            const result = await client.updateSubscription(subscriptionId, updateBody);
            if (!result.success || !result.data) {
                return {
                    content: [
                        { type: "text", text: `更新订阅失败：${result.error?.message || "未知错误"}` },
                    ],
                };
            }
            const sub = result.data;
            return {
                content: [
                    { type: "text", text: `已更新订阅「${sub.name || "未知"}」，当前状态：${sub.isActive ? "活跃" : "已停用"}` },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    { type: "text", text: `更新订阅异常：${error instanceof Error ? error.message : "未知错误"}` },
                ],
            };
        }
    });
    // ========== get_alerts ==========
    server.tool("get_alerts", "当用户询问告警记录、有什么异常、触发了哪些预警、查看最近的价格异动时使用。获取近期价格异动告警列表", {
        limit: z.number().optional().describe("返回条数，默认10条"),
    }, async ({ limit }, _extra) => {
        const limitCount = limit || 10;
        try {
            const result = await client.getAlerts(limitCount);
            if (!result.success || !result.data) {
                return {
                    content: [
                        { type: "text", text: `获取告警列表失败：${result.error?.message || "未知错误"}` },
                    ],
                };
            }
            const alertsData = result.data?.data || result.data;
            const alerts = alertsData?.alerts || alertsData?.results || [];
            if (!alerts || alerts.length === 0) {
                return {
                    content: [
                        { type: "text", text: "暂无告警记录" },
                    ],
                };
            }
            const lines = [`最近 ${Math.min(alerts.length, limitCount)} 条告警：`, ""];
            for (const alert of alerts.slice(0, limitCount)) {
                const status = alert.isHandled ? "[已处理]" : alert.isRead ? "[已读]" : "[未读]";
                const urgency = alert.urgency === "high" ? "[紧急]" : "";
                lines.push(`${urgency}${status} **${alert.alertType || "未知类型"}** — ${alert.message || alert.title || "无描述"}`);
                if (alert.createdAt) {
                    lines.push(`   时间：${alert.createdAt}`);
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
                    { type: "text", text: `获取告警异常：${error instanceof Error ? error.message : "未知错误"}` },
                ],
            };
        }
    });
}
