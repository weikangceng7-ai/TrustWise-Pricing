/**
 * 多维度价格数据生成脚本 - 使用真实外部数据源
 * 用法: npm run db:seed:multi-prices
 */

// 显式加载 .env.local 文件（必须在其他 import 之前）
import { config } from "dotenv"
import { resolve } from "path"
config({ path: resolve(process.cwd(), ".env.local"), quiet: true })

console.log("环境变量加载完成")
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "已配置" : "未配置")

// 然后导入其他模块
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { multiDimensionalPrices } from "@/db/schema"
import { fetchBrentOilPrice, fetchWTIOilPrice } from "@/services/eia-oil-price"

console.log("模块导入完成")

// 数据库连接
const connectionString = process.env.DATABASE_URL || ""
const client = postgres(connectionString)
const db = drizzle(client)

console.log("数据库连接初始化完成")

// 分类配置（精简为4个核心分类）
const PRICE_CATEGORIES = [
  {
    id: "supply",
    categoryName: "供应端价格",
    unit: "元/吨",
    source: "EIA原油价格+汇率换算",
    note: "原油价格影响硫磺生产成本和运输成本",
    fetchFn: fetchSupplyPrice,
  },
  {
    id: "middle-east-cob",
    categoryName: "中东COB报价",
    unit: "美元/吨",
    source: "布伦特原油价格推导",
    note: "中东硫磺FOB价格与原油价格挂钩",
    fetchFn: fetchMiddleEastCOB,
  },
  {
    id: "domestic",
    categoryName: "国内均价",
    unit: "元/吨",
    source: "原油+汇率综合计算",
    note: "国内硫磺价格综合国际因素",
    fetchFn: fetchDomesticPrice,
  },
  {
    id: "market-news",
    categoryName: "市场动态指数",
    unit: "指数",
    source: "原油波动率",
    note: "原油波动反映市场情绪",
    fetchFn: fetchMarketNewsIndex,
  },
]

/**
 * 获取汇率 - 使用 Frankfurter API
 */
async function fetchExchangeRate(): Promise<number> {
  try {
    const response = await fetch("https://api.frankfurter.app/latest?from=USD&to=CNY")
    if (response.ok) {
      const data = await response.json()
      return data.rates.CNY
    }
  } catch (error) {
    console.error("获取汇率失败:", error)
  }
  return 7.24 // 默认汇率
}

/**
 * 供应端价格 - 基于原油价格换算
 */
async function fetchSupplyPrice(days: number): Promise<Array<{ date: Date; price: number; changePercent: number }>> {
  console.log("  正在获取WTI原油数据...")
  const oilData = await fetchWTIOilPrice(days)
  console.log("  获取到", oilData.length, "条WTI数据")
  const exchangeRate = await fetchExchangeRate()
  console.log("  当前汇率:", exchangeRate)

  if (oilData.length === 0) {
    console.warn("  无法获取原油数据，使用模拟数据")
    return generateMockData(1680, 50, days)
  }

  // 硫磺基准价格系数：原油每桶约 $80-120 时硫磺价格约 1500-1800 元/吨
  const sulfurCoefficient = 22
  const baseMultiplier = 10

  return oilData.map((item, index, arr) => {
    const sulfurPrice = item.price * exchangeRate * sulfurCoefficient * baseMultiplier / 100
    const prevPrice = index > 0 ? arr[index - 1].price * exchangeRate * sulfurCoefficient * baseMultiplier / 100 : sulfurPrice
    const changePercent = prevPrice > 0 ? ((sulfurPrice - prevPrice) / prevPrice) * 100 : 0

    return {
      date: new Date(item.date),
      price: Math.round(sulfurPrice * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
    }
  })
}

/**
 * 中东COB报价 - 基于布伦特原油价格
 */
async function fetchMiddleEastCOB(days: number): Promise<Array<{ date: Date; price: number; changePercent: number }>> {
  const oilData = await fetchBrentOilPrice(days)
  if (oilData.length === 0) return generateMockData(145, 12, days)

  // 中东 FOB 报价系数：原油价格 × 系数（约 1.8-2.2）
  const cobCoefficient = 1.9

  return oilData.map((item, index, arr) => {
    const cobPrice = item.price * cobCoefficient
    const prevPrice = index > 0 ? arr[index - 1].price * cobCoefficient : cobPrice
    const changePercent = prevPrice > 0 ? ((cobPrice - prevPrice) / prevPrice) * 100 : 0

    return {
      date: new Date(item.date),
      price: Math.round(cobPrice * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
    }
  })
}

/**
 * 国内均价 - 综合布伦特和WTI原油价格
 */
async function fetchDomesticPrice(days: number): Promise<Array<{ date: Date; price: number; changePercent: number }>> {
  const [brentData, wtiData] = await Promise.all([
    fetchBrentOilPrice(days),
    fetchWTIOilPrice(days),
  ])
  const exchangeRate = await fetchExchangeRate()

  if (brentData.length === 0 && wtiData.length === 0) return generateMockData(1780, 40, days)

  const oilData = brentData.length > 0 ? brentData : wtiData
  const sulfurCoefficient = 24
  const baseMultiplier = 10

  return oilData.map((item, index, arr) => {
    const sulfurPrice = item.price * exchangeRate * sulfurCoefficient * baseMultiplier / 100
    const prevPrice = index > 0 ? arr[index - 1].price * exchangeRate * sulfurCoefficient * baseMultiplier / 100 : sulfurPrice
    const changePercent = prevPrice > 0 ? ((sulfurPrice - prevPrice) / prevPrice) * 100 : 0

    return {
      date: new Date(item.date),
      price: Math.round(sulfurPrice * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
    }
  })
}

/**
 * 市场动态指数 - 基于原油波动率
 */
async function fetchMarketNewsIndex(days: number): Promise<Array<{ date: Date; price: number; changePercent: number }>> {
  const oilData = await fetchBrentOilPrice(days)
  if (oilData.length === 0) return generateMockData(100, 8, days)

  return oilData.map((item, index, arr) => {
    if (index === 0) {
      return { date: new Date(item.date), price: 100, changePercent: 0 }
    }

    const prevPrice = arr[index - 1].price
    const volatility = Math.abs((item.price - prevPrice) / prevPrice) * 100
    const indexValue = 100 + volatility * 5

    return {
      date: new Date(item.date),
      price: Math.round(indexValue * 100) / 100,
      changePercent: Math.round((indexValue - 100) * 100) / 100,
    }
  })
}

/**
 * 模拟数据生成（备用）
 */
function generateMockData(basePrice: number, volatility: number, days: number): Array<{ date: Date; price: number; changePercent: number }> {
  const now = new Date()
  const data: Array<{ date: Date; price: number; changePercent: number }> = []
  let currentPrice = basePrice

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const change = (Math.random() - 0.5) * volatility * 0.3
    currentPrice += change
    const prevPrice = data.length > 0 ? data[data.length - 1].price : basePrice
    const changePercent = prevPrice > 0 ? ((currentPrice - prevPrice) / prevPrice) * 100 : 0

    data.push({
      date,
      price: Math.round(currentPrice * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
    })
  }

  return data
}

// 主函数
async function main() {
  console.log("\n========================================")
  console.log("开始生成多维度价格数据（使用真实外部数据源）")
  console.log("========================================\n")

  if (!process.env.DATABASE_URL) {
    console.error("请配置 DATABASE_URL 环境变量")
    process.exit(1)
  }

  try {
    console.log("清空现有数据...")
    await db.delete(multiDimensionalPrices)
    console.log("现有数据已清空")

    const days = 90

    for (const category of PRICE_CATEGORIES) {
      console.log(`\n获取 ${category.categoryName} 数据...`)
      console.log(`  数据来源: ${category.source}`)

      try {
        const data = await category.fetchFn(days)

        if (data.length === 0) {
          console.warn(`  ⚠ 无法获取数据`)
          continue
        }

        console.log(`  开始写入数据库...`)
        for (const item of data) {
          await db.insert(multiDimensionalPrices).values({
            date: item.date.toISOString().split("T")[0],
            category: category.id,
            categoryName: category.categoryName,
            price: String(item.price),
            value: "0",
            changeValue: "0",
            changePercent: String(item.changePercent),
            source: category.source,
            note: category.note,
          })
        }

        console.log(`  ✓ ${category.categoryName}: 已插入 ${data.length} 条数据`)
        console.log(`  最新价格: ${data[data.length - 1].price} ${category.unit}`)
      } catch (error) {
        console.error(`  ✗ ${category.categoryName} 处理失败:`, error)
      }
    }

    const count = await db.select().from(multiDimensionalPrices)
    console.log(`\n✓ 完成！共插入 ${count.length} 条多维度价格数据`)

  } catch (error) {
    console.error("生成数据失败:", error)
    throw error
  } finally {
    console.log("\n关闭数据库连接...")
    await client.end()
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