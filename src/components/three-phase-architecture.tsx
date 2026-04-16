"use client"

import Link from "next/link"
import { Database, Filter, Brain, BarChart3, Building, Scale, ChevronRight, RefreshCw, ArrowRight, ArrowDown, Settings, FileText, Users, Zap, Target, PieChart as PieChartIcon, TrendingUp } from "lucide-react"
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
// 颜色说明：青色(价格行情)、紫罗兰(供需动态)、琥珀色(政策法规)、翡翠绿(国际市场)、玫瑰红(行业资讯)
// ============================================================
const marketNewsData = [
  { name: "价格行情", count: 1250, fill: "#06b6d4" },  // cyan-400 青色
  { name: "供需动态", count: 890, fill: "#8b5cf6" },   // violet-400 紫罗兰
  { name: "政策法规", count: 456, fill: "#f59e0b" },   // amber-400 琥珀色
  { name: "国际市场", count: 678, fill: "#10b981" },   // emerald-400 翡翠绿
  { name: "行业资讯", count: 934, fill: "#f43f5e" },   // rose-400 玫瑰红
]

// ============================================================
// 第一阶段：数据基础 - 企业经验库数据
// 颜色说明：青色(采购案例)、紫罗兰(供应商管理)、琥珀色(风险案例)、翡翠绿(最佳实践)
// ============================================================
const enterpriseData = [
  { name: "采购案例", value: 35, fill: "#06b6d4" },    // cyan-400 青色
  { name: "供应商管理", value: 25, fill: "#8b5cf6" },  // violet-400 紫罗兰
  { name: "风险案例", value: 20, fill: "#f59e0b" },    // amber-400 琥珀色
  { name: "最佳实践", value: 20, fill: "#10b981" },    // emerald-400 翡翠绿
]

// ============================================================
// 第一阶段：数据基础 - 制度规则库数据
// 颜色说明：使用 COLORS 数组循环配色
// ============================================================
const rulesData = [
  { name: "采购制度", count: 45 },   // cyan-400 青色
  { name: "质量标准", count: 38 },   // violet-400 紫罗兰
  { name: "合规要求", count: 28 },   // amber-400 琥珀色
  { name: "操作规程", count: 52 },   // emerald-400 翡翠绿
  { name: "风险管理", count: 35 },   // rose-400 玫瑰红
]

// 默认数据处理统计（API 加载前显示）
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

// 通用颜色数组，用于制度规则库等需要循环配色的图表
const COLORS = ["#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#f43f5e"]

interface ThreePhaseArchitectureProps {
  className?: string
}

export function ThreePhaseArchitecture({ className }: ThreePhaseArchitectureProps) {
  // 获取数据处理统计数据
  const { data: statsResponse, isLoading, refetch, isFetching } = useDataProcessingStats()

  // 从 API 响应中提取数据，使用默认值作为后备
  const dataProcessingStats = statsResponse?.data?.processingStats || defaultProcessingStats
  const processingEfficiency = statsResponse?.data?.efficiency || defaultEfficiency
  const metrics = statsResponse?.data?.metrics
  const sources = statsResponse?.data?.sources

  return (
    <div className={`bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 ${className}`}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">硫磺价格预测系统架构</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">三阶段数据处理流程</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
          title="刷新数据"
        >
          <RefreshCw className={`h-4 w-4 text-slate-600 dark:text-slate-300 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 流程图 - 横向布局 */}
      <div className="flex items-stretch gap-6 overflow-x-auto pb-4">
        {/* 第一阶段：数据基础 */}
        <div className="flex-1 min-w-[280px]">
          <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-cyan-500 dark:border-cyan-400 shadow-lg shadow-cyan-500/10 overflow-hidden">
            {/* 阶段标题 */}
            <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">1</span>
                <span className="text-white font-semibold">数据基础</span>
              </div>
            </div>
            {/* 内容区 */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Database className="h-4 w-4 text-cyan-500" />
                <span className="font-medium">市场资讯库</span>
              </div>
              <div className="pl-6 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>价格行情数据</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  <span>供需动态数据</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>政策法规数据</span>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 my-2" />

              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Building className="h-4 w-4 text-violet-500" />
                <span className="font-medium">企业经验库</span>
              </div>
              <div className="pl-6 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>采购案例数据</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>供应商管理</span>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 my-2" />

              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Scale className="h-4 w-4 text-amber-500" />
                <span className="font-medium">制度规则库</span>
              </div>
              <div className="pl-6 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>采购制度规则</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>质量标准规范</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 连接线 1→2 */}
        <div className="flex items-center justify-center w-12">
          <div className="flex items-center gap-1">
            <div className="w-8 h-0.5 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full" />
            <ArrowRight className="h-5 w-5 text-violet-500" />
          </div>
        </div>

        {/* 第二阶段：数据处理 */}
        <div className="flex-1 min-w-[280px]">
          <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-violet-500 dark:border-violet-400 shadow-lg shadow-violet-500/10 overflow-hidden">
            {/* 阶段标题 */}
            <div className="bg-gradient-to-r from-violet-500 to-violet-600 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">2</span>
                <span className="text-white font-semibold">数据处理</span>
              </div>
            </div>
            {/* 内容区 */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Filter className="h-4 w-4 text-violet-500" />
                <span className="font-medium">数据清洗</span>
              </div>
              <div className="pl-6 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>去重处理</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>格式标准化</span>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 my-2" />

              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <FileText className="h-4 w-4 text-blue-500" />
                <span className="font-medium">数据标注</span>
              </div>
              <div className="pl-6 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  <span>分类标签</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>质量评估</span>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 my-2" />

              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Settings className="h-4 w-4 text-emerald-500" />
                <span className="font-medium">模型训练</span>
              </div>
              <div className="pl-6 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>训练集构建</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>模型验证</span>
                </div>
              </div>

              {/* 指标展示 */}
              <div className="border-t border-slate-200 dark:border-slate-700 my-2" />
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-cyan-50 dark:bg-cyan-500/10 rounded-lg p-2 text-center">
                  <div className="text-sm font-bold text-cyan-600 dark:text-cyan-400">
                    {metrics?.utilizationRate ?? '--'}{metrics ? '%' : ''}
                  </div>
                  <div className="text-xs text-slate-500">利用率</div>
                </div>
                <div className="bg-violet-50 dark:bg-violet-500/10 rounded-lg p-2 text-center">
                  <div className="text-sm font-bold text-violet-600 dark:text-violet-400">
                    {metrics?.labelingRate ?? '--'}{metrics ? '%' : ''}
                  </div>
                  <div className="text-xs text-slate-500">标注率</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-2 text-center">
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {metrics?.modelAccuracy ?? '--'}{metrics ? '%' : ''}
                  </div>
                  <div className="text-xs text-slate-500">准确率</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 连接线 2→3 */}
        <div className="flex items-center justify-center w-12">
          <div className="flex items-center gap-1">
            <div className="w-8 h-0.5 bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full" />
            <ArrowRight className="h-5 w-5 text-emerald-500" />
          </div>
        </div>

        {/* 第三阶段：AI智能体 */}
        <div className="flex-1 min-w-[280px]">
          <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-emerald-500 dark:border-emerald-400 shadow-lg shadow-emerald-500/10 overflow-hidden">
            {/* 阶段标题 */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">3</span>
                <span className="text-white font-semibold">AI 智能体</span>
              </div>
            </div>
            {/* 内容区 */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Brain className="h-4 w-4 text-emerald-500" />
                <span className="font-medium">智能决策助手</span>
              </div>
              <div className="pl-6 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>价格预测分析</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  <span>采购决策建议</span>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 my-2" />

              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Target className="h-4 w-4 text-blue-500" />
                <span className="font-medium">风险预警系统</span>
              </div>
              <div className="pl-6 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>异常波动监测</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>风险等级评估</span>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 my-2" />

              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <PieChartIcon className="h-4 w-4 text-amber-500" />
                <span className="font-medium">报告生成</span>
              </div>
              <div className="pl-6 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>市场分析报告</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>决策建议报告</span>
                </div>
              </div>

              {/* 快速入口 */}
              <div className="border-t border-slate-200 dark:border-slate-700 my-2" />
              <Link href="/agent-chat" className="block">
                <div className="flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-500/10 dark:to-cyan-500/10 hover:from-emerald-100 hover:to-cyan-100 dark:hover:from-emerald-500/20 dark:hover:to-cyan-500/20 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">立即体验</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-emerald-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* 连接线 3→应用 */}
        <div className="flex items-center justify-center w-12">
          <div className="flex items-center gap-1">
            <div className="w-8 h-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full" />
            <ArrowRight className="h-5 w-5 text-blue-500" />
          </div>
        </div>

        {/* 第四阶段：应用输出 */}
        <div className="flex-1 min-w-[200px]">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-4 shadow-lg shadow-blue-500/20 text-white h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5" />
              <span className="font-semibold">智能应用</span>
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">采购决策</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                <Target className="h-4 w-4" />
                <span className="text-sm">风险预警</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm">分析报告</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm">市场洞察</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}