"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Database, Filter, Brain, BarChart3, Building, Scale, ChevronRight, RefreshCw, ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { useDataProcessingStats } from "@/hooks/use-data-processing"

// ============================================================
// 颜色定义说明
// ============================================================
// #06b6d4 - cyan-400   青色   - 用于：价格行情、采购案例、已清洗数据、数据利用率
// #8b5cf6 - violet-400 紫罗兰 - 用于：供需动态、供应商管理、已标注数据、标注完成率
// #f59e0b - amber-400  琥珀色 - 用于：政策法规、风险案例、制度规则库
// #10b981 - emerald-400 翡翠绿 - 用于：国际市场、最佳实践、模型训练数据、模型准确率
// #f43f5e - rose-400   玫瑰红 - 用于：行业资讯
// #3b82f6 - blue-400   蓝色   - 用于：处理后数据条形图
// #64748b - slate-400  灰色   - 用于：原始数据、处理前数据条形图
// ============================================================

// ============================================================
// 第一阶段：数据基础 - 市场资讯库统计
// ============================================================
const marketNewsData = [
  { name: "价格行情", count: 1250, fill: "#06b6d4" },
  { name: "供需动态", count: 890, fill: "#8b5cf6" },
  { name: "政策法规", count: 456, fill: "#f59e0b" },
  { name: "国际市场", count: 678, fill: "#10b981" },
  { name: "行业资讯", count: 934, fill: "#f43f5e" },
]

// ============================================================
// 第一阶段：数据基础 - 企业经验库数据
// ============================================================
const enterpriseData = [
  { name: "采购案例", value: 35, fill: "#06b6d4" },
  { name: "供应商管理", value: 25, fill: "#8b5cf6" },
  { name: "风险案例", value: 20, fill: "#f59e0b" },
  { name: "最佳实践", value: 20, fill: "#10b981" },
]

// ============================================================
// 第一阶段：数据基础 - 制度规则库数据
// ============================================================
const rulesData = [
  { name: "采购制度", count: 45 },
  { name: "质量标准", count: 38 },
  { name: "合规要求", count: 28 },
  { name: "操作规程", count: 52 },
  { name: "风险管理", count: 35 },
]

// 默认数据处理统计
const defaultProcessingStats = [
  { name: "原始数据", value: 0, fill: "#64748b" },
  { name: "已清洗", value: 0, fill: "#06b6d4" },
  { name: "已标注", value: 0, fill: "#8b5cf6" },
  { name: "模型训练", value: 0, fill: "#10b981" },
]

// 默认处理效率数据
const defaultEfficiency = [
  { stage: "去重", before: 0, after: 0 },
  { stage: "格式化", before: 0, after: 0 },
  { stage: "标注", before: 0, after: 0 },
  { stage: "训练集", before: 0, after: 0 },
]

// 通用颜色数组
const COLORS = ["#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#f43f5e"]

// 阶段配置
const phases = [
  { id: 1, name: "数据基础", color: "cyan", icon: Database },
  { id: 2, name: "数据处理", color: "violet", icon: Filter },
  { id: 3, name: "AI 智能", color: "emerald", icon: Brain },
]

interface ThreePhaseArchitectureCarouselProps {
  className?: string
  autoPlay?: boolean
  interval?: number
}

export function ThreePhaseArchitectureCarousel({
  className,
  autoPlay = true,
  interval = 5000
}: ThreePhaseArchitectureCarouselProps) {
  const [currentPhase, setCurrentPhase] = useState(0)
  const { data: statsResponse, isLoading, refetch, isFetching } = useDataProcessingStats()

  const dataProcessingStats = statsResponse?.data?.processingStats || defaultProcessingStats
  const processingEfficiency = statsResponse?.data?.efficiency || defaultEfficiency
  const metrics = statsResponse?.data?.metrics
  const sources = statsResponse?.data?.sources

  // 自动轮播
  useEffect(() => {
    if (!autoPlay) return
    const timer = setInterval(() => {
      setCurrentPhase((prev) => (prev + 1) % 3)
    }, interval)
    return () => clearInterval(timer)
  }, [autoPlay, interval])

  const goToPhase = (index: number) => {
    setCurrentPhase(index)
  }

  const goToPrevious = () => {
    setCurrentPhase((prev) => (prev - 1 + 3) % 3)
  }

  const goToNext = () => {
    setCurrentPhase((prev) => (prev + 1) % 3)
  }

  const colorClasses = {
    cyan: {
      text: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-100 dark:bg-cyan-500/20",
      border: "border-cyan-400 dark:border-cyan-500/30",
      indicator: "bg-cyan-500",
    },
    violet: {
      text: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-100 dark:bg-violet-500/20",
      border: "border-violet-400 dark:border-violet-500/30",
      indicator: "bg-violet-500",
    },
    emerald: {
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-500/20",
      border: "border-emerald-400 dark:border-emerald-500/30",
      indicator: "bg-emerald-500",
    },
  }

  return (
    <div className={`bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-slate-200 dark:border-white/10 ${className}`}>
      {/* 标题和指示器 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">系统架构</h3>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
            title="刷新数据"
          >
            <RefreshCw className={`h-3 w-3 text-slate-400 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* 阶段指示器 */}
        <div className="flex items-center gap-1">
          {phases.map((phase, index) => (
            <button
              key={phase.id}
              onClick={() => goToPhase(index)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                currentPhase === index
                  ? `${colorClasses[phase.color as keyof typeof colorClasses].text} ${colorClasses[phase.color as keyof typeof colorClasses].bg}`
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              {phase.name}
            </button>
          ))}
        </div>
      </div>

      {/* 轮播内容 */}
      <div className="relative">
        {/* 左右切换按钮 */}
        <button
          onClick={goToPrevious}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-sm hover:bg-white dark:hover:bg-slate-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-sm hover:bg-white dark:hover:bg-slate-700 transition-colors"
        >
          <ChevronRightIcon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        </button>

        {/* 阶段内容 */}
        <div className="px-6 overflow-hidden">
          {/* 第一阶段：数据基础 */}
          {currentPhase === 0 && (
            <div className="animate-in fade-in duration-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">1</span>
                </div>
                <h4 className="text-sm font-medium text-cyan-600 dark:text-cyan-400">第一阶段：数据基础</h4>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {/* 市场资讯库 */}
                <div className="bg-white/80 dark:bg-white/5 rounded-lg p-3 border border-slate-200 dark:border-white/10 hover:border-cyan-400 dark:hover:border-cyan-500/30 transition-all">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Database className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span className="text-xs font-medium text-slate-900 dark:text-white">市场资讯库</span>
                  </div>
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <BarChart data={marketNewsData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
                        <XAxis type="number" tick={{ fontSize: 8, fill: "#64748b" }} stroke="rgba(100,116,139,0.3)" />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 7, fill: "#64748b" }} stroke="rgba(100,116,139,0.3)" width={45} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "10px" }}
                          formatter={(value) => [`${value} 条`, ""]}
                        />
                        <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                          {marketNewsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-slate-400">4,208 条</span>
                  </div>
                </div>

                {/* 企业经验库 */}
                <div className="bg-white/80 dark:bg-white/5 rounded-lg p-3 border border-slate-200 dark:border-white/10 hover:border-violet-400 dark:hover:border-violet-500/30 transition-all">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Building className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                    <span className="text-xs font-medium text-slate-900 dark:text-white">企业经验库</span>
                  </div>
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <RechartsPie>
                        <Pie data={enterpriseData} cx="50%" cy="50%" innerRadius={18} outerRadius={35} paddingAngle={2} dataKey="value">
                          {enterpriseData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}%`, ""]} />
                        <Legend verticalAlign="bottom" height={15} formatter={(value) => <span className="text-xs text-slate-500">{value}</span>} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 制度规则库 */}
                <div className="bg-white/80 dark:bg-white/5 rounded-lg p-3 border border-slate-200 dark:border-white/10 hover:border-amber-400 dark:hover:border-amber-500/30 transition-all">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Scale className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-medium text-slate-900 dark:text-white">制度规则库</span>
                  </div>
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <BarChart data={rulesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
                        <XAxis dataKey="name" tick={{ fontSize: 7, fill: "#64748b" }} stroke="rgba(100,116,139,0.3)" angle={-20} textAnchor="end" height={30} />
                        <YAxis tick={{ fontSize: 8, fill: "#64748b" }} stroke="rgba(100,116,139,0.3)" />
                        <Tooltip formatter={(value) => [`${value} 项`, ""]} />
                        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                          {rulesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-slate-400">198 项</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 第二阶段：数据处理 */}
          {currentPhase === 1 && (
            <div className="animate-in fade-in duration-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400">2</span>
                </div>
                <h4 className="text-sm font-medium text-violet-600 dark:text-violet-400">第二阶段：数据处理</h4>
                {isLoading && <span className="text-xs text-slate-400">(加载中...)</span>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* 数据清洗进度 */}
                <div className="bg-white/80 dark:bg-white/5 rounded-lg p-3 border border-slate-200 dark:border-white/10 hover:border-violet-400 dark:hover:border-violet-500/30 transition-all">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Filter className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                    <span className="text-xs font-medium text-slate-900 dark:text-white">数据清洗进度</span>
                  </div>
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <RechartsPie>
                        <Pie data={dataProcessingStats} cx="50%" cy="50%" innerRadius={20} outerRadius={38} paddingAngle={3} dataKey="value">
                          {dataProcessingStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${(value as number)?.toLocaleString() ?? 0} 条`, ""]} />
                        <Legend verticalAlign="bottom" height={15} formatter={(value) => <span className="text-xs text-slate-500">{value}</span>} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                  {sources && (
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>价格: {sources.prices.total}</span>
                      <span>库存: {sources.inventory.total}</span>
                    </div>
                  )}
                </div>

                {/* 处理效率分析 */}
                <div className="bg-white/80 dark:bg-white/5 rounded-lg p-3 border border-slate-200 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500/30 transition-all">
                  <div className="flex items-center gap-1.5 mb-2">
                    <BarChart3 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-slate-900 dark:text-white">处理效率分析</span>
                  </div>
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <BarChart data={processingEfficiency} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
                        <XAxis type="number" tick={{ fontSize: 8, fill: "#64748b" }} stroke="rgba(100,116,139,0.3)" />
                        <YAxis type="category" dataKey="stage" tick={{ fontSize: 8, fill: "#64748b" }} stroke="rgba(100,116,139,0.3)" width={40} />
                        <Tooltip />
                        <Bar dataKey="before" fill="#64748b" name="前" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="after" fill="#3b82f6" name="后" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* 指标 */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-white/80 dark:bg-white/5 rounded-lg p-2 border border-slate-200 dark:border-white/10 text-center">
                  <div className="text-base font-bold text-cyan-600 dark:text-cyan-400">
                    {metrics?.utilizationRate ?? '...'}{metrics ? '%' : ''}
                  </div>
                  <div className="text-xs text-slate-500">利用率</div>
                </div>
                <div className="bg-white/80 dark:bg-white/5 rounded-lg p-2 border border-slate-200 dark:border-white/10 text-center">
                  <div className="text-base font-bold text-violet-600 dark:text-violet-400">
                    {metrics?.labelingRate ?? '...'}{metrics ? '%' : ''}
                  </div>
                  <div className="text-xs text-slate-500">标注率</div>
                </div>
                <div className="bg-white/80 dark:bg-white/5 rounded-lg p-2 border border-slate-200 dark:border-white/10 text-center">
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {metrics?.modelAccuracy ?? '...'}{metrics ? '%' : ''}
                  </div>
                  <div className="text-xs text-slate-500">准确率</div>
                </div>
              </div>
            </div>
          )}

          {/* 第三阶段：AI 智能体 */}
          {currentPhase === 2 && (
            <div className="animate-in fade-in duration-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">3</span>
                </div>
                <h4 className="text-sm font-medium text-emerald-600 dark:text-emerald-400">第三阶段：AI 智能体中心</h4>
              </div>
              <Link href="/agent-chat" className="block">
                <div className="bg-white/80 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10 hover:border-emerald-400 dark:hover:border-emerald-500/30 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 dark:from-emerald-500/30 to-cyan-100 dark:to-cyan-500/30 border border-emerald-300 dark:border-emerald-400/50 flex items-center justify-center">
                        <Brain className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">智能决策助手</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">智能决策、自动化采购、风险预警</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/30">
                        <span className="text-xs text-emerald-700 dark:text-emerald-400">已激活</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>

              {/* AI 能力说明 */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-white/80 dark:bg-white/5 rounded-lg p-2 border border-slate-200 dark:border-white/10 text-center">
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300">智能决策</div>
                  <div className="text-xs text-slate-500 mt-0.5">数据驱动采购</div>
                </div>
                <div className="bg-white/80 dark:bg-white/5 rounded-lg p-2 border border-slate-200 dark:border-white/10 text-center">
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300">自动化</div>
                  <div className="text-xs text-slate-500 mt-0.5">流程智能化</div>
                </div>
                <div className="bg-white/80 dark:bg-white/5 rounded-lg p-2 border border-slate-200 dark:border-white/10 text-center">
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300">风险预警</div>
                  <div className="text-xs text-slate-500 mt-0.5">实时监控</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部进度条 */}
        <div className="flex justify-center gap-1.5 mt-3">
          {phases.map((phase, index) => (
            <button
              key={phase.id}
              onClick={() => goToPhase(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentPhase === index
                  ? `w-8 ${colorClasses[phase.color as keyof typeof colorClasses].indicator}`
                  : "w-2 bg-slate-300 dark:bg-slate-600"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}