/**
 * Tracker 追踪面板（市场分析页 Tab）
 *
 * 功能：
 * - 显示追踪状态统计
 * - 显示最近异动事件
 * - 手动启动追踪任务
 */

"use client"

import { Activity, Bell, Clock, RefreshCw, Plus, AlertTriangle, CheckCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useTrackerStatus, useTrackerAlerts, useTrackerControl } from "@/hooks/use-tracker"
import { useTrackerSubscriptions } from "@/hooks/use-tracker-subscriptions"
import type { TrackerAlert } from "@/db/schema-tracker"
import { useLanguage } from "@/contexts/language-context"

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
  const { startTracking, isStarting } = useTrackerControl()
  const { t } = useLanguage()

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
                <p className="text-xs text-muted-foreground">{t("tracker.activeSubscriptions")}</p>
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
                <p className="text-xs text-muted-foreground">{t("tracker.unreadAlerts")}</p>
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
                    : t("tracker.notExecuted")}
                </p>
                <p className="text-xs text-muted-foreground">{t("tracker.lastRun")}</p>
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
                    : t("tracker.noSchedule")}
                </p>
                <p className="text-xs text-muted-foreground">{t("tracker.nextRun")}</p>
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
          {isStarting ? t("tracker.executing") : t("tracker.executeAll")}
        </Button>

        <Link href="/tracker/subscriptions">
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            {t("tracker.newSubscription")}
          </Button>
        </Link>
      </div>
    </div>
  )
}

// ==================== 异动事件列表组件 ====================

function AlertList() {
  const { alerts, total, unreadCount, isLoading, markAsRead } = useTrackerAlerts({
    limit: 10,
  })
  const { t } = useLanguage()

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
            {t("tracker.recentAlerts")}
          </CardTitle>
          <CardDescription>{t("tracker.noAlerts")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>{t("tracker.noAlertsDetected")}</p>
            <p className="text-sm">{t("tracker.noAlertsHint")}</p>
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
            {t("tracker.recentAlerts")}
          </div>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              {unreadCount} {t("tracker.unread")}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>{t("tracker.totalAlertsPrefix")}{total}{t("tracker.totalAlertsSuffix")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.slice(0, 5).map((alert) => (
          <AlertItem key={alert.id} alert={alert} onMarkAsRead={() => markAsRead(alert.id)} />
        ))}

        {alerts.length > 5 && (
          <Link href="/tracker/alerts">
            <Button variant="ghost" className="w-full gap-2">
              {t("tracker.viewAllAlertsPrefix")}{total}{t("tracker.viewAllAlertsSuffix")}
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
  const { t } = useLanguage()

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
            {alert.urgency === "high" ? t("tracker.urgencyHigh") : alert.urgency === "normal" ? t("tracker.urgencyMedium") : t("tracker.urgencyLow")}
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
  const { t } = useLanguage()

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
          <CardTitle>{t("tracker.activeSubscriptionsTitle")}</CardTitle>
          <CardDescription>{t("tracker.noActiveSubscriptions")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Link href="/tracker/subscriptions">
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                {t("tracker.createFirstSubscription")}
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
          <span>{t("tracker.activeSubscriptionsTitle")}</span>
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
                {sub.targetType === "all" ? t("tracker.targetAll") : sub.targetType} · {sub.frequency}
              </p>
            </div>
            <Badge variant="outline">{sub.isActive ? t("tracker.statusRunning") : t("tracker.statusStopped")}</Badge>
          </div>
        ))}

        {subscriptions.length > 3 && (
          <Link href="/tracker/subscriptions">
            <Button variant="ghost" className="w-full">
              {t("tracker.viewAllSubscriptionsPrefix")}{subscriptions.length}{t("tracker.viewAllSubscriptionsSuffix")}
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== 面板主组件 ====================

export function TrackerPanel() {
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      {/* 面板标题行 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("tracker.panelDescription")}</p>
        <Link href="/tracker/subscriptions">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {t("tracker.manageSubscriptions")}
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
