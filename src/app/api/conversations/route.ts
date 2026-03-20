import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { chatConversations, chatMessages } from "@/db/schema"
import { auth } from "@/lib/auth"
import { eq, desc } from "drizzle-orm"
import { nanoid } from "nanoid"

// GET - 获取用户所有对话
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })

    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    if (!db) {
      return NextResponse.json({ error: "数据库未配置" }, { status: 503 })
    }

    const conversations = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.userId, session.user.id))
      .orderBy(desc(chatConversations.updatedAt))

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error("获取对话列表失败:", error)
    return NextResponse.json({ error: "获取对话列表失败" }, { status: 500 })
  }
}

// POST - 创建新对话
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })

    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    if (!db) {
      return NextResponse.json({ error: "数据库未配置" }, { status: 503 })
    }

    const body = await req.json()
    const { title, firstMessage } = body

    const conversationId = nanoid()
    const now = new Date()

    // 创建对话
    await db.insert(chatConversations).values({
      id: conversationId,
      title: title || "新对话",
      userId: session.user.id,
      createdAt: now,
      updatedAt: now,
    })

    // 如果有第一条消息，同时添加
    if (firstMessage) {
      const messageId = nanoid()
      await db.insert(chatMessages).values({
        id: messageId,
        conversationId,
        role: "user",
        content: firstMessage,
        createdAt: now,
      })
    }

    return NextResponse.json({
      conversation: {
        id: conversationId,
        title: title || "新对话",
        createdAt: now,
        updatedAt: now,
      }
    })
  } catch (error) {
    console.error("创建对话失败:", error)
    return NextResponse.json({ error: "创建对话失败" }, { status: 500 })
  }
}