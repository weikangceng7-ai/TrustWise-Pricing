"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PRICING_PLANS, type PricingPlan } from "@/lib/pricing"
import { Check, Loader2, ArrowLeft, ArrowRight } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

function PricingContent() {
  const router = useRouter()
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const success = searchParams.get("success")
  const cancelled = searchParams.get("cancelled")

  async function handleSubscribe(plan: PricingPlan) {
    setLoadingPlan(plan.id)
    setError(null)

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      })

      const data = await res.json()

      if (data.success && data.data.url) {
        window.location.href = data.data.url
      } else if (data.error === "请先登录") {
        router.push("/login?redirect=/pricing")
      } else {
        setError(data.error || "创建订单失败")
      }
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-4">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>
      </div>

      <div className="container mx-auto px-4 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">选择适合你的方案</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            所有方案均包含 14 天免费试用期，无需信用卡。随时可以升级或取消。
          </p>
        </div>

        {success && (
          <div className="max-w-md mx-auto mb-8 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4 text-center">
            <p className="text-green-700 dark:text-green-300 font-medium">支付成功！配额已自动到账。</p>
            <Button className="mt-2" onClick={() => router.push("/dashboard")}>
              进入控制台
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
        {cancelled && (
          <div className="max-w-md mx-auto mb-8 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30 p-4 text-center">
            <p className="text-yellow-700 dark:text-yellow-300">支付已取消，如需帮助请联系客服。</p>
          </div>
        )}
        {error && (
          <div className="max-w-md mx-auto mb-8 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-4 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <Button variant="ghost" size="sm" className="mt-1" onClick={() => setError(null)}>
              关闭
            </Button>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PRICING_PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${
                plan.highlighted
                  ? "border-cyan-500 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500"
                  : ""
              }`}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 hover:bg-cyan-600">
                  推荐
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="mb-6">
                  <span className="text-4xl font-bold">¥{plan.price}</span>
                  <span className="text-muted-foreground ml-1">/月</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  onClick={() => handleSubscribe(plan)}
                  disabled={loadingPlan === plan.id}
                >
                  {loadingPlan === plan.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {plan.id === "enterprise" ? "联系我们" : "立即订阅"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>企业版或定制需求，请联系：sales@sulfur-agent.com</p>
          <p className="mt-2">
            也支持银行转账（对公），联系客服获取对公账户信息。
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <PricingContent />
    </Suspense>
  )
}
