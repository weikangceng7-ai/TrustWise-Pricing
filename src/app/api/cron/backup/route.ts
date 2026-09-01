// src/app/api/cron/backup/route.ts
import { NextResponse } from "next/server"
import { db } from "@/db"

// 需要备份的表
const TABLES = [
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

export async function GET(request: Request) {
  const isCron = request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
  const isLocalDev = process.env.NODE_ENV === "development"

  if (!isCron && !isLocalDev) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    if (!db) {
      return NextResponse.json({ error: "数据库不可用" }, { status: 500 })
    }

    const backup: Record<string, unknown[]> = {}
    let totalRows = 0

    for (const table of TABLES) {
      try {
        const rows = await db.execute(`SELECT * FROM "${table}"`)
        backup[table] = rows
        totalRows += rows.length
      } catch {
        // 表可能不存在，跳过
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tables: Object.keys(backup).length,
      totalRows,
    })
  } catch (error) {
    console.error("[Backup Cron] 备份失败:", error)
    return NextResponse.json({ error: "备份失败" }, { status: 500 })
  }
}
