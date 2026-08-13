/**
 * AES-256-GCM 加密工具
 * 用于加密存储敏感字段（如 predictionServiceApiKey）
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const TAG_LENGTH = 16
const SALT_LENGTH = 32
const KEY_LENGTH = 32

function getEncryptionKey(): Buffer {
  const secret = process.env.CRYPTO_SECRET || process.env.BETTER_AUTH_SECRET
  if (!secret) {
    throw new Error("CRYPTO_SECRET or BETTER_AUTH_SECRET environment variable is required for encryption")
  }
  // salt 来自环境变量，未配置时回退到默认值（向后兼容历史加密数据）
  const salt = process.env.CRYPTO_SALT || "sulfur-agent-crypto-salt-2024"
  return scryptSync(secret, salt, KEY_LENGTH)
}

/**
 * 加密文本，返回 base64 编码的加密结果（含 IV + salt + tag + ciphertext）
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, "utf8", "hex")
  encrypted += cipher.final("hex")
  const tag = cipher.getAuthTag()

  // 格式: iv:tag:ciphertext (均为 hex)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`
}

/**
 * 解密文本
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey()
  const parts = ciphertext.split(":")

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format")
  }

  const [ivHex, tagHex, encryptedHex] = parts
  const iv = Buffer.from(ivHex, "hex")
  const tag = Buffer.from(tagHex, "hex")

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encryptedHex, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}
