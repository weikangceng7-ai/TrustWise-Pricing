import { useQuery } from "@tanstack/react-query"

export interface PriceData {
  id: number
  date: string
  price: string
  unit: string
  source: string
  createdAt: string
}

export interface PricesResponse {
  success: boolean
  data: PriceData[]
  total: number
}

async function fetchPrices(): Promise<PricesResponse> {
  const res = await fetch("/api/prices")
  if (!res.ok) {
    throw new Error("获取价格数据失败")
  }
  return res.json()
}

export function usePrices() {
  return useQuery({
    queryKey: ["prices"],
    queryFn: fetchPrices,
  })
}
