import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { resetApiKey } from "@/lib/api-auth"

/**
 * POST /api/api-keys/[id]/reset
 * 重置 API Key（生成新 Key 值）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      )
    }

    const { id } = await params
    const newKeyRecord = await resetApiKey(session.user.id, id)

    if (!newKeyRecord) {
      return NextResponse.json(
        { success: false, error: "重置失败或 Key 不存在" },
        { status: 404 }
      )
    }

    // 重置后显示完整新 Key，仅此一次
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