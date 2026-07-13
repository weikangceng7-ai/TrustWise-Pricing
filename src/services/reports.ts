import { type PurchaseReport, type NewPurchaseReport } from "@/db/schema"

export type ReportType = "weekly" | "monthly" | "supplier" | "inventory" | "special"
export type PriceTrend = "上涨" | "下跌" | "稳定" | "震荡" | "小幅上涨" | "小幅下跌"
export type RiskLevel = "高" | "中等" | "低"
export type Recommendation = "建议备库" | "观望" | "按需采购" | "适当备库" | "紧急采购"

export interface ReportFilters {
  type?: ReportType
  startDate?: string
  endDate?: string
  keyword?: string
  trend?: PriceTrend
  risk?: RiskLevel
}

export interface ReportStats {
  total: number
  thisWeek: number
  thisMonth: number
  pending: number
  byType: Record<string, number>
  byTrend: Record<string, number>
  lastUpdated?: string
  thisWeekTrend?: "up" | "down" | "neutral"
  thisMonthTrend?: "up" | "down" | "neutral"
}

// 动态报告数据（从 API 获取）
let cachedReports: PurchaseReport[] = []
let cachedStats: ReportStats | null = null
let lastFetchTime: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

// 从 daily-data API 获取报告数据（客户端）
async function fetchDailyReportData(): Promise<{ reports: PurchaseReport[], stats: ReportStats }> {
  const now = Date.now()

  // 如果缓存有效，直接返回缓存数据
  if (cachedReports.length > 0 && cachedStats && (now - lastFetchTime) < CACHE_DURATION) {
    return { reports: cachedReports, stats: cachedStats }
  }

  try {
    const res = await fetch("/api/reports/daily-data?days=90")
    if (!res.ok) throw new Error("获取每日报告数据失败")

    const data = await res.json()

    if (data.success) {
      cachedReports = data.data || []
      cachedStats = data.stats || null
      lastFetchTime = now
    }

    return { reports: cachedReports, stats: cachedStats || getDefaultStats() }
  } catch (error) {
    console.error("获取每日报告数据失败:", error)
    // 返回默认数据
    return { reports: getFallbackReports(), stats: getDefaultStats() }
  }
}

function getDefaultStats(): ReportStats {
  return {
    total: 0,
    thisWeek: 0,
    thisMonth: 0,
    pending: 0,
    byType: {},
    byTrend: {},
  }
}

// 备用报告数据（API 获取失败时返回空数组，前端处理空状态）
function getFallbackReports(): PurchaseReport[] {
  return []
}

// 客户端获取报告数据
export async function getReports(filters?: ReportFilters): Promise<PurchaseReport[]> {
  const { reports } = await fetchDailyReportData()
  let filteredReports = reports

  if (filters) {
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase()
      filteredReports = filteredReports.filter(
        (r) =>
          r.title.toLowerCase().includes(keyword) ||
          r.summary.toLowerCase().includes(keyword)
      )
    }

    if (filters.startDate) {
      filteredReports = filteredReports.filter((r) => r.reportDate >= filters.startDate!)
    }

    if (filters.endDate) {
      filteredReports = filteredReports.filter((r) => r.reportDate <= filters.endDate!)
    }

    if (filters.trend) {
      filteredReports = filteredReports.filter((r) => r.priceTrend === filters.trend)
    }

    if (filters.risk) {
      filteredReports = filteredReports.filter((r) => r.riskLevel === filters.risk)
    }
  }

  return filteredReports.sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())
}

export async function getReportById(id: number): Promise<PurchaseReport | null> {
  const { reports } = await fetchDailyReportData()
  return reports.find((r) => r.id === id) || null
}

export async function getReportStats(): Promise<ReportStats> {
  const { stats } = await fetchDailyReportData()
  return stats
}

export async function createReport(report: Omit<NewPurchaseReport, "id" | "createdAt">): Promise<PurchaseReport> {
  // 创建报告时清除缓存，下次获取时会重新加载
  cachedReports = []
  cachedStats = null

  const newReport: PurchaseReport = {
    id: Date.now(),
    title: report.title,
    reportDate: report.reportDate,
    summary: report.summary,
    recommendation: report.recommendation ?? null,
    priceTrend: report.priceTrend ?? null,
    riskLevel: report.riskLevel ?? null,
    createdAt: new Date(),
  }

  return newReport
}

export async function deleteReport(id: number): Promise<boolean> {
  // 删除报告时清除缓存
  cachedReports = []
  cachedStats = null

  return true
}

// 清除缓存（用于手动刷新）
export function clearReportCache() {
  cachedReports = []
  cachedStats = null
  lastFetchTime = 0
}