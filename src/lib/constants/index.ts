// 系统名称常量
export const SYSTEM_NAME = "硫磺督价与采购智能决策系统"
export const SYSTEM_NAME_SHORT = "硫磺督价与采购"

// 颜色常量
export const COLORS = ['cyan', 'violet', 'amber', 'emerald', 'rose', 'blue'] as const
export type Color = typeof COLORS[number]

// 价格趋势常量
export const PRICE_TRENDS = ['上涨', '小幅上涨', '下跌', '小幅下跌', '稳定', '震荡'] as const
export type PriceTrend = typeof PRICE_TRENDS[number]

// 风险等级常量
export const RISK_LEVELS = ['高', '中等', '低'] as const
export type RiskLevel = typeof RISK_LEVELS[number]

// 采购建议常量
export const RECOMMENDATIONS = ['建议备库', '紧急采购', '适当备库', '观望', '按需采购'] as const
export type Recommendation = typeof RECOMMENDATIONS[number]

// 外部数据源请求超时（毫秒）
export const EXTERNAL_FETCH_TIMEOUT_MS = 3000
export const REPORT_FETCH_TIMEOUT_MS = 1500

// 外部数据源分源配置（超时毫秒 + 缓存新鲜期秒）
// 缓存新鲜期与前端 React Query 的 staleTime 对齐（use-external-data.ts）
export const DATA_SOURCE_CONFIG = {
  usdcny: { timeoutMs: 8000, cacheTtlSeconds: 30 * 60 }, // 汇率 30 分钟
  oil: { timeoutMs: 8000, cacheTtlSeconds: 2 * 60 * 60 }, // 原油 2 小时
  brent: { timeoutMs: 8000, cacheTtlSeconds: 2 * 60 * 60 }, // 布伦特 2 小时
  fred: { timeoutMs: 8000, cacheTtlSeconds: 2 * 60 * 60 }, // 宏观指标 2 小时
  bdi: { timeoutMs: 15000, cacheTtlSeconds: 2 * 60 * 60 }, // BDI 2 小时
  spot: { timeoutMs: 15000, cacheTtlSeconds: 6 * 60 * 60 }, // 现货 6 小时
  gdelt: { timeoutMs: 8000, cacheTtlSeconds: 2 * 60 * 60 }, // 新闻 2 小时
  firecrawl: { timeoutMs: 30000, cacheTtlSeconds: 4 * 60 * 60 }, // 网页爬取 4 小时
} as const

export type DataSourceKey = keyof typeof DATA_SOURCE_CONFIG

// 颜色样式映射
export const COLOR_STYLES: Record<Color, {
  bg: string
  border: string
  shadow: string
  text: string
  glow: string
}> = {
  cyan: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    shadow: "shadow-cyan-500/10",
    text: "text-cyan-400",
    glow: "bg-cyan-400/30",
  },
  violet: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    shadow: "shadow-violet-500/10",
    text: "text-violet-400",
    glow: "bg-violet-400/30",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    shadow: "shadow-amber-500/10",
    text: "text-amber-400",
    glow: "bg-amber-400/30",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    shadow: "shadow-emerald-500/10",
    text: "text-emerald-400",
    glow: "bg-emerald-400/30",
  },
  rose: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    shadow: "shadow-rose-500/10",
    text: "text-rose-400",
    glow: "bg-rose-400/30",
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    shadow: "shadow-blue-500/10",
    text: "text-blue-400",
    glow: "bg-blue-400/30",
  },
}