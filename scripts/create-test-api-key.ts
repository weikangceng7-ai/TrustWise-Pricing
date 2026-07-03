/**
 * 创建测试 API Key 的脚本
 * 运行方式: npx tsx scripts/create-test-api-key.ts <email>
 */

import { db } from "@/db"
import { user, apiKeys, apiQuotas } from "@/db/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { createHash } from "crypto"

const API_KEY_PREFIX = "sk_test_"

function generateApiKey(): string {
  const randomPart = nanoid(32)
  return `${API_KEY_PREFIX}${randomPart}`
}

async function createTestApiKey(email: string) {
  if (!db) {
    throw new Error("数据库连接不可用")
  }

  // 查找用户
  const userRecord = await db.select().from(user).where(eq(user.email, email)).limit(1)

  if (userRecord.length === 0) {
    throw new Error(`用户不存在: ${email}`)
  }

  const userId = userRecord[0].id
  console.log(`找到用户: ${userId}`)

  // 检查现有 API Key 数量
  const existingKeys = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId))
  console.log(`现有 API Key 数量: ${existingKeys.length}`)

  // 创建新的 API Key
  const key = generateApiKey()
  const id = nanoid(16)

  const [apiKeyRecord] = await db.insert(apiKeys).values({
    id,
    userId,
    key,
    name: "测试 API Key",
    isActive: true,
    createdAt: new Date(),
  }).returning()

  console.log(`API Key 已创建: ${apiKeyRecord.key}`)

  // 确保用户有配额记录
  const existingQuota = await db.select().from(apiQuotas).where(eq(apiQuotas.userId, userId)).limit(1)

  if (existingQuota.length === 0) {
    // 创建配额记录，设置下月 1 日为重置时间
    const now = new Date()
    const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const [quotaRecord] = await db.insert(apiQuotas).values({
      userId,
      freeLimit: 1000,
      usedFree: 0,
      paidLimit: 0,
      usedPaid: 0,
      resetAt,
    }).returning()

    console.log(`配额记录已创建: 免费额度 ${quotaRecord.freeLimit}`)
  } else {
    console.log(`配额记录已存在: 免费剩余 ${existingQuota[0].freeLimit - existingQuota[0].usedFree}`)
  }

  return apiKeyRecord.key
}

// 从命令行获取 email
const email = process.argv[2]

if (!email) {
  console.error("请提供用户邮箱: npx tsx scripts/create-test-api-key.ts <email>")
  process.exit(1)
}

createTestApiKey(email)
  .then(key => {
    console.log("\n=== 测试 API Key ===")
    console.log(key)
    console.log("\n请使用此 Key 运行测试:")
    console.log(`npx tsx tests/api-server-e2e.ts ${key}`)
    process.exit(0)
  })
  .catch(err => {
    console.error("创建失败:", err.message)
    process.exit(1)
  })