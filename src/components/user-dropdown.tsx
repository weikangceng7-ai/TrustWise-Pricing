"use client"

import { useState, useSyncExternalStore } from "react"
import { useSession, signOut } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { AuthDialog } from "@/components/auth-dialog"
import { LogOut, User } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// 自定义 hook：检测组件是否已挂载（使用 useSyncExternalStore 避免 SSR hydration mismatch）
function useMounted() {
  // useSyncExternalStore 是 React 18 推荐的 SSR 安全模式
  return useSyncExternalStore(
    () => () => {}, // 订阅函数（空）
    () => true,     // 客户端返回 true
    () => false     // 服务端返回 false
  )
}

export function UserDropdown() {
  const { data: session, isPending } = useSession()
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  // 使用 useSyncExternalStore 避免 SSR hydration mismatch
  const mounted = useMounted()

  // SSR 时渲染一致的占位符，避免 hydration mismatch
  if (!mounted) {
    return (
      <Button variant="outline" size="sm" disabled>
        <User className="size-4" />
        <span className="hidden md:inline">登录</span>
      </Button>
    )
  }

  // 客户端加载中显示骨架按钮
  if (isPending) {
    return (
      <Button variant="outline" size="sm" disabled>
        <User className="size-4 animate-pulse" />
        <span className="hidden md:inline">...</span>
      </Button>
    )
  }

  if (!session) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAuthDialog(true)}
        >
          <User className="size-4" />
          <span className="hidden md:inline">登录</span>
        </Button>
        <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
      </>
    )
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setShowLogoutDialog(true)}
      >
        <User className="size-4" />
        <span className="hidden md:inline">{session.user?.name || session.user?.email || "用户"}</span>
      </Button>

      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>退出登录</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">确定要退出登录吗？</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
              取消
            </Button>
            <Button
              onClick={async () => {
                await signOut()
                setShowLogoutDialog(false)
              }}
            >
              <LogOut className="size-4 mr-2" />
              退出
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}