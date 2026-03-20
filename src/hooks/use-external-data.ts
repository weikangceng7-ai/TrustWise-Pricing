import { useQuery } from "@tanstack/react-query"

// =========================
// AkShare（行情类）数据
// =========================
// 单个时间点的数据结构：日期、数值、涨跌额、涨跌幅
export interface AkShareDataPoint {
  date: string
  value: number
  change: number
  changePercent: number
}

// 后端 `/api/external-data/akshare` 的响应结构
export interface AkShareResponse {
  success: boolean
  source: string
  type: string
  data: {
    name: string
    unit: string
    latest: AkShareDataPoint
    history: AkShareDataPoint[]
  }
  timestamp: string
  note?: string
}

// 可查询的 AkShare 指标类型
export type AkShareType = "oil" | "brent" | "usdcny" | "bdi"

// 统一的 AkShare 请求函数（只负责请求，不负责缓存）
async function fetchAkShareData(type: AkShareType): Promise<AkShareResponse> {
  const res = await fetch(`/api/external-data/akshare?type=${type}`)
  if (!res.ok) throw new Error("获取 AkShare 数据失败")
  return res.json()
}

// AkShare 的 React Query Hook：
// - queryKey 用于缓存隔离，不同 type 会分别缓存
// - staleTime: 数据 5 分钟内视为“新鲜”
// - refetchInterval: 每 10 分钟自动刷新一次
export function useAkShareData(type: AkShareType) {
  return useQuery({
    queryKey: ["akshare", type],
    queryFn: () => fetchAkShareData(type),
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    refetchInterval: 10 * 60 * 1000, // 10分钟自动刷新
  })
}

// =========================
// GDELT（新闻舆情）数据
// =========================
// 时间趋势模式下的单点数据
export interface GDELTTimelinePoint {
  date: string
  value: number
  count: number
}

// 单篇新闻结构
export interface GDELTArticle {
  title: string
  url: string
  source: string
  date: string
  language: string
  tone: number
}

// 关键词聚合摘要结构
export interface GDELTTopicSummary {
  keyword: string
  count: number
  articles: GDELTArticle[]
}

// 后端 `/api/external-data/gdelt` 的响应结构
// data 会随 mode 不同而变化（时间线 / 搜索结果 / 摘要）
export interface GDELTResponse {
  success: boolean
  source: string
  query?: string
  mode: string
  data: GDELTTimelinePoint[] | GDELTArticle[] | {
    topics: GDELTTopicSummary[]
    totalArticles: number
    lastUpdated: string
  }
  timestamp: string
}

// GDELT 查询模式
export type GDELTMode = "timeline" | "search" | "summary"

// GDELT 请求函数
async function fetchGDELTData(query: string, mode: GDELTMode): Promise<GDELTResponse> {
  const res = await fetch(`/api/external-data/gdelt?q=${encodeURIComponent(query)}&mode=${mode}`)
  if (!res.ok) throw new Error("获取 GDELT 数据失败")
  return res.json()
}

// GDELT 的 React Query Hook（默认查询 sulfur，默认时间线模式）
export function useGDELTData(query: string = "sulfur", mode: GDELTMode = "timeline") {
  return useQuery({
    queryKey: ["gdelt", query, mode],
    queryFn: () => fetchGDELTData(query, mode),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  })
}

// =========================
// FRED（宏观经济）数据
// =========================
// 指标元信息
export interface FREDSeries {
  id: string
  title: string
  observation_start: string
  observation_end: string
  frequency: string
  units: string
}

// 指标时间序列中的单点
export interface FREDDataPoint {
  date: string
  value: number
}

// 后端 `/api/external-data/fred` 的响应结构
export interface FREDResponse {
  success: boolean
  source: string
  series_id: string
  data: {
    series?: FREDSeries
    observations: FREDDataPoint[]
    latest: FREDDataPoint | null
    change: number | null
    changePercent: number | null
  }
  timestamp: string
  error?: string
}

// 支持查询的 FRED 指标（用官方 series id 表示）
export type FREDIndicator =
  | "DCOILWTICO"   // WTI原油价格
  | "DHHNGSP"      // 天然气价格
  | "DEXCHUS"      // 美元/人民币汇率
  | "DEXUSEU"      // 美元/欧元汇率
  | "FEDFUNDS"     // 联邦基金利率
  | "UNRATE"       // 失业率
  | "CPIAUCSL"     // CPI
  | "PPIACO"       // PPI

// FRED 请求函数
async function fetchFREDData(indicator: FREDIndicator): Promise<FREDResponse> {
  const res = await fetch(`/api/external-data/fred?indicator=${indicator}`)
  if (!res.ok) throw new Error("获取 FRED 数据失败")
  return res.json()
}

// FRED 的 React Query Hook：
// - 宏观数据变化较慢，缓存 1 小时
// - 只有配置了 NEXT_PUBLIC_FRED_API_KEY 才会发请求
export function useFREDData(indicator: FREDIndicator) {
  return useQuery({
    queryKey: ["fred", indicator],
    queryFn: () => fetchFREDData(indicator),
    staleTime: 60 * 60 * 1000, // 1小时缓存
    enabled: !!process.env.NEXT_PUBLIC_FRED_API_KEY, // 只有配置了 API Key 才启用
  })
}

// =========================
// 综合市场概览 Hook
// =========================
// 统一返回多个数据源，便于页面一次性渲染“市场总览”
export interface MarketDataOverview {
  oil: AkShareResponse | null
  brent: AkShareResponse | null
  usdcny: AkShareResponse | null
  bdi: AkShareResponse | null
  news: GDELTResponse | null
  loading: boolean
  errors: string[]
}

// 聚合多个查询：
// - 并行请求 4 个行情指标 + 1 个新闻摘要
// - 统一整理 loading 和 errors，减少页面层判断逻辑
export function useMarketDataOverview(): MarketDataOverview {
  const oilQuery = useAkShareData("oil")
  const brentQuery = useAkShareData("brent")
  const usdcnyQuery = useAkShareData("usdcny")
  const bdiQuery = useAkShareData("bdi")
  const newsQuery = useGDELTData("sulfur", "summary")

  const errors: string[] = []
  if (oilQuery.error) errors.push(`原油数据: ${oilQuery.error.message}`)
  if (brentQuery.error) errors.push(`布伦特数据: ${brentQuery.error.message}`)
  if (usdcnyQuery.error) errors.push(`汇率数据: ${usdcnyQuery.error.message}`)
  if (bdiQuery.error) errors.push(`BDI数据: ${bdiQuery.error.message}`)
  if (newsQuery.error) errors.push(`新闻数据: ${newsQuery.error.message}`)

  return {
    oil: oilQuery.data || null,
    brent: brentQuery.data || null,
    usdcny: usdcnyQuery.data || null,
    bdi: bdiQuery.data || null,
    news: newsQuery.data || null,
    loading: oilQuery.isLoading || brentQuery.isLoading || usdcnyQuery.isLoading || bdiQuery.isLoading || newsQuery.isLoading,
    errors,
  }
}
