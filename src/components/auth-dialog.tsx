"use client"

import { useState, useMemo } from "react"
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
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react"
import { signIn, signUp } from "@/lib/auth-client"

type AuthMode = "login" | "register"

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
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])
  const emailSuggestions = useMemo(() => getEmailSuggestions(email), [email])

  const handleLogin = async (formData: FormData) => {
    setError(null)
    setIsLoading(true)

    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!isValidEmail(email)) {
      setError("请输入有效的邮箱地址")
      setIsLoading(false)
      return
    }

    try {
      const result = await signIn.email({ email, password })

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
    setIsLoading(true)

    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (!isValidEmail(email)) {
      setError("请输入有效的邮箱地址")
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致")
      setIsLoading(false)
      return
    }

    // Better Auth 要求密码至少 8 位
    if (password.length < 8) {
      setError("密码长度至少为 8 位")
      setIsLoading(false)
      return
    }

    // 需要满足至少 2 项要求
    if (passwordStrength.score < 2) {
      setError("密码强度不足，请至少满足 2 项要求")
      setIsLoading(false)
      return
    }

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "login" ? "登录账户" : "创建账户"}
          </DialogTitle>
          <DialogDescription>
            {mode === "login"
              ? "登录以保存您的数据和偏好设置"
              : "注册以使用完整功能"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {mode === "login" ? (
          <form action={handleLogin} className="space-y-4">
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
            <p className="text-center text-sm text-muted-foreground">
              还没有账户？{" "}
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => setMode("register")}
              >
                立即注册
              </button>
            </p>
          </form>
        ) : (
          <form action={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-name">姓名</Label>
              <Input
                id="register-name"
                name="name"
                type="text"
                placeholder="请输入姓名"
                required
                disabled={isLoading}
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              注册
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              已有账户？{" "}
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => setMode("login")}
              >
                立即登录
              </button>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}