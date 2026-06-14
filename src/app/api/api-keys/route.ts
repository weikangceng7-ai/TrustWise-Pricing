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
    console.error("获取 API Keys 失败:", error)
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

    const apiKeyRecord = await createApiKey(session.user.id, name)

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
    return NextResponse.json(
      { success: false, error: "创建 API Key 失败" },
      { status: 500 }
    )
  }
}