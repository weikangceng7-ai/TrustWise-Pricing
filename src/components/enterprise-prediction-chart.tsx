"use client"

import { useState, useEffect, useMemo } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts"
import { useTheme } from "@/components/theme-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, Brain, Target, BarChart3 } from "lucide-react"

// 企业配置
const ENTERPRISE_CONFIG = {
  yihua: {
    name: "湖北宜化集团",
    color: "#06b6d4", // cyan
    description: "国内领先的硫磺生产企业，产能约120万吨/年",
  },
  luxi: {
    name: "鲁西化工集团",
    color: "#8b5cf6", // violet
    description: "山东大型化工企业，硫磺制酸产能居前",
  },
  jinzhengda: {
    name: "金正大生态工程",
    color: "#f59e0b", // amber
    description: "化肥行业龙头，硫磺需求稳定",
  },
}

interface PredictionData {
  id: number
  enterpriseName: string
  enterpriseCode: string
  date: string
  actualPrice: string
  predictedPrice: string | null
  lowerBound: string | null
  upperBound: string | null
  confidence: string | null
  modelType: string | null
}

interface EnterprisePredictionChartProps {
  enterpriseCode: "yihua" | "luxi" | "jinzhengda"
  days?: number
}

export function EnterprisePredictionChart({ enterpriseCode, days = 60 }: EnterprisePredictionChartProps) {
  const { resolvedTheme, mounted } = useTheme()
  const [data, setData] = useState<PredictionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const config = ENTERPRISE_CONFIG[enterpriseCode]

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/enterprise-predictions?enterprise=${enterpriseCode}&days=${days}`)
        if (!res.ok) throw new Error("获取数据失败")
        const result = await res.json()
        setData(result.data || [])
      } catch (err) {
        setError(err instanceof Error ? err : new Error("未知错误"))
      } finally {
        setIsLoading(false)
      }
    }

    if (mounted) {
      fetchData()
    }
  }, [enterpriseCode, days, mounted])

  // 处理图表数据
  const chartData = useMemo(() => {
    return data.map((item) => ({
      date: item.date,
      actualPrice: parseFloat(item.actualPrice),
      predictedPrice: item.predictedPrice ? parseFloat(item.predictedPrice) : null,
      lowerBound: item.lowerBound ? parseFloat(item.lowerBound) : null,
      upperBound: item.upperBound ? parseFloat(item.upperBound) : null,
      confidence: item.confidence ? parseFloat(item.confidence) : null,
      modelType: item.modelType,
    }))
  }, [data])

  // 计算统计信息
  const stats = useMemo(() => {
    if (chartData.length === 0) return null

    const actualPrices = chartData.filter(d => d.actualPrice).map(d => d.actualPrice)
    const lastPrice = actualPrices[actualPrices.length - 1]
    const firstPrice = actualPrices[0]
    const change = lastPrice - firstPrice
    const changePercent = ((change / firstPrice) * 100).toFixed(2)

    const lastItem = chartData[chartData.length - 1]
    const modelType = lastItem?.modelType || "LSTM"
    const confidence = lastItem?.confidence || 0

    return {
      lastPrice,
      change,
      changePercent,
      modelType,
      confidence,
      trend: change > 5 ? "up" : change < -5 ? "down" : "stable",
    }
  }, [chartData])

  if (isLoading || !mounted) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-slate-100">{config.name}</CardTitle>
              <CardDescription className="text-slate-400">{config.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center">
          <div className="text-slate-400 text-sm">加载中...</div>
        </CardContent>
      </Card>
    )
  }

  if (error || chartData.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-slate-100">{config.name}</CardTitle>
              <CardDescription className="text-slate-400">{config.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center">
          <div className="text-slate-400 text-sm">暂无数据</div>
        </CardContent>
      </Card>
    )
  }

  const isDark = !mounted || resolvedTheme === "dark"
  const gridColor = isDark ? "#334155" : "#e2e8f0"
  const axisColor = isDark ? "#475569" : "#94a3b8"
  const tickColor = isDark ? "#94a3b8" : "#64748b"

  return (
    <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-slate-100 flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              {config.name}
            </CardTitle>
            <CardDescription className="text-slate-400">{config.description}</CardDescription>
          </div>
          {stats && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-slate-800 border-slate-700">
                <Brain className="h-3 w-3 mr-1" />
                {stats.modelType}
              </Badge>
              <Badge variant="outline" className="bg-slate-800 border-slate-700">
                <Target className="h-3 w-3 mr-1" />
                {stats.confidence.toFixed(1)}%
              </Badge>
            </div>
          )}
        </div>
        {stats && (
          <div className="flex items-center gap-4 mt-3">
            <div className="text-2xl font-bold text-slate-100">
              ¥{stats.lastPrice.toFixed(0)}
              <span className="text-sm font-normal text-slate-400 ml-1">元/吨</span>
            </div>
            <div className={`flex items-center gap-1 text-sm ${
              stats.trend === "up" ? "text-green-400" : stats.trend === "down" ? "text-red-400" : "text-slate-400"
            }`}>
              {stats.trend === "up" ? <TrendingUp className="h-4 w-4" /> :
               stats.trend === "down" ? <TrendingDown className="h-4 w-4" /> :
               <Minus className="h-4 w-4" />}
              {stats.change > 0 ? "+" : ""}{stats.change.toFixed(0)} ({stats.changePercent}%)
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={200} minWidth={0} minHeight={0}>
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: tickColor }}
              tickFormatter={(value) => value.slice(5)}
              stroke={axisColor}
            />
            <YAxis
              tick={{ fontSize: 10, fill: tickColor }}
              domain={["auto", "auto"]}
              stroke={axisColor}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#f1f5f9" }}
              itemStyle={{ color: "#cbd5e1" }}
              formatter={(value, name) => {
                if (value === null || value === undefined) return ["-", String(name)]
                if (name === "confidence") return [`${Number(value).toFixed(1)}%`, "置信度"]
                return [`${Number(value).toFixed(0)} 元/吨`, String(name)]
              }}
            />
            {/* 预测区间 */}
            <Area
              type="monotone"
              dataKey="upperBound"
              stroke="none"
              fill={config.color}
              fillOpacity={0.1}
            />
            {/* 实际价格线 */}
            <Line
              type="monotone"
              dataKey="actualPrice"
              stroke={config.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: config.color }}
              name="实际价格"
            />
            {/* 预测价格线 */}
            <Line
              type="monotone"
              dataKey="predictedPrice"
              stroke={config.color}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="预测价格"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// 三个企业预测概览组件
export function EnterprisePredictionOverview({ className }: { className?: string }) {
  const { mounted } = useTheme()

  if (!mounted) {
    return (
      <div className={className}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-800">
              <CardContent className="h-[300px] flex items-center justify-center">
                <div className="text-slate-400 text-sm">加载中...</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className || ""}`}>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-cyan-400" />
        <h2 className="text-xl font-semibold text-slate-100">企业硫磺价格预测</h2>
        <Badge variant="outline" className="bg-cyan-900/30 border-cyan-700 text-cyan-300">
          LSTM 模型
        </Badge>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <EnterprisePredictionChart enterpriseCode="yihua" />
        <EnterprisePredictionChart enterpriseCode="luxi" />
        <EnterprisePredictionChart enterpriseCode="jinzhengda" />
      </div>
    </div>
  )
}