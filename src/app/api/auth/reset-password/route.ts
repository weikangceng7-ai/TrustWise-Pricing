import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { user } from "@/db/schema"
import { eq } from "drizzle-orm"
import { resetTokens } from "../forgot-password/route"
import { hash } from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password, confirmPassword } = body

    // 验证参数
    if (!token || !password || !confirmPassword) {
      return NextResponse.json({ error: "请填写所有必填项" }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "两次输入的密码不一致" }, { status: 400 })
    }

    // 密码强度验证
    if (password.length < 8) {
      return NextResponse.json({ error: "密码长度至少为 8 位" }, { status: 400 })
    }

    // 验证 token
    const tokenData = resetTokens.get(token)
    if (!tokenData) {
      return NextResponse.json({ error: "重置链接无效" }, { status: 400 })
    }

    if (Date.now() > tokenData.expiresAt) {
      resetTokens.delete(token)
      return NextResponse.json({ error: "重置链接已过期" }, { status: 400 })
    }

    // 哈希新密码
    const hashedPassword = await hash(password, 10)

    // 更新用户密码
    await db
      .update(user)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(user.email, tokenData.email))

    // 删除已使用的 token
    resetTokens.delete(token)

    return NextResponse.json({
      success: true,
      message: "密码重置成功，请使用新密码登录",
    })
  } catch (error) {
    console.error("[API] 重置密码失败:", error)
    return NextResponse.json({ error: "重置密码失败" }, { status: 500 })
  }
}