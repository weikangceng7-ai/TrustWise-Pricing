import { config } from "dotenv"
import { resolve } from "node:path"

// 先加载 .env.local
config({ path: resolve(process.cwd(), ".env.local") })

async function main() {
  // 动态导入 db，确保环境变量已加载
  const { db } = await import("../src/db")
  const { sql } = await import("drizzle-orm")

  if (!db) {
    console.error("❌ 数据库不可用，DATABASE_URL:", process.env.DATABASE_URL?.slice(0, 30) + "...")
    process.exit(1)
  }

  console.log("🔄 开始数据库迁移...")

  try {
    console.log("1. 修改 api_keys.user_id 为可空...")
    await db.execute(sql`ALTER TABLE api_keys ALTER COLUMN user_id DROP NOT NULL`)
    console.log("   ✅ 完成")
  } catch (e: any) {
    console.log("   ⚠️  已修改或出错:", e.message)
  }

  try {
    console.log("2. 修改 api_quotas.user_id 为可空...")
    await db.execute(sql`ALTER TABLE api_quotas ALTER COLUMN user_id DROP NOT NULL`)
    console.log("   ✅ 完成")
  } catch (e: any) {
    console.log("   ⚠️  已修改或出错:", e.message)
  }

  try {
    console.log("3. 添加 api_quotas.api_key_id 列...")
    await db.execute(sql`ALTER TABLE api_quotas ADD COLUMN IF NOT EXISTS api_key_id TEXT REFERENCES api_keys(id) ON DELETE CASCADE`)
    console.log("   ✅ 完成")
  } catch (e: any) {
    console.log("   ⚠️  已存在或出错:", e.message)
  }

  try {
    console.log("4. 添加 api_quotas.api_key_id 唯一约束...")
    await db.execute(sql`ALTER TABLE api_quotas ADD CONSTRAINT api_quotas_api_key_id_unique UNIQUE (api_key_id)`)
    console.log("   ✅ 完成")
  } catch (e: any) {
    console.log("   ⚠️  约束已存在或出错:", e.message)
  }

  console.log("\n✅ 数据库迁移完成")
  process.exit(0)
}

main().catch(e => {
  console.error("❌ 迁移失败:", e)
  process.exit(1)
})
