"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Warehouse,
  TrendingUp,
  Activity,
  Package,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

// 库存数据类型
interface InventoryData {
  currentStock: number
  maxCapacity: number
  safetyDays: number
  avgConsumption: number
  turnoverRate: number
  lastPurchaseDate: string
  nextPurchaseDate: string
  supplierCount: number
  portDistance: number
}

interface InventoryVisualizationProps {
  inventory: InventoryData
  inventoryStrategy: "aggressive" | "moderate" | "conservative"
  enterpriseColor: string
}

// 计算库存状态
function getInventoryStatus(current: number, max: number, safetyDays: number, avgConsumption: number, t: (key: string) => string) {
  const remainingDays = Math.round(current / avgConsumption)
  const fillPercent = (current / max) * 100

  let status: "critical" | "warning" | "normal" | "high"
  let statusText: string
  let statusColor: string

  if (remainingDays < safetyDays * 0.6) {
    status = "critical"
    statusText = t("inventory.statusCritical")
    statusColor = "text-red-500"
  } else if (remainingDays < safetyDays) {
    status = "warning"
    statusText = t("inventory.statusWarning")
    statusColor = "text-amber-500"
  } else if (fillPercent > 80) {
    status = "high"
    statusText = t("inventory.statusHigh")
    statusColor = "text-blue-500"
  } else {
    status = "normal"
    statusText = t("inventory.statusNormal")
    statusColor = "text-emerald-500"
  }

  return { status, statusText, statusColor, remainingDays, fillPercent }
}

// 策略配置（使用完整 Tailwind 类名，避免 JIT 动态类名失效）
const STRATEGY_CONFIG = (t: (key: string) => string) => ({
  aggressive: {
    label: t("inventory.strategyAggressive"),
    desc: t("inventory.strategyAggressiveDesc"),
    color: "rose",
    icon: TrendingUp,
    iconClass: "text-rose-500",
    badgeClass: "border-rose-500 text-rose-500",
  },
  moderate: {
    label: t("inventory.strategyModerate"),
    desc: t("inventory.strategyModerateDesc"),
    color: "amber",
    icon: Activity,
    iconClass: "text-amber-500",
    badgeClass: "border-amber-500 text-amber-500",
  },
  conservative: {
    label: t("inventory.strategyConservative"),
    desc: t("inventory.strategyConservativeDesc"),
    color: "emerald",
    icon: CheckCircle,
    iconClass: "text-emerald-500",
    badgeClass: "border-emerald-500 text-emerald-500",
  },
})

export function InventoryVisualization({
  inventory,
  inventoryStrategy,
  enterpriseColor,
}: InventoryVisualizationProps) {
  const { t, lang } = useLanguage()
  const { currentStock, maxCapacity, safetyDays, avgConsumption, turnoverRate, lastPurchaseDate, nextPurchaseDate, supplierCount, portDistance } = inventory

  const { status, statusText, statusColor, remainingDays, fillPercent } = getInventoryStatus(
    currentStock,
    maxCapacity,
    safetyDays,
    avgConsumption,
    t
  )

  const strategyConfig = STRATEGY_CONFIG(t)[inventoryStrategy]
  const StrategyIcon = strategyConfig.icon

  // 计算进度条颜色
  const getProgressColor = () => {
    if (status === "critical") return "bg-red-500"
    if (status === "warning") return "bg-amber-500"
    if (status === "high") return "bg-blue-500"
    return "bg-emerald-500"
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric" })
  }

  // 计算距下次采购天数
  const getDaysToNextPurchase = () => {
    const next = new Date(nextPurchaseDate)
    const today = new Date()
    const diff = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const daysToNextPurchase = getDaysToNextPurchase()

  return (
    <div className="space-y-6">
      {/* 库存概览卡片 */}
      <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${enterpriseColor}, ${enterpriseColor}60)` }} />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5" style={{ color: enterpriseColor }} />
              <CardTitle className="text-lg">{t("inventory.title")}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <StrategyIcon className={`h-4 w-4 ${strategyConfig.iconClass}`} />
              <Badge variant="outline" className={`text-xs ${strategyConfig.badgeClass}`}>
                {strategyConfig.label}
              </Badge>
            </div>
          </div>
          <CardDescription className="text-xs">{strategyConfig.desc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 库存量可视化 - 大数字展示 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30">
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t("inventory.currentStock")}</div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-slate-900 dark:text-white">
                  {(currentStock / 1000).toFixed(1)}
                </span>
                <span className="text-lg text-slate-500 dark:text-slate-400 mb-1">{t("inventory.thousandTons")}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-xs font-medium ${statusColor}`}>{statusText}</span>
                {status === "critical" && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                {status === "normal" && <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
              </div>
            </div>

            <div className="relative p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30">
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t("inventory.availableDays")}</div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-slate-900 dark:text-white">{remainingDays}</span>
                <span className="text-lg text-slate-500 dark:text-slate-400 mb-1">{t("inventory.days")}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-500">{t("inventory.safetyStock")}</span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{safetyDays} {t("inventory.days")}</span>
              </div>
            </div>
          </div>

          {/* 库存容量进度条 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">{t("inventory.capacityUsage")}</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{fillPercent.toFixed(1)}%</span>
            </div>
            <div className="relative h-6 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              {/* 安全库存线 */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
                style={{ left: `${(safetyDays * avgConsumption / maxCapacity) * 100}%` }}
              />
              {/* 实际库存 */}
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressColor()}`}
                style={{ width: `${fillPercent}%` }}
              />
              {/* 标注 */}
              <div className="absolute inset-0 flex items-center justify-between px-3 text-xs">
                <span className="text-white font-medium drop-shadow">{currentStock.toLocaleString()} {t("inventory.tons")}</span>
                <span className="text-slate-400">{maxCapacity.toLocaleString()} {t("inventory.tons")}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-amber-500">
              <Info className="h-3 w-3" />
              <span>{t("inventory.safetyLineDesc")} ({(safetyDays * avgConsumption).toLocaleString()} {t("inventory.tons")})</span>
            </div>
          </div>

          {/* 库存关键指标网格 */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400">{t("inventory.dailyConsumption")}</div>
              <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">{avgConsumption}</div>
              <div className="text-xs text-slate-400">{t("inventory.tonsPerDay")}</div>
            </div>
            <div className="p-3 rounded-lg bg-violet-50/50 dark:bg-violet-900/10 text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400">{t("inventory.yearlyTurnover")}</div>
              <div className="text-lg font-semibold text-violet-600 dark:text-violet-400">{turnoverRate}</div>
              <div className="text-xs text-slate-400">{t("inventory.timesPerYear")}</div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400">{t("inventory.suppliers")}</div>
              <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{supplierCount}</div>
              <div className="text-xs text-slate-400">{t("inventory.unit")}</div>
            </div>
            <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400">{t("inventory.portDistance")}</div>
              <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">{portDistance}</div>
              <div className="text-xs text-slate-400">{t("inventory.kilometers")}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 采购时间线 */}
      <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" style={{ color: enterpriseColor }} />
            <CardTitle className="text-lg">{t("inventory.purchaseTimeline")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* 时间轴线 */}
            <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-slate-200 dark:bg-slate-700" />

            <div className="space-y-4">
              {/* 上次采购 */}
              <div className="relative flex items-start gap-4 pl-10">
                <div className="absolute left-2.5 w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600 ring-4 ring-white dark:ring-slate-900" />
                <div className="flex-1">
                  <div className="text-sm text-slate-500 dark:text-slate-400">{t("inventory.lastPurchase")}</div>
                  <div className="font-medium text-slate-900 dark:text-white">{formatDate(lastPurchaseDate)}</div>
                </div>
                <Badge variant="outline" className="text-xs text-slate-500">
                  {t("inventory.completed")}
                </Badge>
              </div>

              {/* 当前状态 */}
              <div className="relative flex items-start gap-4 pl-10">
                <div
                  className="absolute left-1.5 w-4 h-4 rounded-full ring-4 ring-white dark:ring-slate-900"
                  style={{ backgroundColor: enterpriseColor }}
                />
                <div className="flex-1">
                  <div className="text-sm text-slate-500 dark:text-slate-400">{t("inventory.currentStatus")}</div>
                  <div className="font-medium text-slate-900 dark:text-white">
                    {t("inventory.stockCanLastPrefix")}{remainingDays}{t("inventory.stockCanLastSuffix")}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    status === "critical"
                      ? "border-red-500 text-red-500"
                      : status === "warning"
                      ? "border-amber-500 text-amber-500"
                      : "border-emerald-500 text-emerald-500"
                  }`}
                >
                  {statusText}
                </Badge>
              </div>

              {/* 下次采购 */}
              <div className="relative flex items-start gap-4 pl-10">
                <div className="absolute left-2.5 w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600 ring-4 ring-white dark:ring-slate-900 border-2 border-dashed border-slate-400" />
                <div className="flex-1">
                  <div className="text-sm text-slate-500 dark:text-slate-400">{t("inventory.plannedPurchase")}</div>
                  <div className="font-medium text-slate-900 dark:text-white">{formatDate(nextPurchaseDate)}</div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    daysToNextPurchase <= 7
                      ? "border-red-500 text-red-500"
                      : daysToNextPurchase <= 14
                      ? "border-amber-500 text-amber-500"
                      : "border-blue-500 text-blue-500"
                  }`}
                >
                  {daysToNextPurchase > 0 ? `${daysToNextPurchase} ${t("inventory.daysLater")}` : t("inventory.overdue")}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 库存分析图表 */}
      <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" style={{ color: enterpriseColor }} />
            <CardTitle className="text-lg">{t("inventory.consumptionForecast")}</CardTitle>
          </div>
          <CardDescription>{t("inventory.forecastDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 简化的消耗趋势图 */}
          <div className="relative h-32">
            {/* Y轴标签 */}
            <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-slate-400 py-1">
              <span>{maxCapacity}</span>
              <span>{Math.round(maxCapacity / 2)}</span>
              <span>0</span>
            </div>

            {/* 图表区域 */}
            <div className="ml-14 h-full relative">
              {/* 网格线 */}
              <div className="absolute inset-0 flex flex-col justify-between">
                <div className="border-t border-dashed border-slate-200 dark:border-slate-700" />
                <div className="border-t border-dashed border-slate-200 dark:border-slate-700" />
                <div className="border-t border-slate-200 dark:border-slate-700" />
              </div>

              {/* 安全库存线 */}
              <div
                className="absolute left-0 right-0 border-t-2 border-dashed border-amber-400"
                style={{ bottom: `${(safetyDays * avgConsumption / maxCapacity) * 100}%` }}
              >
                <span className="absolute right-0 -top-5 text-xs text-amber-500">{t("inventory.safetyStock")}</span>
              </div>

              {/* 当前库存点 */}
              <div
                className="absolute w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 shadow-lg"
                style={{
                  backgroundColor: enterpriseColor,
                  left: "10%",
                  bottom: `${fillPercent}%`,
                }}
              />

              {/* 预测下降线 */}
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={enterpriseColor} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={enterpriseColor} stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                <line
                  x1="10%"
                  y1={`${100 - fillPercent}%`}
                  x2="90%"
                  y2={`${100 - (remainingDays * avgConsumption / maxCapacity) * 100}%`}
                  stroke={enterpriseColor}
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
              </svg>

              {/* 时间轴标签 */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-slate-400 pt-2">
                <span>{t("inventory.today")}</span>
                <span>{t("inventory.days7")}</span>
                <span>{t("inventory.days14")}</span>
                <span>{t("inventory.days21")}</span>
              </div>
            </div>
          </div>

          {/* 图例 */}
          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: enterpriseColor }} />
              <span className="text-slate-500">{t("inventory.legendCurrentStock")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 border-t-2 border-dashed border-amber-400" />
              <span className="text-slate-500">{t("inventory.legendSafetyStock")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 border-t border-dashed" style={{ borderColor: enterpriseColor }} />
              <span className="text-slate-500">{t("inventory.legendForecast")}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}