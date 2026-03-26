import { NextRequest, NextResponse } from "next/server"
import { verifyEmailCode } from "@/lib/services/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, code } = body

    // 验证参数
    if (!email || !code) {
      return NextResponse.json({ error: "请输入邮箱和验证码" }, { status: 400 })
    }

    // 基本邮箱格式验证
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 })
    }

    // 验证码格式验证
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "验证码格式不正确" }, { status: 400 })
    }

    // 验证验证码
    const result = verifyEmailCode(email, code)

    if (!result.valid) {
      return NextResponse.json({ error: result.error || "验证码错误" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "验证成功",
    })
  } catch (error) {
    console.error("[API] 验证码验证失败:", error)
    return NextResponse.json({ error: "验证失败" }, { status: 500 })
  }
}