import { Context, Next } from "hono"
import type { Hono } from "hono"

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
 * 认证中间件
 * 检查请求是否包含有效的认证信息
 *
 * 注意：这是一个示例实现，实际使用时需要：
 * 1. 集成真实的认证系统（如 JWT、Session 等）
 * 2. 从请求中提取用户信息
 * 3. 验证用户权限
 */
// Hono v4 中 Context 泛型是 <Env, Schema>，Variables 通过 c.set() 设置
export const requireAuth = async (c: Context, next: Next) => {
  // 从请求中获取认证信息
  // 示例：从 Authorization header 获取 token
  const authHeader = c.req.header("Authorization")

  if (!authHeader) {
    return c.json({ error: "Unauthorized - Missing authentication" }, 401)
  }

  // 验证 token（这里使用简化逻辑，实际应该验证 JWT 或 Session）
  const token = authHeader.replace("Bearer ", "")

  // TODO: 实际项目中应该：
  // 1. 验证 JWT token 签名
  // 2. 从 token 中提取用户信息
  // 3. 检查用户是否有效

  // 临时：允许任何非空 token 通过（仅用于开发）
  if (!token) {
    return c.json({ error: "Unauthorized - Invalid token" }, 401)
  }

  // 设置用户上下文
  c.set("userId", "temp-user-id") // 临时用户 ID，实际应从 token 解析
  c.set("isAuthenticated", true)

  return next()
}

/**
 * 可选认证中间件
 * 不强制要求认证，但如果提供了有效 token 则设置用户信息
 */
// Hono v4 中 Context 泛型是 <Env, Schema>，Variables 通过 c.set() 设置
export const optionalAuth = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization")

  if (authHeader) {
    const token = authHeader.replace("Bearer ", "")

    if (token) {
      c.set("userId", "temp-user-id")
      c.set("isAuthenticated", true)
    }
  } else {
    c.set("isAuthenticated", false)
  }

  return next()
}
