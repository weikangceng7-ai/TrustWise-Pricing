"use client"

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
import { usePrices, type PriceData } from "@/hooks/use-prices"
import { Skeleton } from "@/components/ui/skeleton"

// 生成预测价格数据（基于实际价格进行简单预测）
function generatePredictedPrices(data: PriceData[]) {
  if (data.length === 0) return []

  const lastPrice = parseFloat(data[0].mainPrice || "0") // 数据已按日期降序，第一条是最新的
  const avgChange = data.reduce((acc, item, i) => {
    if (i === 0) return 0
    const prevPrice = parseFloat(data[i - 1].mainPrice || "0")
    const currPrice = parseFloat(item.mainPrice || "0")
    return acc + (prevPrice - currPrice)
  }, 0) / (data.length - 1)

  // 生成未来7天的预测
  const predictions = []
  const lastDate = new Date(data[0].date)

  for (let i = 1; i <= 7; i++) {
    const futureDate = new Date(lastDate)
    futureDate.setDate(futureDate.getDate() + i)

    // 添加随机波动（模拟预测不确定性）
    const randomFactor = 1 + (Math.random() - 0.5) * 0.02
    const predictedPrice = (lastPrice + avgChange * i) * randomFactor

    predictions.push({
      date: futureDate.toISOString().split("T")[0],
      actualPrice: null,
      predictedPrice: Math.round(predictedPrice * 100) / 100,
    })
  }

  return predictions
}

// 处理图表数据
function processChartData(data: PriceData[]) {
  // 数据按日期降序排列，需要反转为升序显示
  const sortedData = [...data].reverse()

  const actualData = sortedData.map((item) => ({
    date: item.date,
    actualPrice: item.mainPrice ? parseFloat(item.mainPrice) : null,
    predictedPrice: null,
  }))

  const predictedData = generatePredictedPrices(data)
  return [...actualData, ...predictedData]
}

export function PriceChart() {
  const { data, isLoading, error } = usePrices(60) // 获取最近60天数据

  if (isLoading) {
    return (
      <div className="h-[400px] w-full">
        <Skeleton className="h-full w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        加载数据失败，请刷新页面重试
      </div>
    )
  }

  const chartData = processChartData(data?.data || [])

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => value.slice(5)} // 只显示月-日
          className="text-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          domain={["auto", "auto"]}
          tickFormatter={(value) => `${value}`}
          className="text-muted-foreground"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "hsl(var(--foreground))" }}
          formatter={(value, name) => {
            if (value === null || value === undefined) return ["-", String(name)]
            return [`${Number(value).toFixed(2)} 元/吨`, String(name)]
          }}
        />
        <Legend
          formatter={(value) => {
            if (value === "actualPrice") return "实际价格"
            if (value === "predictedPrice") return "预测价格"
            return value
          }}
        />
        <Line
          type="monotone"
          dataKey="actualPrice"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 2 }}
          activeDot={{ r: 6 }}
          name="actualPrice"
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="predictedPrice"
          stroke="hsl(var(--chart-2))"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 2 }}
          name="predictedPrice"
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}