// src/app/api/v1/data/news/route.ts
import { NextRequest } from "next/server"
import { withApiAuth, apiSuccessResponse, apiErrorResponse } from "@/lib/api-middleware"
import { db } from "@/db"
import { multiDimensionalPrices } from "@/db/schema"
import { desc, eq } from "drizzle-orm"
import type { ApiKey, ApiQuota } from "@/db/schema"

/**
 * GET /api/v1/data/news
 * 市场新闻/动态数据
 *
 * Query params:
 * - category: 分类 (可选)
 * - limit: 返回数量限制
 * - offset: 分页偏移
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async (apiKey: ApiKey, quota: ApiQuota) => {
    const { searchParams } = new URL(request.url)

    const category = searchParams.get("category")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

    try {
      if (!db) {
        return apiErrorResponse(
          "INTERNAL_ERROR",
          "数据库不可用",
          500,
          quota
        )
      }

      const news = await db.select()
        .from(multiDimensionalPrices)
        .where(eq(multiDimensionalPrices.category, "market-news"))
        .orderBy(desc(multiDimensionalPrices.date))
        .limit(limit)
        .offset(offset)

      return apiSuccessResponse({
        news,
        total: news.length,
        limit,
        offset,
      }, quota)
    } catch (error) {
      return apiErrorResponse(
        "INTERNAL_ERROR",
        "获取新闻数据失败",
        500,
        quota
      )
    }
  })
}