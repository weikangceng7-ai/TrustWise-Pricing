"use client"

import { useEffect, useState, useRef } from "react"
import {
  BarChart3,
  ArrowRight,
  Sparkles,
  Target,
  Users,
  Database,
  Activity,
  LineChart,
  Brain,
  FileText,
  CheckCircle2,
  Play,
  Menu,
  X,
  TrendingUp,
  Zap,
  Shield,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Home as HomeIcon,
  Network
} from "lucide-react"
import Link from "next/link"

// 自定义 hook: 检测元素是否在视口内
function useInView(options = {}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
        }
      },
      { threshold: 0.15, ...options }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [options])

  return { ref, isInView }
}

// 动态粒子背景
function ParticleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* 大光球 - 带发光效果 */}
      <div className="absolute w-16 h-16 bg-cyan-400/40 rounded-full animate-particle-1 blur-xl shadow-[0_0_60px_20px_rgba(6,182,212,0.3)]" />
      <div className="absolute w-20 h-20 bg-blue-500/35 rounded-full animate-particle-2 blur-xl shadow-[0_0_80px_25px_rgba(59,130,246,0.25)]" />
      <div className="absolute w-24 h-24 bg-violet-500/30 rounded-full animate-particle-3 blur-2xl shadow-[0_0_100px_30px_rgba(139,92,246,0.2)]" />
      <div className="absolute w-18 h-18 bg-cyan-300/45 rounded-full animate-particle-4 blur-xl shadow-[0_0_70px_22px_rgba(103,232,249,0.35)]" />
      <div className="absolute w-14 h-14 bg-emerald-400/40 rounded-full animate-particle-5 blur-lg shadow-[0_0_50px_15px_rgba(52,211,153,0.3)]" />

      {/* 中等粒子 */}
      <div className="absolute w-8 h-8 bg-cyan-400/50 rounded-full animate-particle-6 blur-md shadow-[0_0_30px_10px_rgba(6,182,212,0.4)]" />
      <div className="absolute w-10 h-10 bg-blue-400/45 rounded-full animate-particle-7 blur-md shadow-[0_0_40px_12px_rgba(96,165,250,0.35)]" />
      <div className="absolute w-6 h-6 bg-violet-400/55 rounded-full animate-particle-8 blur-md shadow-[0_0_25px_8px_rgba(167,139,250,0.4)]" />

      {/* 小光点 - 高亮 */}
      <div className="absolute w-3 h-3 bg-white/60 rounded-full animate-particle-1 blur-sm shadow-[0_0_15px_5px_rgba(255,255,255,0.5)]" style={{ animationDelay: '1s' }} />
      <div className="absolute w-4 h-4 bg-cyan-200/70 rounded-full animate-particle-3 blur-sm shadow-[0_0_20px_6px_rgba(165,243,252,0.6)]" style={{ animationDelay: '3s' }} />
      <div className="absolute w-2 h-2 bg-blue-200/80 rounded-full animate-particle-5 blur-sm shadow-[0_0_10px_3px_rgba(191,219,254,0.7)]" style={{ animationDelay: '5s' }} />

      {/* 流星效果 - 更大更亮 */}
      <div className="absolute w-80 h-1 bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent animate-meteor-1 blur-sm shadow-[0_0_20px_5px_rgba(6,182,212,0.5)]" />
      <div className="absolute w-120 h-1.5 bg-gradient-to-r from-transparent via-blue-400/70 to-transparent animate-meteor-2 blur-sm shadow-[0_0_25px_6px_rgba(96,165,250,0.4)]" />
      <div className="absolute w-60 h-0.5 bg-gradient-to-r from-transparent via-violet-400/60 to-transparent animate-meteor-1 blur-sm" style={{ animationDelay: '4s' }} />
      <div className="absolute w-100 h-1 bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent animate-meteor-2 blur-sm" style={{ animationDelay: '7s' }} />
    </div>
  )
}

// 动态图表动画组件
function AnimatedChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    let time = 0

    const draw = () => {
      time += 0.015
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 绘制网格
      ctx.strokeStyle = "rgba(6, 182, 212, 0.08)"
      ctx.lineWidth = 1
      for (let i = 0; i < 25; i++) {
        ctx.beginPath()
        ctx.moveTo(i * 25, 0)
        ctx.lineTo(i * 25, canvas.height)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, i * 25)
        ctx.lineTo(canvas.width, i * 25)
        ctx.stroke()
      }

      // 绘制多条价格曲线
      const curves = [
        { color: "rgba(6, 182, 212, 0.8)", amplitude: 50, speed: 1, offset: 0 },
        { color: "rgba(139, 92, 246, 0.5)", amplitude: 30, speed: 0.7, offset: 2 },
        { color: "rgba(34, 197, 94, 0.4)", amplitude: 20, speed: 0.5, offset: 4 },
      ]

      curves.forEach((curve, idx) => {
        ctx.strokeStyle = curve.color
        ctx.lineWidth = idx === 0 ? 3 : 2
        ctx.beginPath()
        for (let x = 0; x < canvas.width; x++) {
          const y = canvas.height / 2 +
            Math.sin((x / 50) + time * curve.speed + curve.offset) * curve.amplitude +
            Math.sin((x / 25) + time * curve.speed * 1.5) * (curve.amplitude * 0.3)
          if (x === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.stroke()
      })

      // 绘制主曲线渐变填充
      const gradient = ctx.createLinearGradient(0, canvas.height / 2 - 80, 0, canvas.height)
      gradient.addColorStop(0, "rgba(6, 182, 212, 0.25)")
      gradient.addColorStop(0.5, "rgba(6, 182, 212, 0.1)")
      gradient.addColorStop(1, "rgba(6, 182, 212, 0)")
      ctx.fillStyle = gradient
      ctx.beginPath()
      for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height / 2 + Math.sin((x / 50) + time) * 50 + Math.sin((x / 25) + time * 1.5) * 15
        if (x === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.lineTo(canvas.width, canvas.height)
      ctx.lineTo(0, canvas.height)
      ctx.closePath()
      ctx.fill()

      // 绘制动态数据点
      for (let i = 0; i < 6; i++) {
        const x = (i + 0.5) * 50
        const y = canvas.height / 2 + Math.sin((x / 50) + time) * 50 + Math.sin((x / 25) + time * 1.5) * 15

        // 外圈发光
        ctx.fillStyle = "rgba(6, 182, 212, 0.3)"
        ctx.beginPath()
        ctx.arc(x, y, 8, 0, Math.PI * 2)
        ctx.fill()

        // 内圈
        ctx.fillStyle = "rgba(6, 182, 212, 1)"
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fill()
      }

      animationId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={280}
      className="w-full h-auto"
    />
  )
}

// 数字计数动画组件
function AnimatedNumber({ value, suffix = "", duration = 2000 }: { value: string; suffix?: string; duration?: number }) {
  const [displayValue, setDisplayValue] = useState("0")
  const { ref, isInView } = useInView()

  useEffect(() => {
    if (!isInView) return

    const numMatch = value.match(/^(\d+\.?\d*)/)
    if (!numMatch) {
      setDisplayValue(value)
      return
    }

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

// 顶部导航栏
function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "bg-slate-900/98 backdrop-blur-xl border-b border-slate-700/50 shadow-xl shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-500 to-cyan-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg group-hover:shadow-cyan-500/40">
              <BarChart3 className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-white font-semibold text-lg tracking-tight transition-colors group-hover:text-cyan-400">
              SulfurAI
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="relative text-slate-400 hover:text-white transition-colors text-sm font-medium group">
              <span>功能</span>
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 group-hover:w-full" />
            </Link>
            <Link href="#about" className="relative text-slate-400 hover:text-white transition-colors text-sm font-medium group">
              <span>关于</span>
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 group-hover:w-full" />
            </Link>
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-slate-400 hover:text-white transition-colors text-sm font-medium px-4 py-2 hover:bg-white/5 rounded-lg flex items-center gap-1.5"
            >
              <BarChart3 className="h-4 w-4" />
              进入仪表盘
            </Link>
            <Link
              href="/login"
              className="text-slate-400 hover:text-white transition-colors text-sm font-medium px-4 py-2 hover:bg-white/5 rounded-lg"
            >
              登录
            </Link>
            <Link
              href="/register"
              className="relative px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold overflow-hidden group hover:shadow-xl hover:shadow-cyan-500/30 transition-all duration-300"
            >
              <span className="relative z-10">免费试用</span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${isMobileMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="py-4 border-t border-slate-700/50">
            <div className="flex flex-col gap-2">
              <Link href="#features" className="text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm py-2.5 px-3 rounded-lg">
                功能
              </Link>
              <Link href="#about" className="text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm py-2.5 px-3 rounded-lg">
                关于
              </Link>
              <Link href="/login" className="text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm py-2.5 px-3 rounded-lg">
                登录
              </Link>
              <Link
                href="/register"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold text-center mt-2"
              >
                免费试用
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

// Hero 区域组件
function HeroSection() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 150)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* 动态背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        {/* 主光晕 - 带动画 */}
        <div
          className={`absolute top-1/4 left-1/3 w-[700px] h-[700px] rounded-full transition-all duration-1500 ease-out ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
          style={{
            background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, rgba(6,182,212,0.05) 40%, transparent 70%)',
            filter: 'blur(60px)',
            animation: 'pulse-glow 4s ease-in-out infinite'
          }}
        />

        {/* 次光晕 */}
        <div
          className={`absolute top-1/2 right-1/4 w-[500px] h-[500px] rounded-full transition-all duration-1500 delay-200 ease-out ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.03) 50%, transparent 70%)',
            filter: 'blur(80px)'
          }}
        />

        {/* 底部光晕 */}
        <div
          className={`absolute -bottom-20 left-1/2 w-[900px] h-[400px] rounded-full transition-all duration-1500 delay-400 ease-out ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
          style={{
            background: 'radial-gradient(ellipse, rgba(34,197,94,0.08) 0%, transparent 60%)',
            filter: 'blur(100px)'
          }}
        />

        {/* 动态网格 */}
        <div
          className="absolute inset-0 opacity-[0.04] transition-opacity duration-1000"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />

        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-slate-900/30" />

        {/* 粒子背景 */}
        <ParticleBackground />
      </div>

      {/* 内容 */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* 左侧文字 */}
          <div className="text-left">
            {/* 标签 */}
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 mb-8 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            >
              <Sparkles className="h-4 w-4 text-cyan-400 animate-pulse" />
              <span className="text-sm text-cyan-300 font-medium tracking-wide">AI 驱动的智能决策</span>
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            </div>

            {/* 主标题 */}
            <div className={`transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-2 tracking-tight leading-[1.1]">
                智能硫磺价格
              </h1>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 tracking-tight leading-[1.1]">
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent animate-gradient">
                  预测系统
                </span>
              </h1>
            </div>

            {/* 副标题 */}
            <p
              className={`text-xl text-slate-400 mb-10 max-w-lg leading-relaxed transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
            >
              基于 AI 的市场价格分析与采购决策支持平台，
              为化工企业提供精准的价格预测与智能采购建议。
            </p>

            {/* CTA */}
            <div
              className={`flex items-center gap-5 mb-12 transition-all duration-700 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
            >
              <Link
                href="/register"
                className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-600 text-white text-lg font-semibold overflow-hidden shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300"
              >
                <span className="relative z-10 flex items-center gap-2">
                  开始免费试用
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </Link>
              <Link
                href="#features"
                className="group px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-lg font-semibold hover:bg-white/10 hover:border-white/20 transition-all duration-300 flex items-center gap-2"
              >
                <Play className="h-5 w-5" />
                了解更多
              </Link>
            </div>

            {/* 数据卡片 */}
            <div
              className={`flex flex-wrap items-center gap-8 transition-all duration-700 delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
            >
              <div className="flex items-center gap-2 group cursor-default">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 group-hover:border-cyan-500/50 transition-colors">
                  <CheckCircle2 className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <div className="text-sm text-slate-400">预测准确率</div>
                  <div className="text-lg font-bold text-white">95%+</div>
                </div>
              </div>
              <div className="flex items-center gap-2 group cursor-default">
                <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 group-hover:border-violet-500/50 transition-colors">
                  <Users className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <div className="text-sm text-slate-400">服务企业</div>
                  <div className="text-lg font-bold text-white">100+</div>
                </div>
              </div>
              <div className="flex items-center gap-2 group cursor-default">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 group-hover:border-emerald-500/50 transition-colors">
                  <Database className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm text-slate-400">历史数据</div>
                  <div className="text-lg font-bold text-white">10年+</div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧动画展示 */}
          <div
            className={`relative hidden lg:block transition-all duration-1000 delay-400 ${isLoaded ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-20 scale-90'}`}
          >
            <div className="relative p-8 rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700/50 backdrop-blur-xl hover:border-cyan-500/30 transition-colors duration-300 shadow-2xl shadow-black/40">
              {/* 标题栏 */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-red-500 to-red-600 animate-pulse shadow-lg shadow-red-500/30" />
                  <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500" />
                  <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-green-500 to-green-600" />
                </div>
                <span className="text-xs text-slate-500 font-medium px-3 py-1 rounded-lg bg-slate-700/50">实时价格预测</span>
              </div>

              {/* 动态图表 */}
              <AnimatedChart />

              {/* 底部统计 */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-700/50">
                <div className="group hover:scale-105 transition-transform cursor-default">
                  <div className="text-xs text-slate-500 mb-2">当前价格</div>
                  <div className="text-xl font-bold text-white">¥1,850</div>
                  <div className="text-xs text-slate-400 mt-1">/吨</div>
                </div>
                <div className="group hover:scale-105 transition-transform cursor-default">
                  <div className="text-xs text-slate-500 mb-2">7日预测</div>
                  <div className="text-xl font-bold text-cyan-400 flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    +3.2%
                  </div>
                </div>
                <div className="group hover:scale-105 transition-transform cursor-default">
                  <div className="text-xs text-slate-500 mb-2">置信度</div>
                  <div className="text-xl font-bold text-emerald-400">96%</div>
                </div>
              </div>
            </div>

            {/* 浮动标签 */}
            <div className="absolute -top-5 -right-5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white text-sm font-semibold shadow-xl shadow-emerald-500/40 animate-bounce-slow flex items-center gap-2">
              <Zap className="h-4 w-4" />
              AI 实时分析
            </div>

            {/* 装饰元素 */}
            <div className="absolute -bottom-4 -left-4 w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 animate-ping shadow-lg shadow-cyan-500/50" />
            <div className="absolute top-1/2 -right-6 w-4 h-4 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  )
}

// 功能特性区域
function FeaturesSection() {
  const { ref: sectionRef, isInView } = useInView()

  const features = [
    {
      icon: <LineChart className="h-7 w-7" />,
      title: "智能价格预测",
      description: "融合深度学习模型，结合多维度市场数据，实现精准的短期与中长期价格预测",
      color: "from-cyan-500 via-blue-500 to-cyan-600",
      delay: 100,
      tags: ["深度学习", "多维度分析"]
    },
    {
      icon: <Brain className="h-7 w-7" />,
      title: "AI 决策助手",
      description: "基于大语言模型的智能对话系统，随时解答市场疑问、提供采购建议",
      color: "from-violet-500 via-purple-500 to-violet-600",
      delay: 200,
      tags: ["LLM", "智能对话"]
    },
    {
      icon: <BarChart3 className="h-7 w-7" />,
      title: "知识图谱引擎",
      description: "可视化呈现价格与供需、成本、政策等因素的复杂关联关系",
      color: "from-blue-500 via-indigo-500 to-blue-600",
      delay: 300,
      tags: ["可视化", "关联分析"]
    },
    {
      icon: <FileText className="h-7 w-7" />,
      title: "自动化报告",
      description: "一键生成专业采购决策报告，包含价格预测、风险评估、采购策略",
      color: "from-amber-500 via-orange-500 to-amber-600",
      delay: 400,
      tags: ["一键生成", "专业报告"]
    }
  ]

  return (
    <section ref={sectionRef} id="features" className="relative py-28 px-6 bg-gradient-to-b from-slate-100 to-white dark:from-slate-900 dark:to-slate-800 overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-[100px]" />

      <div className="max-w-6xl mx-auto relative">
        {/* 标题 */}
        <div className={`text-center mb-20 transition-all duration-800 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-200/50 dark:bg-slate-700/50 mb-6">
            <Zap className="h-4 w-4 text-cyan-500" />
            <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">核心能力</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-5 tracking-tight">
            四大智能模块
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            从数据采集到决策输出，全链路 AI 驱动的价格预测与采购决策支持
          </p>
        </div>

        {/* 功能卡片 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group relative p-8 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/50 overflow-hidden transition-all duration-700 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
              style={{ transitionDelay: isInView ? `${feature.delay}ms` : '0ms' }}
            >
              {/* 背景发光效果 */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

              {/* 图标 */}
              <div className={`relative p-4 rounded-2xl bg-gradient-to-br ${feature.color} mb-6 inline-block shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                <div className="text-white drop-shadow-lg">{feature.icon}</div>
              </div>

              {/* 内容 */}
              <h3 className="relative text-xl font-bold text-slate-900 dark:text-white mb-4 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                {feature.title}
              </h3>
              <p className="relative text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
                {feature.description}
              </p>

              {/* 标签 */}
              <div className="relative flex gap-2">
                {feature.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className={`px-3 py-1 rounded-lg text-xs font-medium bg-gradient-to-r ${feature.color} bg-opacity-10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600`}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* 悬停边框发光 */}
              <div className={`absolute inset-0 rounded-2xl border-2 border-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-30 transition-opacity duration-500`} />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={`text-center mt-16 transition-all duration-800 delay-600 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-600 text-white text-lg font-semibold hover:from-cyan-400 hover:via-blue-400 hover:to-cyan-500 transition-all shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105"
          >
            立即体验全部功能
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

// 统计数据区域
function StatsSection() {
  const { ref: sectionRef, isInView } = useInView()

  const stats = [
    { value: "95.2%", label: "预测准确率", icon: <Target className="h-6 w-6" />, delay: 100, desc: "基于历史验证" },
    { value: "100+", label: "服务企业", icon: <Users className="h-6 w-6" />, delay: 200, desc: "化工行业龙头" },
    { value: "10年+", label: "历史数据", icon: <Database className="h-6 w-6" />, delay: 300, desc: "全球市场覆盖" },
    { value: "24/7", label: "实时监控", icon: <Activity className="h-6 w-6" />, delay: 400, desc: "全天候预警" }
  ]

  return (
    <section ref={sectionRef} className="relative py-20 px-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* 背景光效 */}
      <div className="absolute top-1/2 left-0 w-[500px] h-[300px] bg-cyan-500/10 rounded-full blur-[150px]" />
      <div className="absolute top-1/2 right-0 w-[500px] h-[300px] bg-violet-500/10 rounded-full blur-[150px]" />

      <div className="max-w-5xl mx-auto relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`group relative text-center p-8 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-800/30 border border-slate-700/30 hover:border-cyan-500/30 transition-all duration-700 overflow-hidden ${isInView ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-90'}`}
              style={{ transitionDelay: isInView ? `${stat.delay}ms` : '0ms' }}
            >
              {/* 背景发光 */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* 图标 */}
              <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-cyan-600 mb-5 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shadow-xl shadow-cyan-500/30">
                <div className="text-white">{stat.icon}</div>
              </div>

              {/* 数值 */}
              <div className="relative text-3xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                {isInView ? <AnimatedNumber value={stat.value} duration={2000} /> : stat.value}
              </div>

              {/* 标签 */}
              <div className="relative text-base text-slate-400 mb-1 group-hover:text-slate-300 transition-colors">{stat.label}</div>

              {/* 描述 */}
              <div className="relative text-xs text-slate-500">{stat.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// 关于区域
function AboutSection() {
  const { ref: sectionRef, isInView } = useInView()

  const benefits = [
    { text: "降低采购成本 8-15%", icon: <TrendingUp className="h-5 w-5" />, delay: 100 },
    { text: "分析效率提升 70%", icon: <Zap className="h-5 w-5" />, delay: 200 },
    { text: "提前预警价格波动", icon: <Shield className="h-5 w-5" />, delay: 300 },
    { text: "数据驱动决策", icon: <Activity className="h-5 w-5" />, delay: 400 }
  ]

  return (
    <section ref={sectionRef} id="about" className="relative py-28 px-6 bg-gradient-to-b from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute top-1/4 right-0 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[100px]" />

      <div className="max-w-6xl mx-auto relative">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* 左侧 */}
          <div className={`transition-all duration-800 ${isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-16'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-100/50 dark:bg-cyan-500/10 mb-6">
              <CheckCircle2 className="h-4 w-4 text-cyan-500" />
              <span className="text-sm text-cyan-600 dark:text-cyan-400 font-medium">核心价值</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
              为什么选择我们
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
              我们结合深度学习算法、大语言模型和知识图谱技术，
              为化工行业提供前所未有的价格预测精度和决策支持能力。
            </p>

            <div className="space-y-5">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-4 transition-all duration-600 ${isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
                  style={{ transitionDelay: isInView ? `${benefit.delay}ms` : '0ms' }}
                >
                  <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-500/20 dark:to-blue-500/20 group-hover:from-cyan-200 group-hover:to-blue-200 transition-colors">
                    <div className="text-cyan-600 dark:text-cyan-400">{benefit.icon}</div>
                  </div>
                  <span className="text-lg text-slate-700 dark:text-slate-300 font-medium">{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧 */}
          <div
            className={`relative transition-all duration-800 delay-300 ${isInView ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-16 scale-95'}`}
          >
            <div className="relative p-10 rounded-3xl bg-gradient-to-br from-cyan-50/80 via-blue-50/50 to-violet-50/80 dark:from-cyan-900/30 dark:via-blue-900/20 dark:to-violet-900/30 border-2 border-cyan-200/50 dark:border-cyan-500/20 hover:border-cyan-400/50 dark:hover:border-cyan-500/40 transition-colors shadow-xl">
              {/* 背景发光 */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-[60px]" />

              <h3 className="relative text-2xl font-bold text-slate-900 dark:text-white mb-5">
                开始智能采购之旅
              </h3>
              <p className="relative text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                立即注册，获取免费试用体验，
                让 AI 为您的采购决策保驾护航。
              </p>

              <div className="relative flex flex-col sm:flex-row gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-600 text-white text-lg font-semibold hover:from-cyan-400 hover:via-blue-400 hover:to-cyan-500 transition-all shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105"
                >
                  免费注册
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-lg font-semibold hover:bg-white dark:hover:bg-slate-700 transition-all"
                >
                  已有账号？登录
                </Link>
              </div>

              {/* 装饰 */}
              <div className="absolute -bottom-6 -left-6 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 animate-ping opacity-60" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// 页脚
function Footer() {
  const { ref: sectionRef, isInView } = useInView()

  return (
    <footer ref={sectionRef} className="py-12 px-6 bg-slate-950 border-t border-slate-800">
      <div className="max-w-5xl mx-auto">
        <div className={`flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-600 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-lg shadow-cyan-500/30">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <span className="text-white font-semibold text-lg group-hover:text-cyan-400 transition-colors">SulfurAI</span>
          </Link>

          <div className="flex items-center gap-8">
            <Link href="/login" className="text-slate-400 hover:text-white hover:scale-105 transition-all text-sm font-medium">
              登录
            </Link>
            <Link href="/register" className="text-slate-400 hover:text-white hover:scale-105 transition-all text-sm font-medium">
              注册
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 hover:from-cyan-500/30 hover:to-blue-500/30 hover:scale-105 transition-all text-sm font-semibold border border-cyan-500/30 hover:border-cyan-500/50"
            >
              进入系统
            </Link>
          </div>

          <div className="text-slate-500 text-sm">
            © 2024 SulfurAI. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}

// 右下角快速页面导航 - 静态配置
const QUICK_NAV_PAGES = [
  {
    title: "首页",
    icon: HomeIcon,
    href: "/",
    description: "产品介绍与功能展示",
    color: "cyan"
  },
  {
    title: "仪表盘",
    icon: BarChart3,
    href: "/dashboard",
    description: "市场概览与价格走势",
    color: "violet"
  },
  {
    title: "知识图谱",
    icon: Network,
    href: "/yihua-code-graph",
    description: "价格知识图谱可视化",
    color: "amber"
  },
  {
    title: "HX集团",
    icon: TrendingUp,
    href: "/enterprise/yihua",
    description: "硫磺产能约120万吨/年",
    color: "cyan"
  },
  {
    title: "HY集团",
    icon: TrendingUp,
    href: "/enterprise/luxi",
    description: "华北地区大型化工企业",
    color: "violet"
  },
  {
    title: "TC集团",
    icon: TrendingUp,
    href: "/enterprise/jinzhengda",
    description: "化肥行业龙头",
    color: "amber"
  },
  {
    title: "AI对话",
    icon: Sparkles,
    href: "/agent-chat",
    description: "智能问答助手",
    color: "rose"
  },
  {
    title: "决策报告",
    icon: FileText,
    href: "/reports",
    description: "采购决策报告",
    color: "blue"
  },
]

const QUICK_NAV_COLOR_CLASSES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  cyan: { bg: "bg-cyan-100 dark:bg-cyan-500/20", border: "border-cyan-300 dark:border-cyan-500/30", text: "text-cyan-600 dark:text-cyan-400", badge: "bg-cyan-500" },
  violet: { bg: "bg-violet-100 dark:bg-violet-500/20", border: "border-violet-300 dark:border-violet-500/30", text: "text-violet-600 dark:text-violet-400", badge: "bg-violet-500" },
  amber: { bg: "bg-amber-100 dark:bg-amber-500/20", border: "border-amber-300 dark:border-amber-500/30", text: "text-amber-600 dark:text-amber-400", badge: "bg-amber-500" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-500/20", border: "border-emerald-300 dark:border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-500" },
  rose: { bg: "bg-rose-100 dark:bg-rose-500/20", border: "border-rose-300 dark:border-rose-500/30", text: "text-rose-600 dark:text-rose-400", badge: "bg-rose-500" },
  blue: { bg: "bg-blue-100 dark:bg-blue-500/20", border: "border-blue-300 dark:border-blue-500/30", text: "text-blue-600 dark:text-blue-400", badge: "bg-blue-500" },
}

function QuickPageNavigator() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const touchStartY = useRef(0)
  const touchEndY = useRef(0)

  const pagesLength = QUICK_NAV_PAGES.length

  // 自动轮播
  useEffect(() => {
    if (!isAutoPlaying || isExpanded) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % pagesLength)
    }, 5000)
    return () => clearInterval(timer)
  }, [isAutoPlaying, isExpanded, pagesLength])

  const goToPrev = () => {
    setIsAutoPlaying(false)
    setCurrentIndex((prev) => (prev - 1 + pagesLength) % pagesLength)
  }

  const goToNext = () => {
    setIsAutoPlaying(false)
    setCurrentIndex((prev) => (prev + 1) % pagesLength)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.touches[0].clientY
  }

  const handleTouchEnd = () => {
    const diff = touchStartY.current - touchEndY.current
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToPrev()
      } else {
        goToNext()
      }
    }
  }

  const currentPage = QUICK_NAV_PAGES[currentIndex]
  const colors = QUICK_NAV_COLOR_CLASSES[currentPage.color] || QUICK_NAV_COLOR_CLASSES.cyan
  const IconComponent = currentPage.icon

  return (
    <div
      className="fixed bottom-6 right-4 z-50"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* 主卡片 */}
      <div
        className={`relative transition-all duration-300 ${isExpanded ? 'w-64' : 'w-48'}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-xl border ${colors.border} overflow-hidden`}>
          {/* 当前页面展示 */}
          <Link
            href={currentPage.href || "#"}
            className={`block p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
                <IconComponent className={`h-4 w-4 ${colors.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-semibold ${colors.text} truncate`}>{currentPage.title}</h3>
                  <span className={`px-1.5 py-0.5 rounded text-xs text-white ${colors.badge}`}>{currentIndex + 1}/{pagesLength}</span>
                </div>
                {isExpanded && currentPage.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{currentPage.description}</p>
                )}
              </div>
            </div>
          </Link>

          {/* 导航控制 */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-200/50 dark:border-slate-700/50">
            <button
              onClick={goToPrev}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </button>

            {/* 页面指示器 */}
            <div className="flex items-center gap-1">
              {QUICK_NAV_PAGES.map((page, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setIsAutoPlaying(false)
                    setCurrentIndex(idx)
                  }}
                  className={`transition-all rounded-full ${
                    idx === currentIndex
                      ? `w-5 h-2 ${colors.badge}`
                      : "w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500"
                  }`}
                  title={page.title}
                />
              ))}
            </div>

            <button
              onClick={goToNext}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRightIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* 进度指示线 */}
        <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${colors.badge} transition-all duration-1000 ease-linear`}
            style={{ width: isAutoPlaying ? `${((currentIndex + 1) / pagesLength) * 100}%` : '100%' }}
          />
        </div>
      </div>
    </div>
  )
}

// 首页主组件
export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <AboutSection />
      <Footer />
      {/* 右下角快速页面导航 */}
      <QuickPageNavigator />
    </main>
  )
}