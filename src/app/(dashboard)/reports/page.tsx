"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  FileText,
  Calendar,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileDown,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/language-context"
import { useReports } from "@/hooks/use-reports"
import { ReportsPriceChart } from "@/components/reports-price-chart"
import type { Report } from "@/hooks/use-reports"

const trendConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  "上涨": { icon: TrendingUp, color: "text-red-500", bg: "bg-red-500/10" },
  "小幅上涨": { icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-500/10" },
  "下跌": { icon: TrendingDown, color: "text-green-500", bg: "bg-green-500/10" },
  "小幅下跌": { icon: TrendingDown, color: "text-teal-500", bg: "bg-teal-500/10" },
  "稳定": { icon: Minus, color: "text-blue-500", bg: "bg-blue-500/10" },
  "震荡": { icon: Activity, color: "text-purple-500", bg: "bg-purple-500/10" },
}

const riskConfig: Record<string, { color: string; bg: string }> = {
  "高": { color: "text-red-500", bg: "bg-red-500/10" },
  "中等": { color: "text-yellow-600", bg: "bg-yellow-500/10" },
  "低": { color: "text-green-500", bg: "bg-green-500/10" },
}

const recommendationConfig: Record<string, { icon: React.ElementType; color: string }> = {
  "建议备库": { icon: AlertTriangle, color: "text-orange-500" },
  "紧急采购": { icon: AlertTriangle, color: "text-red-500" },
  "适当备库": { icon: CheckCircle, color: "text-blue-500" },
  "观望": { icon: Clock, color: "text-gray-500" },
  "按需采购": { icon: CheckCircle, color: "text-green-500" },
}

// 后端返回中文数据值 → 翻译 key 映射（用于展示，不改动数据结构）
const trendKeyMap: Record<string, string> = {
  "上涨": "reports.trend.up",
  "小幅上涨": "reports.trend.slightUp",
  "下跌": "reports.trend.down",
  "小幅下跌": "reports.trend.slightDown",
  "稳定": "reports.trend.stable",
  "震荡": "reports.trend.volatile",
}

const riskKeyMap: Record<string, string> = {
  "高": "reports.risk.high",
  "中等": "reports.risk.medium",
  "低": "reports.risk.low",
}

const recommendationKeyMap: Record<string, string> = {
  "建议备库": "reports.recommend.stockUp",
  "紧急采购": "reports.recommend.urgent",
  "适当备库": "reports.recommend.moderate",
  "观望": "reports.recommend.wait",
  "按需采购": "reports.recommend.asNeeded",
}

function CollapsibleReportCard({
  report,
  onExport,
  onDiscussInChat,
}: {
  report: Report
  onExport: (format: "word" | "excel") => void
  onDiscussInChat: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useLanguage()
  const TrendIcon = trendConfig[report.priceTrend || "稳定"]?.icon || Minus
  const trendColor = trendConfig[report.priceTrend || "稳定"]?.color || "text-gray-500"
  const trendBg = trendConfig[report.priceTrend || "稳定"]?.bg || "bg-gray-500/10"
  const riskBg = riskConfig[report.riskLevel || "低"]?.bg || "bg-green-500/10"

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger className="w-full">
          <div className="cursor-pointer hover:bg-muted/50 transition-colors py-3 px-6 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium truncate text-sm">{report.title}</h3>
                  <div className="flex items-center gap-1">
                    {report.priceTrend && (
                      <Badge variant="secondary" className={`flex items-center gap-1 text-xs ${trendBg}`}>
                        <TrendIcon className={`h-3 w-3 ${trendColor}`} />
                        {t(trendKeyMap[report.priceTrend] || report.priceTrend)}
                      </Badge>
                    )}
                    {report.riskLevel && (
                      <Badge variant="secondary" className={`text-xs ${riskBg}`}>
                        {t(riskKeyMap[report.riskLevel] || report.riskLevel)}{t("reports.riskSuffix")}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  {report.reportDate}
                </p>
              </div>
            </div>
            <div className="shrink-0 p-2 rounded-md hover:bg-muted transition-colors">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-2 pb-3">
            <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
              {report.summary}
            </p>
            {report.recommendation && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 mb-3">
                {recommendationConfig[report.recommendation] && (
                  <>{(() => {
                    const RecIcon = recommendationConfig[report.recommendation]?.icon || Clock
                    const color = recommendationConfig[report.recommendation]?.color || ""
                    return <RecIcon className={`h-3 w-3 ${color}`} />
                  })()}</>
                )}
                <span className="font-medium text-sm">{t(recommendationKeyMap[report.recommendation] || report.recommendation)}</span>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={onDiscussInChat}>
                <MessageSquare className="h-3 w-3 mr-1" />
                {t("reports.discussInChat")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => onExport("word")}>
                <FileDown className="h-3 w-3 mr-1" />
                Word
              </Button>
              <Button variant="outline" size="sm" onClick={() => onExport("excel")}>
                <FileDown className="h-3 w-3 mr-1" />
                Excel
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

export default function ReportsPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const {
    reports,
    stats,
    isLoading,
    filters,
    updateFilters,
    clearFilters,
    hasActiveFilters,
  } = useReports()

  const [showFilters, setShowFilters] = useState(false)

  const handleExport = async (report: Report, format: "word" | "excel") => {
    try {
      const { generateReportDocument, generateReportExcel } = await import("@/lib/report-export")
      if (format === "word") {
        await generateReportDocument(report)
      } else {
        await generateReportExcel(report)
      }
    } catch (error) {
      console.error("导出失败:", error)
    }
  }

  const handleDiscussInChat = (report: Report) => {
    const prompt = `请帮我分析这份采购报告：
【${report.title}】
报告日期：${report.reportDate}
价格趋势：${report.priceTrend || "未知"}
风险等级：${report.riskLevel || "未知"}
采购建议：${report.recommendation || "未知"}
摘要：${report.summary}

请给出您的分析和建议。`
    router.push(`/agent-chat?prompt=${encodeURIComponent(prompt)}`)
  }

  return (
    <div className="space-y-4">
      {/* 价格走势图表 */}
      <ReportsPriceChart />

      {/* 篮选和生成按钮 */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? "bg-primary/10" : ""}
        >
          <Filter className="h-4 w-4 mr-1" />
          {t("reports.filterByType")}
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
              !
            </Badge>
          )}
        </Button>
        <Button variant="outline" size="sm">
          <Sparkles className="h-4 w-4 mr-1" />
          {t("reports.generateReport")}
        </Button>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs font-medium mb-1 block">{t("reports.keyword")}</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder={t("reports.searchPlaceholder")}
                    className="pl-8 h-8 text-sm"
                    value={filters.keyword || ""}
                    onChange={(e) => updateFilters({ keyword: e.target.value || undefined })}
                  />
                </div>
              </div>

              <div className="w-[140px]">
                <label className="text-xs font-medium mb-1 block">{t("reports.filterByTrend")}</label>
                <Select
                  value={filters.trend || ""}
                  onValueChange={(v: string) => updateFilters({ trend: v as "上涨" | "下跌" | "稳定" | "震荡" | "小幅上涨" | "小幅下跌" | undefined || undefined })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={t("reports.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("reports.all")}</SelectItem>
                    <SelectItem value="上涨">{t("reports.trend.up")}</SelectItem>
                    <SelectItem value="稳定">{t("reports.trend.stable")}</SelectItem>
                    <SelectItem value="震荡">{t("reports.trend.volatile")}</SelectItem>
                    <SelectItem value="下跌">{t("reports.trend.down")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[120px]">
                <label className="text-xs font-medium mb-1 block">{t("reports.filterByRisk")}</label>
                <Select
                  value={filters.risk || ""}
                  onValueChange={(v: string) => updateFilters({ risk: v as "高" | "中等" | "低" | undefined || undefined })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={t("reports.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("reports.all")}</SelectItem>
                    <SelectItem value="高">{t("reports.risk.high")}</SelectItem>
                    <SelectItem value="中等">{t("reports.risk.medium")}</SelectItem>
                    <SelectItem value="低">{t("reports.risk.low")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
                <X className="h-3 w-3 mr-1" />
                {t("reports.clearFilters")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 报告列表 - 折叠排列 */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-3">
                <div className="animate-pulse flex gap-3">
                  <div className="h-8 w-8 bg-muted rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-muted rounded w-1/3" />
                    <div className="h-2 bg-muted rounded w-1/4" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <Card className="p-6">
            <div className="text-center">
              <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t("reports.noReports")}</p>
            </div>
          </Card>
        ) : (
          reports.map((report) => (
            <CollapsibleReportCard
              key={report.id}
              report={report}
              onExport={(format) => handleExport(report, format)}
              onDiscussInChat={() => handleDiscussInChat(report)}
            />
          ))
        )}
      </div>
    </div>
  )
}