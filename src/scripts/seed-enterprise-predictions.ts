/**
 * 企业硫磺价格预测模拟数据生成脚本
 */

import { db, enterprisePricePredictions } from "@/db"
import { desc } from "drizzle-orm"
import { ENTERPRISE_CODES, getEnterpriseNameByCode } from "@/services/enterprise-knowledge-config"

// 企业配置信息（价格相关配置）
const ENTERPRISE_PRICE_CONFIG: Record<string, { basePrice: number; volatility: number; trend: number; modelAccuracy: number }> = {
  yihua: { basePrice: 985, volatility: 35, trend: 0.3, modelAccuracy: 94.2 },
  luxi: { basePrice: 972, volatility: 28, trend: 0.15, modelAccuracy: 92.8 },
  jinzhengda: { basePrice: 958, volatility: 32, trend: 0.25, modelAccuracy: 93.5 },
}

const ENTERPRISES = ENTERPRISE_CODES.map((code) => ({
  name: getEnterpriseNameByCode(code),
  code,
  ...ENTERPRISE_PRICE_CONFIG[code],
}))

// 模型类型
const MODEL_TYPES = ["EEMD-LSTM", "LSTM", "ARIMA-LSTM"]

// 生成随机波动
function randomWalk(base: number, volatility: number, seed: number): number {
  const random = Math.sin(seed) * 0.5 + Math.cos(seed * 1.3) * 0.3 + Math.sin(seed * 0.7) * 0.2
  return base + random * volatility
}

// 生成日期序列
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

// 生成单家企业的预测数据
function generateEnterpriseData(
  enterprise: typeof ENTERPRISES[0],
  historicalDays: number,
  predictionDays: number
) {
  const dates = generateDates(historicalDays)
  const data: Array<{
    date: Date
    actualPrice: string
    predictedPrice: string | null
    lowerBound: string | null
    upperBound: string | null
    confidence: string | null
    modelType: string | null
  }> = []

  let currentPrice = enterprise.basePrice
  const modelType = MODEL_TYPES[Math.floor(Math.random() * MODEL_TYPES.length)]

  // 生成历史数据（包含实际价格和对应的预测）
  dates.forEach((date, index) => {
    const seed = date.getTime() + index * 100
    const change = randomWalk(0, enterprise.volatility * 0.3, seed)
    currentPrice += change + enterprise.trend

    // 实际价格
    const actualPrice = Math.max(850, Math.min(1100, currentPrice))

    // 预测价格（模拟模型预测，有一定误差）
    const predictionError = randomWalk(0, enterprise.volatility * 0.15, seed + 1)
    const predictedPrice = actualPrice + predictionError

    // 预测区间
    const intervalWidth = enterprise.volatility * 0.5
    const lowerBound = predictedPrice - intervalWidth
    const upperBound = predictedPrice + intervalWidth

    // 置信度（模拟）
    const confidence = enterprise.modelAccuracy - Math.abs(predictionError) * 0.1

    data.push({
      date,
      actualPrice: actualPrice.toFixed(2),
      predictedPrice: predictedPrice.toFixed(2),
      lowerBound: lowerBound.toFixed(2),
      upperBound: upperBound.toFixed(2),
      confidence: Math.max(85, Math.min(99, confidence)).toFixed(2),
      modelType,
    })
  })

  // 生成未来预测数据（只有预测，没有实际价格）
  const lastDate = dates[dates.length - 1]
  const lastPrice = parseFloat(data[data.length - 1].actualPrice)

  for (let i = 1; i <= predictionDays; i++) {
    const futureDate = new Date(lastDate)
    futureDate.setDate(futureDate.getDate() + i)

    const seed = futureDate.getTime() + i * 1000
    const predictedChange = randomWalk(enterprise.trend * i, enterprise.volatility * 0.4, seed)
    const predictedPrice = lastPrice + predictedChange

    // 未来预测区间更宽
    const intervalWidth = enterprise.volatility * (0.5 + i * 0.1)
    const lowerBound = predictedPrice - intervalWidth
    const upperBound = predictedPrice + intervalWidth

    // 置信度随预测时间递减
    const confidence = enterprise.modelAccuracy - i * 1.5 - Math.random() * 2

    data.push({
      date: futureDate,
      actualPrice: lastPrice.toFixed(2), // 未来日期用最后实际价格作为参考
      predictedPrice: predictedPrice.toFixed(2),
      lowerBound: lowerBound.toFixed(2),
      upperBound: upperBound.toFixed(2),
      confidence: Math.max(70, Math.min(95, confidence)).toFixed(2),
      modelType,
    })
  }

  return data
}

// 主函数
async function main() {
  console.log("开始生成企业价格预测数据...")

  if (!db) {
    console.error("数据库连接失败")
    process.exit(1)
  }

  const database = db // TypeScript 类型收窄

  try {
    // 清空现有数据
    console.log("清空现有数据...")
    await database.delete(enterprisePricePredictions)

    // 为每家企业生成数据
    for (const enterprise of ENTERPRISES) {
      console.log(`\n生成 ${enterprise.name} 的数据...`)

      const data = generateEnterpriseData(enterprise, 60, 14) // 60天历史 + 14天预测

      // 插入数据库
      for (const item of data) {
        await database.insert(enterprisePricePredictions).values({
          enterpriseName: enterprise.name,
          enterpriseCode: enterprise.code,
          date: item.date.toISOString().split("T")[0],
          actualPrice: item.actualPrice,
          predictedPrice: item.predictedPrice,
          lowerBound: item.lowerBound,
          upperBound: item.upperBound,
          confidence: item.confidence,
          modelType: item.modelType,
          unit: "元/吨",
        })
      }

      console.log(`✓ ${enterprise.name}: 已插入 ${data.length} 条数据`)
    }

    // 验证数据
    const count = await database.select().from(enterprisePricePredictions)
    console.log(`\n✓ 完成！共插入 ${count.length} 条企业价格预测数据`)

    // 显示示例数据
    const sample = await database
      .select()
      .from(enterprisePricePredictions)
      .orderBy(desc(enterprisePricePredictions.date))
      .limit(6)

    console.log("\n示例数据（最新3条）:")
    sample.forEach((item) => {
      console.log(`  ${item.enterpriseName} | ${item.date} | 实际: ${item.actualPrice} | 预测: ${item.predictedPrice} | 模型: ${item.modelType}`)
    })

  } catch (error) {
    console.error("生成数据失败:", error)
    throw error
  }
}

main()
  .then(() => {
    console.log("\n脚本执行完成")
    process.exit(0)
  })
  .catch((error) => {
    console.error("脚本执行失败:", error)
    process.exit(1)
  })