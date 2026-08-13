import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"
import { NextResponse, NextRequest } from "next/server"
import { checkAuthRateLimit } from "@/lib/auth-rate-limit"

const handler = toNextJsHandler(auth)

export async function GET(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        session: null,
        user: null,
        error: "数据库未配置",
      })
    }
    return handler.GET(request)
  } catch (error) {
    console.error("[Auth API] GET 请求失败:", error)
    return NextResponse.json(
      { session: null, user: null, error: "认证服务异常" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        session: null,
        user: null,
        error: "数据库未配置",
      })
    }

    // 登录/注册接口限流
    const url = new URL(request.url)
    const isLogin = url.pathname.includes("/sign-in")
    const isRegister = url.pathname.includes("/sign-up")

    if (isLogin || isRegister) {
      const action = isLogin ? "login" : "register"
      const rateLimit = await checkAuthRateLimit(request, action)

      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: `请求过于频繁，请在 ${rateLimit.retryAfter} 秒后重试` },
          {
            status: 429,
            headers: { "Retry-After": String(rateLimit.retryAfter) },
          }
        )
      }
    }

    return handler.POST(request)
  } catch (error) {
    console.error("[Auth API] POST 请求失败:", error)
    return NextResponse.json(
      { session: null, user: null, error: "认证服务异常" },
      { status: 500 }
    )
  }
}
