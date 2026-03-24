import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { user } from "@/db/schema"
import { eq } from "drizzle-orm"
import { sendPasswordResetEmail } from "@/lib/services/email"
import { nanoid } from "nanoid"

// 密码重置 token 存储（生产环境应使用 Redis）
const resetTokens = new Map<string, { email: string; expiresAt: number }>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: "请输入邮箱地址" }, { status: 400 })
    }

    // 检查数据库连接
    if (!db) {
      // 数据库未配置时，模拟成功（开发环境）
      console.log("[API] 数据库未配置，模拟忘记密码流程")
      return NextResponse.json({
        success: true,
        message: "如果该邮箱已注册，您将收到密码重置邮件",
      })
    }

    // 查找用户
    let existingUser = null
    try {
      [existingUser] = await db
        .select()
        .from(user)
        .where(eq(user.email, email.toLowerCase()))
        .limit(1)
    } catch (dbError) {
      console.error("[API] 数据库查询失败:", dbError)
      // 返回相同消息防止信息泄露
      return NextResponse.json({
        success: true,
        message: "如果该邮箱已注册，您将收到密码重置邮件",
      })
    }

    // 即使用户不存在，也返回成功（防止邮箱枚举）
    // 注意：如果数据库未配置，也返回相同消息
    if (!db || !existingUser) {
      return NextResponse.json({
        success: true,
        message: "如果该邮箱已注册，您将收到密码重置邮件",
      })
    }

    // 生成重置 token
    const resetToken = nanoid(32)
    resetTokens.set(resetToken, {
      email: email.toLowerCase(),
      expiresAt: Date.now() + 3600000, // 1小时有效
    })

    // 发送重置邮件
    await sendPasswordResetEmail(email, resetToken)

    return NextResponse.json({
      success: true,
      message: "如果该邮箱已注册，您将收到密码重置邮件",
    })
  } catch (error) {
    console.error("[API] 忘记密码失败:", error)
    return NextResponse.json({ error: "操作失败，请稍后重试" }, { status: 500 })
  }
}

// 导出 token 存储供重置密码使用
export { resetTokens }