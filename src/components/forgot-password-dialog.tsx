"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface ForgotPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSwitchToLogin: () => void
}

export function ForgotPasswordDialog({
  open,
  onOpenChange,
  onSwitchToLogin,
}: ForgotPasswordDialogProps) {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "发送失败")
        setIsLoading(false)
        return
      }

      setSuccess(true)
    } catch {
      setError("发送失败，请稍后重试")
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>邮件已发送</DialogTitle>
            <DialogDescription>
              如果该邮箱已注册，您将收到密码重置邮件。请检查收件箱。
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => onOpenChange(false)}>确定</Button>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>忘记密码</DialogTitle>
          <DialogDescription>
            输入您的邮箱，我们将发送密码重置链接
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              placeholder="请输入注册邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            发送重置链接
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            想起密码了？{" "}
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline"
              onClick={onSwitchToLogin}
            >
              返回登录
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}