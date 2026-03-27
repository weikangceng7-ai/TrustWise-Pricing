import { NextRequest, NextResponse } from "next/server"
import { sendEmailVerificationCode } from "@/lib/services/email"
import { db } from "@/db"
import { user } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, type = "register" } = body

    // 验证邮箱
    if (!email) {
      return NextResponse.json({ error: "请输入邮箱地址" }, { status: 400 })
    }

    // 基本邮箱格式验证
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 })
    }

    // 注册时检查邮箱是否已被使用
    if (type === "register" && db) {
      try {
        const [existingUser] = await db
          .select()
          .from(user)
          .where(eq(user.email, email.toLowerCase()))
          .limit(1)

        if (existingUser) {
          return NextResponse.json({ error: "该邮箱已被注册" }, { status: 400 })
        }
      } catch (dbError) {
        console.error("[API] 数据库查询失败:", dbError)
        // 数据库错误时继续，让验证码发送流程处理
      }
    }

    // 忘记密码时检查邮箱是否存在
    if (type === "forgot" && db) {
      try {
        const [existingUser] = await db
          .select()
          .from(user)
          .where(eq(user.email, email.toLowerCase()))
          .limit(1)

        if (!existingUser) {
          // 为了安全，不暴露邮箱是否存在的信息
          // 返回成功但实际不发送（或者可以选择发送一个通用提示）
          console.log(`[API] 邮箱未注册: ${email}`)
        }
      } catch (dbError) {
        console.error("[API] 数据库查询失败:", dbError)
      }
    }

    // 发送验证码
    const result = await sendEmailVerificationCode(email)

    if (!result.success) {
      return NextResponse.json({ error: result.error || "发送验证码失败" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "验证码已发送到您的邮箱",
      // 开发环境返回验证码
      ...(process.env.NODE_ENV === "development" && result.devCode && {
        devCode: result.devCode,
        devMessage: "开发环境测试验证码",
      }),
    })
  } catch (error) {
    console.error("[API] 发送验证码失败:", error)
    return NextResponse.json({ error: "发送验证码失败" }, { status: 500 })
  }
}