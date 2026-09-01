import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { resetApiKey } from "@/lib/api-auth"

/**
 * POST /api/api-keys/[id]/reset
 * 重置 API Key（无需登录）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth.api.getSession({ headers: request.headers })
    const userId = session?.user?.id

    const newKeyRecord = await resetApiKey(id, userId || undefined)

    if (!newKeyRecord) {
      return NextResponse.json(
        { success: false, error: "重置失败或 Key 不存在" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        key: newKeyRecord.key,
        warning: "请妥善保存新的 API Key，旧 Key 已失效",
      },
    })
  } catch (error) {
    console.error("重置 API Key 失败:", error)
    return NextResponse.json(
      { success: false, error: "重置 API Key 失败" },
      { status: 500 }
    )
  }
}