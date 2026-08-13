// src/lib/logger.ts
/**
 * 结构化日志工具
 * 生产环境输出 JSON，开发环境输出可读格式
 */

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  data?: Record<string, unknown>
}

function formatLog(entry: LogEntry): string {
  if (process.env.NODE_ENV === "production") {
    return JSON.stringify(entry)
  }
  const { level, message, data } = entry
  const prefix = `[${level.toUpperCase()}]`
  const dataStr = data ? ` ${JSON.stringify(data)}` : ""
  return `${prefix} ${message}${dataStr}`
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    data,
  }
  const output = formatLog(entry)

  switch (level) {
    case "error":
      console.error(output)
      break
    case "warn":
      console.warn(output)
      break
    default:
      console.log(output)
  }
}

export const logger = {
  debug: (message: string, data?: Record<string, unknown>) => log("debug", message, data),
  info: (message: string, data?: Record<string, unknown>) => log("info", message, data),
  warn: (message: string, data?: Record<string, unknown>) => log("warn", message, data),
  error: (message: string, data?: Record<string, unknown>) => log("error", message, data),
}
