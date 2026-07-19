/**
 * get_tracker_status MCP 工具
 */
export function registerGetTrackerStatus(server, config, client) {
    server.tool("get_tracker_status", "当用户询问系统运行状态、有没有告警、订阅是否正常、系统是否在监控时使用。获取 Tracker 运行状态统计，包括活跃订阅数、未读告警数、最近/下次运行时间", {}, async ({}, _extra) => {
        try {
            const result = await client.getTrackerStatus();
            if (!result.success || !result.data) {
                return {
                    content: [
                        { type: "text", text: `获取状态失败：${result.error?.message || "未知错误"}` },
                    ],
                };
            }
            const data = result.data;
            const activeSubscriptions = data.activeSubscriptions || 0;
            const unreadAlerts = data.unreadAlerts || 0;
            const lastRunTime = data.lastRunTime || "尚未运行";
            const nextScheduledRun = data.nextScheduledRun || "未调度";
            const summary = `Tracker 运行状态：\n` +
                `活跃订阅：${activeSubscriptions}\n` +
                `未读告警：${unreadAlerts}\n` +
                `最近执行时间：${lastRunTime}\n` +
                `下次调度时间：${nextScheduledRun}`;
            return {
                content: [{ type: "text", text: summary }],
            };
        }
        catch (error) {
            return {
                content: [
                    { type: "text", text: `获取状态异常：${error instanceof Error ? error.message : "未知错误"}` },
                ],
            };
        }
    });
}
