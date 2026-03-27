"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FileText,
  Download,
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
  Eye,
  FileDown,
  Sparkles,
  X,
  RefreshCw,
  BarChart3,
  PieChart,
} from "lucide-react"
import { useReports } from "@/hooks/use-reports"
import { generateReportDocument, generateReportPDF, generateReportExcel } from "@/lib/report-export"
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
  trend,
  description,
}: {
  title: string
  value: number | string
  icon: React.ElementType
  trend?: "up" | "down" | "neutral"
  description?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">{value}</div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {trend && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {trend === "up" && (
              <TrendingUp className="h-3 w-3 text-green-500" />
            )}
            {trend === "down" && (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            {trend === "neutral" && (
              <Minus className="h-3 w-3 text-gray-500" />
            )}
            <span className="text-muted-foreground">{description}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ReportDetailDialog({
  report,
  open,
  onOpenChange,
  onExport,
}: {
  report: Report | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport: (format: "word" | "pdf" | "excel") => void
}) {
  const currentTime = useMemo(() => {
    return open ? new Date().toLocaleString('zh-CN') : ""
  }, [open])

  if (!report) return null

  const TrendIcon = trendConfig[report.priceTrend || "稳定"]?.icon || Minus
  const trendColor = trendConfig[report.priceTrend || "稳定"]?.color || "text-gray-500"
  const riskColor = riskConfig[report.riskLevel || "低"]?.color || "text-green-500"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {report.title}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {report.reportDate}
            </span>
            {report.priceTrend && (
              <Badge variant="outline" className="flex items-center gap-1">
                <TrendIcon className={`h-3 w-3 ${trendColor}`} />
                {report.priceTrend}
              </Badge>
            )}
            {report.riskLevel && (
              <Badge variant="outline" className={riskConfig[report.riskLevel]?.bg || ""}>
                风险: {report.riskLevel}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">报告摘要</h4>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{report.summary}</p>
            </div>

            {report.recommendation && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">采购建议</h4>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5">
                  {recommendationConfig[report.recommendation] && (
                    <>
                      {(() => {
                        const RecIcon = recommendationConfig[report.recommendation]?.icon || Clock
                        return <RecIcon className={`h-4 w-4 ${recommendationConfig[report.recommendation]?.color || ""}`} />
                      })()}
                    </>
                  )}
                  <span className="font-medium">{report.recommendation}</span>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">详细信息</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">价格趋势</span>
                  <div className="flex items-center gap-1 mt-1 font-medium">
                    <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                    {report.priceTrend || "未知"}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">风险等级</span>
                  <div className={`font-medium mt-1 ${riskColor}`}>
                    {report.riskLevel || "未知"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <Separator className="my-4" />

        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            创建于 {new Date(report.createdAt).toLocaleString("zh-CN")}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onExport("word")}>
              <FileDown className="h-4 w-4 mr-1" />
              Word
            </Button>
            <Button variant="outline" size="sm" onClick={() => onExport("pdf")}>
              <FileDown className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => onExport("excel")}>
              <FileDown className="h-4 w-4 mr-1" />
              Excel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ReportCard({
  report,
  onView,
  onExport,
}: {
  report: Report
  onView: () => void
  onExport: (format: "word" | "pdf" | "excel") => void
}) {
  const TrendIcon = trendConfig[report.priceTrend || "稳定"]?.icon || Minus
  const trendColor = trendConfig[report.priceTrend || "稳定"]?.color || "text-gray-500"
  const trendBg = trendConfig[report.priceTrend || "稳定"]?.bg || "bg-gray-500/10"
  const riskBg = riskConfig[report.riskLevel || "低"]?.bg || "bg-green-500/10"
  const riskColor = riskConfig[report.riskLevel || "低"]?.color || "text-green-500"

  return (
    <div className="group flex items-start justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
      <div className="flex gap-4 flex-1 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium truncate">{report.title}</h3>
            <div className="flex items-center gap-1">
              {report.priceTrend && (
                <Badge variant="secondary" className={`flex items-center gap-1 ${trendBg}`}>
                  <TrendIcon className={`h-3 w-3 ${trendColor}`} />
                  {report.priceTrend}
                </Badge>
              )}
              {report.riskLevel && (
                <Badge variant="secondary" className={`${riskBg} ${riskColor}`}>
                  {report.riskLevel}风险
                </Badge>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {report.summary}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {report.reportDate}
            </p>
            {report.recommendation && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {recommendationConfig[report.recommendation] && (
                  <>
                    {(() => {
                      const RecIcon = recommendationConfig[report.recommendation]?.icon || Clock
                      return <RecIcon className={`h-3 w-3 ${recommendationConfig[report.recommendation]?.color || ""}`} />
                    })()}
                  </>
                )}
                {report.recommendation}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" onClick={onView} title="查看详情">
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onExport("word")} title="导出 Word">
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const {
    reports,
    stats,
    isLoading,
    filters,
    updateFilters,
    clearFilters,
    hasActiveFilters,
  } = useReports()

  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const lastUpdate = useMemo(() => new Date().toLocaleString('zh-CN'), [])

  const handleViewReport = (report: Report) => {
    setSelectedReport(report)
    setDetailOpen(true)
  }

  const handleExport = async (report: Report, format: "word" | "pdf" | "excel") => {
    try {
      if (format === "word") {
        await generateReportDocument(report)
      } else if (format === "pdf") {
        await generateReportPDF(report)
      } else {
        await generateReportExcel(report)
      }
    } catch (error) {
      console.error("导出失败:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">采购报告单</h2>
          <p className="text-muted-foreground">
            历史报告与数据分析
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "bg-primary/10" : ""}
          >
            <Filter className="h-4 w-4 mr-2" />
            筛选
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                !
              </Badge>
            )}
          </Button>
          <Button variant="outline">
            <Sparkles className="h-4 w-4 mr-2" />
            生成报告
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="总报告数"
          value={stats?.total || 0}
          icon={FileText}
          trend="up"
          description="持续增长"
        />
        <StatCard
          title="本周新增"
          value={stats?.thisWeek || 0}
          icon={BarChart3}
          trend="neutral"
          description="较上周持平"
        />
        <StatCard
          title="本月新增"
          value={stats?.thisMonth || 0}
          icon={PieChart}
          trend="up"
          description="较上月+15%"
        />
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-1.5 block">关键词搜索</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索报告标题或内容..."
                    className="pl-9"
                    value={filters.keyword || ""}
                    onChange={(e) => updateFilters({ keyword: e.target.value || undefined })}
                  />
                </div>
              </div>

              <div className="w-[160px]">
                <label className="text-sm font-medium mb-1.5 block">价格趋势</label>
                <Select
                  value={filters.trend || ""}
                  onValueChange={(v: string) => updateFilters({ trend: v as "上涨" | "下跌" | "稳定" | "震荡" | "小幅上涨" | "小幅下跌" | undefined || undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部</SelectItem>
                    <SelectItem value="上涨">上涨</SelectItem>
                    <SelectItem value="小幅上涨">小幅上涨</SelectItem>
                    <SelectItem value="稳定">稳定</SelectItem>
                    <SelectItem value="震荡">震荡</SelectItem>
                    <SelectItem value="下跌">下跌</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[140px]">
                <label className="text-sm font-medium mb-1.5 block">风险等级</label>
                <Select
                  value={filters.risk || ""}
                  onValueChange={(v: string) => updateFilters({ risk: v as "高" | "中等" | "低" | undefined || undefined })}
                >
                  <SelectTrigger>
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

              <div className="w-[160px]">
                <label className="text-sm font-medium mb-1.5 block">开始日期</label>
                <Input
                  type="date"
                  value={filters.startDate || ""}
                  onChange={(e) => updateFilters({ startDate: e.target.value || undefined })}
                />
              </div>

              <div className="w-[160px]">
                <label className="text-sm font-medium mb-1.5 block">结束日期</label>
                <Input
                  type="date"
                  value={filters.endDate || ""}
                  onChange={(e) => updateFilters({ endDate: e.target.value || undefined })}
                />
              </div>

              <Button variant="ghost" onClick={clearFilters} className="mb-0.5">
                <X className="h-4 w-4 mr-1" />
                清除筛选
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>报告列表</CardTitle>
              <CardDescription>
                共 {reports.length} 份报告
              </CardDescription>
            </div>
            {hasActiveFilters && (
              <Badge variant="secondary">
                已筛选
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex gap-4 p-4">
                  <div className="h-10 w-10 bg-muted rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">暂无报告数据</p>
              <Button variant="outline" size="sm" className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onView={() => handleViewReport(report)}
                  onExport={(format) => handleExport(report, format)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ReportDetailDialog
        report={selectedReport}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onExport={(format) => {
          if (selectedReport) {
            handleExport(selectedReport, format)
          }
        }}
      />
    </div>
  )
}
