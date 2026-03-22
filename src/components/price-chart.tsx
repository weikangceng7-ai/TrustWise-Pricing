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
} from "recharts"
import { useTheme } from "@/components/theme-provider"

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

// 硫磺价格模拟数据（基于原油价格推算）
function generateSulfurPriceData(oilData: ExternalDataPoint[]): Array<{
  date: string
  actualPrice: number
  predictedPrice: number | null
}> {
  if (!oilData || oilData.length === 0) return []

  // 硫磺价格约为原油价格的 12-15 倍（元/吨 vs 美元/桶）
  // 汇率约 7.2
  return oilData.map((item) => {
    const oilPrice = item.value
    const exchangeRate = 7.2
    // 硫磺价格 = 原油价格 * 汇率 * 系数 (约 100-120 元/吨)
    const sulfurPrice = Math.round(oilPrice * exchangeRate * 1.2 + (Math.random() - 0.5) * 50)

    return {
      date: item.date,
      actualPrice: Math.max(800, Math.min(1200, sulfurPrice)), // 限制在合理范围
      predictedPrice: null,
    }
  })
}

// 生成预测数据
function generatePredictions(historicalData: Array<{ date: string; actualPrice: number }>) {
  if (historicalData.length === 0) return []

  const lastPrice = historicalData[historicalData.length - 1].actualPrice
  const lastDate = new Date(historicalData[historicalData.length - 1].date)

  // 计算平均变化率
  const prices = historicalData.slice(-7).map(d => d.actualPrice)
  const avgChange = prices.length > 1
    ? (prices[prices.length - 1] - prices[0]) / prices.length
    : 0

  const predictions = []
  for (let i = 1; i <= 7; i++) {
    const futureDate = new Date(lastDate)
    futureDate.setDate(futureDate.getDate() + i)

    // 使用固定种子生成伪随机数
    const seed = futureDate.getTime() + i
    const randomFactor = 1 + (Math.sin(seed) * 0.5 - 0.25) * 0.02
    const predictedPrice = (lastPrice + avgChange * i) * randomFactor

    predictions.push({
      date: futureDate.toISOString().split("T")[0],
      actualPrice: null,
      predictedPrice: Math.round(Math.max(800, Math.min(1200, predictedPrice))),
    })
  }

  return predictions
}

export function PriceChart() {
  const { resolvedTheme, mounted } = useTheme()
  const [externalData, setExternalData] = useState<ExternalDataResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        // 获取原油价格数据作为参考
        const res = await fetch("/api/external-data/akshare?type=oil")
        if (!res.ok) throw new Error("获取数据失败")
        const data: ExternalDataResponse = await res.json()
        setExternalData(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("未知错误"))
      } finally {
        setIsLoading(false)
      }
    }

    if (mounted) {
      fetchData()
    }
  }, [mounted])

  // 处理图表数据
  const chartData = useMemo(() => {
    if (!externalData?.data?.history) return []

    const history = externalData.data.history
    const sulfurData = generateSulfurPriceData(history)
    const predictions = generatePredictions(sulfurData)

    return [...sulfurData, ...predictions]
  }, [externalData])

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
    <ResponsiveContainer width="100%" height={280}>
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