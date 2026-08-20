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
import { useLanguage } from "@/contexts/language-context"

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
    { label: "auth.pw.checkLength", passed: password.length >= 8 },
    { label: "auth.pw.checkUpper", passed: /[A-Z]/.test(password) },
    { label: "auth.pw.checkLower", passed: /[a-z]/.test(password) },
    { label: "auth.pw.checkNumber", passed: /[0-9]/.test(password) },
    { label: "auth.pw.checkSpecial", passed: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ]

  const score = checks.filter((c) => c.passed).length

  let label = "auth.pw.veryWeak"
  let color = "bg-destructive"

  if (score >= 5) {
    label = "auth.pw.veryStrong"
    color = "bg-green-500"
  } else if (score >= 4) {
    label = "auth.pw.strong"
    color = "bg-green-400"
  } else if (score >= 3) {
    label = "auth.pw.medium"
    color = "bg-yellow-500"
  } else if (score >= 2) {
    label = "auth.pw.weak"
    color = "bg-orange-500"
  } else if (score >= 1) {
    label = "auth.pw.veryWeak"
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
  const { t } = useLanguage()
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
      setError(t("auth.error.invalidEmail"))
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
        setError(data.error || t("auth.error.sendCodeFailed"))
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
      setError(t("auth.error.sendCodeRetry"))
      setIsSendingCode(false)
      return false
    }
  }, [t])

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
      return { success: false, error: t("auth.error.verifyFailed") }
    }
  }, [t])

  const handleLogin = async (formData: FormData) => {
    setError(null)
    setIsLoading(true)

    const emailValue = formData.get("email") as string
    const passwordValue = formData.get("password") as string

    if (!isValidEmail(emailValue)) {
      setError(t("auth.error.invalidEmail"))
      setIsLoading(false)
      return
    }

    try {
      const result = await signIn.email({ email: emailValue, password: passwordValue })

      if (result.error) {
        setError(result.error.message || t("auth.error.loginFailed"))
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
      setError(t("auth.error.invalidEmail"))
      return
    }

    if (passwordValue !== confirmPasswordValue) {
      setError(t("auth.error.passwordMismatch"))
      return
    }

    if (passwordValue.length < 8) {
      setError(t("auth.error.passwordTooShort"))
      return
    }

    if (passwordStrength.score < 2) {
      setError(t("auth.error.passwordWeak"))
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
      setError(t("auth.error.codeRequired"))
      setIsLoading(false)
      return
    }

    // 验证验证码
    const verifyResult = await verifyEmailCode(email, verifyCode)
    if (!verifyResult.success) {
      setError(verifyResult.error || t("auth.error.codeWrong"))
      setIsLoading(false)
      return
    }

    // 验证成功，创建账户
    try {
      const result = await signUp.email({ email, password, name })

      if (result.error) {
        setError(result.error.message || t("auth.error.registerFailed"))
        setIsLoading(false)
        return
      }

      onOpenChange(false)
      router.refresh()
    } catch {
      setError(t("auth.error.registerRetry"))
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
      setError(t("auth.error.invalidEmail"))
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
      setError(t("auth.error.codeRequired"))
      setIsLoading(false)
      return
    }

    // 验证验证码
    const verifyResult = await verifyEmailCode(forgotEmail, verifyCode)
    if (!verifyResult.success) {
      setError(verifyResult.error || t("auth.error.codeWrong"))
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
        setError(data.error || t("auth.error.sendResetFailed"))
        setIsLoading(false)
        return
      }

      setForgotSuccess(true)
      setIsLoading(false)
    } catch {
      setError(t("auth.error.sendResetRetry"))
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
        return t("auth.loginTitle")
      case "register":
        return t("auth.registerTitle")
      case "register-verify":
        return t("auth.verifyEmailTitle")
      case "forgot-password":
        return t("auth.resetPasswordTitle")
      case "forgot-verify":
        return t("auth.verifyEmailTitle")
      default:
        return ""
    }
  }

  const getDescription = () => {
    switch (mode) {
      case "login":
        return t("auth.loginDesc")
      case "register":
        return t("auth.registerDesc")
      case "register-verify":
        return `${t("auth.verifyEmailDesc")} ${email}`
      case "forgot-password":
        return t("auth.forgotPasswordDesc")
      case "forgot-verify":
        return `${t("auth.verifyEmailDesc")} ${forgotEmail}`
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
              <Label htmlFor="login-email">{t("auth.email")}</Label>
              <Input
                id="login-email"
                name="email"
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                required
                disabled={isLoading}
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">{t("auth.password")}</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.passwordPlaceholder")}
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
              {t("auth.login")}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={switchToForgotPassword}
              >
                {t("auth.forgotPassword")}
              </button>
              <span className="text-muted-foreground">
                {t("auth.noAccount")}{" "}
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={switchToRegister}
                >
                  {t("auth.registerNow")}
                </button>
              </span>
            </div>
          </form>
        )}

        {mode === "register" && (
          <form key="register-form" action={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-name">{t("auth.name")}</Label>
              <Input
                id="register-name"
                name="name"
                type="text"
                placeholder={t("auth.namePlaceholder")}
                required
                disabled={isLoading}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-email">{t("auth.email")}</Label>
              <div className="relative">
                <Input
                  id="register-email"
                  name="email"
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
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
                <p className="text-xs text-destructive">{t("auth.error.invalidEmail")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-password">{t("auth.password")}</Label>
              <div className="relative">
                <Input
                  id="register-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.passwordPlaceholder")}
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
                      {t(passwordStrength.label)}
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
                          {t(check.label)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-confirm">{t("auth.confirmPassword")}</Label>
              <div className="relative">
                <Input
                  id="register-confirm"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t("auth.confirmPasswordPlaceholder")}
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
              {t("auth.sendCode")}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t("auth.hasAccount")}{" "}
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={switchToLogin}
              >
                {t("auth.loginNow")}
              </button>
            </p>
          </form>
        )}

        {mode === "register-verify" && (
          <div className="space-y-4">
            {devCode && (
              <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-3 text-sm text-cyan-600 dark:text-cyan-400">
                {t("auth.devCodePrefix")}<span className="font-mono font-bold">{devCode}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="verify-code">{t("auth.verifyCode")}</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="verify-code"
                    type="text"
                    placeholder={t("auth.verifyCodePlaceholder")}
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
                    t("auth.resend")
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
              {t("auth.completeRegistration")}
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
              {t("auth.goBack")}
            </Button>
          </div>
        )}

        {mode === "forgot-password" && (
          <form key="forgot-form" action={handleForgotPassword} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("auth.enterEmailDesc")}
            </p>
            <div className="space-y-2">
              <Label htmlFor="forgot-email">{t("auth.email")}</Label>
              <Input
                id="forgot-email"
                name="email"
                type="email"
                placeholder={t("auth.enterEmailPlaceholder")}
                required
                disabled={isLoading || isSendingCode}
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || isSendingCode}>
              {isSendingCode && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("auth.sendCode")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={switchToLogin}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("auth.backToLogin")}
            </Button>
          </form>
        )}

        {mode === "forgot-verify" && !forgotSuccess && (
          <div className="space-y-4">
            {devCode && (
              <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-3 text-sm text-cyan-600 dark:text-cyan-400">
                {t("auth.devCodePrefix")}<span className="font-mono font-bold">{devCode}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="forgot-verify-code">{t("auth.verifyCode")}</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="forgot-verify-code"
                    type="text"
                    placeholder={t("auth.verifyCodePlaceholder")}
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
                    t("auth.resend")
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
              {t("auth.verifyAndSendReset")}
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
              {t("auth.goBack")}
            </Button>
          </div>
        )}

        {mode === "forgot-verify" && forgotSuccess && (
          <div className="space-y-4 text-center">
            <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3 mx-auto w-fit">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-muted-foreground">
              {t("auth.resetLinkSent")}
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
              {t("auth.backToLogin")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}