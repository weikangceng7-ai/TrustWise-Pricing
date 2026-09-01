import { config } from "dotenv"
import { resolve } from "path"

// 加载 .env.local
config({ path: resolve(__dirname, "../.env.local") })

import postgres from "postgres"

async function testConnection() {
  console.log("🔍 测试数据库连接...\n")
  console.log("DATABASE_URL:", process.env.DATABASE_URL?.substring(0, 80) + "...")

  try {
    const client = postgres(process.env.DATABASE_URL!, {
      max: 1,
      idle_timeout: 5,
      connect_timeout: 10,
    })

    // 测试连接
    const result = await client`SELECT 1 as test`
    console.log("✅ 连接成功:", result)

    // 检查表是否存在
    const tables = await client`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'knowledge_chunks'
    `
    console.log("\n📋 knowledge_chunks 表:", tables.length > 0 ? "存在 ✅" : "不存在 ❌")

    if (tables.length > 0) {
      // 检查表结构
      const columns = await client`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'knowledge_chunks'
        ORDER BY ordinal_position
      `
      console.log("\n📊 表结构:")
      console.table(columns)

      // 检查数据量
      const count = await client`SELECT COUNT(*) as count FROM knowledge_chunks`
      console.log(`\n📈 现有数据量: ${count[0].count} 条`)
    }

    await client.end()
  } catch (error) {
    console.error("❌ 连接失败:", error)
  }
}

testConnection().catch(console.error)
