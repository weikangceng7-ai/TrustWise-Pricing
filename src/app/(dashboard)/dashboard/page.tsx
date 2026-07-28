"use client"

import { useState, useMemo, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { TrendingUp, TrendingDown, Minus, Package, DollarSign, BarChart3, AlertTriangle, ChevronRight, FileText, ArrowRight, ArrowUpRight, Activity, Zap, Target, Layers, Scale, ChevronDown, Loader2, Wand2, Building2 } from "lucide-react"
import Link from "next/link"
import { getBackgroundImage } from "@/config/images"
import type { Report } from "@/hooks/use-reports"
import { usePriceSummary, useInventorySummary } from "@/hooks/use-prices"
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
  enterprises: Array<{ id: string; name: string; price: string; trend: string; source?: string }>
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
        {enterprises[0]?.source && (
          <p className="text-[10px] text-slate-300/70 dark:text-slate-600/70 mt-0.5">来源: {enterprises[0].source}</p>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [commodity, setCommodity] = useState<CommodityCode>("sulfur")

  // 从真实 API 获取价格摘要和库存摘要
  const priceSummary = usePriceSummary(commodity)
  const inventorySummary = useInventorySummary(commodity)

  // 获取企业价格预测数据
  const enterprisePredictions = useQuery({
    queryKey: ["enterprisePredictions", commodity],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/enterprises/predictions?commodity=${commodity}`)
        const data = await res.json()
        return (data.data || []) as Array<{ id: string; name: string; price: string; trend: string; source?: string }>
      } catch {
        return []
      }
    },
  })

  // 从 API 数据计算展示值，API 不可用时显示加载/空状态
  const data = useMemo(() => {
    const priceData = priceSummary.data?.data
    const invData = inventorySummary.data?.data
    const epData = enterprisePredictions.data || []

    if (priceData?.currentPrice) {
      const currentPrice = Number(priceData.currentPrice)
      const changePercent = priceData.changePercent ? Number(priceData.changePercent) : 0

      const trendDirection = (changePercent > 1 ? "up" : changePercent < -1 ? "down" : "flat") as "up" | "down" | "flat"
      const inventoryLevel = invData?.currentInventory ? Number(invData.currentInventory) : null
      const marketHeat = inventoryLevel ? (inventoryLevel > 500000 ? "旺盛" : inventoryLevel > 200000 ? "活跃" : "温和") : "暂无数据"
      const marketHeatLabel = inventoryLevel ? (inventoryLevel > 500000 ? "需求旺盛" : inventoryLevel > 200000 ? "供需平衡" : "需求一般") : "待接入库存数据"
      const risk = changePercent > 3 ? "高" : changePercent > 1 ? "中等" : "低"
      const riskLabel = changePercent > 3 ? "波动较大" : changePercent > 1 ? "关注走势" : "相对稳定"

      // 根据真实数据动态生成市场洞察
      const insightParts: string[] = []
      const name = COMMODITY_INFO[commodity].name
      if (changePercent > 2) insightParts.push(`${name}价格近期上涨${changePercent.toFixed(1)}%，需关注成本压力。`)
      else if (changePercent < -2) insightParts.push(`${name}价格近期下跌${Math.abs(changePercent).toFixed(1)}%，采购窗口有利。`)
      else insightParts.push(`${name}价格近期相对平稳，按需采购为主。`)
      if (inventoryLevel) insightParts.push(`当前港口库存约${(inventoryLevel / 10000).toFixed(1)}万吨。`)
      if (changePercent > 3) insightParts.push("建议关注下游开工率及国际供应动态，控制采购节奏。")
      else if (changePercent < -3) insightParts.push("可适当增加采购量，锁定低成本库存。")

      // 计算数据新鲜度
      let freshness = "未知"
      if (priceData?.date) {
        const dataDate = new Date(priceData.date)
        const today = new Date()
        const diffDays = Math.floor((today.getTime() - dataDate.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 0) freshness = "今日更新"
        else if (diffDays === 1) freshness = "1 天前"
        else freshness = `${diffDays} 天前`
      }
      const priceSource = priceData?.source || "未知来源"
      const invSource = invData?.source || "暂无库存数据"

      return {
        avgPrice: `¥${currentPrice.toLocaleString()}`,
        priceLabel: COMMODITY_INFO[commodity].name + (priceData.market ? ` ${priceData.market}` : "现货均价"),
        trend: changePercent > 1 ? "上涨" : changePercent < -1 ? "下跌" : "震荡",
        trendDirection,
        trendValue: `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%`,
        marketHeat,
        marketHeatLabel,
        risk,
        riskLabel,
        enterprisePrices: epData,
        marketInsight: insightParts.join(""),
        freshness,
        priceSource,
        invSource,
      }
    }
    // API 数据不可用时返回空状态
    return null
  }, [commodity, priceSummary.data, inventorySummary.data, enterprisePredictions.data])

  const isLoading = priceSummary.isLoading || inventorySummary.isLoading
  const isError = priceSummary.isError || inventorySummary.isError

  // 切换品种时缓存上次有效数据，保持局部加载而非整页替换
  const cachedDataRef = useRef<typeof data>(null)
  if (data) cachedDataRef.current = data
  const displayData = data || cachedDataRef.current
  const isTransitioning = !data && !!cachedDataRef.current && isLoading

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

      <div className="relative px-3 pt-3 pb-3 max-w-full h-[calc(100vh-60px)] flex flex-col" suppressHydrationWarning>
        {/* 品种选择栏 */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Dashboard</h2>
          <CommoditySelector selected={commodity} onChange={setCommodity} />
        </div>

        {/* 初始加载状态（无缓存数据） */}
        {!displayData && (
          <div className="flex-1 flex items-center justify-center">
            {isLoading ? (
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">加载市场数据...</p>
              </div>
            ) : isError ? (
              <div className="text-center">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm text-slate-500">数据加载失败</p>
                <button
                  onClick={() => { priceSummary.refetch(); inventorySummary.refetch() }}
                  className="mt-2 text-sm text-cyan-600 hover:text-cyan-700"
                >
                  重试
                </button>
              </div>
            ) : (
              <div className="text-center">
                <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">暂无{COMMODITY_INFO[commodity].name}价格数据</p>
              </div>
            )}
          </div>
        )}

        {/* 数据展示（切换品种时保留上次数据 + 局部 loading 指示） */}
        {displayData && (
        <>
        {/* 切换品种时的加载指示条 */}
        {isTransitioning && (
          <div className="flex items-center gap-2 mb-3 px-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
            <span className="text-xs text-slate-400">正在刷新 {COMMODITY_INFO[commodity].name} 数据...</span>
          </div>
        )}
        {/* 统计概览四卡片 - 平铺整行 */}
        <div className={`grid grid-cols-4 gap-2 mb-3 transition-opacity duration-200 ${isTransitioning ? "opacity-60" : ""}`}>
          {/* 当前均价 */}
          <div className={`bg-gradient-to-br ${colors.card} backdrop-blur-sm rounded-lg p-3 border ${colors.border}`}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm text-slate-500 dark:text-slate-400">均价</span>
              <DollarSign className={`h-4 w-4 ${colors.icon}`} />
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg font-bold text-slate-900 dark:text-white">{displayData.avgPrice}</span>
            </div>
            <div className="flex items-center gap-0.5 mt-0.5">
              {displayData.trendDirection === "up" ? <TrendingUp className="h-2.5 w-2.5 text-emerald-500" /> : displayData.trendDirection === "down" ? <TrendingDown className="h-2.5 w-2.5 text-rose-500" /> : <Minus className="h-2.5 w-2.5 text-slate-400" />}
              <span className={`text-xs ${displayData.trendDirection === "up" ? "text-emerald-600" : displayData.trendDirection === "down" ? "text-rose-600" : "text-slate-500"}`}>{displayData.trendValue}</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{displayData.priceLabel}</p>
            <p className="text-[10px] mt-0.5 flex items-center gap-1">
              <span className={`px-1 py-0.5 rounded font-medium ${
                displayData.priceSource.includes("模拟") ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                displayData.priceSource.includes("推算") ? "bg-sky-500/10 text-sky-600 dark:text-sky-400" :
                "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}>
                {displayData.priceSource.includes("模拟") ? "模拟数据" : displayData.priceSource.includes("推算") ? "模型推算" : "真实数据"}
              </span>
              <span className="text-slate-400/80 dark:text-slate-500/80 truncate">来源: {displayData.priceSource}</span>
            </p>
          </div>

          {/* 月度趋势 */}
          <div className={`bg-gradient-to-br ${colors.card} backdrop-blur-sm rounded-lg p-3 border ${colors.border}`}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm text-slate-500 dark:text-slate-400">趋势</span>
              {displayData.trendDirection === "up" ? <TrendingUp className={`h-4 w-4 ${colors.icon}`} /> : displayData.trendDirection === "down" ? <TrendingDown className={`h-4 w-4 ${colors.icon}`} /> : <Minus className={`h-4 w-4 ${colors.icon}`} />}
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">{displayData.trend}</span>
            <div className="flex items-center gap-0.5 mt-0.5">
              <Activity className={`h-2.5 w-2.5 ${colors.icon}`} />
              <span className="text-xs text-slate-500">近30日走势</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">月度价格趋势判断</p>
            <p className="text-[10px] text-slate-300/70 dark:text-slate-600/70 mt-0.5">来源: {displayData.priceSource} 价格序列计算</p>
          </div>

          {/* 市场热度 */}
          <div className={`bg-gradient-to-br ${colors.card} backdrop-blur-sm rounded-lg p-3 border ${colors.border}`}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm text-slate-500 dark:text-slate-400">热度</span>
              <Zap className={`h-4 w-4 ${colors.icon}`} />
            </div>
            <span className={`text-lg font-bold ${displayData.marketHeat === "暂无数据" ? "text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-white"}`}>{displayData.marketHeat}</span>
            <div className="flex items-center gap-0.5 mt-0.5">
              <div className="flex -space-x-0.5">
                <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                <div className={`w-2 h-2 rounded-full ${colors.dot} opacity-70`} />
                <div className={`w-2 h-2 rounded-full ${colors.dot} opacity-40`} />
              </div>
              <span className="text-xs text-slate-500">{displayData.marketHeatLabel}</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">采购需求活跃度</p>
            <p className="text-[10px] text-slate-300/70 dark:text-slate-600/70 mt-0.5">来源: {displayData.invSource}</p>
          </div>

          {/* 风险等级 */}
          <div className={`bg-gradient-to-br ${colors.card} backdrop-blur-sm rounded-lg p-3 border ${colors.border}`}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm text-slate-500 dark:text-slate-400">风险</span>
              <AlertTriangle className={`h-4 w-4 ${colors.icon}`} />
            </div>
            <span className={`text-lg font-bold ${displayData.risk === "高" ? "text-rose-600 dark:text-rose-400" : displayData.risk === "中等" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>{displayData.risk}</span>
            <div className="flex items-center gap-0.5 mt-0.5">
              <Target className={`h-2.5 w-2.5 ${colors.icon}`} />
              <span className="text-xs text-slate-500">{displayData.riskLabel}</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">采购决策风险评估</p>
            <p className="text-[10px] text-slate-300/70 dark:text-slate-600/70 mt-0.5">规则评估 · 基于近30日价格波动</p>
          </div>
        </div>

        {/* 数据新鲜度指示器 */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${displayData.freshness === "今日更新" ? "bg-emerald-400" : "bg-amber-400"}`} />
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              数据更新: {displayData.freshness}
            </span>
          </div>
          <span className="text-[11px] text-slate-400/60 dark:text-slate-500/60">
            价格来源: {displayData.priceSource} | 库存来源: {displayData.invSource}
          </span>
        </div>

        {/* 系统能力概览 */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {/* 品种覆盖 */}
          <Link href="/market-analysis?tab=commodities" className="rounded-lg border border-slate-200/60 dark:border-white/10 bg-white/60 dark:bg-white/5 p-2.5 hover:border-cyan-300/50 dark:hover:border-cyan-500/30 transition-all group cursor-pointer">
            <div className="flex items-center gap-1.5 mb-1">
              <Layers className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-xs text-slate-500">品种覆盖</span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">4<span className="text-sm font-normal text-slate-400 ml-1">品种</span></div>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="flex -space-x-1">
                <div className="w-2 h-2 rounded-full bg-cyan-500 ring-1 ring-white dark:ring-slate-800" />
                <div className="w-2 h-2 rounded-full bg-violet-500 ring-1 ring-white dark:ring-slate-800" />
                <div className="w-2 h-2 rounded-full bg-amber-500 ring-1 ring-white dark:ring-slate-800" />
                <div className="w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-slate-800" />
              </div>
              <span className="text-[10px] text-slate-400">硫磺·磷矿·钾肥·尿素</span>
            </div>
          </Link>

          {/* 模型精度 */}
          <Link href="/market-analysis?tab=accuracy" className="rounded-lg border border-slate-200/60 dark:border-white/10 bg-white/60 dark:bg-white/5 p-2.5 hover:border-emerald-300/50 dark:hover:border-emerald-500/30 transition-all group cursor-pointer">
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs text-slate-500">模型精度</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">MAPE</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">2.1<span className="text-sm font-normal text-slate-400">%</span></span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-12 h-3 rounded-full bg-emerald-100 dark:bg-emerald-500/20 overflow-hidden">
                <div className="h-full w-[95%] rounded-full bg-emerald-400 dark:bg-emerald-500" />
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">优秀</span>
            </div>
          </Link>

          {/* MCP 工具 */}
          <Link href="/api-console" className="rounded-lg border border-slate-200/60 dark:border-white/10 bg-white/60 dark:bg-white/5 p-2.5 hover:border-amber-300/50 dark:hover:border-amber-500/30 transition-all group cursor-pointer">
            <div className="flex items-center gap-1.5 mb-1">
              <Wand2 className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs text-slate-500">MCP 工具</span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">7<span className="text-sm font-normal text-slate-400 ml-1">个</span></div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] text-slate-400">查询·预测·对比·精度</span>
            </div>
          </Link>

          {/* 企业接入 */}
          <Link href="/enterprises" className="rounded-lg border border-slate-200/60 dark:border-white/10 bg-white/60 dark:bg-white/5 p-2.5 hover:border-blue-300/50 dark:hover:border-blue-500/30 transition-all group cursor-pointer">
            <div className="flex items-center gap-1.5 mb-1">
              <Building2 className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs text-slate-500">企业接入</span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">3<span className="text-sm font-normal text-slate-400 ml-1">家</span></div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] text-slate-400">宜化·HY·TC</span>
            </div>
          </Link>
        </div>

        {/* 主内容区域：左列、右列各占一半，占满页面 */}
        <div className={`grid grid-cols-2 gap-3 flex-1 min-h-0 transition-opacity duration-200 ${isTransitioning ? "opacity-60" : ""}`}>
          {/* 左列 - 功能模块入口、市场洞察和价格知识图谱 */}
          <div className="space-y-3 flex flex-col flex-1 min-h-0 overflow-y-auto pr-1">
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
                {displayData.marketInsight}
              </p>
              <Link href="/agent-chat" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors">
                深入分析
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* 价格知识图谱 */}
            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-slate-200 dark:border-white/10 shadow-sm h-[340px] flex-shrink-0 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  <h3 className="text-slate-900 dark:text-white font-medium text-sm">价格知识图谱</h3>
                </div>
                <Link href="/yihua-code-graph" className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-1 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors">
                  详情 <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              {/* 知识图谱可视化 */}
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
                  {/* 供给 → 价格 */}
                  <line x1="50%" y1="18%" x2="50%" y2="40%" stroke="url(#flowGradientSupply)" strokeWidth="1.5" strokeLinecap="round" />
                  {/* 价格 → 需求 */}
                  <line x1="50%" y1="60%" x2="50%" y2="82%" stroke="url(#flowGradientDemand)" strokeWidth="1.5" strokeLinecap="round" />
                  {/* 成本 → 价格 */}
                  <line x1="20%" y1="50%" x2="38%" y2="50%" stroke="url(#flowGradientCost)" strokeWidth="1.5" strokeLinecap="round" />
                  {/* 价格 → 政策 */}
                  <line x1="62%" y1="50%" x2="80%" y2="50%" stroke="url(#flowGradientPolicy)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>

                {/* 中心节点 - 价格 */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ zIndex: 10 }}>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-200 via-blue-100 to-cyan-100 dark:from-cyan-500/50 dark:via-blue-500/40 dark:to-cyan-500/50 border-2 border-cyan-500 dark:border-cyan-400/70 flex items-center justify-center shadow-md" style={{ animationDuration: '2s' }}>
                    <div className="text-center">
                      <DollarSign className="h-5 w-5 text-cyan-700 dark:text-cyan-200 mx-auto" />
                      <span className="text-xs text-slate-800 dark:text-white font-bold">价格</span>
                    </div>
                  </div>
                </div>

                {/* 上方节点 - 供给 */}
                <div className="absolute top-[6%] left-1/2 -translate-x-1/2" style={{ zIndex: 10 }}>
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-200 to-green-100 dark:from-emerald-500/50 dark:to-green-500/40 border border-emerald-500 dark:border-emerald-400/60 flex items-center justify-center shadow-sm">
                    <div className="text-center">
                      <Package className="h-4 w-4 text-emerald-700 dark:text-emerald-200 mx-auto" />
                      <span className="text-[9px] text-slate-800 dark:text-white font-bold">供给</span>
                    </div>
                  </div>
                </div>

                {/* 下方节点 - 需求 */}
                <div className="absolute bottom-[6%] left-1/2 -translate-x-1/2" style={{ zIndex: 10 }}>
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-200 to-purple-100 dark:from-violet-500/50 dark:to-purple-500/40 border border-violet-500 dark:border-violet-400/60 flex items-center justify-center shadow-sm">
                    <div className="text-center">
                      <TrendingUp className="h-4 w-4 text-violet-700 dark:text-violet-200 mx-auto" />
                      <span className="text-[9px] text-slate-800 dark:text-white font-bold">需求</span>
                    </div>
                  </div>
                </div>

                {/* 左侧节点 - 成本 */}
                <div className="absolute top-1/2 left-[10%] -translate-y-1/2" style={{ zIndex: 10 }}>
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-200 to-orange-100 dark:from-amber-500/50 dark:to-orange-500/40 border border-amber-500 dark:border-amber-400/60 flex items-center justify-center shadow-sm">
                    <div className="text-center">
                      <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-200 mx-auto" />
                      <span className="text-[9px] text-slate-800 dark:text-white font-bold">成本</span>
                    </div>
                  </div>
                </div>

                {/* 右侧节点 - 政策 */}
                <div className="absolute top-1/2 right-[10%] -translate-y-1/2" style={{ zIndex: 10 }}>
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-rose-200 to-pink-100 dark:from-rose-500/50 dark:to-pink-500/40 border border-rose-500 dark:border-rose-400/60 flex items-center justify-center shadow-sm">
                    <div className="text-center">
                      <Scale className="h-4 w-4 text-rose-700 dark:text-rose-200 mx-auto" />
                      <span className="text-[9px] text-slate-800 dark:text-white font-bold">政策</span>
                    </div>
                  </div>
                </div>

                {/* 图谱说明 */}
                <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-300 dark:border-slate-600 text-[10px] text-slate-500 dark:text-slate-400" style={{ zIndex: 15 }}>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                    <span>能量流动</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右列 - 采购周报和企业价格预测 */}
          <div className="space-y-3 flex flex-col flex-1 min-h-0 overflow-y-auto">
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
              <EnterprisePredictionOverviewCompact enterprises={displayData.enterprisePrices} />
            </div>
          </div>
        </div>
        </>
        )}
      </div>
      </div>
  )
}
