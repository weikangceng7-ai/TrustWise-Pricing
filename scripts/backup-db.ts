/**
 * 数据库备份脚本
 *
 * 用法:
 *   npx tsx --tsconfig tsconfig.json scripts/backup-db.ts
 *
 * 自动备份策略:
 *   1. Neon 自带 Point-in-Time Recovery（PITR），可回滚到任意时间点
 *      https://neon.tech/docs/introduction/point-in-time-restore
 *   2. Neon Branching：上线前创建分支测试，确认后合并
 *      https://neon.tech/docs/introduction/branching
 *   3. 本脚本作为额外保险，导出关键业务数据为 JSON
 *
 * Vercel Cron 自动备份（可选）:
 *   在 vercel.json 中添加:
 *   "crons": [{
 *     "path": "/api/cron/backup",
 *     "schedule": "0 3 * * *"
 *   }]
 *   需要设置 CRON_SECRET 环境变量
 */

import postgres from "postgres"
import * as fs from "fs"
import * as path from "path"

const BACKUP_DIR = path.join(process.cwd(), "backups")

async function backup() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL 未设置")
    process.exit(1)
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 })

  try {
    // 创建备份目录
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.json`)

    // 需要备份的表
    const tables = [
      "user",
      "sulfur_prices",
      "port_inventory",
      "enterprises",
      "enterprise_price_predictions",
      "multi_dimensional_prices",
      "api_keys",
      "api_quotas",
      "api_usage_logs",
      "orders",
      "notifications",
      "chat_conversations",
      "chat_messages",
    ]

    const backup: Record<string, unknown[]> = {}

    for (const table of tables) {
      try {
        const rows = await sql.unsafe(`SELECT * FROM "${table}"`)
        backup[table] = rows
        console.log(`  ${table}: ${rows.length} rows`)
      } catch (err) {
        console.warn(`  ${table}: SKIPPED (${err instanceof Error ? err.message : err})`)
      }
    }

    const totalRows = Object.values(backup).reduce((sum, rows) => sum + rows.length, 0)
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2))

    console.log(`\n备份完成: ${backupFile} (${totalRows} rows, ${tables.length} tables)`)

    // 保留最近 7 天的备份
    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("backup-") && f.endsWith(".json"))
      .sort()
      .reverse()

    for (const file of files.slice(7)) {
      fs.unlinkSync(path.join(BACKUP_DIR, file))
      console.log(`  清理旧备份: ${file}`)
    }
  } finally {
    await sql.end()
  }
}

backup().catch((err) => {
  console.error("备份失败:", err)
  process.exit(1)
})
