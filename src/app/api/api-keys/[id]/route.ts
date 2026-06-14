import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { deleteApiKey } from "@/lib/api-auth"

/**
 * DELETE /api/api-keys/[id]
 * 删除 API Key
 */
export async function DELETE(
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
    const success = await deleteApiKey(session.user.id, id)

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
    console.error("删除 API Key 失败:", error)
    return NextResponse.json(
      { success: false, error: "删除 API Key 失败" },
      { status: 500 }
    )
  }
}