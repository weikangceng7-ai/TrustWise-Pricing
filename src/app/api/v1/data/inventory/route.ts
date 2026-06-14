// src/app/api/v1/data/inventory/route.ts
import { NextRequest } from "next/server"
import { withApiAuth, apiSuccessResponse, apiErrorResponse } from "@/lib/api-middleware"
import { getInventory } from "@/services/prices"
import type { ApiKey, ApiQuota } from "@/db/schema"

/**
 * GET /api/v1/data/inventory
 * 港口库存数据
 *
 * Query params:
 * - startDate: 开始日期
 * - endDate: 结束日期
 * - limit: 返回数量限制
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async (apiKey: ApiKey, quota: ApiQuota) => {
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 30

    try {
      const inventory = await getInventory(limit)

      let filteredInventory = inventory
      if (startDate) {
        filteredInventory = filteredInventory.filter(i => new Date(i.date) >= new Date(startDate))
      }
      if (endDate) {
        filteredInventory = filteredInventory.filter(i => new Date(i.date) <= new Date(endDate))
      }

      return apiSuccessResponse({
        inventory: filteredInventory,
        total: filteredInventory.length,
      }, quota)
    } catch (error) {
      return apiErrorResponse(
        "INTERNAL_ERROR",
        "获取库存数据失败",
        500,
        quota
      )
    }
  })
}