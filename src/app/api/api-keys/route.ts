import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createApiKey, getUserApiKeys } from "@/lib/api-auth"
import { db } from "@/db"
import { apiKeys as apiKeysTable } from "@/db/schema"
import { getUserQuota, calculateRemainingQuota } from "@/lib/api-quota"
import { isNull } from "drizzle-orm"

/**
 * GET /api/api-keys
 * 获取 API Key 列表
 * 已登录：返回当前用户的 Keys
 * 未登录：返回无用户关联的公开 Keys（MCP 测试用）
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })

    let keysList: typeof apiKeysTable.$inferSelect[] = []
    let quota = null

    if (session?.user) {
      keysList = await getUserApiKeys(session.user.id)
      quota = await getUserQuota(session.user.id)
    } else {
      // 未登录：返回无用户关联的 Keys
      if (db) {
        keysList = await db.select().from(apiKeysTable).where(isNull(apiKeysTable.userId))
      }
    }

    // 隐藏完整的 Key，只显示前缀和后 4 位
    const maskedKeys = keysList.map(key => ({
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
    console.error("获取 API Keys 失败:", error)
    return NextResponse.json(
      { success: false, error: "获取 API Keys 失败" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/api-keys
 * 创建新的 API Key（无需登录）
 *
 * Body:
 * - name: Key 名称
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = body.name || "API Key"

    const apiKeyRecord = await createApiKey(name)

    // 新创建的 Key 显示完整值，仅此一次
    return NextResponse.json({
      success: true,
      data: {
        key: apiKeyRecord.key,
        warning: "请妥善保存此 API Key，创建后将不再显示完整值",
      },
    })
  } catch (error) {
    console.error("创建 API Key 失败:", error)
    const message = error instanceof Error ? error.message : "创建 API Key 失败"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}