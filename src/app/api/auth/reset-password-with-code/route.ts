import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { user, account } from "@/db/schema"
import { eq } from "drizzle-orm"
import { verifyEmailCode } from "@/lib/services/email"
import { hash } from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, code, password } = body

    // 验证参数
    if (!email || !code || !password) {
      return NextResponse.json({ error: "请填写所有必填项" }, { status: 400 })
    }

    // 验证验证码
    const verifyResult = verifyEmailCode(email, code)
    if (!verifyResult.valid) {
      return NextResponse.json({ error: verifyResult.error }, { status: 400 })
    }

    // 密码强度验证
    if (password.length < 8) {
      return NextResponse.json({ error: "密码长度至少为 8 位" }, { status: 400 })
    }

    // 检查数据库连接
    if (!db) {
      // 开发环境模拟成功
      if (process.env.NODE_ENV === "development") {
        console.log("[API] 开发环境模拟重置密码成功:", email)
        return NextResponse.json({
          success: true,
          message: "密码重置成功，请使用新密码登录",
        })
      }
      return NextResponse.json({ error: "数据库连接失败" }, { status: 500 })
    }

    // 查找用户
    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, email.toLowerCase()))
      .limit(1)

    if (!existingUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 400 })
    }

    // 哈希新密码
    const hashedPassword = await hash(password, 10)

    // 更新用户账户密码
    const [existingAccount] = await db
      .select()
      .from(account)
      .where(eq(account.userId, existingUser.id))
      .limit(1)

    if (existingAccount) {
      await db
        .update(account)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(account.userId, existingUser.id))
    } else {
      // 如果没有 account 记录，创建一个
      await db.insert(account).values({
        id: `credential_${existingUser.id}`,
        userId: existingUser.id,
        accountId: existingUser.email,
        providerId: "credential",
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    return NextResponse.json({
      success: true,
      message: "密码重置成功，请使用新密码登录",
    })
  } catch (error) {
    console.error("[API] 重置密码失败:", error)
    return NextResponse.json({ error: "重置密码失败" }, { status: 500 })
  }
}