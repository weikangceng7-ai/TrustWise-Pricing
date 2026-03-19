"use client"

import { TrendingUp, TrendingDown, Minus, Package, Lightbulb } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { usePriceSummary } from "@/hooks/use-prices"
import { Skeleton } from "@/components/ui/skeleton"

export function SummaryCards() {
  const { data, isLoading, error } = usePriceSummary()

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

  if (error || !data?.data) {
    return null
  }

  const summary = data.data
  const currentPrice = parseFloat(summary.currentPrice || "0")
  const predictedAvg = parseFloat(summary.avgPrice || "0")

  // 判断建议操作
  const changePercent = ((predictedAvg - currentPrice) / currentPrice) * 100
  let recommendation: { action: string; trend: "up" | "down" | "stable" }

  if (changePercent > 3) {
    recommendation = { action: "建议备库", trend: "up" }
  } else if (changePercent < -3) {
    recommendation = { action: "观望为主", trend: "down" }
  } else {
    recommendation = { action: "按需采购", trend: "stable" }
  }

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
            {summary.market} - {summary.specification} | {summary.date}
          </p>
        </CardContent>
      </Card>

      {/* 近期均价 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Package className="h-4 w-4" />
            近30日均价
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
            价格区间: {summary.minPrice} - {summary.maxPrice} 元/吨
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
            {summary.changePercent ? `今日涨跌: ${summary.changePercent}` : "基于价格趋势分析的建议"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}