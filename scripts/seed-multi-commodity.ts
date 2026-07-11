/**
 * 多品种价格数据填充脚本
 * 为 sulfur, phosphate, potash, urea 四种品种生成 90 天历史价格数据
 * 用法: npm run db:seed:multi-commodity
 */

import { config } from "dotenv"
import { resolve } from "path"
config({ path: resolve(process.cwd(), ".env.local"), quiet: true })

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { sulfurPrices, portInventory } from "@/db/schema"
import { COMMODITY_INFO, COMMODITY_CODES, type CommodityCode } from "@/db/schema-commodity"
import { eq, and } from "drizzle-orm"

const connectionString = process.env.DATABASE_URL || ""
const client = postgres(connectionString)
const db = drizzle(client)

// 品种价格配置（基准价格、波动率、季节性特征）
const COMMODITY_PRICE_CONFIG: Record<CommodityCode, {
  basePrice: number
  volatility: number
  regions: string[]
  markets: string[]
  specifications: string[]
}> = {
  sulfur: {
    basePrice: 1850,
    volatility: 40,
    regions: ["华东", "华南", "华中"],
    markets: ["镇江港", "湛江港", "防城港"],
    specifications: ["颗粒", "块粉"],
  },
  phosphate: {
    basePrice: 1080,
    volatility: 25,
    regions: ["湖北", "云南", "贵州"],
    markets: ["宜昌", "昆明", "贵阳"],
    specifications: ["28%品位", "30%品位"],
  },
  potash: {
    basePrice: 3500,
    volatility: 80,
    regions: ["华东", "华北", "东北"],
    markets: ["青岛港", "天津港", "大连港"],
    specifications: ["60%红钾", "62%白钾"],
  },
  urea: {
    basePrice: 2350,
    volatility: 50,
    regions: ["山东", "河南", "河北"],
    markets: ["临沂", "郑州", "石家庄"],
    specifications: ["小颗粒", "大颗粒"],
  },
}

// 库存基准配置
const INVENTORY_CONFIG: Record<CommodityCode, { base: number; volatility: number }> = {
  sulfur: { base: 85, volatility: 12 },
  phosphate: { base: 120, volatility: 15 },
  potash: { base: 65, volatility: 10 },
  urea: { base: 95, volatility: 18 },
}

function seedRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

async function main() {
  console.log("\n========================================")
  console.log("开始生成多品种价格数据")
  console.log("========================================\n")

  if (!process.env.DATABASE_URL) {
    console.error("请配置 DATABASE_URL 环境变量")
    process.exit(1)
  }

  // 清空现有的非硫磺数据
  const codes = Object.values(COMMODITY_CODES)
  for (const code of codes) {
    if (code === "sulfur") continue // 保留原有硫磺数据
    console.log(`清空 ${COMMODITY_INFO[code].name} 现有数据...`)
    await db.delete(sulfurPrices).where(eq(sulfurPrices.commodityCode, code))
    await db.delete(portInventory).where(eq(portInventory.commodityCode, code))
  }

  const days = 90
  let totalPrices = 0
  let totalInventory = 0

  for (const code of codes) {
    const info = COMMODITY_INFO[code]
    const config = COMMODITY_PRICE_CONFIG[code]
    const invConfig = INVENTORY_CONFIG[code]
    const rand = seedRandom(Object.values(COMMODITY_CODES).indexOf(code) * 12345 + 42)

    console.log(`\n生成 ${info.name} (${code}) 数据...`)

    // 生成每日价格（带季节性 + 随机游走）
    let currentPrice = config.basePrice
    const now = new Date()

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]

      // 季节性：夏季（6-8月）磷肥需求旺季，价格上涨
      const month = date.getMonth()
      const seasonalFactor = code === "sulfur"
        ? Math.sin((month - 3) * Math.PI / 6) * 30 // 4-6月硫磺旺季
        : code === "phosphate"
        ? Math.sin((month - 2) * Math.PI / 6) * 15 // 3-5月磷矿需求
        : code === "potash"
        ? Math.sin((month - 1) * Math.PI / 6) * 60 // 2-4月钾肥备肥
        : Math.sin((month - 5) * Math.PI / 6) * 35 // 6-8月尿素旺季

      // 随机游走
      const dailyChange = (rand() - 0.48) * config.volatility * 0.2
      currentPrice = Math.max(
        config.basePrice * 0.85,
        Math.min(config.basePrice * 1.15, currentPrice + dailyChange + seasonalFactor * 0.05)
      )

      const highPrice = Math.round((currentPrice + rand() * config.volatility * 0.3) * 100) / 100
      const lowPrice = Math.round((currentPrice - rand() * config.volatility * 0.3) * 100) / 100
      const mainPrice = Math.round(currentPrice * 100) / 100

      // 每个品种插入多个地区/市场的价格
      for (let r = 0; r < config.regions.length; r++) {
        const regionOffset = (rand() - 0.5) * config.volatility * 0.15
        const marketOffset = (rand() - 0.5) * config.volatility * 0.1

        for (let s = 0; s < config.specifications.length; s++) {
          const specOffset = config.specifications[s].includes("大") || config.specifications[s].includes("62%") ? 20 : 0

          await db.insert(sulfurPrices).values({
            date: dateStr,
            commodityCode: code,
            productName: info.name,
            region: config.regions[r],
            market: config.markets[r],
            specification: config.specifications[s],
            minPrice: String(Math.round((lowPrice + regionOffset - 10) * 100) / 100),
            maxPrice: String(Math.round((highPrice + regionOffset + 10) * 100) / 100),
            mainPrice: String(Math.round((mainPrice + regionOffset + specOffset) * 100) / 100),
            changeValue: String(Math.round((dailyChange + regionOffset) * 100) / 100),
            changePercent: String(Math.round(((dailyChange + regionOffset) / (currentPrice - dailyChange)) * 10000) / 100),
            unit: info.unit,
            source: code === "potash" ? "中国化肥网" : code === "urea" ? "隆众资讯" : "百川盈孚",
          })

          totalPrices++
        }
      }

      // 生成港口库存数据（每周两次）
      if (i % 3 === 0 || i % 4 === 0) {
        const invChange = (rand() - 0.5) * invConfig.volatility
        const inventory = Math.round(invConfig.base + invChange * 2)
        const invPrice = Math.round(currentPrice * (1 + (rand() - 0.5) * 0.05))

        await db.insert(portInventory).values({
          date: dateStr,
          commodityCode: code,
          inventory: String(inventory),
          price: String(invPrice),
        })

        totalInventory++
      }
    }

    console.log(`  ✓ ${info.name}: 价格 ${totalPrices} 条, 库存 ${totalInventory} 条`)
  }

  // 验证
  for (const code of codes) {
    const prices = await db
      .select()
      .from(sulfurPrices)
      .where(eq(sulfurPrices.commodityCode, code))
      .limit(1)
    const inventory = await db
      .select()
      .from(portInventory)
      .where(eq(portInventory.commodityCode, code))
      .limit(1)

    console.log(`\n验证 ${COMMODITY_INFO[code].name}:`)
    console.log(`  价格数据: ${prices.length > 0 ? `✓ (${prices[0].mainPrice} ${prices[0].unit})` : "✗ 无数据"}`)
    console.log(`  库存数据: ${inventory.length > 0 ? `✓ (${inventory[0].inventory} 万吨)` : "✗ 无数据"}`)
  }

  console.log(`\n✓ 完成！共插入 ${totalPrices} 条价格数据, ${totalInventory} 条库存数据`)
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
  .finally(async () => {
    await client.end()
  })
