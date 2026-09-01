import { NextRequest, NextResponse } from "next/server"
import {
  getInventoryAnalysis,
  getInventorySnapshots,
  getInventoryAlerts,
  generateInventoryAlerts,
  handleInventoryAlert,
  recordInventorySnapshot,
  calculateTurnoverRate,
  calculateHealthScore,
  predictStagnantRisk,
  getInventoryRecommendation,
} from "@/services/inventory-analysis"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")
    const enterprise = searchParams.get("enterprise")

    if (!enterprise) {
      return NextResponse.json({ success: false, error: "Missing enterprise parameter" }, { status: 400 })
    }

    // 库存分析
    if (action === "analysis") {
      const analysis = await getInventoryAnalysis(enterprise)
      if (!analysis) {
        return NextResponse.json({ success: false, error: "Enterprise not found" }, { status: 404 })
      }
      return NextResponse.json({ success: true, data: analysis })
    }

    // 库存健康度
    if (action === "health") {
      const analysis = await getInventoryAnalysis(enterprise)
      if (!analysis) {
        return NextResponse.json({ success: false, error: "Enterprise not found" }, { status: 404 })
      }
      return NextResponse.json({
        success: true,
        data: {
          healthScore: analysis.healthScore,
          daysOfCover: analysis.daysOfCover,
          stagnantRisk: analysis.stagnantRisk,
          fillPercent: analysis.fillPercent,
        },
      })
    }

    // 库存快照历史
    if (action === "snapshots") {
      const days = parseInt(searchParams.get("days") || "30")
      const snapshots = await getInventorySnapshots(enterprise, days)
      return NextResponse.json({ success: true, data: snapshots })
    }

    // 库存预警
    if (action === "alerts") {
      const isHandled = searchParams.get("isHandled")
      const alerts = await getInventoryAlerts(enterprise, isHandled !== null ? isHandled === "true" : undefined)
      return NextResponse.json({ success: true, data: alerts })
    }

    // 库存建议
    if (action === "recommendation") {
      const analysis = await getInventoryAnalysis(enterprise)
      if (!analysis) {
        return NextResponse.json({ success: false, error: "Enterprise not found" }, { status: 404 })
      }
      const priceTrend = searchParams.get("priceTrend") as "up" | "down" | "stable" | undefined
      const recommendation = getInventoryRecommendation({
        currentStock: analysis.currentStock,
        maxCapacity: analysis.maxCapacity,
        safetyDays: analysis.safetyDays,
        avgConsumption: analysis.avgConsumption,
        priceTrend,
      })
      return NextResponse.json({ success: true, data: recommendation })
    }

    // 默认返回完整分析
    const analysis = await getInventoryAnalysis(enterprise)
    if (!analysis) {
      return NextResponse.json({ success: false, error: "Enterprise not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: analysis })
  } catch (error) {
    console.error("Inventory API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    // 生成库存预警
    if (action === "generate-alerts") {
      const { enterpriseCode } = body
      const alerts = await generateInventoryAlerts(enterpriseCode)
      return NextResponse.json({ success: true, data: alerts })
    }

    // 处理预警
    if (action === "handle-alert") {
      const { id, note } = body
      const result = await handleInventoryAlert(id, note)
      return NextResponse.json({ success: true, data: result })
    }

    // 记录库存快照
    if (action === "record-snapshot") {
      const snapshot = await recordInventorySnapshot(body)
      return NextResponse.json({ success: true, data: snapshot })
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 })
  } catch (error) {
    console.error("Inventory POST error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
