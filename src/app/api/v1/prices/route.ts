// src/app/api/v1/prices/route.ts
import { NextRequest } from "next/server"
import { withApiAuth, apiSuccessResponse, apiErrorResponse } from "@/lib/api-middleware"
import { getPrices } from "@/services/prices"
import type { ApiKey, ApiQuota } from "@/db/schema"

/**
 * GET /api/v1/prices
 * 获取价格数据
 *
 * Query params:
 * - startDate: 开始日期
 * - endDate: 结束日期
 * - region: 地区
 * - market: 市场
 * - limit: 返回数量限制
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async (apiKey: ApiKey, quota: ApiQuota) => {
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const region = searchParams.get("region")
    const market = searchParams.get("market")
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 30

    try {
      const prices = await getPrices(limit)

      // 过滤数据
      let filteredPrices = prices
      if (startDate) {
        filteredPrices = filteredPrices.filter(p => new Date(p.date) >= new Date(startDate))
      }
      if (endDate) {
        filteredPrices = filteredPrices.filter(p => new Date(p.date) <= new Date(endDate))
      }
      if (region) {
        filteredPrices = filteredPrices.filter(p => p.region?.includes(region))
      }
      if (market) {
        filteredPrices = filteredPrices.filter(p => p.market?.includes(market))
      }

      return apiSuccessResponse({
        prices: filteredPrices,
        total: filteredPrices.length,
        query: {
          startDate,
          endDate,
          region,
          market,
          limit,
        },
      }, quota)
    } catch (error) {
      return apiErrorResponse(
        "INTERNAL_ERROR",
        "获取价格数据失败",
        500,
        quota
      )
    }
  })
}