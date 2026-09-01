"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signUp } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2, Key, Copy, Check, ArrowRight } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

export function RegisterClient() {
  const router = useRouter()
  const { t } = useLanguage()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("密码长度至少为 6 位")
      setIsLoading(false)
      return
    }

    try {
      const result = await signUp.email({
        email,
        password,
        name,
      })

      if (result.error) {
        setError(result.error.message || "注册失败，请稍后重试")
        setIsLoading(false)
        return
      }

      // 注册成功后，创建默认 API Key
      try {
        const keyRes = await fetch("/api/api-keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "默认 API Key" }),
        })
        const keyData = await keyRes.json()
        if (keyData.success && keyData.data?.key?.key) {
          setApiKey(keyData.data.key.key)
          setShowApiKey(true)
        }
      } catch (keyError) {
        console.error("创建 API Key 失败:", keyError)
      }

      setIsLoading(false)
    } catch {
      setError("注册失败，请稍后重试")
      setIsLoading(false)
    }
  }

  async function copyApiKey() {
    if (!apiKey) return
    await navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function goToDashboard() {
    router.push("/dashboard")
    router.refresh()
  }

  // 显示 API Key 成功页面
  if (showApiKey && apiKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
              <Key className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardTitle className="text-2xl text-emerald-600 dark:text-emerald-400">注册成功！</CardTitle>
            <CardDescription>您的 API Key 已创建，可用于调用预测服务</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                请保存您的 API Key（仅显示一次）
              </p>
              <div className="flex items-center gap-2">
                <code className="bg-white dark:bg-slate-800 px-3 py-2 rounded text-sm font-mono flex-1 break-all">
                  {apiKey}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyApiKey}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">使用方式：</p>
              <div className="space-y-2 text-slate-600 dark:text-slate-400">
                <p><strong>服务地址：</strong> <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">https://sulfur-agent-web.vercel.app/api/v1</code></p>
                <p><strong>认证方式：</strong> 请求头携带 <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">Authorization: Bearer {apiKey.slice(0, 10)}...</code></p>
              </div>
            </div>

            <div className="text-center">
              <Link href="/api-console" className="text-sm text-cyan-600 dark:text-cyan-400 hover:underline">
                查看完整 API 文档 →
              </Link>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={goToDashboard} className="w-full">
              进入控制台
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">创建账户</CardTitle>
          <CardDescription>注册以使用硫磺督价与采购智能决策系统</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="请输入姓名"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="请输入邮箱"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="请输入密码（至少6位）"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              注册并获取 API Key
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              已有账户？{" "}
              <Link
                href="/login"
                className="text-primary underline-offset-4 hover:underline"
              >
                立即登录
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}