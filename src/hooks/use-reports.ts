"use client"

import { useState, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ReportFilters } from "@/services/reports"

export interface Report {
  id: number
  title: string
  reportDate: string
  summary: string
  recommendation: string | null
  priceTrend: string | null
  riskLevel: string | null
  createdAt: Date
}

export interface ReportStats {
  total: number
  thisWeek: number
  thisMonth: number
  pending: number
  byType: Record<string, number>
  byTrend: Record<string, number>
}

export function useReports() {
  const [filters, setFilters] = useState<ReportFilters>({})

  const { data: reportsData, isLoading: isLoadingReports, refetch: refetchReports } = useQuery({
    queryKey: ["reports", filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.keyword) params.set("keyword", filters.keyword)
      if (filters.startDate) params.set("startDate", filters.startDate)
      if (filters.endDate) params.set("endDate", filters.endDate)
      if (filters.trend) params.set("trend", filters.trend)
      if (filters.risk) params.set("risk", filters.risk)

      const res = await fetch(`/api/reports?${params.toString()}`)
      return res.json()
    },
  })

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ["reports", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/reports?stats=true")
      return res.json()
    },
  })

  const reports = (reportsData?.data || []) as Report[]
  const stats = statsData?.stats as ReportStats | null

  const updateFilters = useCallback((newFilters: Partial<ReportFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
  }, [])

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== "")

  const refresh = useCallback(async () => {
    await Promise.all([refetchReports(), refetchStats()])
  }, [refetchReports, refetchStats])

  return {
    reports,
    stats,
    isLoading: isLoadingReports,
    filters,
    updateFilters,
    clearFilters,
    hasActiveFilters,
    refresh,
  }
}
