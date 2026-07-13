import { NextRequest, NextResponse } from "next/server"
import { verifyCode, formatPhoneNumber } from "@/lib/services/sms"
import { db, schema } from "@/db"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, code } = body

    if (!phone || !code) {
      return NextResponse.json({ error: "请输入手机号和验证码" }, { status: 400 })
    }

    // 服务端验证验证码
    const formattedPhone = formatPhoneNumber(phone)
    const result = verifyCode(formattedPhone, code)
    if (!result.valid) {
      return NextResponse.json({ error: result.error || "验证码错误" }, { status: 400 })
    }

    if (!db) {
      return NextResponse.json({ error: "数据库不可用" }, { status: 500 })
    }

    // 查找或创建用户
    const existingUsers = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.phone, formattedPhone))
      .limit(1)

    let userId: string
    if (existingUsers.length > 0) {
      userId = existingUsers[0].id
      await db
        .update(schema.user)
        .set({ phoneVerified: true })
        .where(eq(schema.user.id, userId))
    } else {
      const [newUser] = await db
        .insert(schema.user)
        .values({
          id: crypto.randomUUID(),
          name: `用户${phone.slice(-4)}`,
          email: `phone_${phone}@sulfur.local`,
          phone: formattedPhone,
          phoneVerified: true,
        })
        .returning()
      userId = newUser.id
    }

    // 创建会话
    const sessionToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await db.insert(schema.session).values({
      id: crypto.randomUUID(),
      token: sessionToken,
      userId,
      expiresAt,
    })

    const response = NextResponse.json({
      success: true,
      message: "登录成功",
    })

    // 设置 session cookie（与 Better Auth 保持一致的命名）
    response.cookies.set("better-auth.session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error("[API] 手机号登录失败:", error)
    return NextResponse.json({ error: "登录失败，请稍后重试" }, { status: 500 })
  }
}
