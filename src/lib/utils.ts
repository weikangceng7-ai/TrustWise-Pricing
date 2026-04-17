import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 生成唯一ID
export function generateId(prefix = "id"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

// 格式化日期为ISO字符串 (YYYY-MM-DD)
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]
}

// 格式化日期为中文格式
export function formatDateCN(date: Date): string {
  return date.toLocaleDateString("zh-CN")
}

// 格式化日期时间为中文格式
export function formatDateTimeCN(date: Date): string {
  return date.toLocaleString("zh-CN")
}

// 解析逗号分隔的字符串
export function parseCommaSeparated(str: string): string[] {
  return str.split(',').map(s => s.trim()).filter(Boolean)
}

// 安全的 localStorage 操作
export function safeGetLocalStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

export function safeSetLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

export function safeRemoveLocalStorage(key: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

// API 响应处理
export async function handleApiResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  return handleApiResponse<T>(res)
}
