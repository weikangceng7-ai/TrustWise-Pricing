import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// 公开路径（不需要登录）
const PUBLIC_PATHS = [
  "/",
  "/api/auth",
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
  "/api/chat",
  "/api/conversations",
  "/api/reports",
  "/api/notifications",
]

// 检查路径是否匹配
function isPathMatch(pathname: string, paths: string[]): boolean {
  return paths.some((p) => pathname.startsWith(p) || pathname === p)
}

// 从 cookie 获取 session token
function getSessionToken(request: NextRequest): string | null {
  // better-auth 默认使用 "better-auth.session_token" cookie
  const sessionToken = request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("session_token")?.value
  return sessionToken || null
}

// 验证 session 并获取用户信息
async function verifySession(sessionToken: string): Promise<{
  valid: boolean
  user?: {
    id: string
    email: string
    role: string
  }
}> {
  try {
    // 调用内部 API 验证 session
    const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000"
    const response = await fetch(`${baseUrl}/api/auth/get-session`, {
      method: "GET",
      headers: {
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    })

    if (!response.ok) {
      return { valid: false }
    }

    const data = await response.json()

    if (data.user) {
      return {
        valid: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role || "user",
        },
      }
    }

    return { valid: false }
  } catch (error) {
    console.error("[Middleware] Session verification failed:", error)
    return { valid: false }
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 静态资源直接放行
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public") ||
    pathname.includes(".") // 文件扩展名
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
      // API 请求返回 401
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Unauthorized", message: "请先登录" },
          { status: 401 }
        )
      }
      // 页面请求重定向到首页并显示登录框
      const url = request.nextUrl.clone()
      url.pathname = "/"
      url.searchParams.set("auth", "login")
      url.searchParams.set("redirect", pathname)
      return NextResponse.redirect(url)
    }

    // 验证 session
    const session = await verifySession(sessionToken)
    if (!session.valid) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Unauthorized", message: "会话已过期，请重新登录" },
          { status: 401 }
        )
      }
      const url = request.nextUrl.clone()
      url.pathname = "/"
      url.searchParams.set("auth", "login")
      return NextResponse.redirect(url)
    }

    // 将用户信息添加到请求头
    const response = NextResponse.next()
    response.headers.set("x-user-id", session.user!.id)
    response.headers.set("x-user-email", session.user!.email)
    response.headers.set("x-user-role", session.user!.role)
    return response
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

    const session = await verifySession(sessionToken)
    if (!session.valid || session.user?.role !== "admin") {
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

    const response = NextResponse.next()
    response.headers.set("x-user-id", session.user.id)
    response.headers.set("x-user-email", session.user.email)
    response.headers.set("x-user-role", session.user.role)
    return response
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