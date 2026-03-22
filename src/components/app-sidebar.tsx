"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  MessageSquareText,
  FileText,
  Network,
} from "lucide-react"

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

const navItems = [
  {
    title: "仪表盘",
    url: "/dashboard",
    icon: LayoutDashboard,
    description: "数据概览与价格趋势",
  },
  {
    title: "价格预测知识图谱",
    url: "/yihua-code-graph",
    icon: Network,
    description: "市场资讯、企业经验、制度规则知识库",
  },
  {
    title: "Agent 决策助手",
    url: "/agent-chat",
    icon: MessageSquareText,
    description: "智能采购决策支持",
  },
  {
    title: "采购报告",
    url: "/reports",
    icon: FileText,
    description: "历史报告与数据分析",
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/dashboard" />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0a0a1a] to-[#1b263b] p-1">
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
                  </defs>
                  <g stroke="url(#sidebarLine)" strokeWidth="1.5" strokeLinecap="round">
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
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">硫磺价格预测</span>
                <span className="truncate text-xs text-muted-foreground">
                  决策辅助系统
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航菜单</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={pathname === item.url || pathname.startsWith(item.url + "/")}
                    tooltip={item.description}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" className="text-xs text-muted-foreground">
              <span>© 2024 Sulfur Agent</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
