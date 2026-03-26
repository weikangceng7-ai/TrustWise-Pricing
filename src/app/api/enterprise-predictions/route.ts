import { NextResponse } from "next/server"
import {
  ENTERPRISE_CODES,
  getEnterpriseNameByCode,
  type EnterpriseCode,
} from "@/services/enterprise-knowledge-config"

interface PredictionRecord {
  id: number
  enterpriseCode: string
  enterpriseName: string
  date: string
  actualPrice: number | null
  predictedPrice: number | null
  modelType: string | null
  confidence: number | null
  factors: Record<string, number> | null
}

function generateMockData(enterprise: string, days: number): PredictionRecord[] {
  const data: PredictionRecord[] = []
  const now = new Date()
  const basePrices: Record<string, number> = {
    yihua: 1180,
    luxi: 1195,
    jinzhengda: 1170,
  }
  const basePrice = basePrices[enterprise] || 1180

  for (let i = days; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]

    const fluctuation = (Math.random() - 0.5) * 40
    const actualPrice = basePrice + fluctuation
    const predictedPrice = basePrice + fluctuation + (Math.random() - 0.5) * 20

    data.push({
      id: i,
      enterpriseCode: enterprise,
      enterpriseName: getEnterpriseNameByCode(enterprise),
      date: dateStr,
      actualPrice: Number(actualPrice.toFixed(2)),
      predictedPrice: Number(predictedPrice.toFixed(2)),
      modelType: "LSTM-Attention",
      confidence: Number((0.85 + Math.random() * 0.1).toFixed(2)),
      factors: {
        supply: 0.35 + Math.random() * 0.1,
        demand: 0.30 + Math.random() * 0.1,
        inventory: 0.20 + Math.random() * 0.1,
        macro: 0.15 + Math.random() * 0.05,
      },
    })
  }

  return data
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const enterprise = searchParams.get("enterprise")
    const days = parseInt(searchParams.get("days") || "30")

    if (enterprise) {
      const data = generateMockData(enterprise, days)
      return NextResponse.json({
        success: true,
        enterprise: enterprise,
        data: data,
      })
    }

    const allData: Record<string, PredictionRecord[]> = {}
    for (const code of ENTERPRISE_CODES) {
      allData[code] = generateMockData(code, days)
    }

    const summary = ENTERPRISE_CODES.map((code) => {
      const data = allData[code]
      const latest = data[data.length - 1]
      return {
        enterpriseCode: code,
        enterpriseName: getEnterpriseNameByCode(code),
        latestDate: latest?.date || new Date().toISOString().split("T")[0],
        latestPrice: latest?.actualPrice?.toString() || "0",
        predictedPrice: latest?.predictedPrice?.toString() || "0",
        modelType: latest?.modelType || "LSTM-Attention",
        confidence: latest?.confidence?.toString() || "0.85",
      }
    })

    return NextResponse.json({
      success: true,
      summary,
      history: allData,
    })
  } catch (error) {
    console.error("获取企业价格预测数据失败:", error)
    return NextResponse.json({ error: "获取数据失败" }, { status: 500 })
  }
}
