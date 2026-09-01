"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

// 路径到翻译 key 的映射表
const PATH_KEY_MAP: Record<string, string> = {
  dashboard: "breadcrumb.dashboard",
  "agent-chat": "breadcrumb.agentChat",
  enterprises: "breadcrumb.enterprises",
  "enterprise-manage": "breadcrumb.enterpriseManage",
  reports: "breadcrumb.reports",
  "market-analysis": "breadcrumb.marketAnalysis",
  tracker: "breadcrumb.tracker",
  alerts: "breadcrumb.alerts",
  subscriptions: "breadcrumb.subscriptions",
  commodities: "breadcrumb.commodities",
  accuracy: "breadcrumb.accuracy",
  "api-console": "breadcrumb.apiConsole",
  "yihua-code-graph": "breadcrumb.knowledgeGraph",
  "success-cases": "breadcrumb.successCases",
  document: "breadcrumb.document",
  settings: "breadcrumb.settings",
  "supply-chain": "breadcrumb.supplyChain",
  decisions: "breadcrumb.decisions",
}

export function BreadcrumbNav() {
  const pathname = usePathname()
  const { t } = useLanguage()
  if (!pathname || pathname === "/") return null

  const segments = pathname.split("/").filter(Boolean)

  // 不在 dashboard 路径下不显示
  if (!segments.includes("dashboard") && !segments.some((s) => PATH_KEY_MAP[s])) {
    return null
  }

  function getSegmentLabel(segment: string): string {
    // 企业代码路径（如 /enterprises/yihua）→ 企业名称
    if (/^[a-z]+$/i.test(segment)) return segment.toUpperCase()
    const key = PATH_KEY_MAP[segment]
    return key ? t(key) : segment
  }

  return (
    <nav aria-label={t("breadcrumb.nav")} className="flex items-center gap-1.5 text-sm text-muted-foreground px-1 py-2">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only">{t("breadcrumb.home")}</span>
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
