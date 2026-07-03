// scripts/setup-api-tables.ts
// 用于在数据库中创建 API 相关表

import postgres from 'postgres'
import { config } from 'dotenv'
config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL 未配置')
  process.exit(1)
}

const sql = postgres(databaseUrl)

async function setupApiTables() {
  try {
    console.log('开始设置 API 相关表...')

    // 1. 添加 phone 唯一约束（如果不存在）
    const constraintExists = await sql`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'user' AND constraint_type = 'UNIQUE' AND constraint_name = 'user_phone_unique'
    `

    if (constraintExists.length === 0) {
      await sql`ALTER TABLE "user" ADD CONSTRAINT "user_phone_unique" UNIQUE (phone)`
      console.log('✓ 已添加 phone 唯一约束')
    } else {
      console.log('• phone 唯一约束已存在')
    }

    // 2. 创建 api_keys 表
    const apiKeysExists = await sql`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'api_keys'
    `

    if (apiKeysExists.length === 0) {
      await sql`
        CREATE TABLE api_keys (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
          key TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          last_used_at TIMESTAMP,
          expires_at TIMESTAMP
        )
      `
      console.log('✓ 已创建 api_keys 表')
    } else {
      console.log('• api_keys 表已存在')
    }

    // 3. 创建 api_quotas 表
    const apiQuotasExists = await sql`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'api_quotas'
    `

    if (apiQuotasExists.length === 0) {
      await sql`
        CREATE TABLE api_quotas (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE UNIQUE,
          free_limit INTEGER NOT NULL DEFAULT 1000,
          used_free INTEGER NOT NULL DEFAULT 0,
          paid_limit INTEGER NOT NULL DEFAULT 0,
          used_paid INTEGER NOT NULL DEFAULT 0,
          reset_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `
      console.log('✓ 已创建 api_quotas 表')
    } else {
      console.log('• api_quotas 表已存在')
    }

    // 4. 创建 api_usage_logs 表
    const apiUsageLogsExists = await sql`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'api_usage_logs'
    `

    if (apiUsageLogsExists.length === 0) {
      await sql`
        CREATE TABLE api_usage_logs (
          id SERIAL PRIMARY KEY,
          api_key_id TEXT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
          endpoint TEXT NOT NULL,
          method TEXT NOT NULL,
          status_code INTEGER NOT NULL,
          response_time INTEGER NOT NULL,
          timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
          error_message TEXT
        )
      `
      console.log('✓ 已创建 api_usage_logs 表')
    } else {
      console.log('• api_usage_logs 表已存在')
    }

    console.log('\n✅ 数据库 schema 设置完成!')
  } catch (error) {
    console.error('❌ 设置失败:', error)
  } finally {
    await sql.end()
  }
}

setupApiTables()