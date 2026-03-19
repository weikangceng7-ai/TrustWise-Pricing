import { useQuery } from "@tanstack/react-query"

// 硫磺价格数据类型
export interface PriceData {
  id: number
  date: string
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

async function fetchPrices(limit?: number): Promise<PricesResponse> {
  const url = limit ? `/api/prices?limit=${limit}` : "/api/prices"
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error("获取价格数据失败")
  }
  return res.json()
}

async function fetchPriceSummary(): Promise<SummaryResponse<PriceSummary>> {
  const res = await fetch("/api/prices/summary")
  if (!res.ok) {
    throw new Error("获取价格摘要失败")
  }
  return res.json()
}

async function fetchInventory(limit?: number): Promise<InventoryResponse> {
  const url = limit ? `/api/inventory?limit=${limit}` : "/api/inventory"
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error("获取库存数据失败")
  }
  return res.json()
}

async function fetchInventorySummary(): Promise<SummaryResponse<InventorySummary>> {
  const res = await fetch("/api/inventory/summary")
  if (!res.ok) {
    throw new Error("获取库存摘要失败")
  }
  return res.json()
}

export function usePrices(limit?: number) {
  return useQuery({
    queryKey: ["prices", limit],
    queryFn: () => fetchPrices(limit),
  })
}

export function usePriceSummary() {
  return useQuery({
    queryKey: ["priceSummary"],
    queryFn: fetchPriceSummary,
  })
}

export function useInventory(limit?: number) {
  return useQuery({
    queryKey: ["inventory", limit],
    queryFn: () => fetchInventory(limit),
  })
}

export function useInventorySummary() {
  return useQuery({
    queryKey: ["inventorySummary"],
    queryFn: fetchInventorySummary,
  })
}