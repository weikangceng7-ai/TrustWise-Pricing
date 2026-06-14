import { db } from "@/db"
import { apiKeys, apiUsageLogs, type ApiUsageLog, type NewApiUsageLog } from "@/db/schema"
import { eq, desc, and, gte, lte, inArray } from "drizzle-orm"

/**
 * Record an API call log
 */
export async function logApiUsage(log: NewApiUsageLog): Promise<ApiUsageLog | null> {
  if (!db) return null

  const [record] = await db.insert(apiUsageLogs).values(log).returning()
  return record
}

/**
 * Get user API usage statistics
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

  // Get all API Key IDs for the user
  const userKeys = await db
    .select({ id: apiKeys.id })
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

  const keyIds = userKeys.map((k) => k.id)

  // Build query conditions
  const conditions = [inArray(apiUsageLogs.apiKeyId, keyIds)]

  if (startDate) {
    conditions.push(gte(apiUsageLogs.timestamp, startDate))
  }
  if (endDate) {
    conditions.push(lte(apiUsageLogs.timestamp, endDate))
  }

  // Get logs
  const logs = await db
    .select()
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
  const successCalls = logs.filter((l) => l.statusCode < 400).length
  const errorCalls = logs.filter((l) => l.statusCode >= 400).length
  const avgResponseTime = Math.round(
    logs.reduce((sum, l) => sum + l.responseTime, 0) / totalCalls
  )

  // Endpoint statistics
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
 * Get user's recent API usage logs
 */
export async function getRecentApiUsageLogs(
  userId: string,
  limit: number = 50
): Promise<ApiUsageLog[]> {
  if (!db) return []

  const userKeys = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))

  if (userKeys.length === 0) return []

  const keyIds = userKeys.map((k) => k.id)

  return await db
    .select()
    .from(apiUsageLogs)
    .where(inArray(apiUsageLogs.apiKeyId, keyIds))
    .orderBy(desc(apiUsageLogs.timestamp))
    .limit(limit)
}