// src/lib/api-middleware.ts
import { NextRequest, NextResponse } from "next/server"
import { validateApiKey, updateApiKeyLastUsed } from "./api-auth"
import { decrementQuota, calculateRemainingQuota } from "./api-quota"
import { logApiUsage } from "@/services/api-usage"
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

  try {
    const response = await handler(apiKey!, quota!)

    // 添加配额信息到响应头
    const remaining = calculateRemainingQuota(quota!)
    response.headers.set("X-Quota-Free", String(remaining.free))
    response.headers.set("X-Quota-Paid", String(remaining.paid))

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