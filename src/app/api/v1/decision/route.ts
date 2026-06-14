// src/app/api/v1/decision/route.ts
import { NextRequest } from "next/server"
import { withApiAuth, apiSuccessResponse, apiErrorResponse } from "@/lib/api-middleware"
import { getPurchaseDecision } from "@/services/prediction"
import type { ApiKey, ApiQuota } from "@/db/schema"

export const maxDuration = 60

/**
 * POST /api/v1/decision
 * 采购决策建议
 *
 * Body:
 * - enterpriseCode: 企业代码 (可选)
 * - current_inventory: 当前库存 (可选)
 * - daily_consumption: 日均消耗 (可选)
 * - safety_days: 安全库存天数 (可选)
 * - days: 预测天数 (默认 7)
 */
export async function POST(request: NextRequest) {
  return withApiAuth(request, async (apiKey: ApiKey, quota: ApiQuota) => {
    try {
      const body = await request.json()
      const days = body.days || 7

      const result = await getPurchaseDecision({
        days,
        current_inventory: body.current_inventory,
        daily_consumption: body.daily_consumption,
        safety_days: body.safety_days,
      })

      if (!result.success) {
        return apiErrorResponse(
          "INTERNAL_ERROR",
          result.error || "决策分析失败",
          500,
          quota
        )
      }

      return apiSuccessResponse(result.data, quota)
    } catch (error) {
      return apiErrorResponse(
        "INTERNAL_ERROR",
        "决策服务调用失败",
        500,
        quota
      )
    }
  })
}