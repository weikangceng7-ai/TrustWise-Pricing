import { NextRequest, NextResponse } from "next/server"
import { sendEmailVerificationCode } from "@/lib/services/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    // 验证邮箱
    if (!email) {
      return NextResponse.json({ error: "请输入邮箱地址" }, { status: 400 })
    }

    // 基本邮箱格式验证
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 })
    }

    // 发送验证码
    const result = await sendEmailVerificationCode(email)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
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
    console.error("[API] 发送邮箱验证码失败:", error)
    return NextResponse.json({ error: "发送验证码失败" }, { status: 500 })
  }
}