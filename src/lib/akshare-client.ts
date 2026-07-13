/**
 * AKShare Python 服务客户端
 * 封装对 python-service AKShare 端点的 HTTP 调用
 */

const DEFAULT_BASE_URL = "http://localhost:5001"
const DEFAULT_TIMEOUT = 10000 // 10 秒超时

export interface CommodityPriceRecord {
  date: string
  price: number
  change_percent?: number | null
  unit: string
}

export interface CommodityDataResponse {
  success: boolean
  source: string
  commodity_code: string
  data: CommodityPriceRecord[]
  count: number
  note?: string
}

function getBaseUrl(): string {
  return process.env.PYTHON_SERVICE_URL || DEFAULT_BASE_URL
}

/**
 * 通用 fetch 封装，带超时和错误处理
 */
async function fetchAKShare<T>(endpoint: string, timeout = DEFAULT_TIMEOUT): Promise<T | null> {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}/akshare/${endpoint}`

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

    const res = await fetch(url, { signal: controller.signal, cache: "no-store" })
    clearTimeout(timer)

    if (!res.ok) {
      console.warn(`AKShare 服务返回 ${res.status}: ${endpoint}`)
      return null
    }

    return (await res.json()) as T
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      console.warn(`AKShare 服务超时: ${endpoint}`)
    } else {
      console.warn(`AKShare 服务不可达 (${endpoint}):`, e)
    }
    return null
  }
}

/**
 * 获取指定品种的现货价格
 */
export async function fetchCommoditySpot(
  code: string,
  days = 90
): Promise<CommodityDataResponse | null> {
  return fetchAKShare<CommodityDataResponse>(`commodity?code=${code}&days=${days}`)
}

/**
 * 获取 BDI 指数
 */
export async function fetchBDI(): Promise<CommodityDataResponse | null> {
  return fetchAKShare<CommodityDataResponse>("bdi")
}

/**
 * 批量获取所有品种数据
 */
export async function fetchAllCommodities(days = 30): Promise<Record<string, CommodityDataResponse> | null> {
  const result = await fetchAKShare<{ success: boolean; data: Record<string, CommodityDataResponse> }>(
    `all?days=${days}`
  )
  return result?.data ?? null
}

/**
 * 检查 AKShare 服务是否可用
 */
export async function checkAKShareHealth(): Promise<boolean> {
  const result = await fetchAKShare<{ akshare_available: boolean }>("health")
  return result?.akshare_available ?? false
}
