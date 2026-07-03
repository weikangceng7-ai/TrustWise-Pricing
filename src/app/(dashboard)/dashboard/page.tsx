"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { TrendingUp, Package, DollarSign, BarChart3, AlertTriangle, ChevronRight, FileText, ArrowRight, ArrowUpRight, Activity, Zap, Target, Layers, Scale } from "lucide-react"
import Link from "next/link"
import { getBackgroundImage } from "@/config/images"
import type { Report } from "@/hooks/use-reports"

function getRiskColor(risk: string | null) {
  if (risk === "高") return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
  if (risk === "中等") return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
}

const ENTERPRISES: Array<{ id: string; name: string; price: string; colorKey: keyof typeof ENTERPRISE_COLORS; trend: string }> = [
  { id: "A", name: "企业A", price: "¥1,880", colorKey: "cyan", trend: "up" },
  { id: "B", name: "企业B", price: "¥1,820", colorKey: "violet", trend: "up" },
  { id: "C", name: "企业C", price: "¥1,750", colorKey: "amber", trend: "rise" },
]

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

function EnterprisePredictionOverviewCompact() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">企业价格预测</h3>
        <Link href="/enterprises" className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 hover:text-cyan-700">
          详情 <ChevronRight className="h-2.5 w-2.5" />
        </Link>
      </div>
      <div className="space-y-3 flex-1 flex flex-col">
        {ENTERPRISES.map((enterprise) => {
          const colors = ENTERPRISE_COLORS[enterprise.colorKey]
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
        <p className="text-sm text-slate-500 dark:text-slate-400">平均预测价格：<span className="font-medium text-cyan-600 dark:text-cyan-400">¥1,817</span>/吨</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
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
        {/* 统计概览四卡片 - 平铺整行 */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {/* 当前均价 */}
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-500/10 dark:to-blue-500/10 backdrop-blur-sm rounded-lg p-3 border border-cyan-200/50 dark:border-cyan-500/20">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm text-slate-500 dark:text-slate-400">均价</span>
              <DollarSign className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg font-bold text-slate-900 dark:text-white">¥1,850</span>
            </div>
            <div className="flex items-center gap-0.5 mt-0.5">
              <ArrowUpRight className="h-2.5 w-2.5 text-emerald-500" />
              <span className="text-xs text-emerald-600">+3.2%</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">硫磺港口现货均价</p>
          </div>

          {/* 月度趋势 */}
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 backdrop-blur-sm rounded-lg p-3 border border-violet-200/50 dark:border-violet-500/20">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm text-slate-500 dark:text-slate-400">趋势</span>
              <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">上涨</span>
            <div className="flex items-center gap-0.5 mt-0.5">
              <Activity className="h-2.5 w-2.5 text-violet-500" />
              <span className="text-xs text-slate-500">连续3周</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">近30日价格走势</p>
          </div>

          {/* 市场热度 */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 backdrop-blur-sm rounded-lg p-3 border border-amber-200/50 dark:border-amber-500/20">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm text-slate-500 dark:text-slate-400">热度</span>
              <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">活跃</span>
            <div className="flex items-center gap-0.5 mt-0.5">
              <div className="flex -space-x-0.5">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <div className="w-2 h-2 rounded-full bg-orange-400" />
                <div className="w-2 h-2 rounded-full bg-red-400" />
              </div>
              <span className="text-xs text-slate-500">需求旺盛</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">采购需求活跃度</p>
          </div>

          {/* 风险等级 */}
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-500/10 dark:to-pink-500/10 backdrop-blur-sm rounded-lg p-3 border border-rose-200/50 dark:border-rose-500/20">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm text-slate-500 dark:text-slate-400">风险</span>
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <span className="text-lg font-bold text-rose-600 dark:text-rose-400">中等</span>
            <div className="flex items-center gap-0.5 mt-0.5">
              <Target className="h-2.5 w-2.5 text-rose-500" />
              <span className="text-xs text-slate-500">关注运费</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">采购决策风险评估</p>
          </div>
        </div>

        {/* 主内容区域：左列、右列各占一半，占满页面 */}
        <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
          {/* 左列 - 市场洞察和价格知识图谱 */}
          <div className="space-y-3 flex flex-col flex-1 min-h-0">
            {/* 市场洞察 */}
            <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-slate-50 dark:from-slate-800/30 dark:via-blue-900/20 dark:to-slate-800/30 backdrop-blur-sm rounded-lg p-3 border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
                  <Layers className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">市场洞察</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                硫磺价格受磷肥需求带动走强，关注港口库存及进口船期，预计短期高位震荡。建议关注下游磷肥开工率及国际硫磺供应动态。
              </p>
              <Link href="/agent-chat" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors">
                深入分析
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* 价格知识图谱 - flex-1 占满剩余空间 */}
            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-slate-200 dark:border-white/10 shadow-sm flex-1 flex flex-col min-h-0">
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
                  <line x1="50%" y1="18%" x2="50%" y2="42%" stroke="url(#flowGradientSupply)" strokeWidth="2" strokeLinecap="round" />
                  <line x1="50%" y1="58%" x2="50%" y2="82%" stroke="url(#flowGradientDemand)" strokeWidth="2" strokeLinecap="round" />
                  <line x1="15%" y1="50%" x2="40%" y2="50%" stroke="url(#flowGradientCost)" strokeWidth="2" strokeLinecap="round" />
                  <line x1="60%" y1="50%" x2="85%" y2="50%" stroke="url(#flowGradientPolicy)" strokeWidth="2" strokeLinecap="round" />
                </svg>

                {/* 中心节点 - 价格 */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ zIndex: 10 }}>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-200 via-blue-100 to-cyan-100 dark:from-cyan-500/50 dark:via-blue-500/40 dark:to-cyan-500/50 border-2 border-cyan-500 dark:border-cyan-400/70 flex items-center justify-center shadow-md animate-pulse" style={{ animationDuration: '2s' }}>
                    <div className="text-center">
                      <DollarSign className="h-5 w-5 text-cyan-700 dark:text-cyan-200 mx-auto" />
                      <span className="text-xs text-slate-800 dark:text-white font-bold">价格</span>
                    </div>
                  </div>
                </div>

                {/* 上方节点 - 供给 */}
                <div className="absolute top-[12%] left-1/2 -translate-x-1/2" style={{ zIndex: 10 }}>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-200 to-green-100 dark:from-emerald-500/50 dark:to-green-500/40 border border-emerald-500 dark:border-emerald-400/60 flex items-center justify-center shadow-sm">
                    <div className="text-center">
                      <Package className="h-4 w-4 text-emerald-700 dark:text-emerald-200 mx-auto" />
                      <span className="text-xs text-slate-800 dark:text-white font-bold">供给</span>
                    </div>
                  </div>
                </div>

                {/* 下方节点 - 需求 */}
                <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2" style={{ zIndex: 10 }}>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-200 to-purple-100 dark:from-violet-500/50 dark:to-purple-500/40 border border-violet-500 dark:border-violet-400/60 flex items-center justify-center shadow-sm">
                    <div className="text-center">
                      <TrendingUp className="h-4 w-4 text-violet-700 dark:text-violet-200 mx-auto" />
                      <span className="text-xs text-slate-800 dark:text-white font-bold">需求</span>
                    </div>
                  </div>
                </div>

                {/* 左侧节点 - 成本 */}
                <div className="absolute top-1/2 left-[12%] -translate-y-1/2" style={{ zIndex: 10 }}>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-200 to-orange-100 dark:from-amber-500/50 dark:to-orange-500/40 border border-amber-500 dark:border-amber-400/60 flex items-center justify-center shadow-sm">
                    <div className="text-center">
                      <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-200 mx-auto" />
                      <span className="text-xs text-slate-800 dark:text-white font-bold">成本</span>
                    </div>
                  </div>
                </div>

                {/* 右侧节点 - 政策 */}
                <div className="absolute top-1/2 right-[12%] -translate-y-1/2" style={{ zIndex: 10 }}>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-200 to-pink-100 dark:from-rose-500/50 dark:to-pink-500/40 border border-rose-500 dark:border-rose-400/60 flex items-center justify-center shadow-sm">
                    <div className="text-center">
                      <Scale className="h-4 w-4 text-rose-700 dark:text-rose-200 mx-auto" />
                      <span className="text-xs text-slate-800 dark:text-white font-bold">政策</span>
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
              <EnterprisePredictionOverviewCompact />
            </div>
          </div>
        </div>
      </div>

      </div>
  )
}
