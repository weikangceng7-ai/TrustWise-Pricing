"use client"

import { useQuery } from "@tanstack/react-query"

/**
 * 数据处理统计 Hook
 * 获取数据清洗进度、处理效率分析等统计信息
 */

export interface ProcessingStat {
  name: string
  value: number
  fill: string
}

export interface EfficiencyRecord {
  stage: string
  before: number
  after: number
}

export interface SourceStats {
  prices: {
    total: number
    latestDate: string | null
    avgPrice: number | null
  }
  inventory: {
    total: number
    latestDate: string | null
    avgInventory: number | null
  }
  reports: {
    total: number
    latestDate: string | null
  }
}

export interface TimelineRecord {
  date: string
  processed: number
  newRaw: number
  error: number
}

export interface DataProcessingMetrics {
  utilizationRate: number
  labelingRate: number
  modelAccuracy: number
  dailyProcessed: number
  avgProcessingTime: number
}

export interface DataProcessingResponse {
  success: boolean
  timestamp: string
  data: {
    processingStats: ProcessingStat[]
    efficiency: EfficiencyRecord[]
    metrics: DataProcessingMetrics
    sources: SourceStats
    timeline: TimelineRecord[]
  }
}

/**
 * 获取数据处理统计数据
 */
export function useDataProcessingStats() {
  return useQuery<DataProcessingResponse>({
    queryKey: ["data-processing-stats"],
    queryFn: async () => {
      const response = await fetch("/api/data-processing/stats")
      if (!response.ok) {
        throw new Error("获取数据处理统计失败")
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 分钟内不重新请求
    refetchInterval: 10 * 60 * 1000, // 每 10 分钟自动刷新
  })
}