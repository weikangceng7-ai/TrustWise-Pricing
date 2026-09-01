import { config } from "dotenv"
import { resolve } from "path"

// 加载 .env.local
config({ path: resolve(__dirname, "../.env.local") })

import { db } from "../src/db"
import { knowledgeChunks } from "../src/db/schema-rag"
import { sql } from "drizzle-orm"

async function checkDatabase() {
  console.log("🔍 检查数据库表结构...\n")

  if (!db) {
    console.error("❌ 数据库连接失败")
    console.log("DATABASE_URL:", process.env.DATABASE_URL?.substring(0, 50) + "...")
    return
  }

  try {
    // 检查表是否存在
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'knowledge_chunks'
      )
    `)

    console.log("✅ knowledge_chunks 表存在:", tableCheck[0].exists)

    // 检查表结构
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'knowledge_chunks'
      ORDER BY ordinal_position
    `)

    console.log("\n📋 表结构:")
    console.table(columns.map((col: any) => ({
      字段: col.column_name,
      类型: col.data_type,
      可空: col.is_nullable
    })))

    // 检查现有数据
    const count = await db.select().from(knowledgeChunks).limit(1)
    console.log(`\n📊 现有数据量: ${count.length} 条`)

  } catch (error) {
    console.error("❌ 检查失败:", error)
  }
}

checkDatabase().catch(console.error)
