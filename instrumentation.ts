// instrumentation.ts
// Sentry 初始化 - 仅在 SENTRY_DSN 配置时激活
export async function register() {
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    await import("./sentry.server.config")
  }
}
