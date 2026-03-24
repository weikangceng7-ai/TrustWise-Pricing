"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react"

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

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const passwordStrength = getPasswordStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError("重置链接无效")
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
      setError("密码强度不足，请至少满足 2 项要求")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "重置密码失败")
        setIsLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push("/?auth=login")
      }, 2000)
    } catch {
      setError("重置密码失败，请稍后重试")
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-md w-full mx-4 p-8 rounded-2xl bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 shadow-2xl">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
              <X className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">链接无效</h1>
            <p className="text-slate-400">
              密码重置链接无效或已过期，请重新申请。
            </p>
            <Button
              onClick={() => router.push("/?auth=login")}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              返回登录
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-md w-full mx-4 p-8 rounded-2xl bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 shadow-2xl">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">密码重置成功</h1>
            <p className="text-slate-400">
              您的密码已成功重置，即将跳转到登录页面...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-md w-full mx-4 p-8 rounded-2xl bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">重置密码</h1>
          <p className="text-slate-400 mt-2">请输入您的新密码</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300">新密码</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="请输入新密码"
                required
                disabled={isLoading}
                className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* 密码强度指示器 */}
            {password && (
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full transition-all ${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-12">
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {passwordStrength.checks.map((check, i) => (
                    <div key={i} className="flex items-center gap-1">
                      {check.passed ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <X className="h-3 w-3 text-slate-500" />
                      )}
                      <span className={check.passed ? "text-green-400" : "text-slate-500"}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-slate-300">确认密码</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="请再次输入新密码"
                required
                disabled={isLoading}
                className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-400">两次输入的密码不一致</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            重置密码
          </Button>
        </form>
      </div>
    </div>
  )
}