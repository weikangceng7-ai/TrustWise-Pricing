import { NextRequest, NextResponse } from "next/server"
import {
  fetchBrentOilPrice,
  fetchWTIOilPrice,
  getOilPriceSummary,
  getOilPriceComparison,
  analyzeOilSulfurCorrelation,
} from "@/services/eia-oil-price"

/**
 * GET /api/external-data/eia/oil-price
 * 获取 EIA 原油价格数据
 *
 * Query params:
 * - type: 'brent' | 'wti' | 'comparison' | 'summary' (default: 'summary')
 * - days: number (default: 30)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type") || "summary"
    const days = parseInt(searchParams.get("days") || "30", 10)

    switch (type) {
      case "brent": {
        const data = await fetchBrentOilPrice(days)
        return NextResponse.json({
          success: true,
          data,
          meta: {
            type: "Brent Crude Oil",
            source: "EIA",
            currency: "USD",
            unit: "BBL",
          },
        })
      }

      case "wti": {
        const data = await fetchWTIOilPrice(days)
        return NextResponse.json({
          success: true,
          data,
          meta: {
            type: "WTI Crude Oil",
            source: "EIA",
            currency: "USD",
            unit: "BBL",
          },
        })
      }

      case "comparison": {
        const comparison = await getOilPriceComparison(days)
        return NextResponse.json({
          success: true,
          data: comparison,
          meta: {
            type: "Brent vs WTI Comparison",
            source: "EIA",
            currency: "USD",
            unit: "BBL",
          },
        })
      }

      case "summary":
      default: {
        const [brentSummary, wtiSummary] = await Promise.all([
          getOilPriceSummary("brent", days),
          getOilPriceSummary("wti", days),
        ])

        let correlation = null
        if (brentSummary) {
          correlation = analyzeOilSulfurCorrelation(
            brentSummary.currentPrice,
            brentSummary.previousPrice
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            brent: brentSummary,
            wti: wtiSummary,
            correlation,
          },
          meta: {
            source: "EIA (U.S. Energy Information Administration)",
            apiUrl: "https://api.eia.gov/v2/petroleum/pri/spt/data/",
            updateFrequency: "Daily",
            currency: "USD",
            unit: "BBL (Barrel)",
          },
        })
      }
    }
  } catch (error) {
    console.error("EIA API Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "获取原油价格数据失败",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}