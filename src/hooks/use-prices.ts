import { useQuery } from "@tanstack/react-query"

// 硫磺价格数据类型
export interface PriceData {
  id: number
  date: string
  commodityCode: string | null
  productName: string | null
  region: string | null
  market: string | null
  specification: string | null
  minPrice: string | null
  maxPrice: string | null
  mainPrice: string | null
  changeValue: string | null
  changePercent: string | null
  unit: string | null
  source: string | null
  createdAt: string | null
}

// 价格摘要数据类型
export interface PriceSummary {
  currentPrice: string | null
  minPrice: string | null
  maxPrice: string | null
  avgPrice: string
  changeValue: string | null
  changePercent: string | null
  date: string | null
  market: string | null
  specification: string | null
}

// 港口库存数据类型
export interface InventoryData {
  id: number
  date: string
  inventory: string
  price: string | null
  createdAt: string | null
}

// 库存摘要数据类型
export interface InventorySummary {
  currentInventory: string
  avgInventory: string
  currentPrice: string | null
  date: string | null
}

export interface PricesResponse {
  success: boolean
  data: PriceData[]
  total: number
}

export interface SummaryResponse<T> {
  success: boolean
  data: T | null
}

export interface InventoryResponse {
  success: boolean
  data: InventoryData[]
  total: number
}

export function usePrices(limit?: number, commodityCode?: string) {
  return useQuery({
    queryKey: ["prices", limit, commodityCode],
    queryFn: () => fetchPrices(limit, commodityCode),
  })
}

export function usePriceSummary(commodityCode?: string) {
  return useQuery({
    queryKey: ["priceSummary", commodityCode],
    queryFn: () => fetchPriceSummary(commodityCode),
  })
}

export function useInventory(limit?: number, commodityCode?: string) {
  return useQuery({
    queryKey: ["inventory", limit, commodityCode],
    queryFn: () => fetchInventory(limit, commodityCode),
  })
}

export function useInventorySummary(commodityCode?: string) {
  return useQuery({
    queryKey: ["inventorySummary", commodityCode],
    queryFn: () => fetchInventorySummary(commodityCode),
  })
}

async function fetchPrices(limit?: number, commodityCode?: string): Promise<PricesResponse> {
  const params = new URLSearchParams()
  if (limit) params.set("limit", String(limit))
  if (commodityCode) params.set("commodity", commodityCode)
  const qs = params.toString()
  const url = qs ? `/api/prices?${qs}` : "/api/prices"
  const res = await fetch(url)
  if (!res.ok) throw new Error("获取价格数据失败")
  return res.json()
}

async function fetchPriceSummary(commodityCode?: string): Promise<SummaryResponse<PriceSummary>> {
  const url = commodityCode ? `/api/prices/summary?commodity=${commodityCode}` : "/api/prices/summary"
  const res = await fetch(url)
  if (!res.ok) throw new Error("获取价格摘要失败")
  return res.json()
}

async function fetchInventory(limit?: number, commodityCode?: string): Promise<InventoryResponse> {
  const params = new URLSearchParams()
  if (limit) params.set("limit", String(limit))
  if (commodityCode) params.set("commodity", commodityCode)
  const qs = params.toString()
  const url = qs ? `/api/inventory?${qs}` : "/api/inventory"
  const res = await fetch(url)
  if (!res.ok) throw new Error("获取库存数据失败")
  return res.json()
}

async function fetchInventorySummary(commodityCode?: string): Promise<SummaryResponse<InventorySummary>> {
  const url = commodityCode ? `/api/inventory/summary?commodity=${commodityCode}` : "/api/inventory/summary"
  const res = await fetch(url)
  if (!res.ok) throw new Error("获取库存摘要失败")
  return res.json()
}