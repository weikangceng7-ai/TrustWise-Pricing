import { Resend } from "resend"

// Resend 配置
const resendApiKey = process.env.RESEND_API_KEY
const emailFrom = process.env.EMAIL_FROM || "noreply@example.com"

// Resend 客户端（模块级别单例，避免重复创建）
const resend = resendApiKey ? new Resend(resendApiKey) : null

// 验证码有效期（秒）
const CODE_EXPIRY_SECONDS = 600 // 10分钟

// 验证码长度
const CODE_LENGTH = 6

/**
 * 生成随机验证码
 */
export function generateEmailVerificationCode(): string {
  let code = ""
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += Math.floor(Math.random() * 10)
  }
  return code
}

/**
 * 验证码存储接口
 */
interface VerificationData {
  code: string
  expiresAt: number
  attempts: number
}

// 使用内存存储（生产环境应替换为 Redis）
const verificationStore = new Map<string, VerificationData>()

/**
 * 存储验证码
 */
export function storeEmailVerificationCode(email: string, code: string): void {
  verificationStore.set(email.toLowerCase(), {
    code,
    expiresAt: Date.now() + CODE_EXPIRY_SECONDS * 1000,
    attempts: 0,
  })
}

/**
 * 验证验证码
 */
export function verifyEmailCode(email: string, inputCode: string): { valid: boolean; error?: string } {
  const data = verificationStore.get(email.toLowerCase())

  if (!data) {
    return { valid: false, error: "验证码已过期或不存在" }
  }

  if (Date.now() > data.expiresAt) {
    verificationStore.delete(email.toLowerCase())
    return { valid: false, error: "验证码已过期" }
  }

  if (data.attempts >= 5) {
    verificationStore.delete(email.toLowerCase())
    return { valid: false, error: "尝试次数过多，请重新获取验证码" }
  }

  data.attempts++

  if (data.code !== inputCode) {
    return { valid: false, error: "验证码错误" }
  }

  verificationStore.delete(email.toLowerCase())
  return { valid: true }
}

/**
 * 发送邮箱验证码
 */
export async function sendEmailVerificationCode(email: string): Promise<{ success: boolean; error?: string; devCode?: string }> {
  const code = generateEmailVerificationCode()
  storeEmailVerificationCode(email, code)

  // 如果有 Resend 客户端，尝试发送真实邮件
  if (resend) {
    try {
      await resend.emails.send({
        from: emailFrom,
        to: email,
        subject: "【硫磺价格预测系统】邮箱验证码",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; text-align: center;">邮箱验证</h2>
            <p style="color: #666; text-align: center;">您的验证码是：</p>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #999; text-align: center; font-size: 14px;">
              验证码有效期为 ${Math.floor(CODE_EXPIRY_SECONDS / 60)} 分钟，请尽快使用。
            </p>
            <p style="color: #999; text-align: center; font-size: 12px; margin-top: 30px;">
              如果您没有请求此验证码，请忽略此邮件。
            </p>
          </div>
        `,
      })

      console.log(`[EMAIL] 验证码邮件已发送: ${email} -> ${code}`)
      // 开发环境返回验证码
      if (process.env.NODE_ENV === "development") {
        return { success: true, devCode: code }
      }
      return { success: true }
    } catch (error) {
      console.error("[EMAIL] 发送失败:", error)
      // 发送失败也输出到控制台，方便测试
      console.log(`[EMAIL] 验证码 (发送失败，备用): ${email} -> ${code}`)
      // 开发环境返回验证码
      if (process.env.NODE_ENV === "development") {
        return { success: true, devCode: code }
      }
      return { success: true }
    }
  }

  // 没有 API Key，输出到控制台
  console.log(`[EMAIL] 验证码已生成: ${email} -> ${code}`)
  // 开发环境返回验证码
  if (process.env.NODE_ENV === "development") {
    return { success: true, devCode: code }
  }
  return { success: true }
}

/**
 * 发送密码重置邮件
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`

  // 如果有 Resend 客户端，尝试发送真实邮件
  if (resend) {
    try {
      await resend.emails.send({
        from: emailFrom,
        to: email,
        subject: "【硫磺价格预测系统】重置密码",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; text-align: center;">重置密码</h2>
            <p style="color: #666; text-align: center;">您收到此邮件是因为您请求重置密码。</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                点击重置密码
              </a>
            </div>
            <p style="color: #999; text-align: center; font-size: 14px;">
              此链接将在 1 小时后失效。
            </p>
            <p style="color: #999; text-align: center; font-size: 12px; margin-top: 30px;">
              如果您没有请求重置密码，请忽略此邮件。
            </p>
            <p style="color: #999; text-align: center; font-size: 12px; margin-top: 10px;">
              或复制此链接：${resetUrl}
            </p>
          </div>
        `,
      })

      console.log(`[EMAIL] 密码重置邮件已发送: ${email}`)
      console.log(`[EMAIL] 重置链接: ${resetUrl}`)
      return { success: true }
    } catch (error) {
      console.error("[EMAIL] 发送失败:", error)
      // 发送失败也输出链接，方便测试
      console.log(`[EMAIL] 重置链接 (发送失败，备用): ${email} -> ${resetUrl}`)
      return { success: true }
    }
  }

  // 没有 API Key，输出到控制台
  console.log(`[EMAIL] 密码重置链接: ${email} -> ${resetUrl}`)
  return { success: true }
}

/**
 * 发送欢迎邮件
 */
export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  if (resend) {
    try {
      await resend.emails.send({
        from: emailFrom,
        to: email,
        subject: "欢迎加入硫磺价格预测系统",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; text-align: center;">欢迎，${name}！</h2>
            <p style="color: #666; text-align: center;">
              感谢您注册硫磺价格预测决策辅助系统。
            </p>
            <p style="color: #666; text-align: center;">
              您现在可以使用以下功能：
            </p>
            <ul style="color: #666; margin: 20px 0;">
              <li>查看实时硫磺价格数据</li>
              <li>价格趋势预测分析</li>
              <li>智能采购建议</li>
              <li>知识图谱查询</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}" style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                开始使用
              </a>
            </div>
          </div>
        `,
      })

      console.log(`[EMAIL] 欢迎邮件已发送: ${email}`)
    } catch (error) {
      console.error("[EMAIL] 欢迎邮件发送失败:", error)
    }
  } else {
    console.log(`[EMAIL] 欢迎邮件: ${email} - ${name}`)
  }
}