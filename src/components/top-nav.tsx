"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { UserDropdown } from "@/components/user-dropdown"
import { NotificationPanel } from "@/components/notification-panel"

export function TopNav() {
  const { setTheme, resolvedTheme, mounted } = useTheme()

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  // Use a default icon during SSR to avoid hydration mismatch
  const ThemeIcon = !mounted ? Sun : (resolvedTheme === "dark" ? Moon : Sun)
  const themeTitle = !mounted ? "切换主题" : (resolvedTheme === "dark" ? "切换浅色模式" : "切换深色模式")

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-slate-200 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 px-4 backdrop-blur-xl supports-backdrop-filter:bg-white/60 dark:supports-backdrop-filter:bg-slate-900/60">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-32 bg-cyan-500/10 dark:bg-cyan-500/10 blur-3xl rounded-full" />
        <div className="absolute top-0 right-1/4 w-64 h-32 bg-violet-500/10 dark:bg-violet-500/10 blur-3xl rounded-full" />
      </div>

      {/* Mobile menu trigger & Sidebar toggle */}
      <SidebarTrigger className="-ml-1" />

      {/* Page title area */}
      <div className="flex-1 flex items-center gap-4 relative">
        <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 dark:from-[#0a0a1a] to-slate-200 dark:to-[#1b263b] p-1.5 border border-slate-200 dark:border-slate-700/50 shadow-lg shadow-cyan-500/10 dark:shadow-cyan-500/10 group hover:shadow-cyan-500/20 transition-all duration-300">
          <svg viewBox="0 0 32 32" className="size-full">
            <defs>
              <linearGradient id="topNavCenter" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24"/>
                <stop offset="100%" stopColor="#f59e0b"/>
              </linearGradient>
              <linearGradient id="topNavLine" x1="0%" y1="0%" x2="100%" y2="100%">
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
            <g stroke="url(#topNavLine)" strokeWidth="1.5" strokeLinecap="round" filter="url(#glow)">
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
            <circle cx="16" cy="16" r="5" fill="url(#topNavCenter)"/>
            <text x="16" y="19" fontFamily="Arial" fontSize="6.5" fontWeight="bold" fill="#0a0a1a" textAnchor="middle">S</text>
          </svg>
        </div>
        <div className="space-y-0.5">
          <h1 className="text-lg font-semibold bg-linear-to-r from-slate-900 dark:from-white to-slate-600 dark:to-slate-300 bg-clip-text text-transparent">
            硫磺价格预测与决策辅助系统
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-px w-12 bg-linear-to-r from-cyan-500 to-transparent" />
            <span className="text-xs text-slate-500 dark:text-slate-500">Powered by AI</span>
          </div>
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2 relative">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all duration-300"
          title={themeTitle}
        >
          <ThemeIcon className="h-4.5 w-4.5" />
          <span className="sr-only">切换主题</span>
        </Button>

        {/* Notifications */}
        <NotificationPanel />

        {/* User menu */}
        <UserDropdown />
      </div>
    </header>
  )
}
