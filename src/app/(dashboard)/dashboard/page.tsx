"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { TrendingUp, TrendingDown, Minus, Package, DollarSign, BarChart3, AlertTriangle, ChevronRight, FileText, ArrowRight, ArrowUpRight, Activity, Zap, Target, Layers, Scale, Network, MessageSquareText, Bell, Key, ChevronDown } from "lucide-react"
import Link from "next/link"
import { getBackgroundImage } from "@/config/images"
import type { Report } from "@/hooks/use-reports"
import { COMMODITY_CODES, COMMODITY_INFO, type CommodityCode } from "@/db/schema-commodity"

// 品种颜色映射
const COMMODITY_COLORS: Record<CommodityCode, {
  card: string; border: string; icon: string; dot: string
}> = {
  sulfur:    { card: "from-cyan-50 to-blue-50 dark:from-cyan-500/10 dark:to-blue-500/10", border: "border-cyan-200/50 dark:border-cyan-500/20", icon: "text-cyan-600 dark:text-cyan-400", dot: "bg-cyan-500" },
  phosphate: { card: "from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10", border: "border-violet-200/50 dark:border-violet-500/20", icon: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500" },
  potash:    { card: "from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10", border: "border-amber-200/50 dark:border-amber-500/20", icon: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  urea:      { card: "from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10", border: "border-emerald-200/50 dark:border-emerald-500/20", icon: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
}

// 品种相关数据映射
const COMMODITY_DASHBOARD_DATA: Record<CommodityCode, {
  avgPrice: string
  priceLabel: string
  trend: string
  trendDirection: "up" | "down" | "flat"
  trendValue: string
  marketHeat: string
  marketHeatLabel: string
  risk: string
  riskLabel: string
  enterprisePrices: Array<{ id: string; name: string; price: string; trend: string }>
  marketInsight: string
}> = {
  sulfur: {
    avgPrice: "¥1,850",
    priceLabel: "硫磺港口现货均价",
    trend: "上涨",
    trendDirection: "up",
    trendValue: "+3.2%",
    marketHeat: "活跃",
    marketHeatLabel: "需求旺盛",
    risk: "中等",
    riskLabel: "关注运费",
    enterprisePrices: [
      { id: "A", name: "企业A", price: "¥1,880", trend: "up" },
      { id: "B", name: "企业B", price: "¥1,820", trend: "up" },
      { id: "C", name: "企业C", price: "¥1,750", trend: "rise" },
    ],
    marketInsight: "硫磺价格受磷肥需求带动走强，关注港口库存及进口船期，预计短期高位震荡。建议关注下游磷肥开工率及国际硫磺供应动态。",
  },
  phosphate: {
    avgPrice: "¥1,080",
    priceLabel: "磷矿出厂均价",
    trend: "震荡",
    trendDirection: "flat",
    trendValue: "+1.5%",
    marketHeat: "温和",
    marketHeatLabel: "供需平衡",
    risk: "低",
    riskLabel: "供应稳定",
    enterprisePrices: [
      { id: "A", name: "企业A", price: "¥1,120", trend: "up" },
      { id: "B", name: "企业B", price: "¥1,050", trend: "up" },
      { id: "C", name: "企业C", price: "¥1,010", trend: "rise" },
    ],
    marketInsight: "国内磷矿供应充裕，下游磷肥开工率回升带动需求温和增长。短期价格以稳为主，关注环保限产政策对矿山开工的影响。",
  },
  potash: {
    avgPrice: "¥3,500",
    priceLabel: "钾肥进口均价",
    trend: "上涨",
    trendDirection: "up",
    trendValue: "+5.8%",
    marketHeat: "旺盛",
    marketHeatLabel: "进口偏紧",
    risk: "高",
    riskLabel: "关注海运",
    enterprisePrices: [
      { id: "A", name: "企业A", price: "¥3,580", trend: "up" },
      { id: "B", name: "企业B", price: "¥3,480", trend: "up" },
      { id: "C", name: "企业C", price: "¥3,320", trend: "rise" },
    ],
    marketInsight: "国际钾肥价格受俄乌冲突及白俄罗斯供应受限影响持续走高。国内港口库存偏低，进口到货量不足，预计短期价格难以下跌。",
  },
  urea: {
    avgPrice: "¥2,350",
    priceLabel: "尿素出厂均价",
    trend: "下跌",
    trendDirection: "down",
    trendValue: "-2.1%",
    marketHeat: "疲软",
    marketHeatLabel: "需求低迷",
    risk: "低",
    riskLabel: "供应过剩",
    enterprisePrices: [
      { id: "A", name: "企业A", price: "¥2,320", trend: "up" },
      { id: "B", name: "企业B", price: "¥2,380", trend: "up" },
      { id: "C", name: "企业C", price: "¥2,290", trend: "rise" },
    ],
    marketInsight: "国内尿素产能过剩，农业需求进入淡季，工业需求增长有限。出口窗口期未开，短期价格承压，建议关注印标动态。",
  },
}

// 品种选择器组件
function CommoditySelector({
  selected,
  onChange,
}: {
  selected: CommodityCode
  onChange: (code: CommodityCode) => void
}) {
  const [open, setOpen] = useState(false)

  const current = COMMODITY_INFO[selected]
  const items = Object.entries(COMMODITY_INFO) as [CommodityCode, typeof current][]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-white/15 transition-all"
      >
        <div className={`w-2 h-2 rounded-full ${selected === "sulfur" ? "bg-cyan-500" : selected === "phosphate" ? "bg-violet-500" : selected === "potash" ? "bg-amber-500" : "bg-emerald-500"}`} />
        {current.name}
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-50 w-48 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1">
            {items.map(([code, info]) => (
              <button
                key={code}
                onClick={() => {
                  onChange(code)
                  setOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 ${
                  selected === code ? "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" : "text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${code === "sulfur" ? "bg-cyan-500" : code === "phosphate" ? "bg-violet-500" : code === "potash" ? "bg-amber-500" : "bg-emerald-500"}`} />
                <div className="flex-1 text-left">
                  <div className="font-medium">{info.name}</div>
                  <div className="text-xs text-slate-400">{info.category}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function getRiskColor(risk: string | null) {
  if (risk === "高") return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
  if (risk === "中等") return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
}

const ENTERPRISE_COLORS = {
  cyan: {
    bg: "bg-cyan-50/50 dark:bg-cyan-500/10",
    border: "border-cyan-200/50 dark:border-cyan-500/20",
    circle: "bg-cyan-100 dark:bg-cyan-500/20",
    text: "text-cyan-700 dark:text-cyan-300",
  },
  violet: {
    bg: "bg-violet-50/50 dark:bg-violet-500/10",
    border: "border-violet-200/50 dark:border-violet-500/20",
    circle: "bg-violet-100 dark:bg-violet-500/20",
    text: "text-violet-700 dark:text-violet-300",
  },
  amber: {
    bg: "bg-amber-50/50 dark:bg-amber-500/10",
    border: "border-amber-200/50 dark:border-amber-500/20",
    circle: "bg-amber-100 dark:bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-300",
  },
}

function ReportCarouselInline() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ["dashboard-reports"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/reports?limit=5")
        const data = await res.json()
        return (data.data || []) as Report[]
      } catch {
        return [] as Report[]
      }
    },
  })

  const reports = reportsData || []

  if (isLoading) {
    return <div className="animate-pulse text-slate-400 text-sm py-4">加载中...</div>
  }

  if (reports.length === 0) {
    return <div className="text-slate-400 text-sm py-4">暂无报告</div>
  }

  const currentReport = reports[currentIndex]

  return (
    <div className="flex flex-col h-full min-h-0 w-full">
      <div className="p-2 rounded-lg bg-white/80 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 flex-1 flex flex-col min-h-0 w-full">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {currentReport.title}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${getRiskColor(currentReport.riskLevel)}`}>
            {currentReport.riskLevel || "低"}
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed flex-1">
          {currentReport.summary}
        </p>
        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          {currentReport.reportDate}
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 px-1">
        <div className="flex gap-1">
          {reports.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex ? "bg-cyan-500 w-3" : "bg-slate-300 dark:bg-slate-600"
              }`}
            />
          ))}
        </div>
        <Link href="/reports" className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 hover:text-cyan-700">
          更多 <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}

function EnterprisePredictionOverviewCompact({
  enterprises,
}: {
  enterprises: Array<{ id: string; name: string; price: string; trend: string }>
}) {
  const colorKeys = ["cyan", "violet", "amber"] as const

  // 动态计算均价
  const numericPrices = enterprises
    .map((e) => parseFloat(e.price.replace(/[¥,]/g, "")))
    .filter((n) => !isNaN(n))
  const avgPrice = numericPrices.length > 0
    ? `¥${Math.round(numericPrices.reduce((a, b) => a + b, 0) / numericPrices.length).toLocaleString()}`
    : "¥0"

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">企业价格预测</h3>
        <Link href="/enterprises" className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 hover:text-cyan-700">
          详情 <ChevronRight className="h-2.5 w-2.5" />
        </Link>
      </div>
      <div className="space-y-3 flex-1 flex flex-col">
        {enterprises.map((enterprise, idx) => {
          const colors = ENTERPRISE_COLORS[colorKeys[idx % colorKeys.length]]
          return (
            <div
              key={enterprise.id}
              className={`flex items-center justify-between p-3 rounded-lg ${colors.bg} ${colors.border}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full ${colors.circle} flex items-center justify-center`}>
                  <span className={`text-sm font-bold ${colors.text}`}>{enterprise.id}</span>
                </div>
                <span className="text-sm text-slate-700 dark:text-slate-300">{enterprise.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-medium text-slate-900 dark:text-white">{enterprise.price}</span>
                {enterprise.trend === "rise" ? (
                  <TrendingUp className="h-4 w-4 text-rose-500" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
        <p className="text-sm text-slate-500 dark:text-slate-400">平均预测价格：<span className="font-medium text-cyan-600 dark:text-cyan-400">{avgPrice}</span>/吨</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [commodity, setCommodity] = useState<CommodityCode>("sulfur")
  const data = COMMODITY_DASHBOARD_DATA[commodity]
  const colors = COMMODITY_COLORS[commodity]
  const bgImage = getBackgroundImage("dashboardBackground")

  return (
    <div className="min-h-screen relative overflow-hidden pb-16 bg-slate-50 dark:bg-[#0a0a1a]">
      {/* 背景图片 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      {/* 背景遮罩层 */}
      <div className="absolute inset-0 bg-white/80 dark:bg-[#0a0a1a]/80 backdrop-blur-sm" />

      {/* 背景渐变和光晕效果 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 顶部紫色光晕 */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-300/30 dark:bg-purple-600/20 blur-[120px] rounded-full" />
        {/* 右上角蓝色光晕 */}
        <div className="absolute top-20 right-0 w-[300px] h-[300px] bg-blue-200/30 dark:bg-blue-500/15 blur-[100px] rounded-full" />
        {/* 左下角青色光晕 */}
        <div className="absolute bottom-40 left-0 w-[250px] h-[250px] bg-cyan-200/30 dark:bg-cyan-500/10 blur-[80px] rounded-full" />
      </div>

      <div className="relative px-3 pt-3 pb-3 max-w-full h-[calc(100vh-60px)] flex flex-col">
        {/* 品种选择栏 */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Dashboard</h2>
          <CommoditySelector selected={commodity} onChange={setCommodity} />
        </div>

        {/* 统计概览四卡片 - 平铺整行 */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {/* 当前均价 */}
          <div className={`bg-gradient-to-br ${colors.card} backdrop-blur-sm rounded-lg p-3 border ${colors.border}`}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm text-slate-500 dark:text-slate-400">均价</span>
              <DollarSign className={`h-4 w-4 ${colors.icon}`} />
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg font-bold text-slate-900 dark:text-white">{data.avgPrice}</span>
            </div>
            <div className="flex items-center gap-0.5 mt-0.5">
              {data.trendDirection === "up" ? <TrendingUp className="h-2.5 w-2.5 text-emerald-500" /> : data.trendDirection === "down" ? <TrendingDown className="h-2.5 w-2.5 text-rose-500" /> : <Minus className="h-2.5 w-2.5 text-slate-400" />}
              <span className={`text-xs ${data.trendDirection === "up" ? "text-emerald-600" : data.trendDirection === "down" ? "text-rose-600" : "text-slate-500"}`}>{data.trendValue}</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{data.priceLabel}</p>
          </div>

          {/* 月度趋势 */}
          <div className={`bg-gradient-to-br ${colors.card} backdrop-blur-sm rounded-lg p-3 border ${colors.border}`}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm text-slate-500 dark:text-slate-400">趋势</span>
              {data.trendDirection === "up" ? <TrendingUp className={`h-4 w-4 ${colors.icon}`} /> : data.trendDirection === "down" ? <TrendingDown className={`h-4 w-4 ${colors.icon}`} /> : <Minus className={`h-4 w-4 ${colors.icon}`} />}
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">{data.trend}</span>
            <div className="flex items-center gap-0.5 mt-0.5">
              <Activity className={`h-2.5 w-2.5 ${colors.icon}`} />
              <span className="text-xs text-slate-500">近30日走势</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">月度价格趋势判断</p>
          </div>

          {/* 市场热度 */}
          <div className={`bg-gradient-to-br ${colors.card} backdrop-blur-sm rounded-lg p-3 border ${colors.border}`}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm text-slate-500 dark:text-slate-400">热度</span>
              <Zap className={`h-4 w-4 ${colors.icon}`} />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">{data.marketHeat}</span>
            <div className="flex items-center gap-0.5 mt-0.5">
              <div className="flex -space-x-0.5">
                <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                <div className={`w-2 h-2 rounded-full ${colors.dot} opacity-70`} />
                <div className={`w-2 h-2 rounded-full ${colors.dot} opacity-40`} />
              </div>
              <span className="text-xs text-slate-500">{data.marketHeatLabel}</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">采购需求活跃度</p>
          </div>

          {/* 风险等级 */}
          <div className={`bg-gradient-to-br ${colors.card} backdrop-blur-sm rounded-lg p-3 border ${colors.border}`}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm text-slate-500 dark:text-slate-400">风险</span>
              <AlertTriangle className={`h-4 w-4 ${colors.icon}`} />
            </div>
            <span className={`text-lg font-bold ${data.risk === "高" ? "text-rose-600 dark:text-rose-400" : data.risk === "中等" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>{data.risk}</span>
            <div className="flex items-center gap-0.5 mt-0.5">
              <Target className={`h-2.5 w-2.5 ${colors.icon}`} />
              <span className="text-xs text-slate-500">{data.riskLabel}</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">采购决策风险评估</p>
          </div>
        </div>

        {/* 主内容区域：左列、右列各占一半，占满页面 */}
        <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
          {/* 左列 - 功能模块入口、市场洞察和价格知识图谱 */}
          <div className="space-y-3 flex flex-col flex-1 min-h-0">
            {/* 功能模块入口 - 纵向排列 */}
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white px-1">功能模块</h3>
              <Link href="/yihua-code-graph" className="group flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-violet-500/10 to-violet-500/5 dark:from-violet-500/5 dark:to-violet-500/2 hover:from-violet-500/15 dark:hover:from-violet-500/10 border border-violet-200/50 dark:border-violet-500/20 transition-all duration-200">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Network className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">价格知识图谱</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">市场资讯·企业经验·制度规则</div>
                </div>
                <ChevronRight className="h-4 w-4 text-violet-400 ml-auto shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link href="/agent-chat" className="group flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-amber-500/5 dark:from-amber-500/5 dark:to-amber-500/2 hover:from-amber-500/15 dark:hover:from-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 transition-all duration-200">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <MessageSquareText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">Agent 决策助手</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">智能采购决策支持</div>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-400 ml-auto shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link href="/tracker" className="group flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-500/5 dark:from-blue-500/5 dark:to-blue-500/2 hover:from-blue-500/15 dark:hover:from-blue-500/10 border border-blue-200/50 dark:border-blue-500/20 transition-all duration-200">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">Tracker 追踪</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">价格追踪与异动预警</div>
                </div>
                <ChevronRight className="h-4 w-4 text-blue-400 ml-auto shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link href="/reports" className="group flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/5 dark:to-emerald-500/2 hover:from-emerald-500/15 dark:hover:from-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 transition-all duration-200">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">采购报告单</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">历史报告与数据分析</div>
                </div>
                <ChevronRight className="h-4 w-4 text-emerald-400 ml-auto shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link href="/api-console" className="group flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-rose-500/10 to-rose-500/5 dark:from-rose-500/5 dark:to-rose-500/2 hover:from-rose-500/15 dark:hover:from-rose-500/10 border border-rose-200/50 dark:border-rose-500/20 transition-all duration-200">
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Key className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">API Console</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">API Key 管理与文档</div>
                </div>
                <ChevronRight className="h-4 w-4 text-rose-400 ml-auto shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* 多品种扩展预览 */}
            <div className="rounded-lg p-2.5 bg-white/50 dark:bg-white/3 border border-slate-200/50 dark:border-white/5">
              <div className="flex items-center gap-2 mb-2 px-1">
                <Layers className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">品种覆盖</span>
                <span className="text-[10px] px-1 py-0.5 rounded bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">扩展中</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.entries(COMMODITY_INFO) as [CommodityCode, typeof COMMODITY_INFO[CommodityCode]][]).map(([code, info]) => {
                  const isActive = code === commodity
                  const activeStyles: Record<string, { card: string; text: string; subtext: string }> = {
                    sulfur: {
                      card: "bg-cyan-50/50 dark:bg-cyan-500/10 border-cyan-200/50 dark:border-cyan-500/20",
                      text: "text-cyan-700 dark:text-cyan-300",
                      subtext: "text-cyan-500",
                    },
                    phosphate: {
                      card: "bg-violet-50/50 dark:bg-violet-500/10 border-violet-200/50 dark:border-violet-500/20",
                      text: "text-violet-700 dark:text-violet-300",
                      subtext: "text-violet-500",
                    },
                    potash: {
                      card: "bg-amber-50/50 dark:bg-amber-500/10 border-amber-200/50 dark:border-amber-500/20",
                      text: "text-amber-700 dark:text-amber-300",
                      subtext: "text-amber-500",
                    },
                    urea: {
                      card: "bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20",
                      text: "text-emerald-700 dark:text-emerald-300",
                      subtext: "text-emerald-500",
                    },
                  }
                  const styles = activeStyles[code]
                  return (
                    <button
                      key={code}
                      onClick={() => setCommodity(code)}
                      className={`text-center py-2 rounded-lg border transition-all duration-200 cursor-pointer ${
                        isActive
                          ? styles.card
                          : "bg-slate-50/50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-700/20 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div className={`text-xs font-semibold ${isActive ? styles.text : "text-slate-500 dark:text-slate-400"}`}>
                        {info.name}
                      </div>
                      <div className={`text-[10px] mt-0.5 ${isActive ? styles.subtext : "text-slate-400 dark:text-slate-500"}`}>
                        {isActive ? <span className="inline-flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />已选中</span> : "切换"}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 市场洞察 */}
            <div className={`bg-gradient-to-br ${colors.card} backdrop-blur-sm rounded-lg p-3 border ${colors.border}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0 ${commodity === "sulfur" ? "from-cyan-500 to-blue-500" : commodity === "phosphate" ? "from-violet-500 to-purple-500" : commodity === "potash" ? "from-amber-500 to-orange-500" : "from-emerald-500 to-green-500"}`}>
                  <Layers className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">市场洞察</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                {data.marketInsight}
              </p>
              <Link href="/agent-chat" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors">
                深入分析
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* 价格知识图谱 - flex-1 占满剩余空间 */}
            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-slate-200 dark:border-white/10 shadow-sm flex-1 flex flex-col min-h-[340px]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  <h3 className="text-slate-900 dark:text-white font-medium text-sm">价格知识图谱</h3>
                </div>
                <Link href="/yihua-code-graph" className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-1 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors">
                  详情 <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              {/* 知识图谱可视化 - 占满剩余高度 */}
              <div className="relative flex-1 min-h-0 rounded-lg bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900/50 dark:via-slate-800/30 dark:to-slate-900/50 border border-slate-200 dark:border-white/5 overflow-hidden">
                {/* 动态连接线 */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                  <defs>
                    <linearGradient id="flowGradientSupply" gradientUnits="userSpaceOnUse" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.7" />
                    </linearGradient>
                    <linearGradient id="flowGradientDemand" gradientUnits="userSpaceOnUse" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.7" />
                    </linearGradient>
                    <linearGradient id="flowGradientCost" gradientUnits="userSpaceOnUse" x1="100%" y1="0%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.7" />
                    </linearGradient>
                    <linearGradient id="flowGradientPolicy" gradientUnits="userSpaceOnUse" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.7" />
                    </linearGradient>
                  </defs>
                  <line x1="50%" y1="20%" x2="50%" y2="40%" stroke="url(#flowGradientSupply)" strokeWidth="2" strokeLinecap="round" />
                  <line x1="50%" y1="60%" x2="50%" y2="80%" stroke="url(#flowGradientDemand)" strokeWidth="2" strokeLinecap="round" />
                  <line x1="22%" y1="50%" x2="40%" y2="50%" stroke="url(#flowGradientCost)" strokeWidth="2" strokeLinecap="round" />
                  <line x1="60%" y1="50%" x2="78%" y2="50%" stroke="url(#flowGradientPolicy)" strokeWidth="2" strokeLinecap="round" />
                </svg>

                {/* 中心节点 - 价格 */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ zIndex: 10 }}>
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-200 via-blue-100 to-cyan-100 dark:from-cyan-500/50 dark:via-blue-500/40 dark:to-cyan-500/50 border-2 border-cyan-500 dark:border-cyan-400/70 flex items-center justify-center shadow-lg animate-pulse" style={{ animationDuration: '2s' }}>
                    <div className="text-center">
                      <DollarSign className="h-6 w-6 text-cyan-700 dark:text-cyan-200 mx-auto" />
                      <span className="text-sm text-slate-800 dark:text-white font-bold">价格</span>
                    </div>
                  </div>
                </div>

                {/* 上方节点 - 供给 */}
                <div className="absolute top-[10%] left-1/2 -translate-x-1/2" style={{ zIndex: 10 }}>
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-200 to-green-100 dark:from-emerald-500/50 dark:to-green-500/40 border border-emerald-500 dark:border-emerald-400/60 flex items-center justify-center shadow-sm">
                    <div className="text-center">
                      <Package className="h-5 w-5 text-emerald-700 dark:text-emerald-200 mx-auto" />
                      <span className="text-[10px] text-slate-800 dark:text-white font-bold">供给</span>
                    </div>
                  </div>
                </div>

                {/* 下方节点 - 需求 */}
                <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2" style={{ zIndex: 10 }}>
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-200 to-purple-100 dark:from-violet-500/50 dark:to-purple-500/40 border border-violet-500 dark:border-violet-400/60 flex items-center justify-center shadow-sm">
                    <div className="text-center">
                      <TrendingUp className="h-5 w-5 text-violet-700 dark:text-violet-200 mx-auto" />
                      <span className="text-[10px] text-slate-800 dark:text-white font-bold">需求</span>
                    </div>
                  </div>
                </div>

                {/* 左侧节点 - 成本 */}
                <div className="absolute top-1/2 left-[15%] -translate-y-1/2" style={{ zIndex: 10 }}>
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-200 to-orange-100 dark:from-amber-500/50 dark:to-orange-500/40 border border-amber-500 dark:border-amber-400/60 flex items-center justify-center shadow-sm">
                    <div className="text-center">
                      <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-200 mx-auto" />
                      <span className="text-[10px] text-slate-800 dark:text-white font-bold">成本</span>
                    </div>
                  </div>
                </div>

                {/* 右侧节点 - 政策 */}
                <div className="absolute top-1/2 right-[15%] -translate-y-1/2" style={{ zIndex: 10 }}>
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-200 to-pink-100 dark:from-rose-500/50 dark:to-pink-500/40 border border-rose-500 dark:border-rose-400/60 flex items-center justify-center shadow-sm">
                    <div className="text-center">
                      <Scale className="h-5 w-5 text-rose-700 dark:text-rose-200 mx-auto" />
                      <span className="text-[10px] text-slate-800 dark:text-white font-bold">政策</span>
                    </div>
                  </div>
                </div>

                {/* 图谱说明 */}
                <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-300 dark:border-slate-600 text-xs text-slate-500 dark:text-slate-400" style={{ zIndex: 15 }}>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                    <span>能量流动</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右列 - 采购周报和企业价格预测 */}
          <div className="space-y-3 flex flex-col flex-1 min-h-0">
            {/* 采购周报 */}
            <div className="bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-cyan-500/10 dark:from-cyan-500/5 dark:via-violet-500/5 dark:to-cyan-500/5 backdrop-blur-sm rounded-lg p-3 border border-cyan-200/50 dark:border-cyan-500/20 flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">采购周报</h3>
              </div>
              <div className="flex-1 min-h-0">
                <ReportCarouselInline />
              </div>
            </div>

            {/* 企业价格预测 - flex-1 占满剩余空间 */}
            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-slate-200 dark:border-white/10 shadow-sm flex-1 flex flex-col min-h-0">
              <EnterprisePredictionOverviewCompact enterprises={data.enterprisePrices} />
            </div>
          </div>
        </div>
      </div>

      </div>
  )
}
