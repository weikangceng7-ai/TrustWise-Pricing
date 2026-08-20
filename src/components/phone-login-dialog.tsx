"use client"

import { useState, useRef, useEffect } from "react"
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
import { useLanguage } from "@/contexts/language-context"

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
  const { t } = useLanguage()
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    }
  }, [])

  // 发送验证码
  const handleSendCode = async () => {
    if (!phone) {
      setError(t("auth.phonePlaceholder"))
      return
    }

    // 验证手机号格式
    const chinaPhoneRegex = /^1[3-9]\d{9}$/
    if (!chinaPhoneRegex.test(phone)) {
      setError(t("auth.error.invalidPhone"))
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
        setError(data.error || t("auth.error.sendCodeFailed"))
        return
      }

      setCountdown(60)

      // 倒计时
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch {
      setError(t("auth.error.sendCodeFailed"))
    } finally {
      setIsSendingCode(false)
    }
  }

  // 验证码登录（验证码在服务端校验）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/phone-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || t("auth.error.loginFailed"))
        setIsLoading(false)
        return
      }

      onOpenChange(false)
      router.refresh()
    } catch {
      setError(t("auth.error.loginRetry"))
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("auth.phoneLogin")}</DialogTitle>
          <DialogDescription>
            {t("auth.phoneLoginDesc")}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">{t("auth.phone")}</Label>
            <div className="flex gap-2">
              <Input
                id="phone"
                type="tel"
                placeholder={t("auth.phonePlaceholder")}
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
                  t("auth.sendCode")
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">{t("auth.verifyCode")}</Label>
            <Input
              id="code"
              type="text"
              placeholder={t("auth.phoneCodePlaceholder")}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isLoading}
              maxLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("auth.login")}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t("auth.noAccountPhone")}{" "}
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline"
              onClick={onSwitchToEmailLogin}
            >
              {t("auth.useEmailRegister")}
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}