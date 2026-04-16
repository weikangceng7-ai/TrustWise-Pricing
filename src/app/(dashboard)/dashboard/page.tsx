"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Package, DollarSign, BarChart3, AlertTriangle, ChevronRight, MessageCircle, FileText, Settings, ArrowRight, ChevronLeft, ChevronRight as ChevronRightIcon, ArrowUpRight, ArrowDownRight, Activity, Zap, Target, Layers, Grid3X3, Scale } from "lucide-react"
import { PriceChart, TimeRange } from "@/components/price-chart"
import { EnterprisePredictionOverview } from "@/components/enterprise-prediction-chart"
import { SupplyDemandAnalysis } from "@/components/supply-demand-analysis"
import Link from "next/link"
import { getBackgroundImage } from "@/config/images"

interface Report {
  id: number
  title: string
  reportDate: string
  summary: string
  recommendation: string | null
  priceTrend: string | null
  riskLevel: string | null
}

function ReportCarousel() {
  const [reports, setReports] = useState<Report[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch("/api/reports")
        const data = await res.json()
        if (data.success && data.data) {
          setReports(data.data.slice(0, 5))
        }
      } catch (error) {
        console.error("获取报告数据失败:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [])

  useEffect(() => {
    if (!isAutoPlaying || reports.length === 0) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % reports.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [isAutoPlaying, reports.length])

  const goToPrev = () => {
    setIsAutoPlaying(false)
    setCurrentIndex((prev) => (prev - 1 + reports.length) % reports.length)
  }

  const goToNext = () => {
    setIsAutoPlaying(false)
    setCurrentIndex((prev) => (prev + 1) % reports.length)
  }

  const getTrendColor = (trend: string | null) => {
    if (!trend) return "text-slate-500"
    if (trend.includes("上涨")) return "text-rose-500"
    if (trend.includes("下跌")) return "text-emerald-500"
    return "text-slate-500"
  }

  const getRiskColor = (risk: string | null) => {
    if (risk === "高") return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
    if (risk === "中等") return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-cyan-500/10 dark:from-cyan-500/5 dark:via-violet-500/5 dark:to-cyan-500/5 backdrop-blur-sm rounded-2xl p-4 border border-cyan-200/50 dark:border-cyan-500/20 mb-6">
        <div className="flex items-center justify-center h-16">
          <div className="animate-pulse text-slate-400 text-sm">加载中...</div>
        </div>
      </div>
    )
  }

  if (reports.length === 0) {
    return null
  }

  const currentReport = reports[currentIndex]

  return (
    <div className="bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-cyan-500/10 dark:from-cyan-500/5 dark:via-violet-500/5 dark:to-cyan-500/5 backdrop-blur-sm rounded-2xl p-4 border border-cyan-200/50 dark:border-cyan-500/20 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center">
            <FileText className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {currentReport.title}
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${getRiskColor(currentReport.riskLevel)}`}>
                {currentReport.riskLevel || "低"}风险
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
              {currentReport.summary}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-500 dark:text-slate-500">{currentReport.reportDate}</span>
              <span className={`text-xs ${getTrendColor(currentReport.priceTrend)}`}>
                {currentReport.priceTrend || "稳定"}
              </span>
              <span className="text-xs text-cyan-600 dark:text-cyan-400">
                {currentReport.recommendation}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <button
            onClick={goToPrev}
            className="p-1.5 rounded-lg bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex gap-1">
            {reports.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setIsAutoPlaying(false)
                  setCurrentIndex(idx)
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  idx === currentIndex
                    ? "bg-cyan-500 w-3"
                    : "bg-slate-300 dark:bg-slate-600"
                }`}
              />
            ))}
          </div>
          <button
            onClick={goToNext}
            className="p-1.5 rounded-lg bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-colors"
          >
            <ChevronRightIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>
          <Link
            href="/reports"
            className="ml-2 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-medium flex items-center gap-1 transition-colors"
          >
            查看全部
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("week")
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const PAGE_COUNT = 3
  const bgImage = getBackgroundImage("dashboardBackground")

  return (
    <div className="min-h-screen relative overflow-hidden pb-24 bg-slate-50 dark:bg-[#0a0a1a]">
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
        {/* 底部紫色光晕 */}
        <div className="absolute -bottom-20 right-1/3 w-[400px] h-[200px] bg-violet-300/30 dark:bg-violet-600/15 blur-[100px] rounded-full" />

        {/* 网格背景 */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <div className="relative px-5 pt-8 pb-32 max-w-6xl mx-auto">
        {/* 页面标题 */}
        <Link href="/" className="block mb-6 group">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">价格知识图谱</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">硫磺市场价格分析与知识关系可视化</p>
        </Link>

        {/* High Level 概览 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {/* 当前均价 */}
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-500/10 dark:to-blue-500/10 backdrop-blur-sm rounded-xl p-4 border border-cyan-200/50 dark:border-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">当前均价</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">¥1,850</span>
              <span className="text-xs text-cyan-600 dark:text-cyan-400">/吨</span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              <span className="text-xs text-emerald-600 dark:text-emerald-400">+3.2%</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">较上周</span>
            </div>
          </div>

          {/* 月度趋势 */}
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 backdrop-blur-sm rounded-xl p-4 border border-violet-200/50 dark:border-violet-500/20 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">月度趋势</span>
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">上涨</span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <Activity className="h-3 w-3 text-violet-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">连续 3 周上涨</span>
            </div>
          </div>

          {/* 市场热度 */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 backdrop-blur-sm rounded-xl p-4 border border-amber-200/50 dark:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">市场热度</span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">活跃</span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <div className="flex -space-x-1">
                <div className="w-4 h-4 rounded-full bg-amber-400 dark:bg-amber-500" />
                <div className="w-4 h-4 rounded-full bg-orange-400 dark:bg-orange-500" />
                <div className="w-4 h-4 rounded-full bg-red-400 dark:bg-red-500" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">需求旺盛</span>
            </div>
          </div>

          {/* 风险等级 */}
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-500/10 dark:to-pink-500/10 backdrop-blur-sm rounded-xl p-4 border border-rose-200/50 dark:border-rose-500/20 hover:shadow-lg hover:shadow-rose-500/10 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">风险等级</span>
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">中等</span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <Target className="h-3 w-3 text-rose-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">需关注运费变化</span>
            </div>
          </div>
        </div>

        {/* 快速洞察 */}
        <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-slate-50 dark:from-slate-800/30 dark:via-blue-900/20 dark:to-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-slate-200 dark:border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-0.5">市场洞察</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                近期硫磺价格受下游磷肥需求带动持续走强，建议关注港口库存变化及进口船期动态。预计短期内价格将维持高位震荡态势。
              </p>
            </div>
            <Link href="/agent-chat" className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium flex items-center gap-1 transition-colors">
              深入分析
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* 采购报告轮播 */}
        <ReportCarousel />

        {/* 上方两个功能板块 - 上下布局，价格走势在上 */}
        <div className="space-y-4 mb-6">
          {/* 价格走势 */}
          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 dark:border-white/10 hover:border-cyan-400 dark:hover:border-cyan-500/30 transition-all duration-300 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-slate-900 dark:text-white font-semibold">价格走势</h3>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setTimeRange("week")}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    timeRange === "week"
                      ? "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/30"
                      : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  周
                </button>
                <button
                  onClick={() => setTimeRange("month")}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    timeRange === "month"
                      ? "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/30"
                      : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  月
                </button>
              </div>
            </div>
            <div className="h-[280px] rounded-xl">
              <PriceChart timeRange={timeRange} />
            </div>
          </div>

          {/* 供需分析 */}
          <SupplyDemandAnalysis />
        </div>

        {/* 中间：价格知识图谱 - 主要区域 */}
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 dark:border-white/10 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-slate-900 dark:text-white font-semibold">价格知识图谱</h3>
            </div>
            <Link href="/yihua-code-graph" className="text-sm text-cyan-600 dark:text-cyan-400 flex items-center gap-1 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors">
              查看详情 <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* 知识图谱可视化区域 - 更舒展的布局 */}
          <div className="relative h-[600px] rounded-xl bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900/50 dark:via-slate-800/30 dark:to-slate-900/50 border border-slate-200 dark:border-white/5 overflow-hidden">
            {/* 背景网格 */}
            <div className="absolute inset-0 opacity-5 dark:opacity-10">
              <svg width="100%" height="100%">
                <defs>
                  <pattern id="graphGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-400" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#graphGrid)" />
              </svg>
            </div>

            {/* 动态连接线 - SVG层 with 流动动画 */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
              {/* 定义渐变和动画 */}
              <defs>
                {/* 流动粒子渐变 - 供给线 */}
                <linearGradient id="flowGradientSupply" gradientUnits="userSpaceOnUse" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#10b981" stopOpacity="1">
                    <animate attributeName="offset" values="0;1;0" dur="3s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
                </linearGradient>
                {/* 流动粒子渐变 - 需求线 */}
                <linearGradient id="flowGradientDemand" gradientUnits="userSpaceOnUse" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1">
                    <animate attributeName="offset" values="0;1;0" dur="3.5s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
                </linearGradient>
                {/* 流动粒子渐变 - 成本线 */}
                <linearGradient id="flowGradientCost" gradientUnits="userSpaceOnUse" x1="100%" y1="0%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="1">
                    <animate attributeName="offset" values="0;1;0" dur="4s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
                </linearGradient>
                {/* 流动粒子渐变 - 政策线 */}
                <linearGradient id="flowGradientPolicy" gradientUnits="userSpaceOnUse" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#06b6d4" stopOpacity="1">
                    <animate attributeName="offset" values="0;1;0" dur="3.8s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.9" />
                </linearGradient>

                {/* 发光效果 */}
                <filter id="lineGlow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {/* 强发光效果 */}
                <filter id="strongGlow">
                  <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* 供给→价格 - 流动能量线 */}
              <line x1="50%" y1="12%" x2="50%" y2="38%" stroke="url(#flowGradientSupply)" strokeWidth="4" strokeLinecap="round" filter="url(#lineGlow)">
                <animate attributeName="stroke-dasharray" values="0,200;200,0;0,200" dur="3s" repeatCount="indefinite" />
              </line>
              {/* 流动粒子群 - 4个粒子 */}
              <circle r="5" fill="#10b981" filter="url(#strongGlow)">
                <animate attributeName="cx" values="50%;50%" dur="3s" repeatCount="indefinite" begin="0s" />
                <animate attributeName="cy" values="12%;38%" dur="3s" repeatCount="indefinite" begin="0s" />
                <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" begin="0s" />
              </circle>
              <circle r="4" fill="#10b981" filter="url(#strongGlow)">
                <animate attributeName="cx" values="50%;50%" dur="3s" repeatCount="indefinite" begin="0.75s" />
                <animate attributeName="cy" values="12%;38%" dur="3s" repeatCount="indefinite" begin="0.75s" />
                <animate attributeName="opacity" values="0.6;0.9;0.6" dur="3s" repeatCount="indefinite" begin="0.75s" />
              </circle>
              <circle r="3" fill="#10b981" filter="url(#strongGlow)">
                <animate attributeName="cx" values="50%;50%" dur="3s" repeatCount="indefinite" begin="1.5s" />
                <animate attributeName="cy" values="12%;38%" dur="3s" repeatCount="indefinite" begin="1.5s" />
                <animate attributeName="opacity" values="0.5;0.8;0.5" dur="3s" repeatCount="indefinite" begin="1.5s" />
              </circle>
              <circle r="2" fill="#10b981" filter="url(#strongGlow)">
                <animate attributeName="cx" values="50%;50%" dur="3s" repeatCount="indefinite" begin="2.25s" />
                <animate attributeName="cy" values="12%;38%" dur="3s" repeatCount="indefinite" begin="2.25s" />
                <animate attributeName="opacity" values="0.4;0.7;0.4" dur="3s" repeatCount="indefinite" begin="2.25s" />
              </circle>

              {/* 价格→需求 - 流动能量线 */}
              <line x1="50%" y1="62%" x2="50%" y2="88%" stroke="url(#flowGradientDemand)" strokeWidth="4" strokeLinecap="round" filter="url(#lineGlow)">
                <animate attributeName="stroke-dasharray" values="0,200;200,0;0,200" dur="3.5s" repeatCount="indefinite" />
              </line>
              {/* 流动粒子群 - 4个粒子 */}
              <circle r="5" fill="#8b5cf6" filter="url(#strongGlow)">
                <animate attributeName="cx" values="50%;50%" dur="3.5s" repeatCount="indefinite" begin="0s" />
                <animate attributeName="cy" values="62%;88%" dur="3.5s" repeatCount="indefinite" begin="0s" />
                <animate attributeName="opacity" values="0.8;1;0.8" dur="3.5s" repeatCount="indefinite" begin="0s" />
              </circle>
              <circle r="4" fill="#8b5cf6" filter="url(#strongGlow)">
                <animate attributeName="cx" values="50%;50%" dur="3.5s" repeatCount="indefinite" begin="0.87s" />
                <animate attributeName="cy" values="62%;88%" dur="3.5s" repeatCount="indefinite" begin="0.87s" />
                <animate attributeName="opacity" values="0.6;0.9;0.6" dur="3.5s" repeatCount="indefinite" begin="0.87s" />
              </circle>
              <circle r="3" fill="#8b5cf6" filter="url(#strongGlow)">
                <animate attributeName="cx" values="50%;50%" dur="3.5s" repeatCount="indefinite" begin="1.75s" />
                <animate attributeName="cy" values="62%;88%" dur="3.5s" repeatCount="indefinite" begin="1.75s" />
                <animate attributeName="opacity" values="0.5;0.8;0.5" dur="3.5s" repeatCount="indefinite" begin="1.75s" />
              </circle>
              <circle r="2" fill="#8b5cf6" filter="url(#strongGlow)">
                <animate attributeName="cx" values="50%;50%" dur="3.5s" repeatCount="indefinite" begin="2.62s" />
                <animate attributeName="cy" values="62%;88%" dur="3.5s" repeatCount="indefinite" begin="2.62s" />
                <animate attributeName="opacity" values="0.4;0.7;0.4" dur="3.5s" repeatCount="indefinite" begin="2.62s" />
              </circle>

              {/* 成本→价格 - 流动能量线 */}
              <line x1="12%" y1="50%" x2="38%" y2="50%" stroke="url(#flowGradientCost)" strokeWidth="4" strokeLinecap="round" filter="url(#lineGlow)">
                <animate attributeName="stroke-dasharray" values="0,200;200,0;0,200" dur="4s" repeatCount="indefinite" />
              </line>
              {/* 流动粒子群 - 4个粒子 */}
              <circle r="5" fill="#f59e0b" filter="url(#strongGlow)">
                <animate attributeName="cx" values="12%;38%" dur="4s" repeatCount="indefinite" begin="0s" />
                <animate attributeName="cy" values="50%;50%" dur="4s" repeatCount="indefinite" begin="0s" />
                <animate attributeName="opacity" values="0.8;1;0.8" dur="4s" repeatCount="indefinite" begin="0s" />
              </circle>
              <circle r="4" fill="#f59e0b" filter="url(#strongGlow)">
                <animate attributeName="cx" values="12%;38%" dur="4s" repeatCount="indefinite" begin="1s" />
                <animate attributeName="cy" values="50%;50%" dur="4s" repeatCount="indefinite" begin="1s" />
                <animate attributeName="opacity" values="0.6;0.9;0.6" dur="4s" repeatCount="indefinite" begin="1s" />
              </circle>
              <circle r="3" fill="#f59e0b" filter="url(#strongGlow)">
                <animate attributeName="cx" values="12%;38%" dur="4s" repeatCount="indefinite" begin="2s" />
                <animate attributeName="cy" values="50%;50%" dur="4s" repeatCount="indefinite" begin="2s" />
                <animate attributeName="opacity" values="0.5;0.8;0.5" dur="4s" repeatCount="indefinite" begin="2s" />
              </circle>
              <circle r="2" fill="#f59e0b" filter="url(#strongGlow)">
                <animate attributeName="cx" values="12%;38%" dur="4s" repeatCount="indefinite" begin="3s" />
                <animate attributeName="cy" values="50%;50%" dur="4s" repeatCount="indefinite" begin="3s" />
                <animate attributeName="opacity" values="0.4;0.7;0.4" dur="4s" repeatCount="indefinite" begin="3s" />
              </circle>

              {/* 价格→政策 - 流动能量线 */}
              <line x1="62%" y1="50%" x2="88%" y2="50%" stroke="url(#flowGradientPolicy)" strokeWidth="4" strokeLinecap="round" filter="url(#lineGlow)">
                <animate attributeName="stroke-dasharray" values="0,200;200,0;0,200" dur="3.8s" repeatCount="indefinite" />
              </line>
              {/* 流动粒子群 - 4个粒子 */}
              <circle r="5" fill="#f43f5e" filter="url(#strongGlow)">
                <animate attributeName="cx" values="62%;88%" dur="3.8s" repeatCount="indefinite" begin="0s" />
                <animate attributeName="cy" values="50%;50%" dur="3.8s" repeatCount="indefinite" begin="0s" />
                <animate attributeName="opacity" values="0.8;1;0.8" dur="3.8s" repeatCount="indefinite" begin="0s" />
              </circle>
              <circle r="4" fill="#f43f5e" filter="url(#strongGlow)">
                <animate attributeName="cx" values="62%;88%" dur="3.8s" repeatCount="indefinite" begin="0.95s" />
                <animate attributeName="cy" values="50%;50%" dur="3.8s" repeatCount="indefinite" begin="0.95s" />
                <animate attributeName="opacity" values="0.6;0.9;0.6" dur="3.8s" repeatCount="indefinite" begin="0.95s" />
              </circle>
              <circle r="3" fill="#f43f5e" filter="url(#strongGlow)">
                <animate attributeName="cx" values="62%;88%" dur="3.8s" repeatCount="indefinite" begin="1.9s" />
                <animate attributeName="cy" values="50%;50%" dur="3.8s" repeatCount="indefinite" begin="1.9s" />
                <animate attributeName="opacity" values="0.5;0.8;0.5" dur="3.8s" repeatCount="indefinite" begin="1.9s" />
              </circle>
              <circle r="2" fill="#f43f5e" filter="url(#strongGlow)">
                <animate attributeName="cx" values="62%;88%" dur="3.8s" repeatCount="indefinite" begin="2.85s" />
                <animate attributeName="cy" values="50%;50%" dur="3.8s" repeatCount="indefinite" begin="2.85s" />
                <animate attributeName="opacity" values="0.4;0.7;0.4" dur="3.8s" repeatCount="indefinite" begin="2.85s" />
              </circle>
            </svg>

            {/* 中心节点 - 价格 - 呼吸动态与能量脉冲 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ zIndex: 10 }}>
              <div className="relative group">
                {/* 多层能量波纹 */}
                <div className="absolute -inset-10 rounded-full border border-cyan-400/20 animate-spin" style={{ animationDuration: '20s' }} />
                <div className="absolute -inset-6 rounded-full bg-cyan-400/10 animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute -inset-4 rounded-full bg-cyan-400/20 animate-pulse" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
                <div className="absolute -inset-3 rounded-full bg-cyan-400/30 animate-pulse" style={{ animationDuration: '2s', animationDelay: '1s' }} />

                {/* 主节点 - 呼吸脉冲 */}
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-200 via-blue-100 to-cyan-100 dark:from-cyan-500/50 dark:via-blue-500/40 dark:to-cyan-500/50 border-3 border-cyan-500 dark:border-cyan-400/70 flex items-center justify-center backdrop-blur-sm shadow-xl shadow-cyan-500/30 dark:shadow-cyan-500/40 animate-pulse" style={{ animationDuration: '2.5s' }}>
                  <div className="text-center">
                    <DollarSign className="h-9 w-9 text-cyan-700 dark:text-cyan-200 mx-auto animate-pulse" style={{ animationDuration: '1.5s' }} />
                    <span className="text-base text-slate-800 dark:text-white font-bold mt-1 block animate-pulse" style={{ animationDuration: '3s' }}>价格</span>
                  </div>
                </div>

                {/* 内部能量核心 */}
                <div className="absolute inset-0 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-white/90 dark:bg-cyan-300/90 animate-ping" style={{ animationDuration: '2s' }} />
                </div>
              </div>
            </div>

            {/* 上方节点 - 供给 - 波纹能量 */}
            <div className="absolute top-[8%] left-1/2 -translate-x-1/2" style={{ zIndex: 10 }}>
              <div className="relative group">
                {/* 能量波纹 */}
                <div className="absolute -inset-4 rounded-full border border-emerald-400/30 animate-ping" style={{ animationDuration: '3s' }} />
                <div className="absolute -inset-3 rounded-full bg-emerald-400/20 animate-pulse" style={{ animationDuration: '2s' }} />

                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-200 to-green-100 dark:from-emerald-500/50 dark:to-green-500/40 border-2 border-emerald-500 dark:border-emerald-400/60 flex items-center justify-center backdrop-blur-sm shadow-lg shadow-emerald-500/20 animate-pulse" style={{ animationDuration: '2s' }}>
                  <div className="text-center">
                    <Package className="h-6 w-6 text-emerald-700 dark:text-emerald-200 mx-auto animate-pulse" style={{ animationDuration: '1.8s' }} />
                    <span className="text-sm text-slate-800 dark:text-white font-bold mt-1 block animate-pulse" style={{ animationDuration: '2.5s' }}>供给</span>
                  </div>
                </div>

                {/* 内部能量点 */}
                <div className="absolute inset-0 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white/80 dark:bg-emerald-300/80 animate-ping" style={{ animationDuration: '2.5s' }} />
                </div>
              </div>
            </div>

            {/* 下方节点 - 需求 - 波纹能量 */}
            <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2" style={{ zIndex: 10 }}>
              <div className="relative group">
                {/* 能量波纹 */}
                <div className="absolute -inset-4 rounded-full border border-violet-400/30 animate-ping" style={{ animationDuration: '3.5s' }} />
                <div className="absolute -inset-3 rounded-full bg-violet-400/20 animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />

                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-200 to-purple-100 dark:from-violet-500/50 dark:to-purple-500/40 border-2 border-violet-500 dark:border-violet-400/60 flex items-center justify-center backdrop-blur-sm shadow-lg shadow-violet-500/20 animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>
                  <div className="text-center">
                    <TrendingUp className="h-6 w-6 text-violet-700 dark:text-violet-200 mx-auto animate-pulse" style={{ animationDuration: '2s' }} />
                    <span className="text-sm text-slate-800 dark:text-white font-bold mt-1 block animate-pulse" style={{ animationDuration: '3s' }}>需求</span>
                  </div>
                </div>

                {/* 内部能量点 */}
                <div className="absolute inset-0 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white/80 dark:bg-violet-300/80 animate-ping" style={{ animationDuration: '3s' }} />
                </div>
              </div>
            </div>

            {/* 左侧节点 - 成本 - 波纹能量 */}
            <div className="absolute top-1/2 left-[8%] -translate-y-1/2" style={{ zIndex: 10 }}>
              <div className="relative group">
                {/* 能量波纹 */}
                <div className="absolute -inset-4 rounded-full border border-amber-400/30 animate-ping" style={{ animationDuration: '4s' }} />
                <div className="absolute -inset-3 rounded-full bg-amber-400/20 animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.6s' }} />

                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-200 to-orange-100 dark:from-amber-500/50 dark:to-orange-500/40 border-2 border-amber-500 dark:border-amber-400/60 flex items-center justify-center backdrop-blur-sm shadow-lg shadow-amber-500/20 animate-pulse" style={{ animationDuration: '3s', animationDelay: '0.8s' }}>
                  <div className="text-center">
                    <AlertTriangle className="h-6 w-6 text-amber-700 dark:text-amber-200 mx-auto animate-pulse" style={{ animationDuration: '2.2s' }} />
                    <span className="text-sm text-slate-800 dark:text-white font-bold mt-1 block animate-pulse" style={{ animationDuration: '3.5s' }}>成本</span>
                  </div>
                </div>

                {/* 内部能量点 */}
                <div className="absolute inset-0 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white/80 dark:bg-amber-300/80 animate-ping" style={{ animationDuration: '3.5s' }} />
                </div>
              </div>
            </div>

            {/* 右侧节点 - 政策 - 波纹能量 */}
            <div className="absolute top-1/2 right-[8%] -translate-y-1/2" style={{ zIndex: 10 }}>
              <div className="relative group">
                {/* 能量波纹 */}
                <div className="absolute -inset-4 rounded-full border border-rose-400/30 animate-ping" style={{ animationDuration: '3.8s' }} />
                <div className="absolute -inset-3 rounded-full bg-rose-400/20 animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.9s' }} />

                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-200 to-pink-100 dark:from-rose-500/50 dark:to-pink-500/40 border-2 border-rose-500 dark:border-rose-400/60 flex items-center justify-center backdrop-blur-sm shadow-lg shadow-rose-500/20 animate-pulse" style={{ animationDuration: '3s', animationDelay: '1s' }}>
                  <div className="text-center">
                    <Scale className="h-6 w-6 text-rose-700 dark:text-rose-200 mx-auto animate-pulse" style={{ animationDuration: '2.2s' }} />
                    <span className="text-sm text-slate-800 dark:text-white font-bold mt-1 block animate-pulse" style={{ animationDuration: '3.5s' }}>政策</span>
                  </div>
                </div>

                {/* 内部能量点 */}
                <div className="absolute inset-0 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white/80 dark:bg-rose-300/80 animate-ping" style={{ animationDuration: '4s' }} />
                </div>
              </div>
            </div>

                
            {/* 图谱说明 - 动态指示 */}
            <div className="absolute bottom-4 right-4 px-4 py-2.5 rounded-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-300 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 shadow-sm animate-pulse" style={{ zIndex: 15, animationDuration: '3s' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping" style={{ animationDuration: '1.5s' }} />
                <span className="animate-pulse" style={{ animationDuration: '2s' }}>能量流动网络</span>
              </div>
            </div>
          </div>
        </div>

        {/* 企业价格预测图谱 */}
        <EnterprisePredictionOverview className="mb-6" />

        {/* 下方功能板块 */}
        <div className="grid grid-cols-1 gap-4">
          {/* 风险提示 */}
          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-rose-500 dark:text-rose-400" />
              <h3 className="text-slate-900 dark:text-white font-semibold">风险监控</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/15 transition-colors">
                <div className="w-2 h-2 rounded-full bg-rose-500 dark:bg-rose-400 animate-pulse" />
                <span className="text-xs text-rose-700 dark:text-rose-300">运费上涨风险</span>
                <span className="text-xs ml-auto px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300">高</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/15 transition-colors">
                <div className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" />
                <span className="text-xs text-amber-700 dark:text-amber-300">库存下降风险</span>
                <span className="text-xs ml-auto px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">中</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部浮动导航栏 - 多页滑动设计 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#0a0a1a]/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 z-50">
        <div className="max-w-lg mx-auto px-4 py-3">
          {/* 顶部滑动指示器 */}
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <button
              onClick={() => setCurrentPageIndex((prev) => (prev - 1 + PAGE_COUNT) % PAGE_COUNT)}
              className="p-1 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-sm hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
            </button>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: PAGE_COUNT }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPageIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentPageIndex === idx
                      ? "w-8 bg-cyan-500"
                      : "w-2 bg-slate-300 dark:bg-slate-600"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => setCurrentPageIndex((prev) => (prev + 1) % PAGE_COUNT)}
              className="p-1 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-sm hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRightIcon className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
            </button>
          </div>

          {/* 底部导航图标 */}
          <div className="flex items-center justify-around">
            <button
              onClick={() => setCurrentPageIndex(0)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className={`p-2 rounded-xl transition-colors ${
                currentPageIndex === 0
                  ? "bg-cyan-100 dark:bg-cyan-500/20"
                  : "group-hover:bg-slate-100 dark:group-hover:bg-white/10"
              }`}>
                <BarChart3 className={`h-5 w-5 transition-colors ${
                  currentPageIndex === 0
                    ? "text-cyan-600 dark:text-cyan-400"
                    : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                }`} />
              </div>
              <span className={`text-xs transition-colors ${
                currentPageIndex === 0
                  ? "text-cyan-600 dark:text-cyan-400"
                  : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
              }`}>首页</span>
            </button>

            <button
              onClick={() => setCurrentPageIndex(1)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className={`p-2 rounded-xl transition-colors ${
                currentPageIndex === 1
                  ? "bg-violet-100 dark:bg-violet-500/20"
                  : "group-hover:bg-slate-100 dark:group-hover:bg-white/10"
              }`}>
                <Grid3X3 className={`h-5 w-5 transition-colors ${
                  currentPageIndex === 1
                    ? "text-violet-600 dark:text-violet-400"
                    : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                }`} />
              </div>
              <span className={`text-xs transition-colors ${
                currentPageIndex === 1
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
              }`}>图谱</span>
            </button>

            <Link href="/agent-chat" className="flex flex-col items-center gap-1 group">
              <div className="p-2 rounded-xl group-hover:bg-slate-100 dark:group-hover:bg-white/10 transition-colors">
                <MessageCircle className="h-5 w-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">对话</span>
            </Link>

            <Link href="/reports" className="flex flex-col items-center gap-1 group">
              <div className="p-2 rounded-xl group-hover:bg-slate-100 dark:group-hover:bg-white/10 transition-colors">
                <FileText className="h-5 w-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">报告</span>
            </Link>

            <Link href="/settings" className="flex flex-col items-center gap-1 group">
              <div className="p-2 rounded-xl group-hover:bg-slate-100 dark:group-hover:bg-white/10 transition-colors">
                <Settings className="h-5 w-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">设置</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
