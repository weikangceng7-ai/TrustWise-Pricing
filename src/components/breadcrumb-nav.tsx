"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"

// 路径到中文名称的映射表
const PATH_NAME_MAP: Record<string, string> = {
  dashboard: "仪表盘",
  "agent-chat": "智能对话",
  enterprises: "企业分析",
  "enterprise-manage": "企业管理",
  reports: "报告中心",
  "market-analysis": "市场分析",
  tracker: "市场追踪",
  alerts: "异动预警",
  subscriptions: "订阅管理",
  commodities: "品种对比",
  accuracy: "精度分析",
  "api-console": "API 控制台",
  "yihua-code-graph": "知识图谱",
  "success-cases": "成功案例",
  document: "产品文档",
  settings: "系统设置",
}

function getSegmentLabel(segment: string): string {
  // 企业代码路径（如 /enterprises/yihua）→ 企业名称
  if (/^[a-z]+$/i.test(segment)) return segment.toUpperCase()
  return PATH_NAME_MAP[segment] || segment
}

export function BreadcrumbNav() {
  const pathname = usePathname()
  if (!pathname || pathname === "/") return null

  const segments = pathname.split("/").filter(Boolean)

  // 不在 dashboard 路径下不显示
  if (!segments.includes("dashboard") && !segments.some((s) => PATH_NAME_MAP[s])) {
    return null
  }

  return (
    <nav aria-label="面包屑导航" className="flex items-center gap-1.5 text-sm text-muted-foreground px-1 py-2">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only">首页</span>
      </Link>

      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`
        const isLast = index === segments.length - 1
        const label = getSegmentLabel(segment)

        return (
          <span key={href} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
