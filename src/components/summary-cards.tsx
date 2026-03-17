"use client"

import { TrendingUp, TrendingDown, Minus, Package, Lightbulb } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { usePrices } from "@/hooks/use-prices"
import { Skeleton } from "@/components/ui/skeleton"

// 计算下周预测均价
function calculatePredictedAverage(data: { price: string }[]): number {
  if (data.length < 2) return 0

  const prices = data.map((d) => parseFloat(d.price))
  const lastPrice = prices[prices.length - 1]
  const avgChange = prices.reduce((acc, p, i) => {
    if (i === 0) return 0
    return acc + (p - prices[i - 1])
  }, 0) / (prices.length - 1)

  // 预测未来7天均价
  let sum = 0
  for (let i = 1; i <= 7; i++) {
    sum += lastPrice + avgChange * i
  }
  return sum / 7
}

// 判断建议操作
function getRecommendation(currentPrice: number, predictedAvg: number): {
  action: string
  trend: "up" | "down" | "stable"
} {
  const changePercent = ((predictedAvg - currentPrice) / currentPrice) * 100

  if (changePercent > 3) {
    return { action: "建议备库", trend: "up" }
  } else if (changePercent < -3) {
    return { action: "观望为主", trend: "down" }
  } else {
    return { action: "按需采购", trend: "stable" }
  }
}

export function SummaryCards() {
  const { data, isLoading, error } = usePrices()

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !data?.data?.length) {
    return null
  }

  const prices = data.data
  const currentPrice = parseFloat(prices[prices.length - 1].price)
  const predictedAvg = calculatePredictedAverage(prices)
  const recommendation = getRecommendation(currentPrice, predictedAvg)

  const TrendIcon =
    recommendation.trend === "up"
      ? TrendingUp
      : recommendation.trend === "down"
      ? TrendingDown
      : Minus

  const trendColor =
    recommendation.trend === "up"
      ? "text-red-500"
      : recommendation.trend === "down"
      ? "text-green-500"
      : "text-yellow-500"

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* 当前现货价 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            当前现货价
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {currentPrice.toFixed(2)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              元/吨
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            数据来源: {prices[prices.length - 1].source}
          </p>
        </CardContent>
      </Card>

      {/* 下周预测均价 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Package className="h-4 w-4" />
            下周预测均价
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {predictedAvg.toFixed(2)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              元/吨
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            预计{predictedAvg > currentPrice ? "上涨" : predictedAvg < currentPrice ? "下跌" : "持平"}
            {Math.abs(((predictedAvg - currentPrice) / currentPrice) * 100).toFixed(1)}%
          </p>
        </CardContent>
      </Card>

      {/* 建议操作 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Lightbulb className="h-4 w-4" />
            建议操作
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`flex items-center gap-2 text-2xl font-bold ${trendColor}`}>
            <TrendIcon className="h-6 w-6" />
            {recommendation.action}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            基于价格趋势分析的建议
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
