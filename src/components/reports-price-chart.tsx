"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"
import { useQuery } from "@tanstack/react-query"
import { useTheme } from "@/components/theme-provider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, TrendingUp, Factory, Globe, BarChart3, Package, Loader2 } from "lucide-react"

// 价格分类配置（改为采购报告数据分类）
const PRICE_CATEGORIES = [
  {
    id: "sulfur-price",
    name: "国内硫磺均价",
    icon: TrendingUp,
    description: "硫磺市场价格走势",
    color: "rose",
    unit: "元/吨",
  },
  {
    id: "oil-price",
    name: "WTI原油现货",
    icon: Globe,
    description: "原油成本价格",
    color: "amber",
    unit: "美元/桶",
  },
  {
    id: "port-inventory",
    name: "主要港口库存",
    icon: Package,
    description: "港口库存水平",
    color: "emerald",
    unit: "万吨",
  },
  {
    id: "port-arrival",
    name: "港口到货量",
    icon: Factory,
    description: "港口到货数量",
    color: "cyan",
    unit: "万吨",
  },
]

const CATEGORY_COLORS: Record<string, string> = {
  cyan: "#06b6d4",
  violet: "#8b5cf6",
  amber: "#f59e0b",
  emerald: "#10b981",
  rose: "#f43f5e",
  blue: "#3b82f6",
}

// 报告摘要解析正则
const REPORT_PATTERNS = {
  SULFUR_PRICE: /国内硫磺均价报(\d+)元\/吨/,
  WEEKLY_CHANGE: /较上周([上涨下跌]+)([\d.]+)%/,
  PORT_ARRIVAL: /港口到货量约(\d+)万吨/,
  MARKET_OVERVIEW: /市场概况/,
}

// 固定 Tooltip 组件
function PinnedTooltip({
  pinnedTooltip,
  tooltipBg,
  tooltipBorder,
  handleCloseTooltip,
  currentCategory,
}: {
  pinnedTooltip: { date: string; price: number; changePercent: number | null; source: string | null; note: string | null; x: number; y: number }
  tooltipBg: string
  tooltipBorder: string
  handleCloseTooltip: () => void
  currentCategory: typeof PRICE_CATEGORIES[0]
}) {
  const { date, price, changePercent, source, note, x, y } = pinnedTooltip
  const tooltipHeight = 180

  // 水平位置（相对于容器中心）
  const leftPos = x
  // 垂直位置：优先在数据点上方显示
  let topPos = y - tooltipHeight - 15
  if (topPos < 10) {
    topPos = y + 20
  }

  const color = CATEGORY_COLORS[currentCategory.color]

  return (
    <div
      id="pinned-tooltip"
      className="p-4 rounded-lg shadow-lg max-w-[280px] absolute z-50"
      style={{
        backgroundColor: tooltipBg,
        border: `1px solid ${tooltipBorder}`,
        left: leftPos,
        top: topPos,
        transform: "translateX(-50%)",
      }}
    >
      <button
        className="absolute top-2 right-2 p-1 rounded hover:bg-muted/50 transition-colors z-10"
        onClick={(e) => {
          e.stopPropagation()
          handleCloseTooltip()
        }}
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
      <p className="font-medium text-sm">{date}</p>
      <p className="text-lg font-bold mt-2" style={{ color }}>
        {price} {currentCategory.unit}
      </p>
      {changePercent !== null && (
        <div className="flex items-center gap-1 mt-2">
          <Badge variant="secondary" className={`text-xs ${changePercent >= 0 ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`}>
            {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(2)}%
          </Badge>
        </div>
      )}
      {source && (
        <p className="text-xs text-muted-foreground mt-2">
          数据来源: {source}
        </p>
      )}
      {note && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note}</p>
      )}
    </div>
  )
}

export function ReportsPriceChart() {
  const { resolvedTheme, mounted } = useTheme()
  const [pinnedTooltip, setPinnedTooltip] = useState<{ date: string; price: number; changePercent: number | null; source: string | null; note: string | null; x: number; y: number } | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("sulfur-price")
  const containerRef = useRef<HTMLDivElement>(null)

  // 获取报告数据并解析出具体数值
  // 使用 staleTime 缓存 1 分钟，避免频繁刷新
  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ["reports-chart"],
    queryFn: async () => {
      const res = await fetch(`/api/reports`)
      const json = await res.json()
      return json.data as any[]
    },
    staleTime: 60 * 1000,
  })

  // 预加载原油价格数据（不按需加载）
  const { data: oilData } = useQuery({
    queryKey: ["oil-price-chart"],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/external-data/akshare?type=oil`)
        if (!res.ok) return []
        const json = await res.json()
        return json.data?.history || []
      } catch {
        return []
      }
    },
    staleTime: 60 * 1000,
  })

  // 预加载库存数据（不按需加载）
  const { data: inventoryData } = useQuery({
    queryKey: ["inventory-chart"],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/inventory?limit=60`)
        if (!res.ok) return []
        const json = await res.json()
        return json.data || []
      } catch {
        return []
      }
    },
    staleTime: 60 * 1000,
  })

  // 根据分类构建图表数据
  const priceData = useCallback((): Array<{ date: string; price: number; changePercent: number | null; source: string | null; note: string | null }> => {
    if (!reportsData) return []

    if (selectedCategory === "sulfur-price") {
      // 从报告中解析硫磺均价
      return reportsData.map((report: any) => {
        const match = report.summary?.match(REPORT_PATTERNS.SULFUR_PRICE)
        const price = match ? parseInt(match[1]) : report.price || 0
        const changeMatch = report.summary?.match(REPORT_PATTERNS.WEEKLY_CHANGE)
        const changePercent = changeMatch ? parseFloat(changeMatch[2]) * (changeMatch[1] === "下跌" ? -1 : 1) : null
        return {
          date: report.reportDate,
          price,
          changePercent,
          source: report.summary?.match(REPORT_PATTERNS.MARKET_OVERVIEW) ? "采购报告" : null,
          note: report.title,
        }
      }).reverse()
    }

    if (selectedCategory === "oil-price" && oilData) {
      // 原油历史数据
      return oilData.map((item: any) => ({
        date: item.date,
        price: item.value,
        changePercent: item.changePercent,
        source: "FRED API",
        note: "WTI原油现货",
      }))
    }

    if (selectedCategory === "port-inventory" && inventoryData) {
      // 库存历史数据
      return inventoryData.map((item: any) => ({
        date: item.date,
        price: parseFloat(item.inventory),
        changePercent: null,
        source: "PostgreSQL",
        note: "港口库存",
      })).reverse()
    }

    if (selectedCategory === "port-arrival") {
      // 从报告中解析港口到货量
      return reportsData.map((report: any) => {
        const match = report.summary?.match(REPORT_PATTERNS.PORT_ARRIVAL)
        const price = match ? parseInt(match[1]) : 30
        return {
          date: report.reportDate,
          price,
          changePercent: null,
          source: "采购报告估算",
          note: report.title,
        }
      }).reverse()
    }

    return []
  }, [reportsData, oilData, inventoryData, selectedCategory])

  const isLoading = reportsLoading

  // 点击外部关闭固定的 tooltip
  const handleCloseTooltip = useCallback(() => {
    setPinnedTooltip(null)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pinnedTooltip && containerRef.current) {
        const tooltipEl = document.getElementById("pinned-tooltip")
        if (tooltipEl && !tooltipEl.contains(event.target as Node)) {
          handleCloseTooltip()
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [pinnedTooltip, handleCloseTooltip])

  // 处理数据点点击，显示固定tooltip
  const handleDotClick = useCallback((event: React.MouseEvent, data: { date: string; price: number; changePercent: number | null; source: string | null; note: string | null }) => {
    event.stopPropagation()
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      setPinnedTooltip({ ...data, x, y })
    }
  }, [])

  if (!mounted) {
    return (
      <div className="h-[280px] w-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // 当前分类配置
  const currentCategory = PRICE_CATEGORIES.find(c => c.id === selectedCategory) || PRICE_CATEGORIES[0]
  const currentCategoryColor = CATEGORY_COLORS[currentCategory.color]

  // 主题颜色配置
  const isDark = resolvedTheme === "dark"
  const gridColor = isDark ? "#334155" : "#e2e8f0"
  const axisColor = isDark ? "#475569" : "#94a3b8"
  const tickColor = isDark ? "#94a3b8" : "#64748b"
  const tooltipBg = isDark ? "#1e293b" : "#ffffff"
  const tooltipBorder = isDark ? "#334155" : "#e2e8f0"

  // 图表数据
  const chartData = priceData().filter(item => item.price !== null && item.price > 0)

  return (
    <div className="flex gap-4">
      {/* 左侧分类选择栏 */}
      <div className="w-[200px] shrink-0">
        <Card className="h-full">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm font-medium">价格分类</CardTitle>
            <CardDescription className="text-xs">选择查看不同维度的价格走势</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <div className="space-y-1">
              {PRICE_CATEGORIES.map((category) => {
                const Icon = category.icon
                const isActive = selectedCategory === category.id
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left ${
                      isActive
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted/50 border border-transparent"
                    }`}
                  >
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-md ${
                        isActive ? "bg-primary/20" : "bg-muted/50"
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : ""}`}>
                        {category.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{category.description}</p>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 右侧图表区域 */}
      <Card className="flex-1 min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" style={{ color: currentCategoryColor }} />
            {currentCategory.name}
          </CardTitle>
          <CardDescription className="text-xs">
            {isLoading ? "数据加载中..." : chartData.length > 0 ? `近${chartData.length}天数据走势 | 点击数据点查看详情` : "暂无数据"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 pb-4 relative" ref={containerRef}>
          {isLoading ? (
            <div className="h-[400px] w-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[400px] w-full flex items-center justify-center">
              <p className="text-sm text-muted-foreground">暂无{currentCategory.name}数据</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400} minWidth={0} minHeight={0}>
              <LineChart
                data={chartData}
                margin={{ top: 50, right: 30, left: -5, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: tickColor }}
                  tickFormatter={(value) => value.slice(5)}
                  stroke={axisColor}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: tickColor }}
                  domain={["auto", "auto"]}
                  tickFormatter={(value) => `${value}`}
                  stroke={axisColor}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={currentCategoryColor}
                  strokeWidth={2}
                  dot={(props: { cx?: number; cy?: number; payload?: { date: string; price: number; changePercent: number | null; source: string | null; note: string | null } }) => {
                    const { cx, cy, payload } = props
                    if (!payload || cx === undefined || cy === undefined) return null
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill={currentCategoryColor}
                        strokeWidth={2}
                        stroke="#fff"
                        style={{ cursor: "pointer" }}
                        onClick={(e) => handleDotClick(e, payload)}
                      />
                    )
                  }}
                  activeDot={(props: { cx?: number; cy?: number; payload?: { date: string; price: number; changePercent: number | null; source: string | null; note: string | null } }) => {
                    const { cx, cy, payload } = props
                    if (!payload || cx === undefined || cy === undefined) return null
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={8}
                        fill={currentCategoryColor}
                        strokeWidth={3}
                        stroke="#fff"
                        style={{ cursor: "pointer" }}
                        onClick={(e) => handleDotClick(e, payload)}
                      />
                    )
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
          {/* 固定的 Tooltip */}
          {pinnedTooltip && (
            <PinnedTooltip
              pinnedTooltip={pinnedTooltip}
              tooltipBg={tooltipBg}
              tooltipBorder={tooltipBorder}
              handleCloseTooltip={handleCloseTooltip}
              currentCategory={currentCategory}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}