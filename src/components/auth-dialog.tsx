"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
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
import { Loader2, Eye, EyeOff, Check, X, ArrowLeft, Shield } from "lucide-react"
import { signIn, signUp } from "@/lib/auth-client"

type AuthMode = "login" | "register" | "register-verify" | "forgot-password" | "forgot-verify"

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultMode?: AuthMode
}

// 常见邮箱后缀
const EMAIL_SUFFIXES = [
  "qq.com",
  "gmail.com",
  "163.com",
  "126.com",
  "outlook.com",
  "hotmail.com",
  "sina.com",
  "foxmail.com",
  "icloud.com",
  "yahoo.com",
]

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
  let color = "bg-destructive"

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
  } else if (score >= 1) {
    label = "非常弱"
    color = "bg-red-500"
  }

  return { score, label, color, checks }
}

// 邮箱格式验证
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

// 获取邮箱后缀建议
function getEmailSuggestions(input: string): string[] {
  if (!input.includes("@")) return []

  const [localPart, domain] = input.split("@")
  if (!domain) {
    return EMAIL_SUFFIXES.map((suffix) => `${localPart}@${suffix}`)
  }

  return EMAIL_SUFFIXES.filter((suffix) =>
    suffix.toLowerCase().startsWith(domain.toLowerCase())
  ).map((suffix) => `${localPart}@${suffix}`)
}

export function AuthDialog({
  open,
  onOpenChange,
  defaultMode = "login",
}: AuthDialogProps) {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>(defaultMode)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState("")
  const [name, setName] = useState("") // 姓名持久化，切换模式不清空
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotSuccess, setForgotSuccess] = useState(false)

  // 验证码相关状态
  const [verifyCode, setVerifyCode] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null) // 开发环境验证码

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])
  const emailSuggestions = useMemo(() => getEmailSuggestions(email), [email])

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // 发送验证码
  const sendVerificationCode = useCallback(async (targetEmail: string, type: "register" | "forgot") => {
    if (!isValidEmail(targetEmail)) {
      setError("请输入有效的邮箱地址")
      return false
    }

    setIsSendingCode(true)
    setError(null)
    setDevCode(null)

    try {
      const res = await fetch("/api/auth/send-verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, type }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "发送验证码失败")
        setIsSendingCode(false)
        return false
      }

      // 开发环境显示验证码
      if (data.devCode) {
        setDevCode(data.devCode)
      }

      setCountdown(60) // 60秒倒计时
      setIsSendingCode(false)
      return true
    } catch {
      setError("发送验证码失败，请稍后重试")
      setIsSendingCode(false)
      return false
    }
  }, [])

  // 验证验证码
  const verifyEmailCode = useCallback(async (targetEmail: string, code: string) => {
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, code }),
      })

      const data = await res.json()
      return { success: res.ok, error: data.error }
    } catch {
      return { success: false, error: "验证失败，请稍后重试" }
    }
  }, [])

  const handleLogin = async (formData: FormData) => {
    setError(null)
    setIsLoading(true)

    const emailValue = formData.get("email") as string
    const passwordValue = formData.get("password") as string

    if (!isValidEmail(emailValue)) {
      setError("请输入有效的邮箱地址")
      setIsLoading(false)
      return
    }

    try {
      const result = await signIn.email({ email: emailValue, password: passwordValue })

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

  const handleRegister = async (formData: FormData) => {
    setError(null)

    const nameValue = formData.get("name") as string
    const emailValue = formData.get("email") as string
    const passwordValue = formData.get("password") as string
    const confirmPasswordValue = formData.get("confirmPassword") as string

    // 更新状态
    setName(nameValue)
    setEmail(emailValue)

    if (!isValidEmail(emailValue)) {
      setError("请输入有效的邮箱地址")
      return
    }

    if (passwordValue !== confirmPasswordValue) {
      setError("两次输入的密码不一致")
      return
    }

    if (passwordValue.length < 8) {
      setError("密码长度至少为 8 位")
      return
    }

    if (passwordStrength.score < 2) {
      setError("密码强度不足，请至少满足 2 项要求")
      return
    }

    // 发送验证码
    const sent = await sendVerificationCode(emailValue, "register")
    if (sent) {
      setMode("register-verify")
    }
  }

  // 完成注册（验证码验证后）
  const handleRegisterVerify = async () => {
    setError(null)
    setIsLoading(true)

    if (!verifyCode.trim()) {
      setError("请输入验证码")
      setIsLoading(false)
      return
    }

    // 验证验证码
    const verifyResult = await verifyEmailCode(email, verifyCode)
    if (!verifyResult.success) {
      setError(verifyResult.error || "验证码错误")
      setIsLoading(false)
      return
    }

    // 验证成功，创建账户
    try {
      const result = await signUp.email({ email, password, name })

      if (result.error) {
        setError(result.error.message || "注册失败")
        setIsLoading(false)
        return
      }

      onOpenChange(false)
      router.refresh()
    } catch {
      setError("注册失败，请稍后重试")
      setIsLoading(false)
    }
  }

  const handleEmailSelect = (suggestion: string) => {
    setEmail(suggestion)
    setShowEmailSuggestions(false)
  }

  const handleForgotPassword = async (formData: FormData) => {
    setError(null)

    const emailValue = formData.get("email") as string
    setForgotEmail(emailValue)

    if (!isValidEmail(emailValue)) {
      setError("请输入有效的邮箱地址")
      return
    }

    // 发送验证码
    const sent = await sendVerificationCode(emailValue, "forgot")
    if (sent) {
      setMode("forgot-verify")
    }
  }

  // 忘记密码验证码验证
  const handleForgotVerify = async () => {
    setError(null)
    setIsLoading(true)

    if (!verifyCode.trim()) {
      setError("请输入验证码")
      setIsLoading(false)
      return
    }

    // 验证验证码
    const verifyResult = await verifyEmailCode(forgotEmail, verifyCode)
    if (!verifyResult.success) {
      setError(verifyResult.error || "验证码错误")
      setIsLoading(false)
      return
    }

    // 验证成功，发送重置邮件
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "发送重置邮件失败")
        setIsLoading(false)
        return
      }

      setForgotSuccess(true)
      setIsLoading(false)
    } catch {
      setError("发送重置邮件失败，请稍后重试")
      setIsLoading(false)
    }
  }

  // 切换到注册时，保留姓名
  const switchToRegister = () => {
    setMode("register")
    setError(null)
    setVerifyCode("")
  }

  // 切换到登录时，清空密码但保留姓名和邮箱
  const switchToLogin = () => {
    setMode("login")
    setError(null)
    setLoginPassword("")
    setVerifyCode("")
  }

  // 切换到忘记密码
  const switchToForgotPassword = () => {
    setMode("forgot-password")
    setError(null)
    setVerifyCode("")
  }

  const getTitle = () => {
    switch (mode) {
      case "login":
        return "登录账户"
      case "register":
        return "创建账户"
      case "register-verify":
        return "验证邮箱"
      case "forgot-password":
        return "重置密码"
      case "forgot-verify":
        return "验证邮箱"
      default:
        return ""
    }
  }

  const getDescription = () => {
    switch (mode) {
      case "login":
        return "登录以保存您的数据和偏好设置"
      case "register":
        return "注册以使用完整功能"
      case "register-verify":
        return `验证码已发送至 ${email}`
      case "forgot-password":
        return "输入邮箱接收密码重置链接"
      case "forgot-verify":
        return `验证码已发送至 ${forgotEmail}`
      default:
        return ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {mode === "login" && (
          <form key="login-form" action={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">邮箱</Label>
              <Input
                id="login-email"
                name="email"
                type="email"
                placeholder="支持 QQ、Gmail、163 等邮箱"
                required
                disabled={isLoading}
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">密码</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="请输入密码"
                  required
                  disabled={isLoading}
                  className="pr-10"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              登录
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={switchToForgotPassword}
              >
                忘记密码？
              </button>
              <span className="text-muted-foreground">
                还没有账户？{" "}
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={switchToRegister}
                >
                  立即注册
                </button>
              </span>
            </div>
          </form>
        )}

        {mode === "register" && (
          <form key="register-form" action={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-name">姓名</Label>
              <Input
                id="register-name"
                name="name"
                type="text"
                placeholder="请输入姓名"
                required
                disabled={isLoading}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-email">邮箱</Label>
              <div className="relative">
                <Input
                  id="register-email"
                  name="email"
                  type="email"
                  placeholder="支持 QQ、Gmail、163 等邮箱"
                  required
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setShowEmailSuggestions(e.target.value.includes("@"))
                  }}
                  onBlur={() => setTimeout(() => setShowEmailSuggestions(false), 200)}
                />
                {/* 邮箱后缀建议 */}
                {showEmailSuggestions && emailSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden">
                    {emailSuggestions.slice(0, 5).map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                        onClick={() => handleEmailSelect(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {email && !isValidEmail(email) && (
                <p className="text-xs text-destructive">请输入有效的邮箱地址</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-password">密码</Label>
              <div className="relative">
                <Input
                  id="register-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="请输入密码"
                  required
                  disabled={isLoading}
                  className="pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* 密码强度指示器 */}
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
            <div className="space-y-2">
              <Label htmlFor="register-confirm">确认密码</Label>
              <div className="relative">
                <Input
                  id="register-confirm"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="请再次输入密码"
                  required
                  disabled={isLoading}
                  className="pr-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || isSendingCode}>
              {isSendingCode && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              发送验证码
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              已有账户？{" "}
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={switchToLogin}
              >
                立即登录
              </button>
            </p>
          </form>
        )}

        {mode === "register-verify" && (
          <div className="space-y-4">
            {devCode && (
              <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-3 text-sm text-cyan-600 dark:text-cyan-400">
                开发环境测试验证码：<span className="font-mono font-bold">{devCode}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="verify-code">验证码</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="verify-code"
                    type="text"
                    placeholder="请输入 6 位验证码"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Shield className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={countdown > 0 || isSendingCode}
                  onClick={() => sendVerificationCode(email, "register")}
                >
                  {isSendingCode ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : countdown > 0 ? (
                    `${countdown}s`
                  ) : (
                    "重发"
                  )}
                </Button>
              </div>
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={isLoading || verifyCode.length !== 6}
              onClick={handleRegisterVerify}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              完成注册
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setMode("register")
                setVerifyCode("")
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回修改
            </Button>
          </div>
        )}

        {mode === "forgot-password" && (
          <form key="forgot-form" action={handleForgotPassword} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              输入您的邮箱地址，我们将发送验证码。
            </p>
            <div className="space-y-2">
              <Label htmlFor="forgot-email">邮箱</Label>
              <Input
                id="forgot-email"
                name="email"
                type="email"
                placeholder="请输入注册邮箱"
                required
                disabled={isLoading || isSendingCode}
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || isSendingCode}>
              {isSendingCode && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              发送验证码
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={switchToLogin}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回登录
            </Button>
          </form>
        )}

        {mode === "forgot-verify" && !forgotSuccess && (
          <div className="space-y-4">
            {devCode && (
              <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-3 text-sm text-cyan-600 dark:text-cyan-400">
                开发环境测试验证码：<span className="font-mono font-bold">{devCode}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="forgot-verify-code">验证码</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="forgot-verify-code"
                    type="text"
                    placeholder="请输入 6 位验证码"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Shield className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={countdown > 0 || isSendingCode}
                  onClick={() => sendVerificationCode(forgotEmail, "forgot")}
                >
                  {isSendingCode ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : countdown > 0 ? (
                    `${countdown}s`
                  ) : (
                    "重发"
                  )}
                </Button>
              </div>
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={isLoading || verifyCode.length !== 6}
              onClick={handleForgotVerify}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              验证并发送重置链接
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setMode("forgot-password")
                setVerifyCode("")
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回修改
            </Button>
          </div>
        )}

        {mode === "forgot-verify" && forgotSuccess && (
          <div className="space-y-4 text-center">
            <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3 mx-auto w-fit">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-muted-foreground">
              密码重置链接已发送至您的邮箱，请查收。
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                switchToLogin()
                setForgotSuccess(false)
                setForgotEmail("")
                setVerifyCode("")
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回登录
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}