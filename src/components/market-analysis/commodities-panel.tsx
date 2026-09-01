"use client"

import { useState, useMemo } from "react"
import { TrendingUp, TrendingDown, Minus, Activity, Scale, Loader2 } from "lucide-react"
import { COMMODITY_INFO, COMMODITY_CODES, type CommodityCode } from "@/db/schema-commodity"
import { usePriceSummary, useInventorySummary } from "@/hooks/use-prices"
import { useLanguage } from "@/contexts/language-context"

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
  const { t } = useLanguage()
  const queries = codes.map((code) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
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
                <span className="text-sm text-slate-400">{t("commodities.noData")}</span>
              )}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <span>{market || t("commodities.spotAvg")}</span>
              {source && (
                <span className={`px-1 py-0.5 rounded text-[10px] font-medium ${
                  source.includes("模拟") ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                  source.includes("推算") ? "bg-sky-500/10 text-sky-600 dark:text-sky-400" :
                  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }`}>
                  {source.includes("模拟") ? t("commodities.sourceSimulated") : source.includes("推算") ? t("commodities.sourceDerived") : t("commodities.sourceReal")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-200/50 dark:border-white/10">
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3 text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {Math.abs(changePercent) > 2 ? t("commodities.activityHigh") : t("commodities.activityNormal")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Scale className="h-3 w-3 text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {Math.abs(changePercent) > 3 ? t("commodities.riskHigh") : Math.abs(changePercent) > 1 ? t("commodities.riskMedium") : t("commodities.riskLow")}
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
  const { t } = useLanguage()
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
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t("commodities.priceComparison")}</h3>
        <p className="text-xs text-slate-400">{t("commodities.loading")}</p>
      </div>
    )
  }

  const maxPrice = Math.max(...items.map((i) => i.price))

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t("commodities.priceComparison")}</h3>
      {items.map(({ code, name, price, market }) => {
        const width = maxPrice > 0 ? (price / maxPrice) * 100 : 0
        return (
          <div key={code} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300">{name}</span>
              <span className="text-slate-600 dark:text-slate-400">
                ¥{price.toLocaleString()} <span className="text-slate-400">{market || t("commodities.spotAvg")}</span>
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

export function CommoditiesPanel() {
  const [selectedCommodity, setSelectedCommodity] = useState<CommodityCode>("sulfur")
  const { t } = useLanguage()

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
      if (Math.abs(changePercent) > 2) drivers.push(changePercent > 0 ? t("commodities.driver.priceUp") : t("commodities.driver.priceDown"))
      if (invData?.currentInventory) {
        const inv = Number(invData.currentInventory)
        if (inv > 500000) drivers.push(t("commodities.driver.inventoryHigh"))
        else if (inv < 200000) drivers.push(t("commodities.driver.inventoryLow"))
        else drivers.push(t("commodities.driver.inventoryNormal"))
      }
      drivers.push(t("commodities.driver.watchInternational"))

      const outlook = changePercent > 2
        ? t("commodities.outlook.strong")
        : changePercent < -2
        ? t("commodities.outlook.weak")
        : t("commodities.outlook.stable")

      return {
        price: `¥${currentPrice.toLocaleString()}`,
        priceLabel: priceData.market ? `${priceData.market}${t("commodities.spotPrice")}` : t("commodities.spotAvg"),
        change: `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%`,
        trend: (changePercent > 1 ? "up" : changePercent < -1 ? "down" : "flat") as "up" | "down" | "flat",
        volatility: changePercent > 3 ? t("commodities.volHigh") : changePercent > 1 ? t("commodities.volMedium") : t("commodities.volLow"),
        marketHeat: invData?.currentInventory ? (Number(invData.currentInventory) > 500000 ? t("commodities.heatHigh") : Number(invData.currentInventory) > 200000 ? t("commodities.heatActive") : t("commodities.heatMild")) : t("commodities.heatNormal"),
        riskLevel: changePercent > 3 ? t("commodities.volHigh") : changePercent > 1 ? t("commodities.volMedium") : t("commodities.volLow"),
        keyDrivers: drivers,
        outlook,
      }
    }
    return null
  }, [priceSummary.data, inventorySummary.data, t])

  const colors = CARD_COLORS[selectedCommodity]

  return (
    <div>
      {/* 品种概览卡片 */}
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">{t("commodities.clickToAnalyze")}</p>
      <CommodityOverviewCards selected={selectedCommodity} onSelect={setSelectedCommodity} />

      <div className="grid grid-cols-2 gap-4">
        {/* 左侧：详情 */}
        {metrics ? (
          <div className={`rounded-xl border backdrop-blur-sm p-5 bg-gradient-to-br ${colors.gradient} ${colors.border}`}>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
              {COMMODITY_INFO[selectedCommodity].name} {t("commodities.detailedAnalysis")}
            </h2>

            {/* 关键指标 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-white/60 dark:bg-white/10 border border-slate-200/50 dark:border-white/5">
                <div className="text-xs text-slate-500 mb-1">{t("commodities.price")}</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{metrics.price}</div>
                <TrendBadge trend={metrics.trend} change={metrics.change} />
              </div>
              <div className="p-3 rounded-lg bg-white/60 dark:bg-white/10 border border-slate-200/50 dark:border-white/5">
                <div className="text-xs text-slate-500 mb-1">{t("commodities.volatility")}</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{metrics.volatility}</div>
                <div className="text-xs text-slate-400">{t("commodities.volatilityRate")}</div>
              </div>
              <div className="p-3 rounded-lg bg-white/60 dark:bg-white/10 border border-slate-200/50 dark:border-white/5">
                <div className="text-xs text-slate-500 mb-1">{t("commodities.riskLevel")}</div>
                <div className={`text-lg font-bold ${metrics.riskLevel === t("commodities.volHigh") ? "text-rose-600 dark:text-rose-400" : metrics.riskLevel === t("commodities.volMedium") ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {metrics.riskLevel}
                </div>
                <div className="text-xs text-slate-400">{t("commodities.overallAssessment")}</div>
              </div>
            </div>

            {/* 关键驱动因素 */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">{t("commodities.keyDrivers")}</h3>
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
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">{t("commodities.outlook")}</h3>
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
                {isLoading ? t("commodities.loading") : t("commodities.noDataRetry")}
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
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{t("commodities.correlation")}</h3>
            <div className="space-y-2">
              {[
                { pair: t("commodities.correlation.pair.sulfurPhosphate"), correlation: t("commodities.correlation.strongPositive"), value: 0.82, desc: t("commodities.correlation.desc.sulfurPhosphate") },
                { pair: t("commodities.correlation.pair.sulfurPotash"), correlation: t("commodities.correlation.weakPositive"), value: 0.35, desc: t("commodities.correlation.desc.sulfurPotash") },
                { pair: t("commodities.correlation.pair.ureaPotash"), correlation: t("commodities.correlation.weakNegative"), value: -0.28, desc: t("commodities.correlation.desc.ureaPotash") },
                { pair: t("commodities.correlation.pair.phosphateUrea"), correlation: t("commodities.correlation.none"), value: 0.05, desc: t("commodities.correlation.desc.phosphateUrea") },
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
  )
}
