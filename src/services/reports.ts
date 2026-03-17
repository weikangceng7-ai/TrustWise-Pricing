import { db } from "@/db"
import { purchaseReports, type PurchaseReport } from "@/db/schema"
import { desc } from "drizzle-orm"

// Mock 采购报告数据（当数据库未配置时使用）
const mockReports: PurchaseReport[] = [
  {
    id: 1,
    title: "2025年3月第三周硫磺采购分析报告",
    reportDate: "2025-03-17",
    summary: "本周硫磺价格持续上涨，中东地区运费波动明显。建议适当增加库存，锁定价格风险。",
    recommendation: "建议备库",
    priceTrend: "上涨",
    riskLevel: "中等",
    createdAt: new Date("2025-03-17"),
  },
  {
    id: 2,
    title: "2025年3月第二周硫磺采购分析报告",
    reportDate: "2025-03-10",
    summary: "进口硫磺到港量稳定，国内需求有所增加。短期内价格预计维持高位震荡。",
    recommendation: "观望",
    priceTrend: "震荡",
    riskLevel: "中等",
    createdAt: new Date("2025-03-10"),
  },
  {
    id: 3,
    title: "2025年3月第一周硫磺采购分析报告",
    reportDate: "2025-03-03",
    summary: "国际硫磺市场供应充足，价格相对稳定。建议按需采购，无需大量囤货。",
    recommendation: "按需采购",
    priceTrend: "稳定",
    riskLevel: "低",
    createdAt: new Date("2025-03-03"),
  },
  {
    id: 4,
    title: "2025年2月第四周硫磺采购分析报告",
    reportDate: "2025-02-24",
    summary: "春节后市场逐步恢复，硫磺需求回暖。预计3月份价格将有小幅上涨。",
    recommendation: "适当备库",
    priceTrend: "小幅上涨",
    riskLevel: "低",
    createdAt: new Date("2025-02-24"),
  },
]

/**
 * 获取所有采购报告
 */
export async function getReports(): Promise<PurchaseReport[]> {
  if (db) {
    return await db.select().from(purchaseReports).orderBy(desc(purchaseReports.reportDate))
  }
  return mockReports
}
