import Twilio from "twilio"

// Twilio 配置
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromPhone = process.env.TWILIO_PHONE_NUMBER

// 验证码有效期（秒）
const CODE_EXPIRY_SECONDS = 300 // 5分钟

// 验证码长度
const CODE_LENGTH = 6

// 开发模式：是否使用控制台输出代替真实短信
const isDev = process.env.NODE_ENV === "development"

/**
 * 生成随机验证码
 */
export function generateVerificationCode(): string {
  let code = ""
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += Math.floor(Math.random() * 10)
  }
  return code
}

/**
 * 验证码存储接口
 * 在生产环境中，应该使用 Redis 等缓存服务
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
export function storeVerificationCode(phone: string, code: string): void {
  verificationStore.set(phone, {
    code,
    expiresAt: Date.now() + CODE_EXPIRY_SECONDS * 1000,
    attempts: 0,
  })
}

/**
 * 验证验证码
 */
export function verifyCode(phone: string, inputCode: string): { valid: boolean; error?: string } {
  const data = verificationStore.get(phone)

  if (!data) {
    return { valid: false, error: "验证码已过期或不存在" }
  }

  if (Date.now() > data.expiresAt) {
    verificationStore.delete(phone)
    return { valid: false, error: "验证码已过期" }
  }

  if (data.attempts >= 5) {
    verificationStore.delete(phone)
    return { valid: false, error: "尝试次数过多，请重新获取验证码" }
  }

  data.attempts++

  if (data.code !== inputCode) {
    return { valid: false, error: "验证码错误" }
  }

  verificationStore.delete(phone)
  return { valid: true }
}

/**
 * 发送短信验证码
 */
export async function sendSmsVerificationCode(phone: string): Promise<{ success: boolean; error?: string }> {
  const code = generateVerificationCode()
  storeVerificationCode(phone, code)

  // 开发模式：输出到控制台
  if (isDev) {
    console.log(`[SMS] 验证码已生成: ${phone} -> ${code}`)
    return { success: true }
  }

  // 生产模式：使用 Twilio 发送短信
  if (!accountSid || !authToken || !fromPhone) {
    console.error("[SMS] Twilio 配置缺失")
    return { success: false, error: "短信服务配置错误" }
  }

  try {
    const client = Twilio(accountSid, authToken)

    await client.messages.create({
      body: `【硫磺价格预测系统】您的验证码是 ${code}，${Math.floor(CODE_EXPIRY_SECONDS / 60)}分钟内有效。`,
      from: fromPhone,
      to: phone,
    })

    return { success: true }
  } catch (error) {
    console.error("[SMS] 发送失败:", error)
    return { success: false, error: "短信发送失败" }
  }
}

/**
 * 格式化手机号（添加中国区号）
 */
export function formatPhoneNumber(phone: string): string {
  // 如果没有 + 前缀，默认添加中国区号
  if (!phone.startsWith("+")) {
    // 如果以 0 开头，去掉 0
    if (phone.startsWith("0")) {
      phone = phone.slice(1)
    }
    return `+86${phone}`
  }
  return phone
}

/**
 * 验证手机号格式
 */
export function isValidPhoneNumber(phone: string): boolean {
  // 中国大陆手机号
  const chinaPhoneRegex = /^1[3-9]\d{9}$/
  // 国际格式
  const internationalRegex = /^\+[1-9]\d{6,14}$/

  return chinaPhoneRegex.test(phone) || internationalRegex.test(phone)
}