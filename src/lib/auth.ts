import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@/db"
import * as schema from "@/db/schema"

const isDatabaseAvailable = db !== null

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: isDatabaseAvailable
    ? drizzleAdapter(db, {
        provider: "pg",
        schema,
      })
    : undefined,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false,
      },
      phone: {
        type: "string",
        required: false,
        unique: true,
      },
      phoneVerified: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
    },
  },
  // 手机号登录提供者
  phone: {
    enabled: true,
    phoneNumberValidation: (phone: string) => {
      // 中国大陆手机号验证
      const chinaPhoneRegex = /^1[3-9]\d{9}$/
      const internationalRegex = /^\+[1-9]\d{6,14}$/
      return chinaPhoneRegex.test(phone) || internationalRegex.test(phone)
    },
  },
  // 高级安全设置
  advanced: {
    generateId: false, // 使用默认 ID 生成
  },
})

export type Session = typeof auth.$Infer.Session.session
export type User = typeof auth.$Infer.Session.user

// 角色定义
export type UserRole = "user" | "admin" | "moderator"

// 权限定义
export const permissions = {
  // 用户权限
  user: {
    dashboard: ["read"],
    chat: ["read", "write"],
    reports: ["read"],
    settings: ["read", "write"],
  },
  // 管理员权限
  admin: {
    dashboard: ["read", "write"],
    chat: ["read", "write", "delete"],
    reports: ["read", "write", "delete"],
    settings: ["read", "write", "delete"],
    users: ["read", "write", "delete"],
    system: ["read", "write"],
  },
  // 版主权限
  moderator: {
    dashboard: ["read", "write"],
    chat: ["read", "write", "delete"],
    reports: ["read", "write"],
    settings: ["read", "write"],
  },
} as const

// 检查用户是否有特定权限
export function hasPermission(
  role: string,
  resource: string,
  action: string
): boolean {
  const rolePermissions = permissions[role as keyof typeof permissions]
  if (!rolePermissions) return false

  const resourcePermissions = rolePermissions[resource as keyof typeof rolePermissions]
  if (!resourcePermissions) return false

  return resourcePermissions.includes(action as never)
}