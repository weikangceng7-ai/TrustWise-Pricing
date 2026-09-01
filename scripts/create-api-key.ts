/**
 * 直接创建 API Key（跳过登录/注册）
 *
 * 用法: npx tsx scripts/create-api-key.ts
 *
 * 可选环境变量:
 *   DATABASE_URL  - 数据库连接（优先使用 .env.local）
 *   API_KEY_NAME  - Key 名称，默认 "MCP Test Key"
 */

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { nanoid } from "nanoid"
import * as schema from "../src/db/schema"
import { eq } from "drizzle-orm"
import { config } from "dotenv"
import { resolve } from "node:path"

// 加载 .env.local
config({ path: resolve(process.cwd(), ".env.local") })

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error("❌ 未配置 DATABASE_URL，请检查 .env.local")
    process.exit(1)
  }

  const client = postgres(connectionString, { max: 1 })
  const db = drizzle(client, { schema })

  const keyName = process.env.API_KEY_NAME || "MCP Test Key"

  // 1. 查找或创建测试用户
  const testEmail = "mcp-test@sulfur.local"
  let userId: string

  const existingUsers = await db.select().from(schema.user).where(eq(schema.user.email, testEmail)).limit(1)

  if (existingUsers.length > 0) {
    userId = existingUsers[0].id
    console.log(`✅ 使用已有用户: ${testEmail} (${userId})`)
  } else {
    userId = nanoid()
    await db.insert(schema.user).values({
      id: userId,
      name: "MCP Test User",
      email: testEmail,
      emailVerified: true,
      role: "admin",
    })
    console.log(`✅ 创建测试用户: ${testEmail} (${userId})`)
  }

  // 2. 检查已有 API Key 数量
  const existingKeys = await db.select().from(schema.apiKeys).where(eq(schema.apiKeys.userId, userId))
  if (existingKeys.length >= 5) {
    console.error("❌ 该用户 API Key 已达上限（5 个），请先删除旧的")
    process.exit(1)
  }

  // 3. 创建 API Key
  const apiKey = `sk_${nanoid(32)}`
  const keyId = nanoid(16)

  await db.insert(schema.apiKeys).values({
    id: keyId,
    userId,
    key: apiKey,
    name: keyName,
    isActive: true,
    createdAt: new Date(),
  })
  console.log(`✅ API Key 已创建: ${keyName}`)

  // 4. 确保配额记录存在
  const existingQuota = await db.select().from(schema.apiQuotas).where(eq(schema.apiQuotas.userId, userId)).limit(1)
  if (existingQuota.length === 0) {
    const resetAt = new Date()
    resetAt.setMonth(resetAt.getMonth() + 1)
    resetAt.setDate(1)
    resetAt.setHours(0, 0, 0, 0)

    await db.insert(schema.apiQuotas).values({
      userId,
      freeLimit: 10000,
      usedFree: 0,
      paidLimit: 0,
      usedPaid: 0,
      resetAt,
    })
    console.log("✅ 配额已创建: 10000 次免费调用/月")
  } else {
    console.log("✅ 配额已存在")
  }

  // 5. 输出结果
  console.log("\n" + "=".repeat(60))
  console.log("🔑 API Key（请妥善保存，仅显示一次）:")
  console.log("=".repeat(60))
  console.log(`\n  ${apiKey}\n`)
  console.log("=".repeat(60))
  console.log("\n📋 MCP Server 配置（mcp-server/.env）:")
  console.log(`  API_BASE_URL=http://localhost:3000`)
  console.log(`  API_KEY=${apiKey}`)
  console.log(`  INDUSTRY_CODE=sulfur`)
  console.log(`  MCP_TRANSPORT=stdio`)
  console.log(`  DEMO_MODE=false`)
  console.log("\n📋 Claude Desktop 配置 (claude_desktop_config.json):")
  console.log(`  在 mcpServers 中添加:`)
  console.log(`  "sulfur": {`)
  console.log(`    "command": "npx",`)
  console.log(`    "args": ["tsx", "mcp-server/index.ts"],`)
  console.log(`    "cwd": "<项目绝对路径>",`)
  console.log(`    "env": {`)
  console.log(`      "API_BASE_URL": "http://localhost:3000",`)
  console.log(`      "API_KEY": "${apiKey}",`)
  console.log(`      "DEMO_MODE": "false"`)
  console.log(`    }`)
  console.log(`  }`)
  console.log("=".repeat(60))

  await client.end()
}

main().catch((err) => {
  console.error("❌ 执行失败:", err)
  process.exit(1)
})
