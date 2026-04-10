import { NextRequest, NextResponse } from "next/server"
import {
  sendSmsVerificationCode,
  isValidPhoneNumber,
  formatPhoneNumber,
} from "@/lib/services/sms"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone } = body

    // 验证手机号
    if (!phone) {
      return NextResponse.json({ error: "请输入手机号" }, { status: 400 })
    }

    if (!isValidPhoneNumber(phone)) {
      return NextResponse.json({ error: "手机号格式不正确" }, { status: 400 })
    }

    // 格式化手机号
    const formattedPhone = formatPhoneNumber(phone)

    // 发送验证码
    const result = await sendSmsVerificationCode(formattedPhone)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "验证码已发送",
      // 开发环境返回验证码（生产环境删除）
      ...(process.env.NODE_ENV === "development" && {
        devCode: "请查看控制台",
      }),
    })
  } catch (error) {
    console.error("[API] 发送短信验证码失败:", error)
    return NextResponse.json({ error: "发送验证码失败" }, { status: 500 })
  }
}