/**
 * Tracker 异动事件列表页面
 *
 * 功能：
 * - 查看异动事件列表
 * - 筛选异动类型、紧急程度
 * - 标记已读/已处理
 */

"use client"

import { useState } from "react"
import {
  Activity,
  Bell,
  CheckCircle,
  Filter,
  AlertTriangle,
  RefreshCw,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useTrackerAlerts, useTrackerAlert } from "@/hooks/use-tracker"
import type { TrackerAlert } from "@/db/schema-tracker"

// ==================== 异动紧急程度颜色 ====================

function getUrgencyColor(urgency: string) {
  if (urgency === "high") return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
  if (urgency === "normal") return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
}

// ==================== 异动类型图标 ====================

function getAlertTypeIcon(type: string) {
  switch (type) {
    case "price_change":
      return <Activity className="h-4 w-4" />
    case "price_threshold":
      return <AlertTriangle className="h-4 w-4" />
    case "inventory_change":
      return <RefreshCw className="h-4 w-4" />
    case "inventory_threshold":
      return <AlertTriangle className="h-4 w-4" />
    case "news_keyword":
      return <Bell className="h-4 w-4" />
    case "prediction_risk":
      return <AlertTriangle className="h-4 w-4" />
    default:
      return <Bell className="h-4 w-4" />
  }
}

// ==================== 异动类型名称 ====================

function getAlertTypeName(type: string) {
  switch (type) {
    case "price_change":
      return "价格变化"
    case "price_threshold":
      return "价格阈值"
    case "inventory_change":
      return "库存变化"
    case "inventory_threshold":
      return "库存阈值"
    case "news_keyword":
      return "新闻关键词"
    case "prediction_risk":
      return "预测风险"
    default:
      return type
  }
}

// ==================== 筛选组件 ====================

function AlertFilters({
  filters,
  onFilterChange,
}: {
  filters: { alertType: string; urgency: string; isRead: string; isHandled: string }
  onFilterChange: (key: string, value: string) => void
}) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">筛选</span>
      </div>

      <Select value={filters.alertType} onValueChange={(v) => onFilterChange("alertType", v)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="异动类型" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部类型</SelectItem>
          <SelectItem value="price_change">价格变化</SelectItem>
          <SelectItem value="price_threshold">价格阈值</SelectItem>
          <SelectItem value="inventory_change">库存变化</SelectItem>
          <SelectItem value="inventory_threshold">库存阈值</SelectItem>
          <SelectItem value="news_keyword">新闻关键词</SelectItem>
          <SelectItem value="prediction_risk">预测风险</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.urgency} onValueChange={(v) => onFilterChange("urgency", v)}>
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="紧急程度" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部</SelectItem>
          <SelectItem value="high">高</SelectItem>
          <SelectItem value="normal">中</SelectItem>
          <SelectItem value="low">低</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.isRead} onValueChange={(v) => onFilterChange("isRead", v)}>
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="已读状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部</SelectItem>
          <SelectItem value="false">未读</SelectItem>
          <SelectItem value="true">已读</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.isHandled} onValueChange={(v) => onFilterChange("isHandled", v)}>
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="处理状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部</SelectItem>
          <SelectItem value="false">未处理</SelectItem>
          <SelectItem value="true">已处理</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

// ==================== 异动事件列表组件 ====================

function AlertList() {
  const [filters, setFilters] = useState({
    alertType: "all",
    urgency: "all",
    isRead: "all",
    isHandled: "all",
  })
  const [page, setPage] = useState(0)
  const pageSize = 20

  const { alerts, total, unreadCount, isLoading, markAsRead, markAllAsRead, isMarkingAllAsRead } = useTrackerAlerts({
    limit: pageSize,
    offset: page * pageSize,
    alertType: filters.alertType !== "all" ? filters.alertType : undefined,
    urgency: filters.urgency !== "all" ? filters.urgency as "high" | "normal" | "low" : undefined,
    isRead: filters.isRead !== "all" ? filters.isRead === "true" : undefined,
    isHandled: filters.isHandled !== "all" ? filters.isHandled === "true" : undefined,
  })

  const [selectedAlert, setSelectedAlert] = useState<TrackerAlert | null>(null)
  const [handleDialogOpen, setHandleDialogOpen] = useState(false)
  const [handleNote, setHandleNote] = useState("")
  const { markAsHandled, isMarkingAsHandled } = useTrackerAlert(selectedAlert?.id || 0)

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value })
    setPage(0) // 重置到第一页
  }

  const handleOpenHandleDialog = (alert: TrackerAlert) => {
    setSelectedAlert(alert)
    setHandleNote("")
    setHandleDialogOpen(true)
  }

  const handleMarkHandled = async () => {
    if (selectedAlert) {
      await markAsHandled(handleNote)
      setHandleDialogOpen(false)
      setSelectedAlert(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>没有匹配的异动事件</p>
            <p className="text-sm mt-1">调整筛选条件或等待追踪任务执行</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <AlertFilters filters={filters} onFilterChange={handleFilterChange} />
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={isMarkingAllAsRead}>
              <CheckCircle className="h-4 w-4 mr-1" />
              全部标记已读
            </Button>
          )}
          <Badge variant="secondary">{total} 条异动</Badge>
        </div>
      </div>

      {/* 异动列表 */}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <Card key={alert.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`${getUrgencyColor(alert.urgency)} p-2 rounded-lg`}>
                    {getAlertTypeIcon(alert.alertType)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{getAlertTypeName(alert.alertType)}</Badge>
                      <Badge className={getUrgencyColor(alert.urgency)}>
                        {alert.urgency === "high" ? "高紧急" : alert.urgency === "normal" ? "中等" : "低紧急"}
                      </Badge>
                      {!alert.isRead && (
                        <Badge variant="default" className="bg-cyan-500">
                          未读
                        </Badge>
                      )}
                      {alert.isHandled && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          已处理
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{alert.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(alert.createdAt).toLocaleString("zh-CN")}
                      </span>
                      {alert.triggerValue && (
                        <span>触发值: {alert.triggerValue}</span>
                      )}
                      {alert.changePercent && (
                        <span>变化: {alert.changePercent}%</span>
                      )}
                    </div>
                    {alert.isHandled && alert.handleNote && (
                      <div className="mt-2 p-2 rounded bg-slate-50 dark:bg-slate-500/10 text-sm">
                        <p className="text-muted-foreground">处理备注:</p>
                        <p>{alert.handleNote}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!alert.isRead && (
                    <Button variant="ghost" size="sm" onClick={() => markAsRead(alert.id)}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {!alert.isHandled && (
                    <Button variant="outline" size="sm" onClick={() => handleOpenHandleDialog(alert)}>
                      标记处理
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {page + 1} / {totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 处理对话框 */}
      <Dialog open={handleDialogOpen} onOpenChange={setHandleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>标记异动已处理</DialogTitle>
            <DialogDescription>添加处理备注以记录采取的措施</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="font-medium">{selectedAlert?.title}</p>
              <p className="text-sm text-muted-foreground">{selectedAlert?.content}</p>
            </div>
            <div>
              <Label htmlFor="handleNote">处理备注</Label>
              <Textarea
                id="handleNote"
                value={handleNote}
                onChange={(e) => setHandleNote(e.target.value)}
                placeholder="记录采取的措施、决策依据等..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHandleDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleMarkHandled}>
              确认处理
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== 主页面组件 ====================

export default function TrackerAlertsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">异动事件列表</h1>
          <p className="text-muted-foreground">查看和管理 Tracker 检测到的异动事件</p>
        </div>
        <Link href="/tracker">
          <Button variant="outline" className="gap-2">
            <Activity className="h-4 w-4" />
            返回仪表盘
          </Button>
        </Link>
      </div>

      {/* 异动列表 */}
      <AlertList />
    </div>
  )
}