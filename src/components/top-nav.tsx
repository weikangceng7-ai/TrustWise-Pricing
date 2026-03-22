"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { UserDropdown } from "@/components/user-dropdown"
import { NotificationPanel } from "@/components/notification-panel"

export function TopNav() {
  const { setTheme, resolvedTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
      {/* Mobile menu trigger & Sidebar toggle */}
      <SidebarTrigger className="-ml-1" />

      {/* Page title area */}
      <div className="flex-1 flex items-center gap-3">
        <div className="flex aspect-square size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#0a0a1a] to-[#1b263b] p-1">
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
            </defs>
            <g stroke="url(#topNavLine)" strokeWidth="1.5" strokeLinecap="round">
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
        <h1 className="text-lg font-semibold">硫磺价格预测与决策辅助系统</h1>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-8 w-8"
          title={resolvedTheme === "dark" ? "切换浅色模式" : "切换深色模式"}
        >
          {resolvedTheme === "dark" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
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
