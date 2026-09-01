"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  Clock,
  Package,
} from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

interface InventoryData {
  currentStock: number
  maxCapacity: number
  safetyDays: number
  avgConsumption: number
  turnoverRate: number
}

interface InventoryHealthDashboardProps {
  inventory: InventoryData
}

// 内联计算：健康度评分
function computeHealthScore(inv: InventoryData, daysOfCover: number, fillPercent: number): number {
  let turnoverScore = 30
  if (inv.turnoverRate < 4) turnoverScore = 10
  else if (inv.turnoverRate < 6) turnoverScore = 20
  else if (inv.turnoverRate < 8) turnoverScore = 25

  let fillScore = 30
  if (fillPercent < 20) fillScore = 5
  else if (fillPercent < 40) fillScore = 15
  else if (fillPercent <= 70) fillScore = 30
  else if (fillPercent <= 85) fillScore = 20
  else fillScore = 10

  let safetyScore = 40
  if (daysOfCover < inv.safetyDays * 0.5) safetyScore = 5
  else if (daysOfCover < inv.safetyDays * 0.8) safetyScore = 20
  else if (daysOfCover <= inv.safetyDays * 1.5) safetyScore = 40
  else if (daysOfCover <= inv.safetyDays * 2) safetyScore = 25
  else safetyScore = 10

  return turnoverScore + fillScore + safetyScore
}

const HEALTH_LABELS = {
  excellent: "health.excellent",
  good: "health.good",
  fair: "health.fair",
  poor: "health.poor",
} as const

const RISK_LABELS = {
  low: "health.riskLow",
  medium: "health.riskMedium",
  high: "health.riskHigh",
} as const

// 内联计算：呆滞风险
function computeStagnantRisk(daysOfCover: number, safetyDays: number): { riskLevel: "low" | "medium" | "high"; reasonKey: string; reasonArgs: Record<string, string | number> } {
  const threshold = safetyDays * 1.5
  if (daysOfCover > threshold * 2) {
    return { riskLevel: "high", reasonKey: "health.stagnantHigh", reasonArgs: { daysOfCover, safetyDays } }
  }
  if (daysOfCover > threshold) {
    return { riskLevel: "medium", reasonKey: "health.stagnantMedium", reasonArgs: { daysOfCover, threshold: Math.round(threshold) } }
  }
  return { riskLevel: "low", reasonKey: "health.stagnantLow", reasonArgs: { daysOfCover } }
}

export function InventoryHealthDashboard({ inventory }: InventoryHealthDashboardProps) {
  const { t } = useLanguage()
  const daysOfCover = Math.round(inventory.currentStock / (inventory.avgConsumption || 1))
  const fillPercent = (inventory.currentStock / (inventory.maxCapacity || 1)) * 100
  const healthScore = computeHealthScore(inventory, daysOfCover, fillPercent)
  const stagnantRisk = computeStagnantRisk(daysOfCover, inventory.safetyDays)

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-emerald-500"
    if (score >= 60) return "text-amber-500"
    return "text-rose-500"
  }

  const getHealthLabel = (score: number) => {
    if (score >= 80) return t(HEALTH_LABELS.excellent)
    if (score >= 60) return t(HEALTH_LABELS.good)
    if (score >= 40) return t(HEALTH_LABELS.fair)
    return t(HEALTH_LABELS.poor)
  }

  const getRiskColor = (level: string) => {
    if (level === "low") return "text-emerald-500 border-emerald-500"
    if (level === "medium") return "text-amber-500 border-amber-500"
    return "text-rose-500 border-rose-500"
  }

  const getRiskLabel = (level: string) => {
    const key = RISK_LABELS[level as keyof typeof RISK_LABELS]
    return key ? t(key) : level
  }

  return (
    <div className="space-y-6">
      {/* 健康度总览 */}
      <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-500" />
              <CardTitle className="text-lg">{t("health.title")}</CardTitle>
            </div>
            <Badge variant="outline" className={`text-xs ${getHealthColor(healthScore)} ${getHealthColor(healthScore).replace("text-", "border-")}`}>
              {getHealthLabel(healthScore)}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            {t("health.desc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 健康度大数字 */}
          <div className="text-center mb-6">
            <div className={`text-5xl font-bold ${getHealthColor(healthScore)}`}>
              {healthScore}
            </div>
            <div className="text-sm text-slate-500 mt-2">{t("health.scoreLabel")}</div>
          </div>

          {/* 关键指标 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">{t("health.daysOfCover")}</span>
                <Clock className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {daysOfCover}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {t("health.safetyLine")}{inventory.safetyDays}{t("health.daysUnit")}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">{t("health.fillRate")}</span>
                <Package className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {fillPercent.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {t("health.capacityPrefix")}{inventory.maxCapacity.toLocaleString()}{t("health.capacitySuffix")}
              </div>
            </div>
          </div>

          {/* 填充率进度条 */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-500">{t("health.capacityUsage")}</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {inventory.currentStock.toLocaleString()} / {inventory.maxCapacity.toLocaleString()} {t("health.tons")}
              </span>
            </div>
            <Progress value={fillPercent} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* 呆滞风险 */}
      <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">{t("health.stagnantTitle")}</CardTitle>
            </div>
            <Badge variant="outline" className={`text-xs ${getRiskColor(stagnantRisk.riskLevel)}`}>
              {getRiskLabel(stagnantRisk.riskLevel)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-700 dark:text-slate-300">
            {(() => {
              const raw = t(stagnantRisk.reasonKey)
              return Object.entries(stagnantRisk.reasonArgs).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), raw)
            })()}
          </div>
          {stagnantRisk.riskLevel === "high" && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                <span>{t("health.slowPurchase")}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 周转率分析 */}
      <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-violet-500" />
            <CardTitle className="text-lg">{t("health.turnoverTitle")}</CardTitle>
          </div>
          <CardDescription className="text-xs">
            {t("health.turnoverDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-violet-600 dark:text-violet-400">
                {inventory.turnoverRate}
              </div>
              <div className="text-xs text-slate-500 mt-1">{t("health.timesPerYear")}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {inventory.turnoverRate > 0 ? Math.round(365 / inventory.turnoverRate) : 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">{t("health.daysPerTime")}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {Math.round(inventory.avgConsumption * 365 / 1000)}
              </div>
              <div className="text-xs text-slate-500 mt-1">{t("health.kTonsPerYear")}</div>
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-500 text-center">
            {inventory.turnoverRate >= 8 ? t("health.turnoverGood") : inventory.turnoverRate >= 4 ? t("health.turnoverNormal") : t("health.turnoverLow")}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
