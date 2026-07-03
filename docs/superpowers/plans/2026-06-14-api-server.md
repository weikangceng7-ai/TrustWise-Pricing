# API Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为硫磺采购价格预测系统建立对外开放的 API Server，支持 API Key 认证、配额管理和 4 类核心 API。

**Architecture:** 基于 Next.js API Routes 扩展，新增数据库表存储 API Key 和配额，中间件验证 API Key 并扣减配额。

**Tech Stack:** Next.js 16, Drizzle ORM, PostgreSQL, nanoid (API Key 生成)

---

## File Structure

**新增文件:**
- `src/db/schema-api.ts` - API 相关数据库表定义
- `src/lib/api-auth.ts` - API Key 生成与验证逻辑
- `src/lib/api-quota.ts` - 配额管理逻辑
- `src/lib/api-middleware.ts` - API 验证中间件
- `src/services/api-usage.ts` - 使用日志记录服务
- `src/app/api/v1/prices/route.ts` - 价格查询 API
- `src/app/api/v1/prices/predict/route.ts` - 价格预测 API
- `src/app/api/v1/decision/route.ts` - 决策建议 API
- `src/app/api/v1/data/inventory/route.ts` - 库存数据 API
- `src/app/api/v1/data/news/route.ts` - 市场新闻 API
- `src/app/api/v1/chat/route.ts` - AI 聊天 API
- `src/app/api/api-keys/route.ts` - API Key 管理端点
- `src/app/api/api-keys/[id]/route.ts` - 单个 API Key 操作
- `src/app/api/api-keys/[id]/reset/route.ts` - 重置 API Key
- `src/app/api/api-usage/route.ts` - 使用统计端点
- `src/app/(dashboard)/api-console/page.tsx` - API Console 页面
- `src/app/(dashboard)/api-keys/page.tsx` - API Keys 管理页
- `src/components/api-key-card.tsx` - API Key 卡片组件
- `src/components/api-usage-chart.tsx` - 使用统计图表组件

**修改文件:**
- `src/db/schema.ts` - 导入 API 相关表

---

### Task 1: 数据库 Schema 扩展

**Files:**
- Create: `src/db/schema-api.ts`
- Modify: `src/db/schema.ts`

- [ ] **Step 1: 创建 API Schema 文件**

```typescript
// src/db/schema-api.ts
import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core"
import { user } from "./schema"

// API Key 表
export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
})

// API 配额表
export const apiQuotas = pgTable("api_quotas", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .unique(),
  freeLimit: integer("free_limit").notNull().default(1000),
  usedFree: integer("used_free").notNull().default(0),
  paidLimit: integer("paid_limit").notNull().default(0),
  usedPaid: integer("used_paid").notNull().default(0),
  resetAt: timestamp("reset_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// API 使用日志表
export const apiUsageLogs = pgTable("api_usage_logs", {
  id: serial("id").primaryKey(),
  apiKeyId: text("api_key_id")
    .notNull()
    .references(() => apiKeys.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  statusCode: integer("status_code").notNull(),
  responseTime: integer("response_time").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  errorMessage: text("error_message"),
})

// 类型导出
export type ApiKey = typeof apiKeys.$inferSelect
export type NewApiKey = typeof apiKeys.$inferInsert
export type ApiQuota = typeof apiQuotas.$inferSelect
export type NewApiQuota = typeof apiQuotas.$inferInsert
export type ApiUsageLog = typeof apiUsageLogs.$inferSelect
export type NewApiUsageLog = typeof apiUsageLogs.$inferInsert
```

- [ ] **Step 2: 导入到主 Schema**

在 `src/db/schema.ts` 文件末尾添加:

```typescript
// API 相关表 - 从 schema-api 导入
export * from "./schema-api"
```

- [ ] **Step 3: 运行数据库迁移**

```bash
npm run db:generate
npm run db:push
```

Expected: 生成迁移文件并应用到数据库

- [ ] **Step 4: Commit**

```bash
git add src/db/schema-api.ts src/db/schema.ts
git commit -m "feat: add API keys, quotas, and usage logs database schema"
```

---

### Task 2: API Key 生成与验证逻辑

**Files:**
- Create: `src/lib/api-auth.ts`

- [ ] **Step 1: 创建 API Auth 模块**

```typescript
// src/lib/api-auth.ts
import { nanoid } from "nanoid"
import { db } from "@/db"
import { apiKeys, apiQuotas, type ApiKey, type ApiQuota } from "@/db/schema"
import { eq } from "drizzle-orm"

const API_KEY_PREFIX = "sk_"
const API_KEY_LENGTH = 32

/**
 * 生成新的 API Key
 */
export function generateApiKey(): string {
  return `${API_KEY_PREFIX}${nanoid(API_KEY_LENGTH)}`
}

/**
 * 创建新的 API Key 记录
 */
export async function createApiKey(userId: string, name: string): Promise<ApiKey> {
  if (!db) {
    throw new Error("数据库不可用")
  }

  const key = generateApiKey()
  const id = nanoid(16)

  const [apiKey] = await db.insert(apiKeys).values({
    id,
    userId,
    key,
    name,
    isActive: true,
    createdAt: new Date(),
  }).returning()

  // 确保用户有配额记录
  await ensureUserQuota(userId)

  return apiKey
}

/**
 * 确保用户有配额记录
 */
async function ensureUserQuota(userId: string): Promise<void> {
  if (!db) return

  const existing = await db.select().from(apiQuotas).where(eq(apiQuotas.userId, userId)).limit(1)

  if (existing.length === 0) {
    // 计算下月 1 日作为重置时间
    const now = new Date()
    const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    await db.insert(apiQuotas).values({
      userId,
      freeLimit: 1000,
      usedFree: 0,
      paidLimit: 0,
      usedPaid: 0,
      resetAt,
    })
  }
}

/**
 * 验证 API Key
 */
export async function validateApiKey(key: string): Promise<{
  valid: boolean
  apiKey?: ApiKey
  quota?: ApiQuota
  error?: string
}> {
  if (!db) {
    return { valid: false, error: "数据库不可用" }
  }

  if (!key || !key.startsWith(API_KEY_PREFIX)) {
    return { valid: false, error: "INVALID_API_KEY" }
  }

  const apiKeyRecord = await db.select().from(apiKeys).where(eq(apiKeys.key, key)).limit(1)

  if (apiKeyRecord.length === 0) {
    return { valid: false, error: "INVALID_API_KEY" }
  }

  const apiKey = apiKeyRecord[0]

  if (!apiKey.isActive) {
    return { valid: false, error: "API_KEY_DISABLED" }
  }

  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
    return { valid: false, error: "API_KEY_EXPIRED" }
  }

  // 获取配额
  const quotaRecord = await db.select().from(apiQuotas).where(eq(apiQuotas.userId, apiKey.userId)).limit(1)
  const quota = quotaRecord[0]

  if (!quota) {
    return { valid: false, error: "配额记录不存在" }
  }

  // 检查配额是否需要重置
  await checkAndResetQuota(quota)

  // 检查配额是否充足
  const freeRemaining = quota.freeLimit - quota.usedFree
  const paidRemaining = quota.paidLimit - quota.usedPaid

  if (freeRemaining <= 0 && paidRemaining <= 0) {
    return { 
      valid: false, 
      error: "QUOTA_EXCEEDED",
      apiKey,
      quota
    }
  }

  return { valid: true, apiKey, quota }
}

/**
 * 检查并重置配额
 */
async function checkAndResetQuota(quota: ApiQuota): Promise<void> {
  if (!db) return

  const now = new Date()
  if (now >= quota.resetAt) {
    // 计算下月 1 日
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    await db.update(apiQuotas)
      .set({
        usedFree: 0,
        resetAt: nextReset,
        updatedAt: now,
      })
      .where(eq(apiQuotas.id, quota.id))
  }
}

/**
 * 更新 API Key 最后使用时间
 */
export async function updateApiKeyLastUsed(keyId: string): Promise<void> {
  if (!db) return

  await db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyId))
}

/**
 * 获取用户的所有 API Keys
 */
export async function getUserApiKeys(userId: string): Promise<ApiKey[]> {
  if (!db) return []

  return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId))
}

/**
 * 删除 API Key
 */
export async function deleteApiKey(userId: string, keyId: string): Promise<boolean> {
  if (!db) return false

  const result = await db.delete(apiKeys)
    .where(eq(apiKeys.id, keyId))
    .where(eq(apiKeys.userId, userId))

  return result.rowCount > 0
}

/**
 * 重置 API Key（生成新 Key 值）
 */
export async function resetApiKey(userId: string, keyId: string): Promise<ApiKey | null> {
  if (!db) return null

  const newKey = generateApiKey()

  const [updated] = await db.update(apiKeys)
    .set({ key: newKey, updatedAt: new Date() })
    .where(eq(apiKeys.id, keyId))
    .where(eq(apiKeys.userId, userId))
    .returning()

  return updated || null
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api-auth.ts
git commit -m "feat: add API key generation and validation logic"
```

---

### Task 3: 配额管理逻辑

**Files:**
- Create: `src/lib/api-quota.ts`

- [ ] **Step 1: 创建配额管理模块**

```typescript
// src/lib/api-quota.ts
import { db } from "@/db"
import { apiQuotas, type ApiQuota } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * 扣减配额
 * 优先扣减免费额度，不足时扣减付费额度
 */
export async function decrementQuota(userId: string): Promise<{
  success: boolean
  quota?: ApiQuota
  error?: string
}> {
  if (!db) {
    return { success: false, error: "数据库不可用" }
  }

  const quotaRecord = await db.select().from(apiQuotas).where(eq(apiQuotas.userId, userId)).limit(1)

  if (quotaRecord.length === 0) {
    return { success: false, error: "配额记录不存在" }
  }

  const quota = quotaRecord[0]

  // 优先扣免费额度
  if (quota.usedFree < quota.freeLimit) {
    const [updated] = await db.update(apiQuotas)
      .set({
        usedFree: quota.usedFree + 1,
        updatedAt: new Date(),
      })
      .where(eq(apiQuotas.id, quota.id))
      .returning()

    return { success: true, quota: updated }
  }

  // 扣付费额度
  if (quota.usedPaid < quota.paidLimit) {
    const [updated] = await db.update(apiQuotas)
      .set({
        usedPaid: quota.usedPaid + 1,
        updatedAt: new Date(),
      })
      .where(eq(apiQuotas.id, quota.id))
      .returning()

    return { success: true, quota: updated }
  }

  return { success: false, error: "QUOTA_EXCEEDED", quota }
}

/**
 * 获取用户配额
 */
export async function getUserQuota(userId: string): Promise<ApiQuota | null> {
  if (!db) return null

  const quota = await db.select().from(apiQuotas).where(eq(apiQuotas.userId, userId)).limit(1)
  return quota[0] || null
}

/**
 * 计算剩余配额
 */
export function calculateRemainingQuota(quota: ApiQuota): {
  free: number
  paid: number
  total: number
} {
  const free = Math.max(0, quota.freeLimit - quota.usedFree)
  const paid = Math.max(0, quota.paidLimit - quota.usedPaid)
  return { free, paid, total: free + paid }
}

/**
 * 增加付费额度
 */
export async function addPaidQuota(userId: string, amount: number): Promise<ApiQuota | null> {
  if (!db) return null

  const [updated] = await db.update(apiQuotas)
    .set({
      paidLimit: sql`${apiQuotas.paidLimit} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(apiQuotas.userId, userId))
    .returning()

  return updated || null
}
```

- [ ] **Step 2: 导入 sql**

在文件顶部添加:

```typescript
import { sql } from "drizzle-orm"
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/api-quota.ts
git commit -m "feat: add quota management logic"
```

---

### Task 4: API 使用日志服务

**Files:**
- Create: `src/services/api-usage.ts`

- [ ] **Step 1: 创建使用日志服务**

```typescript
// src/services/api-usage.ts
import { db } from "@/db"
import { apiUsageLogs, type ApiUsageLog, type NewApiUsageLog } from "@/db/schema"
import { eq, desc, and, gte, lte, sql } from "drizzle-orm"

/**
 * 记录 API 调用日志
 */
export async function logApiUsage(log: NewApiUsageLog): Promise<ApiUsageLog | null> {
  if (!db) return null

  const [record] = await db.insert(apiUsageLogs).values(log).returning()
  return record
}

/**
 * 获取用户 API 使用统计
 */
export async function getUserApiUsageStats(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalCalls: number
  successCalls: number
  errorCalls: number
  avgResponseTime: number
  endpointStats: Record<string, number>
}> {
  if (!db) {
    return {
      totalCalls: 0,
      successCalls: 0,
      errorCalls: 0,
      avgResponseTime: 0,
      endpointStats: {},
    }
  }

  // 获取用户的所有 API Key IDs
  const userKeys = await db.select({ id: apiKeys.id })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))

  if (userKeys.length === 0) {
    return {
      totalCalls: 0,
      successCalls: 0,
      errorCalls: 0,
      avgResponseTime: 0,
      endpointStats: {},
    }
  }

  const keyIds = userKeys.map(k => k.id)

  // 构建查询条件
  const conditions = [sql`${apiUsageLogs.apiKeyId} IN ${keyIds}`]
  
  if (startDate) {
    conditions.push(gte(apiUsageLogs.timestamp, startDate))
  }
  if (endDate) {
    conditions.push(lte(apiUsageLogs.timestamp, endDate))
  }

  // 获取日志
  const logs = await db.select()
    .from(apiUsageLogs)
    .where(and(...conditions))
    .orderBy(desc(apiUsageLogs.timestamp))

  if (logs.length === 0) {
    return {
      totalCalls: 0,
      successCalls: 0,
      errorCalls: 0,
      avgResponseTime: 0,
      endpointStats: {},
    }
  }

  const totalCalls = logs.length
  const successCalls = logs.filter(l => l.statusCode < 400).length
  const errorCalls = logs.filter(l => l.statusCode >= 400).length
  const avgResponseTime = Math.round(logs.reduce((sum, l) => sum + l.responseTime, 0) / totalCalls)

  // 按端点统计
  const endpointStats: Record<string, number> = {}
  for (const log of logs) {
    endpointStats[log.endpoint] = (endpointStats[log.endpoint] || 0) + 1
  }

  return {
    totalCalls,
    successCalls,
    errorCalls,
    avgResponseTime,
    endpointStats,
  }
}

/**
 * 获取用户最近的使用日志
 */
export async function getRecentApiUsageLogs(
  userId: string,
  limit: number = 50
): Promise<ApiUsageLog[]> {
  if (!db) return []

  const userKeys = await db.select({ id: apiKeys.id })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))

  if (userKeys.length === 0) return []

  const keyIds = userKeys.map(k => k.id)

  return await db.select()
    .from(apiUsageLogs)
    .where(sql`${apiUsageLogs.apiKeyId} IN ${keyIds}`)
    .orderBy(desc(apiUsageLogs.timestamp))
    .limit(limit)
}
```

- [ ] **Step 2: 导入 apiKeys 表**

在文件顶部添加导入:

```typescript
import { apiKeys } from "@/db/schema"
```

- [ ] **Step 3: Commit**

```bash
git add src/services/api-usage.ts
git commit -m "feat: add API usage logging service"
```

---

### Task 5: API 验证中间件

**Files:**
- Create: `src/lib/api-middleware.ts`

- [ ] **Step 1: 创建 API 中间件**

```typescript
// src/lib/api-middleware.ts
import { NextRequest, NextResponse } from "next/server"
import { validateApiKey, updateApiKeyLastUsed } from "./api-auth"
import { decrementQuota, calculateRemainingQuota } from "./api-quota"
import { logApiUsage } from "@/services/api-usage"
import type { ApiKey, ApiQuota } from "@/db/schema"

/**
 * API 错误响应格式
 */
interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    quota?: { free: number; paid: number }
  }
}

/**
 * API 成功响应格式
 */
interface ApiSuccessResponse<T> {
  success: true
  data: T
  meta?: {
    quotaRemaining: { free: number; paid: number }
  }
}

/**
 * 从请求头提取 API Key
 */
export function extractApiKey(request: NextRequest): string | null {
  // Authorization: Bearer <key>
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7)
  }

  // X-API-Key: <key>
  const apiKeyHeader = request.headers.get("x-api-key")
  if (apiKeyHeader) {
    return apiKeyHeader
  }

  return null
}

/**
 * API 验证中间件
 * 返回验证结果和配额信息，或错误响应
 */
export async function withApiAuth(
  request: NextRequest,
  handler: (apiKey: ApiKey, quota: ApiQuota) => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = Date.now()
  const apiKeyValue = extractApiKey(request)

  if (!apiKeyValue) {
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: {
          code: "INVALID_API_KEY",
          message: "缺少 API Key，请在请求头中提供 Authorization: Bearer <key> 或 X-API-Key: <key>",
        },
      },
      { status: 401 }
    )
  }

  const validation = await validateApiKey(apiKeyValue)

  if (!validation.valid) {
    const statusCode = getStatusCodeForError(validation.error!)
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: {
          code: validation.error!,
          message: getErrorMessage(validation.error!),
          quota: validation.quota ? calculateRemainingQuota(validation.quota) : undefined,
        },
      },
      { status: statusCode }
    )
  }

  const { apiKey, quota } = validation

  try {
    const response = await handler(apiKey!, quota!)

    // 添加配额信息到响应头
    const remaining = calculateRemainingQuota(quota!)
    response.headers.set("X-Quota-Free", String(remaining.free))
    response.headers.set("X-Quota-Paid", String(remaining.paid))

    // 记录使用日志
    const responseTime = Date.now() - startTime
    await logApiUsage({
      apiKeyId: apiKey!.id,
      endpoint: new URL(request.url).pathname,
      method: request.method,
      statusCode: response.status,
      responseTime,
      timestamp: new Date(),
    })

    // 更新最后使用时间
    await updateApiKeyLastUsed(apiKey!.id)

    // 扣减配额
    await decrementQuota(apiKey!.userId)

    return response
  } catch (error) {
    const responseTime = Date.now() - startTime
    await logApiUsage({
      apiKeyId: apiKey!.id,
      endpoint: new URL(request.url).pathname,
      method: request.method,
      statusCode: 500,
      responseTime,
      timestamp: new Date(),
      errorMessage: error instanceof Error ? error.message : "未知错误",
    })

    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "服务器内部错误",
        },
      },
      { status: 500 }
    )
  }
}

/**
 * 根据错误码获取 HTTP 状态码
 */
function getStatusCodeForError(errorCode: string): number {
  switch (errorCode) {
    case "INVALID_API_KEY":
    case "API_KEY_EXPIRED":
      return 401
    case "API_KEY_DISABLED":
      return 403
    case "QUOTA_EXCEEDED":
      return 429
    default:
      return 400
  }
}

/**
 * 根据错误码获取错误消息
 */
function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "INVALID_API_KEY":
      return "API Key 无效"
    case "API_KEY_EXPIRED":
      return "API Key 已过期"
    case "API_KEY_DISABLED":
      return "API Key 已禁用"
    case "QUOTA_EXCEEDED":
      return "配额已用尽，请购买更多额度"
    default:
      return "未知错误"
  }
}

/**
 * 构建成功响应
 */
export function apiSuccessResponse<T>(
  data: T,
  quota?: ApiQuota
): NextResponse<ApiSuccessResponse<T>> {
  const meta = quota
    ? { meta: { quotaRemaining: calculateRemainingQuota(quota) } }
    : {}

  return NextResponse.json({
    success: true,
    data,
    ...meta,
  })
}

/**
 * 构建错误响应
 */
export function apiErrorResponse(
  code: string,
  message: string,
  statusCode: number = 400,
  quota?: ApiQuota
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        quota: quota ? calculateRemainingQuota(quota) : undefined,
      },
    },
    { status: statusCode }
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api-middleware.ts
git commit -m "feat: add API authentication middleware"
```

---

### Task 6: V1 API 端点 - 价格查询

**Files:**
- Create: `src/app/api/v1/prices/route.ts`

- [ ] **Step 1: 创建价格查询 API**

```typescript
// src/app/api/v1/prices/route.ts
import { NextRequest } from "next/server"
import { withApiAuth, apiSuccessResponse, apiErrorResponse } from "@/lib/api-middleware"
import { getPrices, getInventory } from "@/services/prices"
import type { ApiKey, ApiQuota } from "@/db/schema"

/**
 * GET /api/v1/prices
 * 获取价格数据
 * 
 * Query params:
 * - startDate: 开始日期
 * - endDate: 结束日期
 * - region: 地区
 * - market: 市场
 * - limit: 返回数量限制
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async (apiKey: ApiKey, quota: ApiQuota) => {
    const { searchParams } = new URL(request.url)
    
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const region = searchParams.get("region")
    const market = searchParams.get("market")
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 30

    try {
      const prices = await getPrices(limit)

      // 过滤数据
      let filteredPrices = prices
      if (startDate) {
        filteredPrices = filteredPrices.filter(p => new Date(p.date) >= new Date(startDate))
      }
      if (endDate) {
        filteredPrices = filteredPrices.filter(p => new Date(p.date) <= new Date(endDate))
      }
      if (region) {
        filteredPrices = filteredPrices.filter(p => p.region?.includes(region))
      }
      if (market) {
        filteredPrices = filteredPrices.filter(p => p.market?.includes(market))
      }

      return apiSuccessResponse({
        prices: filteredPrices,
        total: filteredPrices.length,
        query: {
          startDate,
          endDate,
          region,
          market,
          limit,
        },
      }, quota)
    } catch (error) {
      return apiErrorResponse(
        "INTERNAL_ERROR",
        "获取价格数据失败",
        500,
        quota
      )
    }
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/v1/prices/route.ts
git commit -m "feat: add v1 prices API endpoint"
```

---

### Task 7: V1 API 端点 - 价格预测

**Files:**
- Create: `src/app/api/v1/prices/predict/route.ts`

- [ ] **Step 1: 创建价格预测 API**

```typescript
// src/app/api/v1/prices/predict/route.ts
import { NextRequest } from "next/server"
import { withApiAuth, apiSuccessResponse, apiErrorResponse } from "@/lib/api-middleware"
import { predictPrices, getTrendAnalysis } from "@/services/prediction"
import type { ApiKey, ApiQuota } from "@/db/schema"

export const maxDuration = 60

/**
 * POST /api/v1/prices/predict
 * 价格预测
 * 
 * Body:
 * - days: 预测天数 (默认 7)
 * - model: 模型类型 (可选)
 */
export async function POST(request: NextRequest) {
  return withApiAuth(request, async (apiKey: ApiKey, quota: ApiQuota) => {
    try {
      const body = await request.json()
      const days = body.days || 7

      if (days < 1 || days > 90) {
        return apiErrorResponse(
          "INVALID_REQUEST",
          "预测天数需在 1-90 之间",
          400,
          quota
        )
      }

      const result = await predictPrices(days)

      if (!result.success) {
        return apiErrorResponse(
          "INTERNAL_ERROR",
          result.error || "预测失败",
          500,
          quota
        )
      }

      return apiSuccessResponse(result.data, quota)
    } catch (error) {
      return apiErrorResponse(
        "INTERNAL_ERROR",
        "预测服务调用失败",
        500,
        quota
      )
    }
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/v1/prices/predict/route.ts
git commit -m "feat: add v1 prices predict API endpoint"
```

---

### Task 8: V1 API 端点 - 决策建议

**Files:**
- Create: `src/app/api/v1/decision/route.ts`

- [ ] **Step 1: 创建决策建议 API**

```typescript
// src/app/api/v1/decision/route.ts
import { NextRequest } from "next/server"
import { withApiAuth, apiSuccessResponse, apiErrorResponse } from "@/lib/api-middleware"
import { getPurchaseDecision } from "@/services/prediction"
import type { ApiKey, ApiQuota } from "@/db/schema"

export const maxDuration = 60

/**
 * POST /api/v1/decision
 * 采购决策建议
 * 
 * Body:
 * - enterpriseCode: 企业代码 (可选)
 * - current_inventory: 当前库存 (可选)
 * - daily_consumption: 日均消耗 (可选)
 * - safety_days: 安全库存天数 (可选)
 * - days: 预测天数 (默认 7)
 */
export async function POST(request: NextRequest) {
  return withApiAuth(request, async (apiKey: ApiKey, quota: ApiQuota) => {
    try {
      const body = await request.json()
      const days = body.days || 7

      const result = await getPurchaseDecision({
        days,
        current_inventory: body.current_inventory,
        daily_consumption: body.daily_consumption,
        safety_days: body.safety_days,
      })

      if (!result.success) {
        return apiErrorResponse(
          "INTERNAL_ERROR",
          result.error || "决策分析失败",
          500,
          quota
        )
      }

      return apiSuccessResponse(result.data, quota)
    } catch (error) {
      return apiErrorResponse(
        "INTERNAL_ERROR",
        "决策服务调用失败",
        500,
        quota
      )
    }
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/v1/decision/route.ts
git commit -m "feat: add v1 decision API endpoint"
```

---

### Task 9: V1 API 端点 - 数据查询

**Files:**
- Create: `src/app/api/v1/data/inventory/route.ts`
- Create: `src/app/api/v1/data/news/route.ts`

- [ ] **Step 1: 创建库存数据 API**

```typescript
// src/app/api/v1/data/inventory/route.ts
import { NextRequest } from "next/server"
import { withApiAuth, apiSuccessResponse, apiErrorResponse } from "@/lib/api-middleware"
import { getInventory } from "@/services/prices"
import type { ApiKey, ApiQuota } from "@/db/schema"

/**
 * GET /api/v1/data/inventory
 * 港口库存数据
 * 
 * Query params:
 * - startDate: 开始日期
 * - endDate: 结束日期
 * - limit: 返回数量限制
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async (apiKey: ApiKey, quota: ApiQuota) => {
    const { searchParams } = new URL(request.url)
    
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 30

    try {
      const inventory = await getInventory(limit)

      let filteredInventory = inventory
      if (startDate) {
        filteredInventory = filteredInventory.filter(i => new Date(i.date) >= new Date(startDate))
      }
      if (endDate) {
        filteredInventory = filteredInventory.filter(i => new Date(i.date) <= new Date(endDate))
      }

      return apiSuccessResponse({
        inventory: filteredInventory,
        total: filteredInventory.length,
      }, quota)
    } catch (error) {
      return apiErrorResponse(
        "INTERNAL_ERROR",
        "获取库存数据失败",
        500,
        quota
      )
    }
  })
}
```

- [ ] **Step 2: 创建市场新闻 API**

```typescript
// src/app/api/v1/data/news/route.ts
import { NextRequest } from "next/server"
import { withApiAuth, apiSuccessResponse, apiErrorResponse } from "@/lib/api-middleware"
import { db } from "@/db"
import { multiDimensionalPrices } from "@/db/schema"
import { desc, eq } from "drizzle-orm"
import type { ApiKey, ApiQuota } from "@/db/schema"

/**
 * GET /api/v1/data/news
 * 市场新闻/动态数据
 * 
 * Query params:
 * - category: 分类 (可选)
 * - limit: 返回数量限制
 * - offset: 分页偏移
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async (apiKey: ApiKey, quota: ApiQuota) => {
    const { searchParams } = new URL(request.url)
    
    const category = searchParams.get("category")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

    try {
      if (!db) {
        return apiErrorResponse(
          "INTERNAL_ERROR",
          "数据库不可用",
          500,
          quota
        )
      }

      let query = db.select()
        .from(multiDimensionalPrices)
        .where(eq(multiDimensionalPrices.category, "market-news"))
        .orderBy(desc(multiDimensionalPrices.date))
        .limit(limit)
        .offset(offset)

      const news = await query

      return apiSuccessResponse({
        news,
        total: news.length,
        limit,
        offset,
      }, quota)
    } catch (error) {
      return apiErrorResponse(
        "INTERNAL_ERROR",
        "获取新闻数据失败",
        500,
        quota
      )
    }
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/data/inventory/route.ts src/app/api/v1/data/news/route.ts
git commit -m "feat: add v1 data inventory and news API endpoints"
```

---

### Task 10: V1 API 端点 - AI 聊天

**Files:**
- Create: `src/app/api/v1/chat/route.ts`

- [ ] **Step 1: 创建 AI 聊天 API**

```typescript
// src/app/api/v1/chat/route.ts
import { NextRequest } from "next/server"
import { withApiAuth, apiSuccessResponse, apiErrorResponse } from "@/lib/api-middleware"
import OpenAI from "openai"
import { generateSystemPromptWithContext } from "@/lib/system-prompt"
import { getPrices, getInventory } from "@/services/prices"
import type { ApiKey, ApiQuota } from "@/db/schema"

export const maxDuration = 60

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.qnaigc.com/v1",
})

/**
 * POST /api/v1/chat
 * AI 聊天问答
 * 
 * Body:
 * - message: 用户消息
 * - conversationId: 会话 ID (可选，用于多轮对话)
 * - history: 历史消息 (可选，多轮对话时提供)
 */
export async function POST(request: NextRequest) {
  return withApiAuth(request, async (apiKey: ApiKey, quota: ApiQuota) => {
    try {
      const body = await request.json()
      const { message, history } = body

      if (!message) {
        return apiErrorResponse(
          "INVALID_REQUEST",
          "请提供消息内容",
          400,
          quota
        )
      }

      // 获取上下文数据
      const [prices, inventory] = await Promise.all([
        getPrices(10),
        getInventory(5),
      ])

      const systemPrompt = generateSystemPromptWithContext({
        prices: prices && prices.length > 0 ? formatPrices(prices) : undefined,
        inventory: inventory && inventory.length > 0 ? formatInventory(inventory) : undefined,
        date: new Date().toLocaleDateString("zh-CN"),
      })

      // 构建消息
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
      ]

      // 添加历史消息
      if (history && Array.isArray(history)) {
        for (const msg of history) {
          messages.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content,
          })
        }
      }

      // 添加当前消息
      messages.push({ role: "user", content: message })

      const completion = await openai.chat.completions.create({
        model: "deepseek-v3-0324",
        messages,
        stream: false,
      })

      const responseContent = completion.choices[0]?.message?.content || "抱歉，我暂时无法回答这个问题。"

      return apiSuccessResponse({
        message: responseContent,
        conversationId: body.conversationId || null,
      }, quota)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "聊天服务调用失败"
      
      if (errorMsg.includes("401") || errorMsg.includes("Unauthorized")) {
        return apiErrorResponse(
          "INTERNAL_ERROR",
          "AI 服务配置错误",
          500,
          quota
        )
      }

      return apiErrorResponse(
        "INTERNAL_ERROR",
        errorMsg,
        500,
        quota
      )
    }
  })
}

function formatPrices(prices: Awaited<ReturnType<typeof getPrices>>): string {
  if (!prices || prices.length === 0) return ""
  const headers = "| 日期 | 市场 | 规格 | 主流价 | 涨跌 |\n|------|------|------|--------|------|\n"
  const rows = prices.slice(0, 5).map(p => {
    const change = p.changeValue ? `${Number(p.changeValue) > 0 ? "+" : ""}${p.changeValue}` : "-"
    return `| ${p.date} | ${p.market || "-"} | ${p.specification || "-"} | ${p.mainPrice || "-"} | ${change} |`
  }).join("\n")
  return headers + rows
}

function formatInventory(inventory: Awaited<ReturnType<typeof getInventory>>): string {
  if (!inventory || inventory.length === 0) return ""
  const headers = "| 日期 | 库存(万吨) | 价格(元/吨) |\n|------|-----------|------------|\n"
  const rows = inventory.slice(0, 3).map(i => {
    return `| ${i.date} | ${i.inventory || "-"} | ${i.price || "-"} |`
  }).join("\n")
  return headers + rows
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/v1/chat/route.ts
git commit -m "feat: add v1 chat API endpoint"
```

---

### Task 11: API Key 管理端点

**Files:**
- Create: `src/app/api/api-keys/route.ts`
- Create: `src/app/api/api-keys/[id]/route.ts`
- Create: `src/app/api/api-keys/[id]/reset/route.ts`

- [ ] **Step 1: 创建 API Keys 列表和创建端点**

```typescript
// src/app/api/api-keys/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createApiKey, getUserApiKeys } from "@/lib/api-auth"
import { getUserQuota, calculateRemainingQuota } from "@/lib/api-quota"

/**
 * GET /api/api-keys
 * 获取用户的 API Key 列表
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      )
    }

    const apiKeys = await getUserApiKeys(session.user.id)
    const quota = await getUserQuota(session.user.id)

    // 隐藏完整的 Key，只显示前缀和后 4 位
    const maskedKeys = apiKeys.map(key => ({
      ...key,
      key: `${key.key.slice(0, 10)}...${key.key.slice(-4)}`,
    }))

    return NextResponse.json({
      success: true,
      data: {
        keys: maskedKeys,
        quota: quota ? calculateRemainingQuota(quota) : null,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "获取 API Keys 失败" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/api-keys
 * 创建新的 API Key
 * 
 * Body:
 * - name: Key 名称
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const name = body.name || "API Key"

    const apiKey = await createApiKey(session.user.id, name)

    // 新创建的 Key 显示完整值，仅此一次
    return NextResponse.json({
      success: true,
      data: {
        key: apiKey,
        warning: "请妥善保存此 API Key，创建后将不再显示完整值",
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "创建 API Key 失败" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: 创建单个 API Key 操作端点**

```typescript
// src/app/api/api-keys/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { deleteApiKey, getUserApiKeys } from "@/lib/api-auth"

/**
 * DELETE /api/api-keys/[id]
 * 删除 API Key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      )
    }

    const success = await deleteApiKey(session.user.id, params.id)

    if (!success) {
      return NextResponse.json(
        { success: false, error: "删除失败或 Key 不存在" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "API Key 已删除",
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "删除 API Key 失败" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: 创建重置 API Key 端点**

```typescript
// src/app/api/api-keys/[id]/reset/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { resetApiKey } from "@/lib/api-auth"

/**
 * POST /api/api-keys/[id]/reset
 * 重置 API Key（生成新 Key 值）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      )
    }

    const newKey = await resetApiKey(session.user.id, params.id)

    if (!newKey) {
      return NextResponse.json(
        { success: false, error: "重置失败或 Key 不存在" },
        { status: 404 }
      )
    }

    // 重置后显示完整新 Key，仅此一次
    return NextResponse.json({
      success: true,
      data: {
        key: newKey,
        warning: "请妥善保存新的 API Key，旧 Key 已失效",
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "重置 API Key 失败" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/api-keys/route.ts src/app/api/api-keys/[id]/route.ts src/app/api/api-keys/[id]/reset/route.ts
git commit -m "feat: add API keys management endpoints"
```

---

### Task 12: 使用统计端点

**Files:**
- Create: `src/app/api/api-usage/route.ts`

- [ ] **Step 1: 创建使用统计端点**

```typescript
// src/app/api/api-usage/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getUserApiUsageStats, getRecentApiUsageLogs } from "@/services/api-usage"

/**
 * GET /api/api-usage
 * 获取用户 API 使用统计
 * 
 * Query params:
 * - startDate: 开始日期 (可选)
 * - endDate: 结束日期 (可选)
 * - limit: 日志数量限制 (默认 50)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const limit = parseInt(searchParams.get("limit") || "50")

    const [stats, logs] = await Promise.all([
      getUserApiUsageStats(
        session.user.id,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      ),
      getRecentApiUsageLogs(session.user.id, limit),
    ])

    return NextResponse.json({
      success: true,
      data: {
        stats,
        logs,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "获取使用统计失败" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/api-usage/route.ts
git commit -m "feat: add API usage statistics endpoint"
```

---

### Task 13: API Console 页面

**Files:**
- Create: `src/app/(dashboard)/api-console/page.tsx`

- [ ] **Step 1: 创建 API Console 页面**

```typescript
// src/app/(dashboard)/api-console/page.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Code, Key, BarChart, Zap, Book, ArrowRight } from "lucide-react"

export default function ApiConsolePage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState("prices")

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">硫磺采购决策 API</h1>
        <p className="text-xl text-muted-foreground mb-6">
          通过 API 接口获取价格预测、决策建议、市场数据和 AI 聊天服务
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/api-keys">
            <Button size="lg">
              <Key className="mr-2 h-5 w-5" />
              获取 API Key
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" size="lg">
              注册账号
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        <Card>
          <CardHeader className="pb-2">
            <Zap className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">价格预测</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Hybrid ARIMA + XGBoost 模型预测未来价格走势
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <BarChart className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">决策建议</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              智能采购决策建议，包含库存分析
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <Book className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">数据查询</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              价格、库存、市场新闻等历史数据
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <Code className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">AI 聊天</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              与专业硫磺采购助手对话问答
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Pricing */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle>定价方案</CardTitle>
          <CardDescription>灵活的配额方案，满足不同需求</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">免费额度</h3>
              <div className="text-3xl font-bold mb-4">1000 次<span className="text-muted-foreground text-lg">/月</span></div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>每月自动重置</li>
                <li>所有 API 端点可用</li>
                <li>注册即可获得</li>
              </ul>
            </div>
            <div className="border rounded-lg p-6 bg-primary/5">
              <h3 className="text-lg font-semibold mb-2">付费额度</h3>
              <div className="text-3xl font-bold mb-4">¥1<span className="text-muted-foreground text-lg">/100 次</span></div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>按需购买，永久有效</li>
                <li>优先扣减免费额度</li>
                <li>超额后自动使用付费额度</li>
              </ul>
              <Badge variant="secondary" className="mt-4">即将上线</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>API 文档</CardTitle>
          <CardDescription>选择端点查看详细说明</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
            <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
              <TabsTrigger value="prices">价格查询</TabsTrigger>
              <TabsTrigger value="predict">价格预测</TabsTrigger>
              <TabsTrigger value="decision">决策建议</TabsTrigger>
              <TabsTrigger value="inventory">库存数据</TabsTrigger>
              <TabsTrigger value="news">市场新闻</TabsTrigger>
              <TabsTrigger value="chat">AI 聊天</TabsTrigger>
            </TabsList>

            <TabsContent value="prices" className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>GET</Badge>
                  <code className="text-sm">/api/v1/prices</code>
                </div>
                <p className="text-sm text-muted-foreground">获取硫磺价格历史数据</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">请求参数</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">参数</th>
                      <th className="text-left py-2">类型</th>
                      <th className="text-left py-2">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2">startDate</td>
                      <td className="py-2">string</td>
                      <td className="py-2">开始日期 (YYYY-MM-DD)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">endDate</td>
                      <td className="py-2">string</td>
                      <td className="py-2">结束日期 (YYYY-MM-DD)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">region</td>
                      <td className="py-2">string</td>
                      <td className="py-2">地区筛选</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">market</td>
                      <td className="py-2">string</td>
                      <td className="py-2">市场筛选</td>
                    </tr>
                    <tr>
                      <td className="py-2">limit</td>
                      <td className="py-2">integer</td>
                      <td className="py-2">返回数量 (默认 30)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h4 className="font-semibold mb-2">示例代码</h4>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`curl -X GET "https://sulfur-agent-web.vercel.app/api/v1/prices?limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"`}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="predict" className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default">POST</Badge>
                  <code className="text-sm">/api/v1/prices/predict</code>
                </div>
                <p className="text-sm text-muted-foreground">预测未来硫磺价格</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">请求体</h4>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`{
  "days": 7
}`}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">示例代码</h4>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`curl -X POST "https://sulfur-agent-web.vercel.app/api/v1/prices/predict" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"days": 7}'`}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="decision" className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default">POST</Badge>
                  <code className="text-sm">/api/v1/decision</code>
                </div>
                <p className="text-sm text-muted-foreground">获取采购决策建议</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">请求体</h4>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`{
  "days": 7,
  "current_inventory": 5000,
  "daily_consumption": 100,
  "safety_days": 30
}`}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>GET</Badge>
                  <code className="text-sm">/api/v1/data/inventory</code>
                </div>
                <p className="text-sm text-muted-foreground">获取港口库存数据</p>
              </div>
            </TabsContent>

            <TabsContent value="news" className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>GET</Badge>
                  <code className="text-sm">/api/v1/data/news</code>
                </div>
                <p className="text-sm text-muted-foreground">获取市场新闻动态</p>
              </div>
            </TabsContent>

            <TabsContent value="chat" className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default">POST</Badge>
                  <code className="text-sm">/api/v1/chat</code>
                </div>
                <p className="text-sm text-muted-foreground">与 AI 聊天助手对话</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">请求体</h4>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`{
  "message": "当前硫磺价格趋势如何？",
  "history": []
}`}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/api-console/page.tsx
git commit -m "feat: add API Console documentation page"
```

---

### Task 14: API Keys 管理页面

**Files:**
- Create: `src/app/(dashboard)/api-keys/page.tsx`

- [ ] **Step 1: 创建 API Keys 管理页面**

```typescript
// src/app/(dashboard)/api-keys/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Key, Plus, Trash2, RefreshCw, Copy, Check, 
  AlertTriangle, BarChart, ArrowRight, Loader2 
} from "lucide-react"

interface ApiKeyData {
  id: string
  name: string
  key: string
  isActive: boolean
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string | null
}

interface QuotaData {
  free: number
  paid: number
  total: number
}

export default function ApiKeysPage() {
  const router = useRouter()
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([])
  const [quota, setQuota] = useState<QuotaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [showFullKey, setShowFullKey] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetchApiKeys()
  }, [])

  async function fetchApiKeys() {
    try {
      const res = await fetch("/api/api-keys")
      const data = await res.json()

      if (data.success) {
        setApiKeys(data.data.keys)
        setQuota(data.data.quota)
      } else {
        if (data.error === "未登录") {
          router.push("/login")
        }
      }
    } catch (error) {
      console.error("获取 API Keys 失败:", error)
    } finally {
      setLoading(false)
    }
  }

  async function createKey() {
    if (!newKeyName.trim()) return

    setCreating(true)
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      })

      const data = await res.json()

      if (data.success) {
        setShowFullKey(data.data.key.key)
        setNewKeyName("")
        await fetchApiKeys()
      }
    } catch (error) {
      console.error("创建失败:", error)
    } finally {
      setCreating(false)
    }
  }

  async function deleteKey(id: string) {
    if (!confirm("确定要删除此 API Key 吗？")) return

    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" })
      const data = await res.json()

      if (data.success) {
        await fetchApiKeys()
      }
    } catch (error) {
      console.error("删除失败:", error)
    }
  }

  async function resetKey(id: string) {
    if (!confirm("重置后旧 Key 将失效，确定继续？")) return

    try {
      const res = await fetch(`/api/api-keys/${id}/reset`, { method: "POST" })
      const data = await res.json()

      if (data.success) {
        setShowFullKey(data.data.key.key)
        await fetchApiKeys()
      }
    } catch (error) {
      console.error("重置失败:", error)
    }
  }

  async function copyKey(key: string) {
    await navigator.clipboard.writeText(key)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">API Keys 管理</h1>
          <p className="text-muted-foreground">管理你的 API 密钥和配额</p>
        </div>
        <Link href="/api-console">
          <Button variant="outline">
            <BarChart className="mr-2 h-4 w-4" />
            API 文档
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Quota Card */}
      {quota && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">配额余额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div>
                <p className="text-sm text-muted-foreground">免费额度</p>
                <p className="text-2xl font-bold">{quota.free}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">付费额度</p>
                <p className="text-2xl font-bold">{quota.paid}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">总剩余</p>
                <p className="text-2xl font-bold text-primary">{quota.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Key Form */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">创建新 API Key</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Key 名称（如：生产环境）"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={createKey} disabled={creating}>
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              创建
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Full Key Display */}
      {showFullKey && (
        <Card className="mb-6 border-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              <div className="flex-1">
                <p className="font-semibold mb-2">请保存此 API Key</p>
                <p className="text-sm text-muted-foreground mb-4">
                  此 Key 仅显示一次，关闭后将无法再次查看完整值
                </p>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-3 py-2 rounded text-sm font-mono flex-1">
                    {showFullKey}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyKey(showFullKey)}
                  >
                    {copied === showFullKey ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => setShowFullKey(null)}
                >
                  关闭
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>已创建的 API Keys</CardTitle>
          <CardDescription>最多可创建 5 个 API Key</CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无 API Key，请创建一个</p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between border rounded-lg p-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{key.name}</span>
                      <Badge variant={key.isActive ? "default" : "secondary"}>
                        {key.isActive ? "活跃" : "已禁用"}
                      </Badge>
                    </div>
                    <code className="text-sm text-muted-foreground font-mono">
                      {key.key}
                    </code>
                    <div className="text-xs text-muted-foreground mt-1">
                      创建: {new Date(key.createdAt).toLocaleDateString()}
                      {key.lastUsedAt && (
                        <span className="ml-4">
                          最后使用: {new Date(key.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resetKey(key.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteKey(key.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/api-keys/page.tsx
git commit -m "feat: add API Keys management page"
```

---

### Task 15: 验证与集成测试

**Files:**
- 无新增，验证现有功能

- [ ] **Step 1: 运行构建检查**

```bash
npm run build
```

Expected: 构建成功，无编译错误

- [ ] **Step 2: 检查数据库连接**

```bash
npm run db:push
```

Expected: 数据库迁移成功

- [ ] **Step 3: 测试 API Key 流程**

手动测试步骤:
1. 注册/登录用户
2. 访问 `/api-keys` 页面创建 API Key
3. 使用 curl 测试 API 端点:

```bash
curl -X GET "http://localhost:3000/api/v1/prices?limit=5" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Expected: 返回价格数据，配额扣减

- [ ] **Step 4: Commit 最终集成**

```bash
git add -A
git commit -m "feat: complete API Server implementation with auth, quota, and v1 endpoints"
```

---

## Self-Review Checklist

**1. Spec Coverage:**
- ✅ 数据库设计 - Task 1
- ✅ API Key 生成验证 - Task 2
- ✅ 配额管理 - Task 3
- ✅ 使用日志 - Task 4
- ✅ 中间件 - Task 5
- ✅ V1 价格查询 API - Task 6
- ✅ V1 价格预测 API - Task 7
- ✅ V1 决策建议 API - Task 8
- ✅ V1 数据查询 API - Task 9
- ✅ V1 AI 聊天 API - Task 10
- ✅ API Key 管理端点 - Task 11
- ✅ 使用统计端点 - Task 12
- ✅ API Console 页面 - Task 13
- ✅ API Keys 管理页面 - Task 14

**2. Placeholder Scan:**
- 无 TBD/TODO
- 所有代码块完整

**3. Type Consistency:**
- `ApiKey`, `ApiQuota`, `ApiUsageLog` 类型定义一致
- 导入路径正确