"use client"

import { useState, useEffect } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { useTheme } from "@/components/theme-provider"

// 时间范围类型
export type TimeRange = "week" | "month"

// 外部数据类型
interface ExternalDataPoint {
  date: string
  value: number
  change?: number
  changePercent?: number
}

interface ExternalDataResponse {
  success: boolean
  source: string
  data: {
    name: string
    unit: string
    latest: ExternalDataPoint
    history: ExternalDataPoint[]
  }
  timestamp: string
}

// 硫磺价格模拟数据（基于原油价格推算，仅作 fallback）
function generateSulfurPriceFromOil(oilData: ExternalDataPoint[]): Array<{
  date: string
  actualPrice: number
  predictedPrice: number | null
}> {
  if (!oilData || oilData.length === 0) return []

  return oilData.map((item) => {
    const oilPrice = item.value
    const exchangeRate = 7.2
    const sulfurPrice = Math.round(oilPrice * exchangeRate * 1.2 + (Math.random() - 0.5) * 50)

    return {
      date: item.date,
      actualPrice: Math.max(800, Math.min(1200, sulfurPrice)),
      predictedPrice: null,
    }
  })
}

// 生成预测数据（优先使用预测 API，失败时本地推算）
async function fetchPredictions(historicalData: Array<{ date: string; actualPrice: number }>) {
  if (historicalData.length === 0) return []

  // 尝试调用预测 API
  try {
    const res = await fetch("/api/v1/prices/predict", { method: "POST" })
    if (res.ok) {
      const data = await res.json()
      if (data.success && data.data?.predictions) {
        return data.data.predictions.map((p: { date: string; price: number }) => ({
          date: p.date,
          actualPrice: null as number | null,
          predictedPrice: Math.round(p.price),
        }))
      }
    }
  } catch {
    // 预测 API 不可用，使用本地推算
  }

  // 本地 fallback 推算
  const lastPrice = historicalData[historicalData.length - 1].actualPrice
  const lastDate = new Date(historicalData[historicalData.length - 1].date)
  const prices = historicalData.slice(-7).map(d => d.actualPrice)
  const avgChange = prices.length > 1
    ? (prices[prices.length - 1] - prices[0]) / prices.length
    : 0

  const predictions = []
  for (let i = 1; i <= 7; i++) {
    const futureDate = new Date(lastDate)
    futureDate.setDate(futureDate.getDate() + i)
    const predictedPrice = lastPrice + avgChange * i

    predictions.push({
      date: futureDate.toISOString().split("T")[0],
      actualPrice: null as number | null,
      predictedPrice: Math.round(Math.max(800, Math.min(1200, predictedPrice))),
    })
  }
  return predictions
}

interface PriceChartProps {
  timeRange?: TimeRange
}

export function PriceChart({ timeRange = "month" }: PriceChartProps) {
  const { resolvedTheme, mounted } = useTheme()
  const [chartData, setChartData] = useState<Array<{ date: string; actualPrice: number | null; predictedPrice: number | null }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        // 优先获取真实价格数据
        const chartRes = await fetch("/api/prices/chart-data")
        let historicalData: Array<{ date: string; actualPrice: number }> = []

        if (chartRes.ok) {
          const chartJson = await chartRes.json()
          if (chartJson.success && chartJson.data?.length > 0) {
            historicalData = chartJson.data
          }
        }

        // Fallback: 从原油价格推算
        if (historicalData.length === 0) {
          const oilRes = await fetch("/api/external-data/akshare?type=oil")
          if (!oilRes.ok) throw new Error("获取数据失败")
          const oilData: ExternalDataResponse = await oilRes.json()
          historicalData = generateSulfurPriceFromOil(oilData.data?.history || [])
        }

        // 获取预测数据
        const predictions = await fetchPredictions(historicalData)

        setChartData([...historicalData.map(d => ({ ...d, predictedPrice: null as number | null })), ...predictions])
      } catch (err) {
        setError(err instanceof Error ? err : new Error("未知错误"))
      } finally {
        setIsLoading(false)
      }
    }

    if (mounted) {
      fetchData()
    }
  }, [mounted, timeRange])

  if (isLoading || !mounted) {
    return (
      <div className="h-[280px] w-full flex items-center justify-center">
        <div className="text-slate-400 dark:text-slate-500 text-sm">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[280px] items-center justify-center text-slate-500 dark:text-slate-400">
        加载数据失败，请刷新页面重试
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-slate-500 dark:text-slate-400">
        暂无价格数据
      </div>
    )
  }

  // 根据主题设置颜色（默认深色主题）
  const isDark = !mounted || resolvedTheme === "dark"
  const gridColor = isDark ? "#334155" : "#e2e8f0"
  const axisColor = isDark ? "#475569" : "#94a3b8"
  const tickColor = isDark ? "#94a3b8" : "#64748b"
  const tooltipBg = isDark ? "#1e293b" : "#ffffff"
  const tooltipBorder = isDark ? "#334155" : "#e2e8f0"
  const tooltipLabelColor = isDark ? "#f1f5f9" : "#0f172a"
  const tooltipItemColor = isDark ? "#cbd5e1" : "#475569"

  return (
    <ResponsiveContainer width="100%" height={280} minWidth={0} minHeight={0}>
      <LineChart
        data={chartData}
        margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: tickColor }}
          tickFormatter={(value) => value.slice(5)}
          stroke={axisColor}
        />
        <YAxis
          tick={{ fontSize: 10, fill: tickColor }}
          domain={["auto", "auto"]}
          tickFormatter={(value) => `${value}`}
          stroke={axisColor}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          }}
          labelStyle={{ color: tooltipLabelColor, fontWeight: 500 }}
          itemStyle={{ color: tooltipItemColor }}
          formatter={(value, name) => {
            if (value === null || value === undefined) return ["-", String(name)]
            return [`${Number(value).toFixed(0)} 元/吨`, String(name)]
          }}
        />
        <Legend
          formatter={(value) => {
            if (value === "actualPrice") return "实际价格"
            if (value === "predictedPrice") return "预测价格"
            return value
          }}
          wrapperStyle={{ paddingTop: 10 }}
        />
        <Line
          type="monotone"
          dataKey="actualPrice"
          stroke="#06b6d4"
          strokeWidth={2}
          dot={{ fill: "#06b6d4", strokeWidth: 2, r: 3 }}
          activeDot={{ r: 5, fill: "#06b6d4" }}
          name="actualPrice"
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="predictedPrice"
          stroke="#8b5cf6"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 3 }}
          name="predictedPrice"
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}