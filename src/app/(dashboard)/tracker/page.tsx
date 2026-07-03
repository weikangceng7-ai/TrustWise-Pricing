/**
 * Tracker 追踪仪表盘页面
 *
 * 功能：
 * - 显示追踪状态统计
 * - 显示最近异动事件
 * - 手动启动追踪任务
 */

"use client"

import { Activity, Bell, Clock, RefreshCw, Plus, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useTrackerStatus, useTrackerAlerts, useTrackerControl } from "@/hooks/use-tracker"
import { useTrackerSubscriptions } from "@/hooks/use-tracker-subscriptions"
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

// ==================== 状态卡片组件 ====================

function StatusCards() {
  const { status, isLoading, refetch } = useTrackerStatus()
  const { subscriptions, total } = useTrackerSubscriptions({ activeOnly: false })
  const { startTracking, isStarting } = useTrackerControl()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const handleStartAll = async () => {
    await startTracking({ frequency: "daily" })
    refetch()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-500" />
              <div>
                <p className="text-2xl font-bold">{status?.activeSubscriptions || 0}</p>
                <p className="text-xs text-muted-foreground">活跃订阅</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{status?.unreadAlerts || 0}</p>
                <p className="text-xs text-muted-foreground">未读异动</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-violet-500" />
              <div>
                <p className="text-sm font-semibold">
                  {status?.lastRunTime
                    ? new Date(status.lastRunTime).toLocaleString("zh-CN", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "未执行"}
                </p>
                <p className="text-xs text-muted-foreground">最近执行</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold">
                  {status?.nextScheduledRun
                    ? new Date(status.nextScheduledRun).toLocaleString("zh-CN", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "无调度"}
                </p>
                <p className="text-xs text-muted-foreground">下次执行</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleStartAll}
          disabled={isStarting || status?.activeSubscriptions === 0}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isStarting ? "animate-spin" : ""}`} />
          {isStarting ? "正在执行..." : "立即执行所有追踪"}
        </Button>

        <Link href="/tracker/subscriptions">
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            新建订阅
          </Button>
        </Link>
      </div>
    </div>
  )
}

// ==================== 异动事件列表组件 ====================

function AlertList() {
  const { alerts, total, unreadCount, isLoading, markAsRead, isMarkingAsRead } = useTrackerAlerts({
    limit: 10,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            最近异动事件
          </CardTitle>
          <CardDescription>暂无异动事件</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>还没有检测到异动事件</p>
            <p className="text-sm">创建订阅并执行追踪后，将自动检测异动</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            最近异动事件
          </div>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              {unreadCount} 未读
            </Badge>
          )}
        </CardTitle>
        <CardDescription>共 {total} 条异动事件</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.slice(0, 5).map((alert) => (
          <AlertItem key={alert.id} alert={alert} onMarkAsRead={() => markAsRead(alert.id)} />
        ))}

        {alerts.length > 5 && (
          <Link href="/tracker/alerts">
            <Button variant="ghost" className="w-full gap-2">
              查看全部 {total} 条异动
              <Activity className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== 异动事件单项组件 ====================

function AlertItem({ alert, onMarkAsRead }: { alert: TrackerAlert; onMarkAsRead: () => void }) {
  const handleRead = async () => {
    await onMarkAsRead()
  }

  return (
    <div
      className={`p-3 rounded-lg border ${
        alert.isRead
          ? "bg-slate-50/50 dark:bg-slate-500/10 border-slate-200/50 dark:border-slate-500/20"
          : "bg-cyan-50/50 dark:bg-cyan-500/10 border-cyan-200/50 dark:border-cyan-500/20"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className={`${getUrgencyColor(alert.urgency)} p-1 rounded`}>
            {getAlertTypeIcon(alert.alertType)}
          </div>
          <div>
            <p className="font-medium text-sm">{alert.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{alert.content}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(alert.createdAt).toLocaleString("zh-CN", {
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getUrgencyColor(alert.urgency)}>
            {alert.urgency === "high" ? "高" : alert.urgency === "normal" ? "中" : "低"}
          </Badge>
          {!alert.isRead && (
            <Button variant="ghost" size="sm" onClick={handleRead} className="h-6 px-2">
              <CheckCircle className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ==================== 订阅列表预览组件 ====================

function SubscriptionPreview() {
  const { subscriptions, isLoading } = useTrackerSubscriptions({ activeOnly: true })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>活跃订阅</CardTitle>
          <CardDescription>暂无活跃订阅</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Link href="/tracker/subscriptions">
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                创建第一个订阅
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>活跃订阅</span>
          <Badge variant="secondary">{subscriptions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {subscriptions.slice(0, 3).map((sub) => (
          <div
            key={sub.id}
            className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 dark:bg-slate-500/10 border border-slate-200/50 dark:border-slate-500/20"
          >
            <div>
              <p className="font-medium text-sm">{sub.name}</p>
              <p className="text-xs text-muted-foreground">
                {sub.targetType === "all" ? "全部" : sub.targetType} · {sub.frequency}
              </p>
            </div>
            <Badge variant="outline">{sub.isActive ? "运行中" : "已停用"}</Badge>
          </div>
        ))}

        {subscriptions.length > 3 && (
          <Link href="/tracker/subscriptions">
            <Button variant="ghost" className="w-full">
              查看全部 {subscriptions.length} 个订阅
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== 主页面组件 ====================

export default function TrackerDashboardPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tracker 追踪仪表盘</h1>
          <p className="text-muted-foreground">硫磺价格追踪与异动预警</p>
        </div>
        <Link href="/tracker/subscriptions">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            管理订阅
          </Button>
        </Link>
      </div>

      {/* 状态统计卡片 */}
      <StatusCards />

      {/* 两列布局：异动事件 + 订阅预览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AlertList />
        <SubscriptionPreview />
      </div>
    </div>
  )
}