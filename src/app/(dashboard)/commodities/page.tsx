"use client"

import { useState, useMemo } from "react"
import { TrendingUp, TrendingDown, Minus, Activity, Scale, Loader2 } from "lucide-react"
import { COMMODITY_INFO, COMMODITY_CODES, type CommodityCode } from "@/db/schema-commodity"
import { usePriceSummary, useInventorySummary } from "@/hooks/use-prices"
import { getBackgroundImage } from "@/config/images"

const CARD_COLORS: Record<CommodityCode, { gradient: string; border: string; badge: string; badgeText: string }> = {
  sulfur: {
    gradient: "from-cyan-50 to-blue-50 dark:from-cyan-500/10 dark:to-blue-500/10",
    border: "border-cyan-200/50 dark:border-cyan-500/20",
    badge: "bg-cyan-100 dark:bg-cyan-500/20",
    badgeText: "text-cyan-700 dark:text-cyan-300",
  },
  phosphate: {
    gradient: "from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10",
    border: "border-violet-200/50 dark:border-violet-500/20",
    badge: "bg-violet-100 dark:bg-violet-500/20",
    badgeText: "text-violet-700 dark:text-violet-300",
  },
  potash: {
    gradient: "from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10",
    border: "border-amber-200/50 dark:border-amber-500/20",
    badge: "bg-amber-100 dark:bg-amber-500/20",
    badgeText: "text-amber-700 dark:text-amber-300",
  },
  urea: {
    gradient: "from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10",
    border: "border-emerald-200/50 dark:border-emerald-500/20",
    badge: "bg-emerald-100 dark:bg-emerald-500/20",
    badgeText: "text-emerald-700 dark:text-emerald-300",
  },
}

function TrendBadge({ trend, change }: { trend: "up" | "down" | "flat"; change: string }) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="h-3 w-3" />
        {change}
      </span>
    )
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-rose-600 dark:text-rose-400">
        <TrendingDown className="h-3 w-3" />
        {change}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-500">
      <Minus className="h-3 w-3" />
      {change}
    </span>
  )
}

function CommodityOverviewCards({
  selected,
  onSelect,
}: {
  selected: CommodityCode
  onSelect: (code: CommodityCode) => void
}) {
  const codes = Object.values(COMMODITY_CODES)
  const queries = codes.map((code) => {
    const summary = usePriceSummary(code)
    return { code, summary }
  })

  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      {queries.map(({ code, summary }) => {
        const cardColors = CARD_COLORS[code]
        const info = COMMODITY_INFO[code]
        const isSelected = selected === code
        const priceData = summary.data?.data
        const isLoading = summary.isLoading

        const currentPrice = priceData?.currentPrice
        const changePercent = priceData?.changePercent ? Number(priceData.changePercent) : 0
        const trend: "up" | "down" | "flat" = changePercent > 1 ? "up" : changePercent < -1 ? "down" : "flat"
        const changeStr = `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%`
        const market = priceData?.market || ""
        const source = priceData?.source || ""

        return (
          <button
            key={code}
            onClick={() => onSelect(code)}
            className={`text-left p-4 rounded-xl border backdrop-blur-sm transition-all duration-200 cursor-pointer bg-gradient-to-br ${cardColors.gradient} ${cardColors.border} ${
              isSelected ? "ring-2 ring-offset-1 ring-slate-400 dark:ring-slate-500 scale-[1.02] shadow-lg" : "hover:scale-[1.02] hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${cardColors.badge} ${cardColors.badgeText}`}>
                {info.name}
              </span>
              <TrendBadge trend={trend} change={changeStr} />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mb-1">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              ) : currentPrice ? (
                `¥${Number(currentPrice).toLocaleString()}`
              ) : (
                <span className="text-sm text-slate-400">暂无数据</span>
              )}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <span>{market || "现货均价"}</span>
              {source && (
                <span className={`px-1 py-0.5 rounded text-[10px] font-medium ${
                  source.includes("模拟") ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                  source.includes("推算") ? "bg-sky-500/10 text-sky-600 dark:text-sky-400" :
                  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }`}>
                  {source.includes("模拟") ? "模拟" : source.includes("推算") ? "推算" : "真实"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-200/50 dark:border-white/10">
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3 text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {Math.abs(changePercent) > 2 ? "活跃" : "正常"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Scale className="h-3 w-3 text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {Math.abs(changePercent) > 3 ? "高风险" : Math.abs(changePercent) > 1 ? "中等风险" : "低风险"}
                </span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function ComparisonBar() {
  const codes = Object.values(COMMODITY_CODES)
  // 并行获取所有品种的价格摘要
  const queries = codes.map((code) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const summary = usePriceSummary(code)
    return { code, summary }
  })

  const items = queries
    .map(({ code, summary }) => {
      const priceData = summary.data?.data
      if (!priceData?.currentPrice) return null
      return {
        code,
        name: COMMODITY_INFO[code].name,
        price: Number(priceData.currentPrice),
        changePercent: priceData.changePercent ? Number(priceData.changePercent) : 0,
        market: priceData.market || "",
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  if (items.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">价格对比</h3>
        <p className="text-xs text-slate-400">加载中...</p>
      </div>
    )
  }

  const maxPrice = Math.max(...items.map((i) => i.price))

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">价格对比</h3>
      {items.map(({ code, name, price, changePercent, market }) => {
        const width = maxPrice > 0 ? (price / maxPrice) * 100 : 0
        return (
          <div key={code} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300">{name}</span>
              <span className="text-slate-600 dark:text-slate-400">
                ¥{price.toLocaleString()} <span className="text-slate-400">{market || "现货均价"}</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  code === "sulfur" ? "bg-cyan-500" :
                  code === "phosphate" ? "bg-violet-500" :
                  code === "potash" ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function CommoditiesPage() {
  const [selectedCommodity, setSelectedCommodity] = useState<CommodityCode>("sulfur")
  const bgImage = getBackgroundImage("dashboardBackground")

  // 从 API 获取选中品种的真实数据
  const priceSummary = usePriceSummary(selectedCommodity)
  const inventorySummary = useInventorySummary(selectedCommodity)
  const isLoading = priceSummary.isLoading || inventorySummary.isLoading

  // 从 API 计算展示值，API 不可用时显示空状态
  const metrics = useMemo(() => {
    const priceData = priceSummary.data?.data
    const invData = inventorySummary.data?.data
    if (priceData?.currentPrice) {
      const currentPrice = Number(priceData.currentPrice)
      const changePercent = priceData.changePercent ? Number(priceData.changePercent) : 0

      // 根据真实数据生成关键驱动因素和展望
      const drivers: string[] = []
      if (Math.abs(changePercent) > 2) drivers.push(changePercent > 0 ? "价格上涨趋势" : "价格下跌趋势")
      if (invData?.currentInventory) {
        const inv = Number(invData.currentInventory)
        if (inv > 500000) drivers.push("港口库存偏高")
        else if (inv < 200000) drivers.push("港口库存偏低")
        else drivers.push("库存水平正常")
      }
      drivers.push("关注国际市场动态")

      const outlook = changePercent > 2
        ? `短期价格走强，变动${changePercent.toFixed(1)}%，建议关注下游需求变化。`
        : changePercent < -2
        ? `短期价格承压，变动${Math.abs(changePercent).toFixed(1)}%，可关注采购时机。`
        : "价格相对平稳，按需采购为主。"

      return {
        price: `¥${currentPrice.toLocaleString()}`,
        priceLabel: priceData.market ? `${priceData.market}现货价` : "现货均价",
        change: `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%`,
        trend: (changePercent > 1 ? "up" : changePercent < -1 ? "down" : "flat") as "up" | "down" | "flat",
        volatility: changePercent > 3 ? "高" : changePercent > 1 ? "中等" : "低",
        marketHeat: invData?.currentInventory ? (Number(invData.currentInventory) > 500000 ? "旺盛" : Number(invData.currentInventory) > 200000 ? "活跃" : "温和") : "正常",
        riskLevel: changePercent > 3 ? "高" : changePercent > 1 ? "中等" : "低",
        keyDrivers: drivers,
        outlook,
      }
    }
    return null
  }, [selectedCommodity, priceSummary.data, inventorySummary.data])

  const colors = CARD_COLORS[selectedCommodity]

  return (
    <div className="min-h-screen relative overflow-hidden pb-16 bg-slate-50 dark:bg-[#0a0a1a]">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="absolute inset-0 bg-white/80 dark:bg-[#0a0a1a]/80 backdrop-blur-sm" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-300/30 dark:bg-purple-600/20 blur-[120px] rounded-full" />
        <div className="absolute top-20 right-0 w-[300px] h-[300px] bg-blue-200/30 dark:bg-blue-500/15 blur-[100px] rounded-full" />
      </div>

      <div className="relative px-4 pt-4 pb-3 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">品种对比分析</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">多品种价格、趋势与驱动因素横向对比</p>
          </div>
        </div>

        {/* 品种概览卡片 */}
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">点击卡片查看品种详细分析</p>
        <CommodityOverviewCards selected={selectedCommodity} onSelect={setSelectedCommodity} />

        <div className="grid grid-cols-2 gap-4">
          {/* 左侧：详情 */}
          {metrics ? (
            <div className={`rounded-xl border backdrop-blur-sm p-5 bg-gradient-to-br ${colors.gradient} ${colors.border}`}>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
                {COMMODITY_INFO[selectedCommodity].name} 详细分析
              </h2>

              {/* 关键指标 */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-white/60 dark:bg-white/10 border border-slate-200/50 dark:border-white/5">
                  <div className="text-xs text-slate-500 mb-1">价格</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{metrics.price}</div>
                  <TrendBadge trend={metrics.trend} change={metrics.change} />
                </div>
                <div className="p-3 rounded-lg bg-white/60 dark:bg-white/10 border border-slate-200/50 dark:border-white/5">
                  <div className="text-xs text-slate-500 mb-1">波动性</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{metrics.volatility}</div>
                  <div className="text-xs text-slate-400">价格波动率</div>
                </div>
                <div className="p-3 rounded-lg bg-white/60 dark:bg-white/10 border border-slate-200/50 dark:border-white/5">
                  <div className="text-xs text-slate-500 mb-1">风险等级</div>
                  <div className={`text-lg font-bold ${metrics.riskLevel === "高" ? "text-rose-600 dark:text-rose-400" : metrics.riskLevel === "中等" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {metrics.riskLevel}
                  </div>
                  <div className="text-xs text-slate-400">综合评估</div>
                </div>
              </div>

              {/* 关键驱动因素 */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">关键驱动因素</h3>
                <div className="flex flex-wrap gap-2">
                  {metrics.keyDrivers.map((d) => (
                    <span key={d} className="text-xs px-2.5 py-1 rounded-full bg-white/60 dark:bg-white/10 border border-slate-200/50 dark:border-white/10 text-slate-700 dark:text-slate-300">
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              {/* 展望 */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">市场展望</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{metrics.outlook}</p>
              </div>
            </div>
          ) : (
            <div className={`rounded-xl border backdrop-blur-sm p-5 bg-gradient-to-br ${colors.gradient} ${colors.border} flex items-center justify-center min-h-[300px]`}>
              <div className="text-center">
                {isLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-3" />
                ) : (
                  <Activity className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                )}
                <p className="text-sm text-slate-500">
                  {isLoading ? "加载中..." : "暂无数据，请稍后重试"}
                </p>
              </div>
            </div>
          )}

          {/* 右侧：价格对比条 + 相关性 */}
          <div className="space-y-4">
            <div className="rounded-xl border backdrop-blur-sm p-5 bg-white/80 dark:bg-white/5 border-slate-200 dark:border-white/10">
              <ComparisonBar />
            </div>

            {/* 品种相关性 */}
            <div className="rounded-xl border backdrop-blur-sm p-5 bg-white/80 dark:bg-white/5 border-slate-200 dark:border-white/10">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">品种相关性</h3>
              <div className="space-y-2">
                {[
                  { pair: "硫磺 → 磷矿", correlation: "强正相关", value: 0.82, desc: "磷肥生产拉动硫磺需求" },
                  { pair: "硫磺 → 钾肥", correlation: "弱正相关", value: 0.35, desc: "化肥板块整体联动" },
                  { pair: "尿素 → 钾肥", correlation: "弱负相关", value: -0.28, desc: "替代效应与季节性差异" },
                  { pair: "磷矿 → 尿素", correlation: "不相关", value: 0.05, desc: "产业链上下游不同步" },
                ].map((item) => (
                  <div key={item.pair} className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-700/20">
                    <div>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.pair}</div>
                      <div className="text-xs text-slate-400">{item.desc}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${
                        item.value > 0.5 ? "text-emerald-600 dark:text-emerald-400" :
                        item.value > 0 ? "text-amber-600 dark:text-amber-400" :
                        "text-rose-600 dark:text-rose-400"
                      }`}>
                        {item.correlation}
                      </div>
                      <div className="text-xs text-slate-400">r = {item.value.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
