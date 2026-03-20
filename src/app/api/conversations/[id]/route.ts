import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { chatConversations, chatMessages } from "@/db/schema"
import { auth } from "@/lib/auth"
import { eq, and, desc } from "drizzle-orm"
import { nanoid } from "nanoid"

// GET - 获取对话消息
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })

    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    if (!db) {
      return NextResponse.json({ error: "数据库未配置" }, { status: 503 })
    }

    const { id } = await params

    // 验证对话属于当前用户
    const conversation = await db
      .select()
      .from(chatConversations)
      .where(and(
        eq(chatConversations.id, id),
        eq(chatConversations.userId, session.user.id)
      ))
      .limit(1)

    if (!conversation.length) {
      return NextResponse.json({ error: "对话不存在" }, { status: 404 })
    }

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, id))
      .orderBy(chatMessages.createdAt)

    return NextResponse.json({
      conversation: conversation[0],
      messages
    })
  } catch (error) {
    console.error("获取对话消息失败:", error)
    return NextResponse.json({ error: "获取对话消息失败" }, { status: 500 })
  }
}

// POST - 添加消息到对话
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })

    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    if (!db) {
      return NextResponse.json({ error: "数据库未配置" }, { status: 503 })
    }

    const { id } = await params
    const body = await req.json()
    const { role, content } = body

    if (!role || !content) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    // 验证对话属于当前用户
    const conversation = await db
      .select()
      .from(chatConversations)
      .where(and(
        eq(chatConversations.id, id),
        eq(chatConversations.userId, session.user.id)
      ))
      .limit(1)

    if (!conversation.length) {
      return NextResponse.json({ error: "对话不存在" }, { status: 404 })
    }

    const messageId = nanoid()
    const now = new Date()

    await db.insert(chatMessages).values({
      id: messageId,
      conversationId: id,
      role,
      content,
      createdAt: now,
    })

    // 更新对话的 updatedAt 时间
    await db
      .update(chatConversations)
      .set({ updatedAt: now })
      .where(eq(chatConversations.id, id))

    return NextResponse.json({
      message: {
        id: messageId,
        conversationId: id,
        role,
        content,
        createdAt: now,
      }
    })
  } catch (error) {
    console.error("添加消息失败:", error)
    return NextResponse.json({ error: "添加消息失败" }, { status: 500 })
  }
}

// DELETE - 删除对话
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })

    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    if (!db) {
      return NextResponse.json({ error: "数据库未配置" }, { status: 503 })
    }

    const { id } = await params

    // 验证对话属于当前用户
    const conversation = await db
      .select()
      .from(chatConversations)
      .where(and(
        eq(chatConversations.id, id),
        eq(chatConversations.userId, session.user.id)
      ))
      .limit(1)

    if (!conversation.length) {
      return NextResponse.json({ error: "对话不存在" }, { status: 404 })
    }

    // 删除对话（消息会级联删除）
    await db
      .delete(chatConversations)
      .where(eq(chatConversations.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("删除对话失败:", error)
    return NextResponse.json({ error: "删除对话失败" }, { status: 500 })
  }
}

// PATCH - 更新对话标题
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })

    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { title } = body

    if (!title) {
      return NextResponse.json({ error: "缺少标题" }, { status: 400 })
    }

    if (!db) {
      return NextResponse.json({ error: "数据库未配置" }, { status: 503 })
    }

    // 验证对话属于当前用户
    const conversation = await db
      .select()
      .from(chatConversations)
      .where(and(
        eq(chatConversations.id, id),
        eq(chatConversations.userId, session.user.id)
      ))
      .limit(1)

    if (!conversation.length) {
      return NextResponse.json({ error: "对话不存在" }, { status: 404 })
    }

    await db
      .update(chatConversations)
      .set({ title, updatedAt: new Date() })
      .where(eq(chatConversations.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("更新对话失败:", error)
    return NextResponse.json({ error: "更新对话失败" }, { status: 500 })
  }
}