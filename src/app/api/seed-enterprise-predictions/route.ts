import { NextResponse } from "next/server"
import { db, enterprisePricePredictions } from "@/db"
import { ENTERPRISE_CONFIGS } from "@/services/enterprise-knowledge-config"

// 安全检查：仅在开发环境或提供正确密钥时允许访问
function isAuthorized(request: Request): boolean {
  // 开发环境允许访问
  if (process.env.NODE_ENV === "development") {
    return true
  }

  // 生产环境需要提供密钥
  const { searchParams } = new URL(request.url)
  const providedKey = searchParams.get("key")
  const expectedKey = process.env.SEED_API_KEY

  // 如果没有配置密钥，拒绝访问
  if (!expectedKey) {
    console.warn("[Seed API] 生产环境未配置 SEED_API_KEY，拒绝访问")
    return false
  }

  return providedKey === expectedKey
}

const ENTERPRISES = ENTERPRISE_CONFIGS.map((enterprise) => ({
  name: enterprise.name,
  code: enterprise.code,
  basePrice: enterprise.priceConfig.basePrice,
  volatility: enterprise.priceConfig.volatility,
  trend: enterprise.priceConfig.trend,
  modelAccuracy: enterprise.priceConfig.modelAccuracy,
}))

const MODEL_TYPES = ["EEMD-LSTM", "LSTM", "ARIMA-LSTM"]

function randomWalk(base: number, volatility: number, seed: number): number {
  const random = Math.sin(seed) * 0.5 + Math.cos(seed * 1.3) * 0.3 + Math.sin(seed * 0.7) * 0.2
  return base + random * volatility
}

function generateDates(days: number): Date[] {
  const dates: Date[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    dates.push(date)
  }
  return dates
}

function generateEnterpriseData(
  enterprise: typeof ENTERPRISES[0],
  historicalDays: number,
  predictionDays: number
) {
  const dates = generateDates(historicalDays)
  const data: Array<{
    date: string
    actualPrice: string
    predictedPrice: string | null
    lowerBound: string | null
    upperBound: string | null
    confidence: string | null
    modelType: string | null
  }> = []

  let currentPrice = enterprise.basePrice
  const modelType = MODEL_TYPES[Math.floor(Math.random() * MODEL_TYPES.length)]

  dates.forEach((date, index) => {
    const seed = date.getTime() + index * 100
    const change = randomWalk(0, enterprise.volatility * 0.3, seed)
    currentPrice += change + enterprise.trend

    const actualPrice = Math.max(850, Math.min(1100, currentPrice))
    const predictionError = randomWalk(0, enterprise.volatility * 0.15, seed + 1)
    const predictedPrice = actualPrice + predictionError
    const intervalWidth = enterprise.volatility * 0.5
    const lowerBound = predictedPrice - intervalWidth
    const upperBound = predictedPrice + intervalWidth
    const confidence = enterprise.modelAccuracy - Math.abs(predictionError) * 0.1

    data.push({
      date: date.toISOString().split("T")[0],
      actualPrice: actualPrice.toFixed(2),
      predictedPrice: predictedPrice.toFixed(2),
      lowerBound: lowerBound.toFixed(2),
      upperBound: upperBound.toFixed(2),
      confidence: Math.max(85, Math.min(99, confidence)).toFixed(2),
      modelType,
    })
  })

  const lastDate = dates[dates.length - 1]
  const lastPrice = parseFloat(data[data.length - 1].actualPrice)

  for (let i = 1; i <= predictionDays; i++) {
    const futureDate = new Date(lastDate)
    futureDate.setDate(futureDate.getDate() + i)

    const seed = futureDate.getTime() + i * 1000
    const predictedChange = randomWalk(enterprise.trend * i, enterprise.volatility * 0.4, seed)
    const predictedPrice = lastPrice + predictedChange
    const intervalWidth = enterprise.volatility * (0.5 + i * 0.1)
    const lowerBound = predictedPrice - intervalWidth
    const upperBound = predictedPrice + intervalWidth
    const confidence = enterprise.modelAccuracy - i * 1.5 - Math.random() * 2

    data.push({
      date: futureDate.toISOString().split("T")[0],
      actualPrice: lastPrice.toFixed(2),
      predictedPrice: predictedPrice.toFixed(2),
      lowerBound: lowerBound.toFixed(2),
      upperBound: upperBound.toFixed(2),
      confidence: Math.max(70, Math.min(95, confidence)).toFixed(2),
      modelType,
    })
  }

  return data
}

export async function GET(request: Request) {
  // 安全检查
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "未授权访问。生产环境需要提供有效的 key 参数。" },
      { status: 403 }
    )
  }

  if (!db) {
    return NextResponse.json({ error: "Database not available" }, { status: 500 })
  }

  try {
    // 清空现有数据
    await db.delete(enterprisePricePredictions)

    let totalCount = 0

    // 为每家企业生成数据
    for (const enterprise of ENTERPRISES) {
      const data = generateEnterpriseData(enterprise, 60, 14)

      for (const item of data) {
        await db.insert(enterprisePricePredictions).values({
          enterpriseName: enterprise.name,
          enterpriseCode: enterprise.code,
          date: item.date,
          actualPrice: item.actualPrice,
          predictedPrice: item.predictedPrice,
          lowerBound: item.lowerBound,
          upperBound: item.upperBound,
          confidence: item.confidence,
          modelType: item.modelType,
          unit: "元/吨",
        })
      }

      totalCount += data.length
    }

    return NextResponse.json({
      success: true,
      message: `已生成 ${totalCount} 条企业价格预测数据`,
      enterprises: ENTERPRISES.map(e => ({ name: e.name, code: e.code })),
    })
  } catch (error) {
    console.error("生成数据失败:", error)
    return NextResponse.json({ error: "生成数据失败" }, { status: 500 })
  }
}