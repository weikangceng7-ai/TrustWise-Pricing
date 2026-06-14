// src/app/api/v1/prices/predict/route.ts
import { NextRequest } from "next/server"
import { withApiAuth, apiSuccessResponse, apiErrorResponse } from "@/lib/api-middleware"
import { predictPrices } from "@/services/prediction"
import type { ApiKey, ApiQuota } from "@/db/schema"

export const maxDuration = 60

/**
 * POST /api/v1/prices/predict
 * 价格预测
 *
 * Body:
 * - days: 预测天数 (默认 7)
 * - model: 模型类型 (可选)
 */
export async function POST(request: NextRequest) {
  return withApiAuth(request, async (apiKey: ApiKey, quota: ApiQuota) => {
    try {
      const body = await request.json()
      const days = body.days || 7

      if (days < 1 || days > 90) {
        return apiErrorResponse(
          "INVALID_REQUEST",
          "预测天数需在 1-90 之间",
          400,
          quota
        )
      }

      const result = await predictPrices(days)

      if (!result.success) {
        return apiErrorResponse(
          "INTERNAL_ERROR",
          result.error || "预测失败",
          500,
          quota
        )
      }

      return apiSuccessResponse(result.data, quota)
    } catch (error) {
      return apiErrorResponse(
        "INTERNAL_ERROR",
        "预测服务调用失败",
        500,
        quota
      )
    }
  })
}