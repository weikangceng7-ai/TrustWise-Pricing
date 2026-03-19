"use client"

import { useState } from "react"
import { useSession, signOut } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { AuthDialog } from "@/components/auth-dialog"
import { LogOut, User } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function UserDropdown() {
  const { data: session } = useSession()
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

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