"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  TrendingUp,
  Package,
  Clock,
  Newspaper,
  FileText,
  Settings,
  Sparkles,
  Globe,
  MapPin,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useNotifications, type Notification, type PublicNews } from "@/hooks/use-notifications"
import { useLanguage } from "@/contexts/language-context"

const typeConfig: Record<
  string,
  { icon: React.ElementType; color: string; bgColor: string; label: string }
> = {
  price_alert: {
    icon: TrendingUp,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    label: "notification.priceAlert",
  },
  inventory_alert: {
    icon: Package,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    label: "notification.inventoryAlert",
  },
  purchase_timing: {
    icon: Clock,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    label: "notification.purchaseTiming",
  },
  market_news: {
    icon: Newspaper,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    label: "notification.marketNews",
  },
  report_ready: {
    icon: FileText,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    label: "notification.reportReady",
  },
  system: {
    icon: Settings,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    label: "notification.system",
  },
}

function formatTime(dateString: string, t: (key: string) => string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return t("notification.justNow")
  if (minutes < 60) return `${minutes} ${t("notification.minutesAgo")}`
  if (hours < 24) return `${hours} ${t("notification.hoursAgo")}`
  if (days < 7) return `${days} ${t("notification.daysAgo")}`
  return date.toLocaleDateString()
}

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: Notification
  onMarkRead: () => void
  onDelete: () => void
}) {
  const { t } = useLanguage()
  const router = useRouter()
  const config = typeConfig[notification.type] || typeConfig.system
  const Icon = config.icon

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkRead()
    }
    if (notification.link) {
      router.push(notification.link)
    }
  }

  return (
    <div
      className={`group relative p-3 rounded-lg transition-colors cursor-pointer hover:bg-muted/50 ${
        !notification.isRead ? "bg-primary/5" : ""
      }`}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${config.bgColor}`}
        >
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t(config.label)}</span>
            {notification.priority === "high" && (
              <span className="text-xs bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded">
                {t("notification.urgent")}
              </span>
            )}
            {!notification.isRead && (
              <span className="h-2 w-2 rounded-full bg-primary" />
            )}
          </div>
          <p className="text-sm font-medium mt-0.5 line-clamp-1">
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {notification.content}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {formatTime(notification.createdAt, t)}
          </p>
        </div>
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                onMarkRead()
              }}
              title={t("notification.markAsRead")}
            >
              <Check className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            title={t("notification.delete")}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function PublicNewsItem({ news }: { news: PublicNews }) {
  const { t } = useLanguage()
  const isInternational = news.category === "international"
  const Icon = isInternational ? Globe : MapPin
  const color = isInternational ? "text-cyan-500" : "text-amber-500"
  const bgColor = isInternational ? "bg-cyan-500/10" : "bg-amber-500/10"

  return (
    <a
      href={news.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block p-3 rounded-lg transition-colors hover:bg-muted/50"
    >
      <div className="flex gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bgColor}`}
        >
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs ${color}`}>{news.label}</span>
            <span className="text-xs text-muted-foreground">
              {isInternational ? t("notification.international") : t("notification.domestic")}
            </span>
          </div>
          <p className="text-sm font-medium mt-0.5 line-clamp-2 group-hover:text-primary transition-colors">
            {news.title}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {formatTime(news.date, t)}
          </p>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors self-center" />
      </div>
    </a>
  )
}

export function NotificationPanel() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const {
    notifications,
    unreadCount,
    isLoading,
    isLoggedIn,
    publicNews,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createDemoNotifications,
    isMarkingAllAsRead,
    isCreatingDemo,
  } = useNotifications()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 relative"
            title={unreadCount > 0 ? `${unreadCount} ${t("notification.unreadNotifications")}` : t("notification.notifications")}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            <span className="sr-only">{t("notification.notifications")}</span>
          </Button>
        }
      />
      <SheetContent className="w-[calc(100vw-16px)] max-w-[400px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t("notification.notificationCenter")}
            </SheetTitle>
            {isLoggedIn && unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                disabled={isMarkingAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                {t("notification.markAllAsRead")}
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {/* 公开新闻 - 无论是否登录都显示 */}
          {publicNews.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Newspaper className="h-3.5 w-3.5" />
                {t("notification.newsFlash")}
              </div>
              {publicNews.map((news, index) => (
                <div key={news.url}>
                  <PublicNewsItem news={news} />
                  {index < publicNews.length - 1 && <Separator className="my-1" />}
                </div>
              ))}
            </div>
          )}

          {/* 用户通知 - 仅登录后显示 */}
          {isLoggedIn ? (
            isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <Sparkles className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">{t("notification.noPersonalNotifications")}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={createDemoNotifications}
                  disabled={isCreatingDemo}
                >
                  {t("notification.createDemoNotifications")}
                </Button>
              </div>
            ) : (
              <div className="p-2 border-t">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  {t("notification.personalNotifications")}
                </div>
                {notifications.map((notification, index) => (
                  <div key={notification.id}>
                    <NotificationItem
                      notification={notification}
                      onMarkRead={() => markAsRead(notification.id)}
                      onDelete={() => deleteNotification(notification.id)}
                    />
                    {index < notifications.length - 1 && (
                      <Separator className="my-1" />
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            !publicNews.length && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">{t("notification.loginToView")}</p>
              </div>
            )
          )}
        </ScrollArea>

        {isLoggedIn && notifications.length > 0 && (
          <div className="p-3 border-t text-center">
            <p className="text-xs text-muted-foreground">
              {t("notification.totalCount")} {notifications.length} {t("notification.count")}，{unreadCount} {t("notification.unread")}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
