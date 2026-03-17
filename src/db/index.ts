import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

// 数据库连接配置
const connectionString = process.env.DATABASE_URL || ""

// 判断是否使用真实数据库
const useRealDb = Boolean(connectionString)

// 创建数据库连接（仅在配置了 DATABASE_URL 时）
let db: ReturnType<typeof drizzle> | null = null

if (useRealDb) {
  const client = postgres(connectionString)
  db = drizzle(client, { schema })
}

export { db, schema }
export * from "./schema"
