import { NextRequest, NextResponse } from "next/server"
import { markAsRead, deleteNotification } from "@/services/notifications"

async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const response = await fetch(
      `${request.nextUrl.origin}/api/auth/get-session`,
      {
        headers: request.headers,
      }
    )
    const data = await response.json()
    return data?.user?.id || null
  } catch {
    return null
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      )
    }

    const { id } = await params
    const notificationId = parseInt(id)

    if (isNaN(notificationId)) {
      return NextResponse.json(
        { success: false, error: "无效的通知 ID" },
        { status: 400 }
      )
    }

    const notification = await markAsRead(notificationId, userId)

    if (!notification) {
      return NextResponse.json(
        { success: false, error: "通知不存在" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: notification })
  } catch (error) {
    console.error("标记通知已读失败:", error)
    return NextResponse.json(
      { success: false, error: "操作失败" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      )
    }

    const { id } = await params
    const notificationId = parseInt(id)

    if (isNaN(notificationId)) {
      return NextResponse.json(
        { success: false, error: "无效的通知 ID" },
        { status: 400 }
      )
    }

    const success = await deleteNotification(notificationId, userId)

    if (!success) {
      return NextResponse.json(
        { success: false, error: "通知不存在" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("删除通知失败:", error)
    return NextResponse.json(
      { success: false, error: "操作失败" },
      { status: 500 }
    )
  }
}
