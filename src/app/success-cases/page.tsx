"use client"

import { useEffect, useState, useRef } from "react"
import {
  ArrowRight,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
  Shield,
  ChevronRight,
  BarChart3,
  Building2,
  Award,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/contexts/language-context"

// 自定义 hook: 检测元素是否在视口内
function useInView(options = {}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsInView(true)
      },
      { threshold: 0.15, ...options }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, isInView }
}

function AnimatedNumber({ value, suffix = "", duration = 2000 }: { value: string; suffix?: string; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(() => {
    const numMatch = value.match(/^(\d+\.?\d*)/)
    return numMatch ? "0" : value
  })
  const { ref, isInView } = useInView()

  useEffect(() => {
    if (!isInView) return
    const numMatch = value.match(/^(\d+\.?\d*)/)
    if (!numMatch) return
    const targetNum = parseFloat(numMatch[1])
    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeProgress = 1 - Math.pow(2, -10 * progress)
      const currentNum = targetNum * easeProgress
      if (progress < 1) {
        setDisplayValue(currentNum.toFixed(targetNum % 1 === 0 ? 0 : 1) + suffix)
        requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
      }
    }
    animate()
  }, [isInView, value, suffix, duration])

  return <span ref={ref}>{displayValue}</span>
}

interface CaseStudy {
  logo: string
  name: string
  industry: string
  subtitle: string
  challenge: string
  solution: string
  results: Array<{ label: string; value: string }>
  highlight: string
  color: "cyan" | "violet" | "amber"
}

const COLORS = {
  cyan: {
    gradient: "from-cyan-500 to-blue-600",
    bg: "bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-500/10 dark:to-blue-500/10",
    border: "border-cyan-200/50 dark:border-cyan-500/20",
    text: "text-cyan-600 dark:text-cyan-400",
    icon: "bg-cyan-100 dark:bg-cyan-500/20",
    badge: "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300",
  },
  violet: {
    gradient: "from-violet-500 to-purple-600",
    bg: "bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10",
    border: "border-violet-200/50 dark:border-violet-500/20",
    text: "text-violet-600 dark:text-violet-400",
    icon: "bg-violet-100 dark:bg-violet-500/20",
    badge: "bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300",
  },
  amber: {
    gradient: "from-amber-500 to-orange-600",
    bg: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10",
    border: "border-amber-200/50 dark:border-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    icon: "bg-amber-100 dark:bg-amber-500/20",
    badge: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300",
  },
}

const CASE_STUDIES: CaseStudy[] = [
  {
    logo: "HX",
    name: "HX集团",
    industry: "磷化工",
    subtitle: "华中地区大型磷化工企业",
    challenge: "年硫磺采购量120万吨，价格波动导致采购成本不可控。传统依赖人工经验判断，缺乏数据支撑，采购时机经常错失。",
    solution: "部署 SulfurAI 智能预测与决策系统，利用 Hybrid ARIMA + XGBoost 模型进行7-30天价格预测，结合知识图谱进行企业个性化因子权重分析，输出最优采购时机和数量建议。",
    results: [
      { label: "采购成本降低", value: "12%" },
      { label: "年节约金额", value: "约3,000万元" },
      { label: "决策周期缩短", value: "7天→2天" },
      { label: "预测准确率", value: "96.5%" },
    ],
    highlight: "年节约采购成本约3,000万元，投资回报率超过500%",
    color: "cyan",
  },
  {
    logo: "HY",
    name: "HY集团",
    industry: "化肥制造",
    subtitle: "华北地区大型化工企业",
    challenge: "分析团队5人，每天需手动整理港口库存、国际报价、运费等数十个数据源。人工分析效率低，响应市场变化滞后，难以支撑快速决策。",
    solution: "接入 SulfurAI Tracker 自动追踪系统 + Agent 决策助手，实现多源数据自动聚合、智能预警推送、定制化采购报告一键生成。分析师从数据整理转向策略制定。",
    results: [
      { label: "分析效率提升", value: "70%" },
      { label: "人力节省", value: "3人" },
      { label: "预警提前量", value: "48小时" },
      { label: "报告生成时间", value: "3天→10分钟" },
    ],
    highlight: "AI 替代70%重复劳动，团队聚焦高价值决策",
    color: "violet",
  },
  {
    logo: "TC",
    name: "TC集团",
    industry: "复合肥",
    subtitle: "华东地区大型复合肥企业",
    challenge: "多品类原料（硫磺、磷矿、钾肥）采购协同困难，各品类独立决策导致库存成本高、资金占用大。需要统一平台进行多品类协调。",
    solution: "部署 SulfurAI 多维度价格分析模块 + 库存优化引擎，通过 AI Agent 对多品类进行联合预测和协同优化，自动生成综合采购策略，平衡各品类采购节奏。",
    results: [
      { label: "库存周转率提升", value: "25%" },
      { label: "综合采购成本降低", value: "8%" },
      { label: "资金占用量优化", value: "15%" },
      { label: "多品类覆盖", value: "3大类" },
    ],
    highlight: "多品类协同采购，库存周转率和资金效率双提升",
    color: "amber",
  },
]

function CaseStudyCard({ study, idx }: { study: CaseStudy; idx: number }) {
  const c = COLORS[study.color]
  const isEven = idx % 2 === 0
  const { ref, isInView } = useInView()

  return (
    <div
      ref={ref}
      className={`mb-12 last:mb-0 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
    >
      <div className={`rounded-2xl ${c.bg} ${c.border} border overflow-hidden`}>
        <div className="grid md:grid-cols-5">
          {/* 左侧企业信息 */}
          <div className={`p-8 md:p-10 flex flex-col justify-center ${isEven ? "md:order-1" : "md:order-2"}`}>
            <div className={`w-16 h-16 rounded-2xl ${c.icon} flex items-center justify-center mb-4`}>
              <span className={`text-2xl font-bold ${c.text}`}>{study.logo}</span>
            </div>
            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${c.badge} inline-block w-fit mb-3`}>
              {study.industry}
            </span>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{study.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{study.subtitle}</p>
            <div className={`inline-flex items-center gap-1.5 text-lg font-semibold ${c.text}`}>
              {study.highlight}
            </div>
          </div>

          {/* 右侧详情 */}
          <div className={`p-8 md:p-10 bg-white/60 dark:bg-slate-800/40 md:col-span-3 flex flex-col justify-center ${isEven ? "md:order-2" : "md:order-1"}`}>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-rose-500" />
                  挑战
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{study.challenge}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  解决方案
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{study.solution}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
              {study.results.map((r, i) => (
                <div key={i} className="text-center">
                  <div className={`text-lg font-bold ${c.text}`}>{r.value}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{r.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ stat }: { stat: { value: string; label: string; icon: React.ReactNode } }) {
  const { ref, isInView } = useInView()
  return (
    <div
      ref={ref}
      className={`text-center transition-all duration-600 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-cyan-600 mb-4 shadow-xl shadow-cyan-500/30">
        <div className="text-white">{stat.icon}</div>
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
        {isInView ? <AnimatedNumber value={stat.value} duration={2000} /> : stat.value}
      </div>
      <div className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</div>
    </div>
  )
}

export default function SuccessCasesPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 overflow-x-hidden">
      {/* Hero */}
      <section className="relative py-32 px-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-cyan-500/15 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[100px]" />
        </div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />

        {/* Nav */}
        <div className="absolute top-0 left-0 right-0 z-20">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-500 to-cyan-600 flex items-center justify-center">
                <BarChart3 className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-white font-semibold text-lg">SulfurAI</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-slate-400 hover:text-white text-sm">首页</Link>
              <Link href="/register" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold hover:shadow-xl hover:shadow-cyan-500/30 transition-all">预约演示</Link>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
            <Award className="h-4 w-4 text-cyan-400" />
            <span className="text-sm text-cyan-300 font-medium">客户成功案例</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-5 tracking-tight">
            见证化工企业如何通过 AI
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              实现采购数字化转型
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-4">
            已服务 100+ 化工企业，覆盖磷化工、化肥制造、复合肥等多个细分领域，助力客户实现显著的成本节约与效率提升。
          </p>
          <p className="text-xs text-slate-500 max-w-2xl mx-auto mb-8">
            * 本页为产品演示示例，案例与数据均为模拟场景，企业名称已匿名化处理，不代表真实客户合作情况。
          </p>
          <div className="flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-cyan-400" />
              <span className="text-slate-400"><strong className="text-white">100+</strong> 服务企业</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-cyan-400" />
              <span className="text-slate-400"><strong className="text-white">95%+</strong> 预测准确率</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span className="text-slate-400"><strong className="text-white">10年+</strong> 行业经验</span>
            </div>
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="relative py-20 px-6 bg-gradient-to-b from-slate-100 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-5xl mx-auto">
          {CASE_STUDIES.map((study, idx) => (
            <CaseStudyCard key={idx} study={study} idx={idx} />
          ))}
        </div>
      </section>

      {/* Summary Stats */}
      <section className="relative py-16 px-6 bg-gradient-to-r from-slate-100 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "3,000万+", label: "累计为客户节约采购成本（年）", icon: <TrendingUp className="h-6 w-6" /> },
              { value: "95%+", label: "客户续约率", icon: <Shield className="h-6 w-6" /> },
              { value: "96.2%", label: "平均预测准确率", icon: <Target className="h-6 w-6" /> },
              { value: "50+", label: "日均智能决策建议", icon: <Zap className="h-6 w-6" /> },
            ].map((stat, idx) => (
              <StatCard key={idx} stat={stat} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 px-6 bg-gradient-to-b from-white to-slate-100 dark:from-slate-800 dark:to-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-100/50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 mb-6">
            <Sparkles className="h-4 w-4 text-cyan-500" />
            <span className="text-sm text-cyan-600 dark:text-cyan-400 font-medium">开始智能采购之旅</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
            准备好让 AI 驱动您的采购决策？
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
            立即预约演示，了解 SulfurAI 如何为您的企业量身定制采购决策解决方案。
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-600 text-white text-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/30 transition-all"
            >
              预约演示
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              进入系统
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-slate-950 border-t border-slate-800">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <span className="text-white font-semibold">SulfurAI</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-slate-400 hover:text-white text-sm">首页</Link>
            <Link href="/login" className="text-slate-400 hover:text-white text-sm">登录</Link>
            <Link href="/register" className="text-slate-400 hover:text-white text-sm">注册</Link>
          </div>
          <div className="text-slate-500 text-sm">© 2026 SulfurAI. All rights reserved.</div>
        </div>
      </footer>
    </main>
  )
}
