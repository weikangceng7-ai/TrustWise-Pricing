import { NextRequest, NextResponse } from "next/server"
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  createDemoNotifications,
} from "@/services/notifications"

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

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unreadOnly") === "true"
    const countOnly = searchParams.get("count") === "true"

    if (countOnly) {
      const count = await getUnreadCount(userId)
      return NextResponse.json({ success: true, count })
    }

    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 20

    const notifications = await getNotifications(userId, { limit, unreadOnly })

    return NextResponse.json({
      success: true,
      data: notifications,
    })
  } catch (error) {
    console.error("获取通知失败:", error)
    return NextResponse.json(
      { success: false, error: "获取通知失败" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (action === "markAllRead") {
      const count = await markAllAsRead(userId)
      return NextResponse.json({ success: true, markedCount: count })
    }

    if (action === "createDemo") {
      await createDemoNotifications(userId)
      return NextResponse.json({ success: true, message: "演示通知已创建" })
    }

    return NextResponse.json(
      { success: false, error: "未知操作" },
      { status: 400 }
    )
  } catch (error) {
    console.error("操作通知失败:", error)
    return NextResponse.json(
      { success: false, error: "操作失败" },
      { status: 500 }
    )
  }
}
