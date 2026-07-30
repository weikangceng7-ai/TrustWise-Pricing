/**
 * 训练数据导出脚本
 *
 * 从 PostgreSQL 导出硫磺价格历史数据，生成 Python 预测服务所需的 Excel 文件。
 * 用法: npx tsx scripts/export-training-data.ts [--commodity=sulfur] [--output=python-service/data/price_history.xlsx]
 *
 * 前置条件:
 *   - .env.local 中 DATABASE_URL 已配置
 *   - sulfur_prices 表中有数据（由 Cron Job 每日采集）
 *
 * 工作流:
 *   1. 从 DB 查询指定品种的历史价格
 *   2. 写入 Excel（格式: 日期 + 长江港硫磺现货价），Python 服务直接读取
 *   3. 可选: 触发 Python 服务重新训练
 */

import { config } from "dotenv"
import { resolve } from "path"
import * as XLSX from "xlsx"
import { writeFileSync, mkdirSync, existsSync } from "fs"

// 加载环境变量
config({ path: resolve(process.cwd(), ".env.local"), quiet: true })

async function main() {
  const args = process.argv.slice(2)
  const commodity = args.find((a) => a.startsWith("--commodity="))?.split("=")[1] || "sulfur"
  const outputPath =
    args.find((a) => a.startsWith("--output="))?.split("=")[1] ||
    resolve(process.cwd(), "python-service", "data", "price_history.xlsx")
  const triggerRetrain = args.includes("--retrain")
  const pythonUrl = args.find((a) => a.startsWith("--python-url="))?.split("=")[1] || "http://localhost:5001"

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL 未配置，请在 .env.local 中设置")
    process.exit(1)
  }

  console.log(`📊 导出 ${commodity} 价格数据...`)

  // 动态导入 DB 模块（依赖 DATABASE_URL）
  const { default: postgres } = await import("postgres")
  const { drizzle } = await import("drizzle-orm/postgres")
  const { sulfurPrices } = await import("@/db/schema")
  const { desc } = await import("drizzle-orm")

  const client = postgres(process.env.DATABASE_URL)
  const db = drizzle(client, { schema: { sulfurPrices } })

  try {
    const rows = await db
      .select({ date: sulfurPrices.date, price: sulfurPrices.mainPrice })
      .from(sulfurPrices)
      .orderBy(desc(sulfurPrices.date))

    if (rows.length === 0) {
      console.error(`❌ sulfur_prices 表中无 ${commodity} 数据，请先运行数据采集 Cron Job`)
      process.exit(1)
    }

    // 按日期升序（训练需要时间递增）
    const sorted = [...rows].reverse()
    console.log(`   共 ${sorted.length} 条记录 (${sorted[0].date} ~ ${sorted[sorted.length - 1].date})`)

    // 写入 Excel（格式与 Python 服务 load_data() 一致）
    const excelData = sorted.map((r) => ({
      日期: r.date,
      长江港硫磺现货价: Number(r.price),
    }))

    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1")

    const outDir = resolve(outputPath, "..")
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true })
    }

    writeFileSync(outputPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }))
    console.log(`✅ 已写入: ${outputPath}`)

    // 可选: 触发重训练
    if (triggerRetrain) {
      console.log(`🔄 触发 Python 服务重新训练...`)
      const res = await fetch(`${pythonUrl}/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_ratio: 0.1 }),
      })
      const body = await res.json()
      if (body.success) {
        console.log(`✅ 训练完成: MAPE=${body.metrics?.mape}%, MAE=${body.metrics?.mae}`)
      } else {
        console.error(`❌ 训练失败: ${body.error}`)
      }
    } else {
      console.log(`💡 提示: 添加 --retrain 参数可自动触发 Python 服务重训练`)
    }
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error("导出失败:", e)
  process.exit(1)
})
