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
  BarChart3,
  PieChart,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useReports } from "@/hooks/use-reports"
import { generateReportDocument, generateReportExcel } from "@/lib/report-export"
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

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: number | string
  icon: React.ElementType
}) {
  return (
    <Card className="py-2">
      <CardContent className="pt-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-base font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
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
                        {report.priceTrend}
                      </Badge>
                    )}
                    {report.riskLevel && (
                      <Badge variant="secondary" className={`text-xs ${riskBg}`}>
                        {report.riskLevel}风险
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
                <span className="font-medium text-sm">{report.recommendation}</span>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={onDiscussInChat}>
                <MessageSquare className="h-3 w-3 mr-1" />
                在Chat中讨论
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

      {/* 统计卡片 - 紧凑排列 */}
      <div className="flex gap-2 flex-wrap">
        <StatCard
          title="总报告"
          value={stats?.total || 0}
          icon={FileText}
        />
        <StatCard
          title="本周"
          value={stats?.thisWeek || 0}
          icon={BarChart3}
        />
        <StatCard
          title="本月"
          value={stats?.thisMonth || 0}
          icon={PieChart}
        />
      </div>

      {/* 篮选和生成按钮 */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? "bg-primary/10" : ""}
        >
          <Filter className="h-4 w-4 mr-1" />
          篮选
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
              !
            </Badge>
          )}
        </Button>
        <Button variant="outline" size="sm">
          <Sparkles className="h-4 w-4 mr-1" />
          生成报告
        </Button>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs font-medium mb-1 block">关键词</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="搜索..."
                    className="pl-8 h-8 text-sm"
                    value={filters.keyword || ""}
                    onChange={(e) => updateFilters({ keyword: e.target.value || undefined })}
                  />
                </div>
              </div>

              <div className="w-[140px]">
                <label className="text-xs font-medium mb-1 block">价格趋势</label>
                <Select
                  value={filters.trend || ""}
                  onValueChange={(v: string) => updateFilters({ trend: v as "上涨" | "下跌" | "稳定" | "震荡" | "小幅上涨" | "小幅下跌" | undefined || undefined })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部</SelectItem>
                    <SelectItem value="上涨">上涨</SelectItem>
                    <SelectItem value="稳定">稳定</SelectItem>
                    <SelectItem value="震荡">震荡</SelectItem>
                    <SelectItem value="下跌">下跌</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[120px]">
                <label className="text-xs font-medium mb-1 block">风险等级</label>
                <Select
                  value={filters.risk || ""}
                  onValueChange={(v: string) => updateFilters({ risk: v as "高" | "中等" | "低" | undefined || undefined })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部</SelectItem>
                    <SelectItem value="高">高</SelectItem>
                    <SelectItem value="中等">中等</SelectItem>
                    <SelectItem value="低">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
                <X className="h-3 w-3 mr-1" />
                清除
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
              <p className="text-sm text-muted-foreground">暂无报告数据</p>
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