"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  Warehouse,
  Shield,
  Target,
  Brain,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import type { OrchestrationResult, AgentOutput } from "@/services/agent-orchestrator"

interface MultiAgentViewProps {
  result: OrchestrationResult
}

const AGENT_CONFIG: Record<string, { labelKey: string; icon: React.ReactNode; color: string }> = {
  price: {
    labelKey: "multiAgent.priceAgent",
    icon: <TrendingUp className="h-4 w-4" />,
    color: "text-cyan-500 border-cyan-500",
  },
  inventory: {
    labelKey: "multiAgent.inventoryAgent",
    icon: <Warehouse className="h-4 w-4" />,
    color: "text-amber-500 border-amber-500",
  },
  risk: {
    labelKey: "multiAgent.riskAgent",
    icon: <Shield className="h-4 w-4" />,
    color: "text-rose-500 border-rose-500",
  },
  procurement: {
    labelKey: "multiAgent.procurementAgent",
    icon: <Target className="h-4 w-4" />,
    color: "text-emerald-500 border-emerald-500",
  },
}

// 递归渲染值：处理嵌套对象、数组、基础类型
function renderValue(value: unknown, t: (key: string) => string): string {
  if (value === null || value === undefined) return "-"
  if (typeof value === "number") return value.toFixed(2)
  if (typeof value === "boolean") return value ? t("multiAgent.yes") : t("multiAgent.no")
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value.map(v => renderValue(v, t)).join(", ")
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${renderValue(v, t)}`)
      .join("; ")
  }
  return String(value)
}

function AgentCard({ output, isExpanded, onToggle, t }: { output: AgentOutput; isExpanded: boolean; onToggle: () => void; t: (key: string) => string }) {
  const config = AGENT_CONFIG[output.agent]
  if (!config) return null

  return (
    <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={config.color}>
              {config.icon}
            </div>
            <CardTitle className="text-base">{t(config.labelKey)}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {t("multiAgent.confidence")}{Math.round(output.confidence * 100)}%
            </Badge>
            <Button variant="ghost" size="sm" onClick={onToggle}>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-slate-700 dark:text-slate-300">
          {output.analysis}
        </div>
        {isExpanded && (
          <>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t("multiAgent.recommendation")}</div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {output.recommendation}
              </div>
            </div>
            {Object.keys(output.data).length > 0 && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t("multiAgent.data")}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(output.data).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-2">
                      <span className="text-slate-500 shrink-0">{key}:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                        {renderValue(value, t)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function MultiAgentView({ result }: MultiAgentViewProps) {
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set(["procurement"]))
  const { t } = useLanguage()

  const toggleAgent = (agent: string) => {
    const newExpanded = new Set(expandedAgents)
    if (newExpanded.has(agent)) {
      newExpanded.delete(agent)
    } else {
      newExpanded.add(agent)
    }
    setExpandedAgents(newExpanded)
  }

  return (
    <div className="space-y-4">
      {/* 协作流程说明 */}
      <Card className="bg-gradient-to-br from-cyan-50 to-violet-50 dark:from-cyan-900/10 dark:to-violet-900/10 border-slate-200 dark:border-slate-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-5 w-5 text-violet-500" />
            <span className="font-semibold text-slate-900 dark:text-white">{t("multiAgent.collabTitle")}</span>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {t("multiAgent.collabDesc")}
          </div>
        </CardContent>
      </Card>

      {/* Agent 分析卡片 */}
      <div className="space-y-3">
        {result.agents.map((output) => (
          <AgentCard
            key={output.agent}
            output={output}
            isExpanded={expandedAgents.has(output.agent)}
            onToggle={() => toggleAgent(output.agent)}
            t={t}
          />
        ))}
      </div>

      {/* 最终建议 */}
      <Card className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-lg text-emerald-900 dark:text-emerald-100">
              {t("multiAgent.finalTitle")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-base font-semibold text-emerald-900 dark:text-emerald-100">
            {result.finalRecommendation}
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-300">
            {result.reasoning}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
