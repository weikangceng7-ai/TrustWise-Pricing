"use client"

import { useState, useEffect } from "react"
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

export function UserDropdown() {
  const { data: session, isPending } = useSession()
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [mounted, setMounted] = useState(false)

  // 等待客户端挂载后再渲染，避免 SSR hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

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
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => setShowLogoutDialog(true)}
      >
        <div className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
          {session.user.name?.charAt(0) || "U"}
        </div>
        <span className="hidden md:inline">{session.user.name}</span>
      </Button>

      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>账户信息</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3">
              <p className="font-medium">{session.user.name}</p>
              <p className="text-sm text-muted-foreground">{session.user.email}</p>
            </div>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                signOut()
                setShowLogoutDialog(false)
              }}
            >
              <LogOut className="mr-2 size-4" />
              退出登录
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}