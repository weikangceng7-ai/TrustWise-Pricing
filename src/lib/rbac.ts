import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/auth"

/**
 * RBAC 中间件
 * 用于检查用户是否有访问特定资源的权限
 */
export async function withRBAC(
  request: NextRequest,
  resource: string,
  action: string,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // 获取会话
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    // 检查权限
    const userRole = (session.user as { role?: string }).role || "user"
    if (!hasPermission(userRole, resource, action)) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 })
    }

    return handler()
  } catch (error) {
    console.error("[RBAC] 权限检查失败:", error)
    return NextResponse.json({ error: "认证失败" }, { status: 401 })
  }
}

/**
 * 检查用户是否为管理员
 */
export async function isAdmin(request: NextRequest): Promise<boolean> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) return false

    const userRole = (session.user as { role?: string }).role || "user"
    return userRole === "admin"
  } catch {
    return false
  }
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    return session?.user || null
  } catch {
    return null
  }
}

/**
 * 要求用户登录的中间件
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ success: true; userId: string } | { success: false; response: NextResponse }> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return {
        success: false,
        response: NextResponse.json({ error: "请先登录" }, { status: 401 }),
      }
    }

    return { success: true, userId: session.user.id }
  } catch (error) {
    return {
      success: false,
      response: NextResponse.json({ error: "认证失败" }, { status: 401 }),
    }
  }
}

/**
 * 要求特定角色的中间件
 */
export async function requireRole(
  request: NextRequest,
  requiredRole: string | string[]
): Promise<{ success: true; userId: string } | { success: false; response: NextResponse }> {
  const authResult = await requireAuth(request)

  if (!authResult.success) {
    return authResult
  }

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    const userRole = (session?.user as { role?: string }).role || "user"
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

    if (!roles.includes(userRole)) {
      return {
        success: false,
        response: NextResponse.json({ error: "权限不足" }, { status: 403 }),
      }
    }

    return { success: true, userId: authResult.userId }
  } catch (error) {
    return {
      success: false,
      response: NextResponse.json({ error: "权限检查失败" }, { status: 500 }),
    }
  }
}