/**
 * 统一的外部数据请求工具
 *
 * 提供分源超时 + 指数退避重试，替代各 route 内散落的 fetchWithTimeout。
 * 约定：全部尝试失败（网络错误或非 2xx）时返回 null，不抛错，由上层降级链处理。
 */

export interface FetchWithRetryOptions {
  /** 单次请求超时（毫秒） */
  timeoutMs: number
  /** 重试次数（默认 1，即最多尝试 2 次） */
  retries?: number
  /** 退避基数（毫秒，默认 500，指数增长：500 → 1000 → ...） */
  backoffMs?: number
  /** 额外请求头 */
  headers?: Record<string, string>
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions
): Promise<Response | null> {
  const { timeoutMs, retries = 1, backoffMs = 500, headers } = options

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, backoffMs * Math.pow(2, attempt - 1)))
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, { signal: controller.signal, headers })
      if (response.ok) return response
      // 非 2xx 视为失败，进入下一次重试
      console.warn(`外部请求返回 ${response.status}: ${url.slice(0, 80)}`)
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") {
        console.warn(`外部请求超时 (${timeoutMs}ms): ${url.slice(0, 80)}`)
      } else {
        console.warn(`外部请求失败: ${url.slice(0, 80)}`, error)
      }
    } finally {
      clearTimeout(timer)
    }
  }

  return null
}
