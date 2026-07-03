// src/lib/api-middleware.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { validateApiKey, updateApiKeyLastUsed } from "./api-auth"
import { decrementQuota, calculateRemainingQuota } from "./api-quota"
import { logApiUsage } from "@/services/api-usage"
import { checkRateLimit } from "./rate-limit"
import type { ApiKey, ApiQuota } from "@/db/schema"

/**
 * API 错误响应格式
 */
interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    quota?: { free: number; paid: number }
  }
}

/**
 * API 成功响应格式
 */
interface ApiSuccessResponse<T> {
  success: true
  data: T
  meta?: {
    quotaRemaining: { free: number; paid: number }
  }
}

/**
 * Tracker 路由认证辅助
 * 先尝试 Better Auth session，失败后 fallback 到 API Key 认证
 * 返回 userId 或 401 响应
 */
export async function authForTracker(
  request: { headers: Headers }
): Promise<{ userId: string } | NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers as unknown as Record<string, string> })

  if (session?.user) {
    return { userId: session.user.id }
  }

  // Fallback: 尝试 API Key 认证
  const apiKeyValue = extractApiKeyFromHeaders(request.headers)
  if (!apiKeyValue) {
    return NextResponse.json(
      { success: false, error: "未登录或缺少 API Key" },
      { status: 401 }
    )
  }

  const validation = await validateApiKey(apiKeyValue)
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(validation.error || "INVALID_API_KEY") },
      { status: 401 }
    )
  }

  return { userId: validation.apiKey!.userId }
}

/**
 * 从 Headers 对象提取 API Key
 */
export function extractApiKeyFromHeaders(headers: Headers | { get: (name: string) => string | null }): string | null {
  const authHeader = headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7)
  }
  const apiKeyHeader = headers.get("x-api-key")
  if (apiKeyHeader) {
    return apiKeyHeader
  }
  return null
}

/**
 * 构建未认证响应
 */
export function unauthorizedResponse(message: string = "未登录或缺少 API Key"): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  )
}

/**
 * API 认证结果类型
 */
export interface TrackerAuthResult {
  authenticated: boolean
  userId?: string
  response?: NextResponse
}

/**
 * Tracker 路由认证（泛型版本）
 */
export async function authenticateTracker(
  request: { headers: Headers }
): Promise<TrackerAuthResult> {
  const session = await auth.api.getSession({ headers: request.headers as unknown as Record<string, string> })

  if (session?.user) {
    return { authenticated: true, userId: session.user.id }
  }

  const apiKeyValue = extractApiKeyFromHeaders(request.headers)
  if (!apiKeyValue) {
    return {
      authenticated: false,
      response: unauthorizedResponse(),
    }
  }

  const validation = await validateApiKey(apiKeyValue)
  if (!validation.valid) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { success: false, error: getErrorMessage(validation.error || "INVALID_API_KEY") },
        { status: 401 }
      ),
    }
  }

  return { authenticated: true, userId: validation.apiKey!.userId }
}

/**
 * 从请求头提取 API Key
 */
export function extractApiKey(request: NextRequest): string | null {
  // Authorization: Bearer <key>
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7)
  }

  // X-API-Key: <key>
  const apiKeyHeader = request.headers.get("x-api-key")
  if (apiKeyHeader) {
    return apiKeyHeader
  }

  return null
}

/**
 * API 验证中间件
 * 返回验证结果和配额信息，或错误响应
 */
export async function withApiAuth(
  request: NextRequest,
  handler: (apiKey: ApiKey, quota: ApiQuota) => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = Date.now()
  const apiKeyValue = extractApiKey(request)

  if (!apiKeyValue) {
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: {
          code: "INVALID_API_KEY",
          message: "缺少 API Key，请在请求头中提供 Authorization: Bearer <key> 或 X-API-Key: <key>",
        },
      },
      { status: 401 }
    )
  }

  const validation = await validateApiKey(apiKeyValue)

  if (!validation.valid) {
    const statusCode = getStatusCodeForError(validation.error!)
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: {
          code: validation.error!,
          message: getErrorMessage(validation.error!),
          quota: validation.quota ? calculateRemainingQuota(validation.quota) : undefined,
        },
      },
      { status: statusCode }
    )
  }

  const { apiKey, quota } = validation

  // Rate Limiting 检查
  const rateLimitResult = checkRateLimit(apiKey!.id)
  if (!rateLimitResult.allowed) {
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: `请求频率超限，请在 ${rateLimitResult.retryAfter} 秒后重试`,
          quota: quota ? calculateRemainingQuota(quota) : undefined,
        },
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(rateLimitResult.limit),
          "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          "X-RateLimit-Reset": String(rateLimitResult.resetTime),
          "Retry-After": String(rateLimitResult.retryAfter),
        },
      }
    )
  }

  try {
    const response = await handler(apiKey!, quota!)

    // 添加配额信息到响应头
    const remaining = calculateRemainingQuota(quota!)
    response.headers.set("X-Quota-Free", String(remaining.free))
    response.headers.set("X-Quota-Paid", String(remaining.paid))

    // 配额预警：当总剩余配额低于 20% 时添加 warning header
    const totalQuota = quota!.freeLimit + quota!.paidLimit
    const usedQuota = quota!.usedFree + quota!.usedPaid
    const remainingTotal = totalQuota - usedQuota
    if (remainingTotal < totalQuota * 0.2) {
      response.headers.set("X-Quota-Warning", "low")
    }

    // Rate Limit 信息
    response.headers.set("X-RateLimit-Limit", String(rateLimitResult.limit))
    response.headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining))
    response.headers.set("X-RateLimit-Reset", String(rateLimitResult.resetTime))

    // 记录使用日志
    const responseTime = Date.now() - startTime
    await logApiUsage({
      apiKeyId: apiKey!.id,
      endpoint: new URL(request.url).pathname,
      method: request.method,
      statusCode: response.status,
      responseTime,
      timestamp: new Date(),
    })

    // 更新最后使用时间
    await updateApiKeyLastUsed(apiKey!.id)

    // 扣减配额
    await decrementQuota(apiKey!.userId)

    return response
  } catch (error) {
    const responseTime = Date.now() - startTime
    await logApiUsage({
      apiKeyId: apiKey!.id,
      endpoint: new URL(request.url).pathname,
      method: request.method,
      statusCode: 500,
      responseTime,
      timestamp: new Date(),
      errorMessage: error instanceof Error ? error.message : "未知错误",
    })

    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "服务器内部错误",
        },
      },
      { status: 500 }
    )
  }
}

/**
 * 根据错误码获取 HTTP 状态码
 */
function getStatusCodeForError(errorCode: string): number {
  switch (errorCode) {
    case "INVALID_API_KEY":
    case "API_KEY_EXPIRED":
      return 401
    case "API_KEY_DISABLED":
      return 403
    case "QUOTA_EXCEEDED":
    case "RATE_LIMIT_EXCEEDED":
      return 429
    default:
      return 400
  }
}

/**
 * 根据错误码获取错误消息
 */
function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "INVALID_API_KEY":
      return "API Key 无效"
    case "API_KEY_EXPIRED":
      return "API Key 已过期"
    case "API_KEY_DISABLED":
      return "API Key 已禁用"
    case "QUOTA_EXCEEDED":
      return "配额已用尽，请购买更多额度"
    case "RATE_LIMIT_EXCEEDED":
      return "请求频率超限，请稍后重试"
    default:
      return "未知错误"
  }
}

/**
 * 构建成功响应
 */
export function apiSuccessResponse<T>(
  data: T,
  quota?: ApiQuota
): NextResponse<ApiSuccessResponse<T>> {
  const meta = quota
    ? { meta: { quotaRemaining: calculateRemainingQuota(quota) } }
    : {}

  return NextResponse.json({
    success: true,
    data,
    ...meta,
  })
}

/**
 * 构建错误响应
 */
export function apiErrorResponse(
  code: string,
  message: string,
  statusCode: number = 400,
  quota?: ApiQuota
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        quota: quota ? calculateRemainingQuota(quota) : undefined,
      },
    },
    { status: statusCode }
  )
}