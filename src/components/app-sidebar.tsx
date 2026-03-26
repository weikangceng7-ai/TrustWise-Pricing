"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  MessageSquareText,
  FileText,
  Network,
  Sparkles,
  ChevronRight,
  Building2,
  ChevronDown,
} from "lucide-react"
import { useState } from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

// 颜色样式映射 - 解决 Tailwind JIT 无法检测动态类名的问题
const COLOR_STYLES: Record<string, {
  bg: string
  border: string
  shadow: string
  text: string
  glow: string
}> = {
  cyan: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    shadow: "shadow-cyan-500/10",
    text: "text-cyan-400",
    glow: "bg-cyan-400/30",
  },
  violet: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    shadow: "shadow-violet-500/10",
    text: "text-violet-400",
    glow: "bg-violet-400/30",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    shadow: "shadow-amber-500/10",
    text: "text-amber-400",
    glow: "bg-amber-400/30",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    shadow: "shadow-emerald-500/10",
    text: "text-emerald-400",
    glow: "bg-emerald-400/30",
  },
}

const navItems = [
  {
    title: "仪表盘",
    url: "/dashboard",
    icon: LayoutDashboard,
    description: "数据概览与价格趋势",
    color: "cyan",
  },
  {
    title: "价格预测知识图谱",
    url: "/yihua-code-graph",
    icon: Network,
    description: "市场资讯、企业经验、制度规则知识库",
    color: "violet",
  },
  {
    title: "Agent 决策助手",
    url: "/agent-chat",
    icon: MessageSquareText,
    description: "智能采购决策支持",
    color: "amber",
  },
  {
    title: "采购报告单",
    url: "/reports",
    icon: FileText,
    description: "历史报告与数据分析",
    color: "emerald",
  },
]

// 企业导航配置
const enterpriseItems = [
  {
    title: "湖北宜化集团",
    url: "/enterprise/yihua",
    code: "yihua",
    description: "硫磺产能约120万吨/年",
    color: "cyan",
  },
  {
    title: "鲁西化工集团",
    url: "/enterprise/luxi",
    code: "luxi",
    description: "山东大型化工企业",
    color: "violet",
  },
  {
    title: "金正大生态工程",
    url: "/enterprise/jinzhengda",
    code: "jinzhengda",
    description: "化肥行业龙头",
    color: "amber",
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [enterprisesOpen, setEnterprisesOpen] = useState(true)
  const isEnterpriseActive = pathname.startsWith("/enterprise/")

  return (
    <Sidebar collapsible="icon">
      {/* Sidebar Header */}
      <SidebarHeader className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-cyan-500/5 via-transparent to-transparent" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/dashboard" />}
              className="relative hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all duration-300"
            >
              <div className="relative flex aspect-square size-8 items-center justify-center rounded-xl bg-linear-to-br from-slate-100 dark:from-[#0a0a1a] to-slate-200 dark:to-[#1b263b] p-1.5 border border-slate-200 dark:border-slate-700/50 shadow-lg group hover:shadow-cyan-500/20 transition-all duration-300">
                <svg viewBox="0 0 32 32" className="size-full">
                  <defs>
                    <linearGradient id="sidebarCenter" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fbbf24"/>
                      <stop offset="100%" stopColor="#f59e0b"/>
                    </linearGradient>
                    <linearGradient id="sidebarLine" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00d4ff"/>
                      <stop offset="100%" stopColor="#a855f7"/>
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <g stroke="url(#sidebarLine)" strokeWidth="1.5" strokeLinecap="round" filter="url(#glow)">
                    <line x1="16" y1="16" x2="16" y2="5"/>
                    <line x1="16" y1="16" x2="26" y2="10"/>
                    <line x1="16" y1="16" x2="26" y2="22"/>
                    <line x1="16" y1="16" x2="16" y2="27"/>
                    <line x1="16" y1="16" x2="6" y2="22"/>
                    <line x1="16" y1="16" x2="6" y2="10"/>
                  </g>
                  <polygon points="16,5 26,10 26,22 16,27 6,22 6,10" fill="none" stroke="#00d4ff" strokeWidth="0.5" opacity="0.4"/>
                  <circle cx="16" cy="5" r="2" fill="#00d4ff"/>
                  <circle cx="26" cy="10" r="1.8" fill="#a855f7"/>
                  <circle cx="26" cy="22" r="1.8" fill="#22d3ee"/>
                  <circle cx="16" cy="27" r="2" fill="#00d4ff"/>
                  <circle cx="6" cy="22" r="1.8" fill="#a855f7"/>
                  <circle cx="6" cy="10" r="1.8" fill="#22d3ee"/>
                  <circle cx="16" cy="16" r="5" fill="url(#sidebarCenter)"/>
                  <text x="16" y="19" fontFamily="Arial" fontSize="6.5" fontWeight="bold" fill="#0a0a1a" textAnchor="middle">S</text>
                </svg>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight relative">
                <span className="truncate font-semibold text-slate-900 dark:text-white">硫磺价格预测</span>
                <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                  决策辅助系统
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Sidebar Content */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide uppercase px-2">
            导航菜单
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.url || pathname.startsWith(item.url + "/")
                const styles = COLOR_STYLES[item.color]
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      isActive={isActive}
                      tooltip={item.description}
                      className={`group relative transition-all duration-300 ${
                        isActive
                          ? `${styles.bg} ${styles.border} shadow-lg ${styles.shadow}`
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 border-transparent'
                      }`}
                    >
                      <div className="relative">
                        {isActive ? (
                          <div className={`absolute inset-0 ${styles.glow} blur-lg`} />
                        ) : null}
                        <item.icon className={`relative size-4.5 ${isActive ? styles.text : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors'}`} />
                      </div>
                      <span className={`font-medium ${isActive ? styles.text : 'text-slate-700 dark:text-slate-300'}`}>{item.title}</span>
                      <ChevronRight className={`ml-auto size-3.5 transition-transform duration-300 ${
                        isActive ? 'rotate-90 opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`} />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 企业导航 */}
        <SidebarGroup>
          <button
            onClick={() => setEnterprisesOpen(!enterprisesOpen)}
            className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide uppercase hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <span>企业价格分析</span>
            <ChevronDown className={`size-3.5 transition-transform duration-200 ${enterprisesOpen ? 'rotate-0' : '-rotate-90'}`} />
          </button>
          {enterprisesOpen && (
            <SidebarGroupContent>
              <SidebarMenu>
                {enterpriseItems.map((item) => {
                  const isActive = pathname === item.url
                  const styles = COLOR_STYLES[item.color]
                  return (
                    <SidebarMenuItem key={item.code}>
                      <SidebarMenuButton
                        render={<Link href={item.url} />}
                        isActive={isActive}
                        tooltip={item.description}
                        className={`group relative transition-all duration-300 ${
                          isActive
                            ? `${styles.bg} ${styles.border} shadow-lg ${styles.shadow}`
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 border-transparent'
                        }`}
                      >
                        <div className="relative">
                          {isActive ? (
                            <div className={`absolute inset-0 ${styles.glow} blur-lg`} />
                          ) : null}
                          <Building2 className={`relative size-4.5 ${isActive ? styles.text : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors'}`} />
                        </div>
                        <span className={`font-medium ${isActive ? styles.text : 'text-slate-700 dark:text-slate-300'}`}>{item.title}</span>
                        <ChevronRight className={`ml-auto size-3.5 transition-transform duration-300 ${
                          isActive ? 'rotate-90 opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`} />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>
      </SidebarContent>

      {/* Sidebar Footer */}
      <SidebarFooter className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-t from-violet-500/5 via-transparent to-transparent" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all duration-300">
              <div className="flex items-center gap-2">
                <Sparkles className="size-3" />
                <span>© 2024 Sulfur Agent</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
