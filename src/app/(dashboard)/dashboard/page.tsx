"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Package, DollarSign, BarChart3, AlertTriangle, ChevronRight, MessageCircle, FileText, Settings, ArrowRight, ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react"
import { PriceChart, TimeRange } from "@/components/price-chart"
import { EnterprisePredictionOverview } from "@/components/enterprise-prediction-chart"
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
  const [timeRange, setTimeRange] = useState<TimeRange>("month")
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">价格知识图谱</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">硫磺市场价格分析与知识关系可视化</p>
        </div>

        {/* 采购报告轮播 */}
        <ReportCarousel />

        {/* 上方两个功能板块 - 左右布局 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* 左上：价格走势 */}
          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 dark:border-white/10 hover:border-cyan-400 dark:hover:border-cyan-500/30 transition-all duration-300 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-slate-900 dark:text-white font-semibold">价格走势</h3>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setTimeRange("day")}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    timeRange === "day"
                      ? "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/30"
                      : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  日
                </button>
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
            <div className="h-48 rounded-xl">
              <PriceChart timeRange={timeRange} />
            </div>
          </div>

          {/* 右上：供需分析 */}
          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 dark:border-white/10 hover:border-violet-400 dark:hover:border-violet-500/30 transition-all duration-300 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              <h3 className="text-slate-900 dark:text-white font-semibold">供需分析</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* 当前价格 */}
              <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-200 dark:border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">当前价格</span>
                  <DollarSign className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-slate-900 dark:text-white">950</span>
                  <span className="text-xs text-slate-500 dark:text-slate-500">元/吨</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-rose-500 dark:text-rose-400" />
                  <span className="text-xs text-rose-500 dark:text-rose-400">+3.2%</span>
                </div>
              </div>

              {/* 港口库存 */}
              <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-200 dark:border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">港口库存</span>
                  <Package className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-slate-900 dark:text-white">12.5</span>
                  <span className="text-xs text-slate-500 dark:text-slate-500">万吨</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500 dark:text-emerald-400 rotate-180" />
                  <span className="text-xs text-emerald-500 dark:text-emerald-400">-5.2%</span>
                </div>
              </div>

              {/* 供给评估 */}
              <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-200 dark:border-white/5">
                <span className="text-xs text-slate-500 dark:text-slate-400">供给评估</span>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-linear-to-r from-cyan-500 to-blue-500 rounded-full" />
                  </div>
                  <span className="text-xs text-cyan-600 dark:text-cyan-400">充足</span>
                </div>
              </div>

              {/* 需求评估 */}
              <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-200 dark:border-white/5">
                <span className="text-xs text-slate-500 dark:text-slate-400">需求评估</span>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-linear-to-r from-violet-500 to-purple-500 rounded-full" />
                  </div>
                  <span className="text-xs text-violet-600 dark:text-violet-400">旺盛</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 中间：价格知识图谱 - 主要区域 */}
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 dark:border-white/10 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-slate-900 dark:text-white font-semibold">价格知识图谱</h3>
            </div>
            <Link href="/yihua-code-graph" className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-1 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors">
              查看详情 <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* 知识图谱可视化区域 */}
          <div className="relative h-80 rounded-xl bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900/50 dark:via-slate-800/30 dark:to-slate-900/50 border border-slate-200 dark:border-white/5 overflow-hidden">
            {/* 中心节点 - 价格 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-500/30 dark:to-blue-500/30 border-2 border-cyan-300 dark:border-cyan-400/50 flex items-center justify-center backdrop-blur-sm">
                  <div className="text-center">
                    <DollarSign className="h-6 w-6 text-cyan-600 dark:text-cyan-400 mx-auto" />
                    <span className="text-xs text-slate-700 dark:text-white font-medium mt-1 block">价格</span>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-full bg-cyan-300/30 dark:bg-cyan-400/20 animate-ping" />
              </div>
            </div>

            {/* 上方节点 - 供给 */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-500/30 dark:to-green-500/30 border border-emerald-300 dark:border-emerald-400/50 flex items-center justify-center backdrop-blur-sm">
                <div className="text-center">
                  <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <span className="text-xs text-slate-700 dark:text-white mt-0.5 block">供给</span>
                </div>
              </div>
            </div>

            {/* 下方节点 - 需求 */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-500/30 dark:to-purple-500/30 border border-violet-300 dark:border-violet-400/50 flex items-center justify-center backdrop-blur-sm">
                <div className="text-center">
                  <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400 mx-auto" />
                  <span className="text-xs text-slate-700 dark:text-white mt-0.5 block">需求</span>
                </div>
              </div>
            </div>

            {/* 左侧节点 - 成本 */}
            <div className="absolute top-1/2 left-8 -translate-y-1/2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-500/30 dark:to-orange-500/30 border border-amber-300 dark:border-amber-400/50 flex items-center justify-center backdrop-blur-sm">
                <div className="text-center">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mx-auto" />
                  <span className="text-xs text-slate-700 dark:text-white mt-0.5 block">成本</span>
                </div>
              </div>
            </div>

            {/* 右侧节点 - 政策 */}
            <div className="absolute top-1/2 right-8 -translate-y-1/2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-500/30 dark:to-pink-500/30 border border-rose-300 dark:border-rose-400/50 flex items-center justify-center backdrop-blur-sm">
                <div className="text-center">
                  <FileText className="h-4 w-4 text-rose-600 dark:text-rose-400 mx-auto" />
                  <span className="text-xs text-slate-700 dark:text-white mt-0.5 block">政策</span>
                </div>
              </div>
            </div>

            {/* 连接线 - 从中心到各节点 */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {/* 到供给 */}
              <line x1="50%" y1="50%" x2="50%" y2="20%" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="2" strokeDasharray="4 4" />
              {/* 到需求 */}
              <line x1="50%" y1="50%" x2="50%" y2="80%" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="2" strokeDasharray="4 4" />
              {/* 到成本 */}
              <line x1="50%" y1="50%" x2="20%" y2="50%" stroke="rgba(245, 158, 11, 0.3)" strokeWidth="2" strokeDasharray="4 4" />
              {/* 到政策 */}
              <line x1="50%" y1="50%" x2="80%" y2="50%" stroke="rgba(244, 63, 94, 0.3)" strokeWidth="2" strokeDasharray="4 4" />
            </svg>

            {/* 关系标签 */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-xs text-slate-500 dark:text-slate-400">影响</div>
            <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 text-xs text-slate-500 dark:text-slate-400">驱动</div>
            <div className="absolute top-1/2 left-1/3 -translate-y-1/2 text-xs text-slate-500 dark:text-slate-400">构成</div>
            <div className="absolute top-1/2 right-1/3 translate-x-1/2 -translate-y-1/2 text-xs text-slate-500 dark:text-slate-400">调控</div>
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

      {/* 底部浮动导航栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#0a0a1a]/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 z-50">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-around">
            <Link href="/dashboard" className="flex flex-col items-center gap-1 group">
              <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 group-hover:bg-cyan-200 dark:group-hover:bg-cyan-500/30 transition-colors">
                <BarChart3 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
<span className="text-xs text-cyan-600 dark:text-cyan-400">首页</span>
            </Link>
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
