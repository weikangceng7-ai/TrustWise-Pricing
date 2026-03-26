"use client"

import { useState, useEffect } from "react"
import { Package, DollarSign, TrendingUp } from "lucide-react"

interface SupplyDemandData {
  price: {
    current: number
    changePercent: number
    date: string
    market?: string
    specification?: string
  }
  inventory: {
    current: number
    changePercent: number
    date: string
  }
  supply: {
    level: string
    percent: number
  }
  demand: {
    level: string
    percent: number
  }
  lastUpdated: string
}

export function SupplyDemandAnalysis() {
  const [data, setData] = useState<SupplyDemandData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/supply-demand")
        const json = await res.json()
        if (json.success && json.data) {
          setData(json.data)
        } else if (json.data) {
          setData(json.data)
        }
      } catch (err) {
        console.error("获取供需分析数据失败:", err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 dark:border-white/10 hover:border-violet-400 dark:hover:border-violet-500/30 transition-all duration-300 shadow-sm">
        <div className="flex items-center justify-center h-32">
          <div className="text-slate-400 text-sm">加载中...</div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 dark:border-white/10 hover:border-violet-400 dark:hover:border-violet-500/30 transition-all duration-300 shadow-sm">
        <div className="flex items-center justify-center h-32">
          <div className="text-slate-400 text-sm">暂无数据</div>
        </div>
      </div>
    )
  }

  const priceChange = data.price.changePercent || 0
  const inventoryChange = Number(data.inventory.changePercent) || 0

  return (
    <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-slate-200 dark:border-white/10 hover:border-violet-400 dark:hover:border-violet-500/30 transition-all duration-300 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          <h3 className="text-slate-900 dark:text-white font-semibold">供需分析</h3>
        </div>
        <span className="text-xs text-slate-400">
          更新于 {new Date(data.lastUpdated).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-200 dark:border-white/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">当前价格</span>
            <DollarSign className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {data.price.current?.toFixed(0) || "-"}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-500">元/吨</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className={`h-3 w-3 ${priceChange >= 0 ? "text-rose-500 dark:text-rose-400" : "text-emerald-500 dark:text-emerald-400 rotate-180"}`} />
            <span className={`text-xs ${priceChange >= 0 ? "text-rose-500 dark:text-rose-400" : "text-emerald-500 dark:text-emerald-400"}`}>
              {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-200 dark:border-white/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">港口库存</span>
            <Package className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {data.inventory.current?.toFixed(1) || "-"}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-500">万吨</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className={`h-3 w-3 ${inventoryChange >= 0 ? "text-rose-500 dark:text-rose-400" : "text-emerald-500 dark:text-emerald-400 rotate-180"}`} />
            <span className={`text-xs ${inventoryChange >= 0 ? "text-rose-500 dark:text-rose-400" : "text-emerald-500 dark:text-emerald-400"}`}>
              {inventoryChange >= 0 ? "+" : ""}{inventoryChange.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-200 dark:border-white/5">
          <span className="text-xs text-slate-500 dark:text-slate-400">供给评估</span>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-linear-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500" 
                style={{ width: `${data.supply.percent}%` }} 
              />
            </div>
            <span className="text-xs text-cyan-600 dark:text-cyan-400">{data.supply.level}</span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-200 dark:border-white/5">
          <span className="text-xs text-slate-500 dark:text-slate-400">需求评估</span>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-linear-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500" 
                style={{ width: `${data.demand.percent}%` }} 
              />
            </div>
            <span className="text-xs text-violet-600 dark:text-violet-400">{data.demand.level}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
