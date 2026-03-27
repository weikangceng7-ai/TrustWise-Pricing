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
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react"

interface ForgotPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSwitchToLogin: () => void
}

// 密码强度检测
function getPasswordStrength(password: string): {
  score: number
  label: string
  color: string
  checks: { label: string; passed: boolean }[]
} {
  const checks = [
    { label: "至少 8 个字符", passed: password.length >= 8 },
    { label: "包含大写字母", passed: /[A-Z]/.test(password) },
    { label: "包含小写字母", passed: /[a-z]/.test(password) },
    { label: "包含数字", passed: /[0-9]/.test(password) },
    { label: "包含特殊字符", passed: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ]

  const score = checks.filter((c) => c.passed).length

  let label = "非常弱"
  let color = "bg-red-500"

  if (score >= 5) {
    label = "非常强"
    color = "bg-green-500"
  } else if (score >= 4) {
    label = "强"
    color = "bg-green-400"
  } else if (score >= 3) {
    label = "中等"
    color = "bg-yellow-500"
  } else if (score >= 2) {
    label = "弱"
    color = "bg-orange-500"
  }

  return { score, label, color, checks }
}

export function ForgotPasswordDialog({
  open,
  onOpenChange,
  onSwitchToLogin,
}: ForgotPasswordDialogProps) {
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [devCode, setDevCode] = useState<string | null>(null)

  const passwordStrength = getPasswordStrength(password)

  // 发送验证码
  const handleSendCode = async () => {
    if (!email) {
      setError("请输入邮箱地址")
      return
    }

    setError(null)
    setIsSendingCode(true)

    try {
      const res = await fetch("/api/auth/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "reset" }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "发送验证码失败")
        setIsSendingCode(false)
        return
      }

      setCodeSent(true)
      setCountdown(60)

      // 开发环境显示验证码
      if (data.devCode) {
        setDevCode(data.devCode)
      }

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
      setError("发送验证码失败，请稍后重试")
    } finally {
      setIsSendingCode(false)
    }
  }

  // 重置密码
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!code) {
      setError("请输入验证码")
      return
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致")
      return
    }

    if (password.length < 8) {
      setError("密码长度至少为 8 位")
      return
    }

    if (passwordStrength.score < 2) {
      setError("密码强度不足")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/reset-password-with-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "重置密码失败")
        setIsLoading(false)
        return
      }

      setSuccess(true)
    } catch {
      setError("重置密码失败，请稍后重试")
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>密码重置成功</DialogTitle>
            <DialogDescription>
              您的密码已成功重置，请使用新密码登录。
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => onOpenChange(false)}>确定</Button>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>忘记密码</DialogTitle>
          <DialogDescription>
            输入您的邮箱获取验证码，然后设置新密码
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {devCode && (
          <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-3 text-sm text-cyan-600 dark:text-cyan-400">
            验证码已发送到控制台，开发环境测试验证码：<span className="font-mono font-bold">{devCode}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 邮箱 */}
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="请输入注册邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || codeSent}
                className="flex-1"
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSendCode}
                disabled={isLoading || isSendingCode || countdown > 0 || !email}
                className="shrink-0"
              >
                {isSendingCode ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : countdown > 0 ? (
                  `${countdown}s`
                ) : codeSent ? (
                  "重新发送"
                ) : (
                  "发送验证码"
                )}
              </Button>
            </div>
          </div>

          {/* 验证码 */}
          {codeSent && (
            <div className="space-y-2">
              <Label htmlFor="code">验证码</Label>
              <Input
                id="code"
                type="text"
                placeholder="请输入 6 位验证码"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                disabled={isLoading}
                maxLength={6}
                required
              />
            </div>
          )}

          {/* 新密码 */}
          {codeSent && (
            <div className="space-y-2">
              <Label htmlFor="password">新密码</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="请输入新密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full transition-all ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-12">
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {passwordStrength.checks.map((check, i) => (
                      <div key={i} className="flex items-center gap-1">
                        {check.passed ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <X className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className={check.passed ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 确认密码 */}
          {codeSent && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="请再次输入新密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">两次输入的密码不一致</p>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !codeSent || !code || !password || !confirmPassword}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            重置密码
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