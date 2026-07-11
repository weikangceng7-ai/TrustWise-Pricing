"use client"

import { useQuery } from "@tanstack/react-query"
import {
  TrendingUp,
  Target,
  Activity,
  BarChart3,
  ChevronRight,
  DollarSign,
  TrendingDown,
} from "lucide-react"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import Link from "next/link"
import { getBackgroundImage } from "@/config/images"

interface AccuracyData {
  overview: {
    mae: number
    rmse: number
    mape: number
    r2: number
    totalPredictions: number
  }
  accuracyTrend: Array<{ date: string; mape: number; mae: number }>
  historicalPredictions: Array<{
    date: string
    actual: number
    predicted: number
    lowerBound: number
    upperBound: number
  }>
  byEnterprise: Array<{
    code: string
    name: string
    mape: number
    mae: number
    predictionCount: number
  }>
}

function EnterpriseAccuracyCard({
  enterprise,
  index,
}: {
  enterprise: AccuracyData["byEnterprise"][0]
  index: number
}) {
  const colors = [
    { bg: "bg-cyan-50/50 dark:bg-cyan-500/10", border: "border-cyan-200/50 dark:border-cyan-500/20", text: "text-cyan-700 dark:text-cyan-300", bar: "bg-cyan-500" },
    { bg: "bg-violet-50/50 dark:bg-violet-500/10", border: "border-violet-200/50 dark:border-violet-500/20", text: "text-violet-700 dark:text-violet-300", bar: "bg-violet-500" },
    { bg: "bg-amber-50/50 dark:bg-amber-500/10", border: "border-amber-200/50 dark:border-amber-500/20", text: "text-amber-700 dark:text-amber-300", bar: "bg-amber-500" },
  ]
  const c = colors[index % colors.length]

  return (
    <div className={`p-4 rounded-lg ${c.bg} ${c.border}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-sm font-semibold ${c.text}`}>{enterprise.name}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {enterprise.predictionCount} 次预测
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">MAPE</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">
            {enterprise.mape}%
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">MAE (¥)</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">
            ¥{enterprise.mae}
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-white/5">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">精度评级</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full ${c.bar} transition-all`}
              style={{ width: `${100 - enterprise.mape * 10}%` }}
            />
          </div>
          <span className={`text-xs font-medium ${c.text}`}>
            {enterprise.mape < 3.5 ? "优秀" : enterprise.mape < 4 ? "良好" : "合格"}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function AccuracyDashboardPage() {
  const bgImage = getBackgroundImage("dashboardBackground")

  const { data, isLoading, error } = useQuery({
    queryKey: ["accuracy"],
    queryFn: async () => {
      const res = await fetch("/api/accuracy")
      const json = await res.json()
      return json.data as AccuracyData
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0a1a]">
        <div className="text-slate-400 text-sm animate-pulse">加载模型精度数据...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0a1a]">
        <div className="text-slate-400 text-sm">数据加载失败，请稍后重试</div>
      </div>
    )
  }

  const { overview, accuracyTrend, historicalPredictions, byEnterprise } = data

  return (
    <div className="min-h-screen relative overflow-hidden pb-16 bg-slate-50 dark:bg-[#0a0a1a]">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="absolute inset-0 bg-white/80 dark:bg-[#0a0a1a]/80 backdrop-blur-sm" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-300/30 dark:bg-emerald-600/20 blur-[120px] rounded-full" />
        <div className="absolute top-20 right-0 w-[300px] h-[300px] bg-cyan-200/30 dark:bg-cyan-500/15 blur-[100px] rounded-full" />
        <div className="absolute bottom-40 left-0 w-[250px] h-[250px] bg-blue-200/30 dark:bg-blue-500/10 blur-[80px] rounded-full" />
      </div>

      <div className="relative px-4 pt-6 pb-3 max-w-full">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">模型精度评估</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              基于 {overview.totalPredictions} 次历史预测的模型性能评估
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 hover:text-cyan-700"
          >
            返回仪表盘 <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* 四个指标卡片 */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 backdrop-blur-sm rounded-lg p-3 border border-emerald-200/50 dark:border-emerald-500/20">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm text-slate-500 dark:text-slate-400">MAPE</span>
              <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {overview.mape}%
            </span>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">平均绝对百分比误差</p>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-500/10 dark:to-blue-500/10 backdrop-blur-sm rounded-lg p-3 border border-cyan-200/50 dark:border-cyan-500/20">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm text-slate-500 dark:text-slate-400">MAE</span>
              <Activity className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              ¥{overview.mae}
            </span>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">平均绝对误差（元/吨）</p>
          </div>

          <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 backdrop-blur-sm rounded-lg p-3 border border-violet-200/50 dark:border-violet-500/20">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm text-slate-500 dark:text-slate-400">RMSE</span>
              <BarChart3 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              ¥{overview.rmse}
            </span>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">均方根误差</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 backdrop-blur-sm rounded-lg p-3 border border-amber-200/50 dark:border-amber-500/20">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm text-slate-500 dark:text-slate-400">R²</span>
              <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {overview.r2}
            </span>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">决定系数</p>
          </div>
        </div>

        {/* 主图表区域 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* 预测 vs 实际对比 */}
          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-slate-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                预测 vs 实际价格对比
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={historicalPredictions}>
                <defs>
                  <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  stroke="none"
                  fill="url(#confidenceBand)"
                  name="置信区间"
                />
                <Area
                  type="monotone"
                  dataKey="lowerBound"
                  stroke="none"
                  fill="url(#confidenceBand)"
                  name=""
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                  name="实际价格"
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="预测价格"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* MAPE 趋势 */}
          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-slate-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                MAPE 趋势（近12周，数值越低越好）
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={accuracyTrend}>
                <defs>
                  <linearGradient id="mapeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} domain={[0, "auto"]} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                  formatter={(value: any, name: any) => {
                    if (name === "MAPE") return [`${value}%`, "MAPE"]
                    return [value, name]
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="mape"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#10b981" }}
                  name="MAPE"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 按企业精度分布 */}
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              按企业精度分布
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {byEnterprise.map((enterprise, idx) => (
              <EnterpriseAccuracyCard key={enterprise.code} enterprise={enterprise} index={idx} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
