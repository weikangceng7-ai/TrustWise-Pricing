"use client"

import { TrendingUp, TrendingDown, Minus, Package, Lightbulb, AlertTriangle, Shield } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usePriceSummary } from "@/hooks/use-prices"
import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"

// 趋势分析数据类型
interface TrendAnalysis {
  current_price: number
  ma_7: number
  ma_30: number
  volatility: number
  trend_7d: string
  trend_30d: string
  change_7d_percent: number
  change_30d_percent: number
  regime?: string
  risk_adjustment?: number
  analysis: string
}

export function SummaryCards() {
  const { data, isLoading, error } = usePriceSummary()

  // 获取趋势分析（包含 regime 信息）
  const { data: trendData } = useQuery({
    queryKey: ["trend-analysis"],
    queryFn: async () => {
      const res = await fetch("/api/prediction?action=trend&days=30")
      if (!res.ok) throw new Error("获取趋势分析失败")
      const result = await res.json()
      return result.data as TrendAnalysis
    },
    staleTime: 10 * 60 * 1000, // 10分钟缓存
  })

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

  // 获取 regime 信息
  const regime = trendData?.regime || "normal"
  const riskAdjustment = trendData?.risk_adjustment || 1.0

  // 判断建议操作（整合 regime 信息）
  const changePercent = ((predictedAvg - currentPrice) / currentPrice) * 100
  let recommendation: { action: string; trend: "up" | "down" | "stable"; description: string }

  // 根据 regime 调整建议
  if (regime === "high") {
    recommendation = {
      action: "谨慎观望",
      trend: "stable",
      description: "市场波动较大，建议降低风险敞口"
    }
  } else if (regime === "low") {
    // 低波动时，可以更积极地建议备库
    if (changePercent > 2) {
      recommendation = {
        action: "建议备库",
        trend: "up",
        description: "市场平稳，价格上行，适合增加库存"
      }
    } else if (changePercent < -2) {
      recommendation = {
        action: "观望等待",
        trend: "down",
        description: "市场平稳，价格下行，可等待更低价格"
      }
    } else {
      recommendation = {
        action: "按需采购",
        trend: "stable",
        description: "市场平稳，价格稳定，按实际需求采购"
      }
    }
  } else {
    // normal regime
    if (changePercent > 3) {
      recommendation = { action: "建议备库", trend: "up", description: "价格上涨趋势，建议提前备库" }
    } else if (changePercent < -3) {
      recommendation = { action: "观望为主", trend: "down", description: "价格下跌趋势，可等待更低价格" }
    } else {
      recommendation = { action: "按需采购", trend: "stable", description: "基于价格趋势分析的建议" }
    }
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

  // Regime Badge 配置
  const regimeConfig = {
    low: { label: "低波动", color: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700", icon: Shield },
    normal: { label: "正常", color: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700", icon: null },
    high: { label: "高波动", color: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700", icon: AlertTriangle },
  }
  const currentRegimeConfig = regimeConfig[regime as keyof typeof regimeConfig] || regimeConfig.normal

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

      {/* 建议操作（整合 regime 信息） */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Lightbulb className="h-4 w-4" />
              建议操作
            </CardTitle>
            {currentRegimeConfig && (
              <Badge variant="outline" className={`${currentRegimeConfig.color} text-xs`}>
                {currentRegimeConfig.icon && <currentRegimeConfig.icon className="h-3 w-3 mr-1" />}
                {currentRegimeConfig.label}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className={`flex items-center gap-2 text-2xl font-bold ${trendColor}`}>
            <TrendIcon className="h-6 w-6" />
            {recommendation.action}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {recommendation.description}
          </p>
          {riskAdjustment !== 1.0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              风险系数: {riskAdjustment.toFixed(2)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}