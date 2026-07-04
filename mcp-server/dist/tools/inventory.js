/**
 * get_inventory MCP 工具
 */
import { z } from "zod";
export function registerGetInventory(server, config, client) {
    server.tool("get_inventory", `获取${config.INDUSTRY_CODE === "sulfur" ? "港口硫磺" : "行业"}库存数据`, {
        limit: z.number().optional(),
    }, async ({ limit }, _extra) => {
        const limitCount = limit || 2;
        try {
            const result = await client.getInventory(limitCount);
            if (!result.success || !result.data) {
                return {
                    content: [
                        { type: "text", text: `获取库存数据失败：${result.error?.message || "未知错误"}` },
                    ],
                };
            }
            const inventory = result.data?.data?.inventory || result.data?.inventory || [];
            if (!inventory || inventory.length === 0) {
                return {
                    content: [
                        { type: "text", text: "暂无库存数据" },
                    ],
                };
            }
            const latest = inventory[0];
            const currentInventory = parseFloat(latest.inventory || latest.quantity || "0");
            let changeInfo = "";
            if (inventory.length >= 2) {
                const prev = inventory[1];
                const prevInventory = parseFloat(prev.inventory || prev.quantity || "0");
                if (prevInventory > 0) {
                    const change = ((currentInventory - prevInventory) / prevInventory * 100).toFixed(1);
                    changeInfo = `较上一周期${change.startsWith("-") ? "下降" : "增加"}${Math.abs(parseFloat(change))}%`;
                }
            }
            const summary = `主要港口当前库存为 ${currentInventory} 吨，${changeInfo}。\n\n数据明细：\n\`\`\`json\n${JSON.stringify(inventory, null, 2)}\n\`\`\``;
            return {
                content: [{ type: "text", text: summary }],
            };
        }
        catch (error) {
            return {
                content: [
                    { type: "text", text: `获取库存数据异常：${error instanceof Error ? error.message : "未知错误"}` },
                ],
            };
        }
    });
}
