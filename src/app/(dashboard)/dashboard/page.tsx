import { TrendingUp, Package, DollarSign, BarChart3, Sparkles, AlertTriangle, ChevronRight, MessageCircle, FileText, Settings } from "lucide-react"
import { PriceChart } from "@/components/price-chart"
import Link from "next/link"
import { getBackgroundImage } from "@/config/images"

export default function DashboardPage() {
  const bgImage = getBackgroundImage("dashboardBackground")

  return (
    <div className="min-h-screen relative overflow-hidden pb-24 bg-[#0a0a1a]">
      {/* 背景图片 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      {/* 背景遮罩层 */}
      <div className="absolute inset-0 bg-[#0a0a1a]/80 backdrop-blur-sm" />

      {/* 背景渐变和光晕效果 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 顶部紫色光晕 */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-600/20 blur-[120px] rounded-full" />
        {/* 右上角蓝色光晕 */}
        <div className="absolute top-20 right-0 w-[300px] h-[300px] bg-blue-500/15 blur-[100px] rounded-full" />
        {/* 左下角青色光晕 */}
        <div className="absolute bottom-40 left-0 w-[250px] h-[250px] bg-cyan-500/10 blur-[80px] rounded-full" />
        {/* 底部紫色光晕 */}
        <div className="absolute -bottom-20 right-1/3 w-[400px] h-[200px] bg-violet-600/15 blur-[100px] rounded-full" />

        {/* 网格背景 */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <div className="relative px-5 pt-8 space-y-6 max-w-lg mx-auto">
        {/* 核心指标卡片 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold">核心指标</h2>
            <Link href="/analytics" className="text-xs text-cyan-400 flex items-center gap-1 hover:text-cyan-300 transition-colors">
              查看更多 <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* 当前价格 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300 hover:bg-white/8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">当前价格</span>
                <DollarSign className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">950</span>
                <span className="text-xs text-slate-500">元/吨</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-rose-400" />
                <span className="text-xs text-rose-400">+3.2%</span>
              </div>
            </div>

            {/* 港口库存 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300 hover:bg-white/8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">港口库存</span>
                <Package className="h-4 w-4 text-violet-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">12.5</span>
                <span className="text-xs text-slate-500">万吨</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-emerald-400 rotate-180" />
                <span className="text-xs text-emerald-400">-5.2%</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI 建议卡片 */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-cyan-500/20 bg-linear-to-br from-cyan-500/10 via-blue-500/5 to-violet-500/10 backdrop-blur-sm">
          {/* 卡片内部光晕 */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-2xl rounded-full" />

          <div className="relative flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30">
              <Sparkles className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1">AI 采购建议</h3>
              <p className="text-slate-400 text-sm leading-relaxed">基于当前市场分析，建议适当增加库存，预计未来一周价格可能上涨 2-3%。</p>
              <Link href="/agent-chat" className="inline-flex items-center gap-1 mt-3 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                查看详细分析 <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* 价格趋势图 */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-white">价格趋势</span>
            </div>
            <div className="flex gap-1">
              <button className="px-2.5 py-1 text-xs rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors">日</button>
              <button className="px-2.5 py-1 text-xs rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors">周</button>
              <button className="px-2.5 py-1 text-xs rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">月</button>
            </div>
          </div>
          <div className="rounded-xl">
            <PriceChart />
          </div>
        </div>

        {/* 风险提示 */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <span className="text-sm font-medium text-white">风险监控</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 transition-colors">
              <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              <span className="text-xs text-rose-300">运费上涨风险</span>
              <span className="text-xs ml-auto px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">高</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs text-amber-300">库存下降风险</span>
              <span className="text-xs ml-auto px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">中</span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部浮动导航栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a1a]/95 backdrop-blur-xl border-t border-white/10 z-50">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-around">
            <Link href="/dashboard" className="flex flex-col items-center gap-1 group">
              <div className="p-2 rounded-xl bg-cyan-500/20 group-hover:bg-cyan-500/30 transition-colors">
                <BarChart3 className="h-5 w-5 text-cyan-400" />
              </div>
              <span className="text-xs text-cyan-400">首页</span>
            </Link>
            <Link href="/agent-chat" className="flex flex-col items-center gap-1 group">
              <div className="p-2 rounded-xl group-hover:bg-white/10 transition-colors">
                <MessageCircle className="h-5 w-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
              </div>
              <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">对话</span>
            </Link>
            <Link href="/reports" className="flex flex-col items-center gap-1 group">
              <div className="p-2 rounded-xl group-hover:bg-white/10 transition-colors">
                <FileText className="h-5 w-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
              </div>
              <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">报告</span>
            </Link>
            <Link href="/settings" className="flex flex-col items-center gap-1 group">
              <div className="p-2 rounded-xl group-hover:bg-white/10 transition-colors">
                <Settings className="h-5 w-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
              </div>
              <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">设置</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}