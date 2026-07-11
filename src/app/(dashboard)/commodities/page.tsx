"use client"

import { useState } from "react"
import { TrendingUp, TrendingDown, Minus, DollarSign, BarChart3, ArrowUpRight, Activity, Scale } from "lucide-react"
import { COMMODITY_INFO, COMMODITY_CODES, type CommodityCode } from "@/db/schema-commodity"
import { getBackgroundImage } from "@/config/images"

const COMMODITY_METRICS: Record<CommodityCode, {
  price: string
  priceLabel: string
  change: string
  trend: "up" | "down" | "flat"
  volatility: string
  marketHeat: string
  riskLevel: string
  keyDrivers: string[]
  outlook: string
}> = {
  sulfur: {
    price: "¥1,850",
    priceLabel: "港口现货均价",
    change: "+3.2%",
    trend: "up",
    volatility: "中等",
    marketHeat: "活跃",
    riskLevel: "中等",
    keyDrivers: ["磷肥需求旺盛", "中东供应稳定", "运费上涨", "港口库存适中"],
    outlook: "短期高位震荡，关注下游磷肥开工率及国际硫磺供应动态",
  },
  phosphate: {
    price: "¥1,080",
    priceLabel: "矿山出厂均价",
    change: "+1.5%",
    trend: "up",
    volatility: "低",
    marketHeat: "温和",
    riskLevel: "低",
    keyDrivers: ["磷肥开工率回升", "矿山开工正常", "环保限产政策", "运输成本稳定"],
    outlook: "价格以稳为主，关注环保限产政策对矿山开工的影响",
  },
  potash: {
    price: "¥3,500",
    priceLabel: "进口均价",
    change: "+5.8%",
    trend: "up",
    volatility: "高",
    marketHeat: "旺盛",
    riskLevel: "高",
    keyDrivers: ["俄乌冲突持续", "白俄罗斯供应受限", "港口库存偏低", "进口到货不足"],
    outlook: "短期价格难以下跌，关注地缘政治及国际海运变化",
  },
  urea: {
    price: "¥2,350",
    priceLabel: "出厂均价",
    change: "-2.1%",
    trend: "down",
    volatility: "中等",
    marketHeat: "疲软",
    riskLevel: "低",
    keyDrivers: ["国内产能过剩", "农业需求淡季", "出口窗口未开", "工业需求有限"],
    outlook: "价格承压，关注印度招标动态及出口政策变化",
  },
}

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

function ComparisonBar() {
  const commodities = Object.entries(COMMODITY_METRICS) as [CommodityCode, typeof COMMODITY_METRICS[CommodityCode]][]
  const prices = commodities.map(([, m]) => parseFloat(m.price.replace(/[¥,]/g, "")))
  const maxPrice = Math.max(...prices)

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">价格对比</h3>
      {commodities.map(([code, m]) => {
        const price = parseFloat(m.price.replace(/[¥,]/g, ""))
        const width = (price / maxPrice) * 100
        const info = COMMODITY_INFO[code]
        return (
          <div key={code} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300">{info.name}</span>
              <span className="text-slate-600 dark:text-slate-400">
                {m.price} <span className="text-slate-400">{m.priceLabel}</span>
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

  const metrics = COMMODITY_METRICS[selectedCommodity]
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
        <div className="grid grid-cols-4 gap-3 mb-4">
          {(Object.entries(COMMODITY_METRICS) as [CommodityCode, typeof COMMODITY_METRICS[CommodityCode]][]).map(([code, m]) => {
            const cardColors = CARD_COLORS[code]
            const info = COMMODITY_INFO[code]
            const isSelected = selectedCommodity === code
            return (
              <button
                key={code}
                onClick={() => setSelectedCommodity(code)}
                className={`text-left p-4 rounded-xl border backdrop-blur-sm transition-all duration-200 cursor-pointer bg-gradient-to-br ${cardColors.gradient} ${cardColors.border} ${
                  isSelected ? "ring-2 ring-offset-1 ring-slate-400 dark:ring-slate-500 scale-[1.02] shadow-lg" : "hover:scale-[1.02] hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${cardColors.badge} ${cardColors.badgeText}`}>
                    {info.name}
                  </span>
                  <TrendBadge trend={m.trend} change={m.change} />
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mb-1">{m.price}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500">{m.priceLabel}</div>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-200/50 dark:border-white/10">
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3 text-slate-400" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">{m.marketHeat}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Scale className="h-3 w-3 text-slate-400" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">{m.riskLevel}风险</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 左侧：详情 */}
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
