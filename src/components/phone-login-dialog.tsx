"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { signIn } from "@/lib/auth-client"
import { verifyCode } from "@/lib/services/sms"

interface PhoneLoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSwitchToEmailLogin: () => void
}

export function PhoneLoginDialog({
  open,
  onOpenChange,
  onSwitchToEmailLogin,
}: PhoneLoginDialogProps) {
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // 发送验证码
  const handleSendCode = async () => {
    if (!phone) {
      setError("请输入手机号")
      return
    }

    // 验证手机号格式
    const chinaPhoneRegex = /^1[3-9]\d{9}$/
    if (!chinaPhoneRegex.test(phone)) {
      setError("请输入正确的手机号")
      return
    }

    setIsSendingCode(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, action: "login" }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "发送验证码失败")
        return
      }

      setCodeSent(true)
      setCountdown(60)

      // 倒计时
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch {
      setError("发送验证码失败")
    } finally {
      setIsSendingCode(false)
    }
  }

  // 验证码登录
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // 先验证验证码
      const verifyResult = verifyCode(phone, code)
      if (!verifyResult.valid) {
        setError(verifyResult.error || "验证码错误")
        setIsLoading(false)
        return
      }

      // 调用 better-auth 的手机号登录
      // 注意：better-auth 需要配置手机号登录插件
      const result = await signIn.phone({
        phone,
        code,
      })

      if (result.error) {
        setError(result.error.message || "登录失败")
        setIsLoading(false)
        return
      }

      onOpenChange(false)
      router.refresh()
    } catch {
      setError("登录失败，请稍后重试")
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>手机号登录</DialogTitle>
          <DialogDescription>
            使用手机验证码快速登录
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">手机号</Label>
            <div className="flex gap-2">
              <Input
                id="phone"
                type="tel"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSendCode}
                disabled={isSendingCode || countdown > 0}
              >
                {isSendingCode ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : countdown > 0 ? (
                  `${countdown}s`
                ) : (
                  "发送验证码"
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">验证码</Label>
            <Input
              id="code"
              type="text"
              placeholder="请输入验证码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isLoading}
              maxLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            登录
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            没有账号？{" "}
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline"
              onClick={onSwitchToEmailLogin}
            >
              使用邮箱注册
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}