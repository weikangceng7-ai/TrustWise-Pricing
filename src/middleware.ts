import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// 公开路径（不需要登录）
const PUBLIC_PATHS = [
  "/",
  "/api/auth",
  "/api/stripe/webhook",
  "/pricing",
  "/privacy",
  "/terms",
  "/api/health",
  "/reset-password",
]

// 仅管理员路径
const ADMIN_PATHS = [
  "/admin",
  "/api/admin",
]

// 仅登录用户路径
const PROTECTED_PATHS = [
  "/dashboard",
  "/agent-chat",
  "/market-analysis",
  "/api/chat",
  "/api/conversations",
  "/api/reports",
  "/api/notifications",
  "/api/prices",
  "/api/inventory",
  "/api/prediction",
  "/api/enterprises",
  "/api/neo4j",
  "/api/supply-demand",
  "/api/multi-dimensional-prices",
  "/api/data-collection",
  "/api/external-data",
  "/api/enterprise-predictions",
  "/api/api-keys",
  "/api/stripe/checkout",
  "/enterprise-manage",
  "/enterprises",
  "/commodities",
  "/reports",
  "/document",
  "/tracker",
  "/success-cases",
  "/yihua-code-graph",
]

// 检查路径是否匹配
function isPathMatch(pathname: string, paths: string[]): boolean {
  return paths.some((p) => pathname.startsWith(p) || pathname === p)
}

// 从 cookie 获取 session token
function getSessionToken(request: NextRequest): string | null {
  return request.cookies.get("better-auth.session_token")?.value
    || request.cookies.get("session_token")?.value
    || null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 静态资源直接放行
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // 公开路径直接放行
  if (isPathMatch(pathname, PUBLIC_PATHS)) {
    return NextResponse.next()
  }

  // 获取 session token
  const sessionToken = getSessionToken(request)

  // 未登录用户访问受保护路径
  if (isPathMatch(pathname, PROTECTED_PATHS)) {
    if (!sessionToken) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Unauthorized", message: "请先登录" },
          { status: 401 }
        )
      }
      const url = request.nextUrl.clone()
      url.pathname = "/"
      url.searchParams.set("auth", "login")
      url.searchParams.set("redirect", pathname)
      return NextResponse.redirect(url)
    }

    // Cookie 存在则放行，实际鉴权由各 API 路由通过 auth.api.getSession() 自行完成
    return NextResponse.next()
  }

  // 管理员路径检查
  if (isPathMatch(pathname, ADMIN_PATHS)) {
    if (!sessionToken) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Forbidden", message: "需要管理员权限" },
          { status: 403 }
        )
      }
      const url = request.nextUrl.clone()
      url.pathname = "/"
      url.searchParams.set("error", "forbidden")
      return NextResponse.redirect(url)
    }
    // Cookie 存在则放行，管理员权限由各 API 路由自行验证
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (网站图标)
     * - public 文件夹
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
