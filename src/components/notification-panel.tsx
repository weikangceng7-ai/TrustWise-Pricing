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
import { useNotifications, type Notification } from "@/hooks/use-notifications"

const typeConfig: Record<
  string,
  { icon: React.ElementType; color: string; bgColor: string; label: string }
> = {
  price_alert: {
    icon: TrendingUp,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    label: "价格预警",
  },
  inventory_alert: {
    icon: Package,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    label: "库存预警",
  },
  purchase_timing: {
    icon: Clock,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    label: "采购时机",
  },
  market_news: {
    icon: Newspaper,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    label: "市场动态",
  },
  report_ready: {
    icon: FileText,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    label: "报告生成",
  },
  system: {
    icon: Settings,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    label: "系统通知",
  },
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "刚刚"
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return date.toLocaleDateString("zh-CN")
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
            <span className="text-xs text-muted-foreground">{config.label}</span>
            {notification.priority === "high" && (
              <span className="text-xs bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded">
                紧急
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
            {formatTime(notification.createdAt)}
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
              title="标记已读"
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
            title="删除"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const {
    notifications,
    unreadCount,
    isLoading,
    isLoggedIn,
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
            title={unreadCount > 0 ? `${unreadCount} 条未读通知` : "通知"}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            <span className="sr-only">通知</span>
          </Button>
        }
      />
      <SheetContent className="w-[400px] sm:max-w-[400px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              通知中心
            </SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                disabled={isMarkingAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                全部已读
              </Button>
            )}
          </div>
        </SheetHeader>

        {!isLoggedIn ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">登录后可查看通知</p>
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">暂无通知</p>
            <Button
              variant="outline"
              size="sm"
              onClick={createDemoNotifications}
              disabled={isCreatingDemo}
            >
              创建演示通知
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="p-2">
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
            </ScrollArea>
            <div className="p-3 border-t text-center">
              <p className="text-xs text-muted-foreground">
                共 {notifications.length} 条通知，{unreadCount} 条未读
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
