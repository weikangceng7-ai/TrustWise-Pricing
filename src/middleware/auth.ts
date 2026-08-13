import { Context, Next } from "hono"
import type { Hono } from "hono"
import { auth } from "@/lib/auth"

/**
 * 认证上下文类型
 */
export interface AuthContext {
  userId?: string
  isAuthenticated: boolean
}

/**
 * 认证中间件类型
 */
export type AuthMiddleware = Hono<{
  Variables: AuthContext
}>

/**
 * 从请求头中提取 session token
 */
function getSessionToken(c: Context): string | null {
  // 从 Cookie 中获取 Better Auth session token
  const cookieHeader = c.req.header("Cookie") || ""
  const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/)
  if (match) return match[1]

  // 备选：从 Authorization header 获取（用于 API client）
  const authHeader = c.req.header("Authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7)
  }

  return null
}

/**
 * 认证中间件
 * 验证 Better Auth session token 是否有效
 */
export const requireAuth = async (c: Context, next: Next) => {
  const token = getSessionToken(c)

  if (!token) {
    return c.json({ error: "Unauthorized - Missing authentication" }, 401)
  }

  try {
    const session = await auth.api.getSession({
      headers: new Headers({ Cookie: `better-auth.session_token=${token}` }),
    })

    if (!session?.user) {
      return c.json({ error: "Unauthorized - Invalid session" }, 401)
    }

    c.set("userId", session.user.id)
    c.set("isAuthenticated", true)

    return next()
  } catch (error) {
    console.error("[Auth Middleware] Session verification failed:", error)
    return c.json({ error: "Unauthorized - Session verification failed" }, 401)
  }
}

/**
 * 可选认证中间件
 * 不强制要求认证，但如果提供了有效 token 则设置用户信息
 */
export const optionalAuth = async (c: Context, next: Next) => {
  const token = getSessionToken(c)

  if (token) {
    try {
      const session = await auth.api.getSession({
        headers: new Headers({ Cookie: `better-auth.session_token=${token}` }),
      })

      if (session?.user) {
        c.set("userId", session.user.id)
        c.set("isAuthenticated", true)
        return next()
      }
    } catch {
      // 认证失败，继续作为未登录用户
    }
  }

  c.set("isAuthenticated", false)
  return next()
}
