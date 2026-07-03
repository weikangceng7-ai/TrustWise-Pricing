/**
 * Tracker 数据查询 Hooks
 *
 * 使用 @tanstack/react-query 实现异动事件、追踪状态、追踪记录等数据的查询
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { TrackerAlert, TrackerRecord } from "@/db/schema-tracker"

// ==================== 类型定义 ====================

export interface TrackerStatus {
  activeSubscriptions: number
  totalSubscriptions: number
  runningTasks: number
  recentAlerts: number
  unreadAlerts: number
  lastRunTime: string | null
  nextScheduledRun: string | null
}

export interface AlertsQueryOptions {
  subscriptionId?: number
  alertType?: string
  urgency?: "high" | "normal" | "low"
  isRead?: boolean
  isHandled?: boolean
  limit?: number
  offset?: number
}

export interface AlertsResponse {
  alerts: TrackerAlert[]
  total: number
  unreadCount: number
}

// ==================== 用户认证状态 ====================

function useUserId() {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/auth/get-session")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.id) {
          setUserId(data.user.id)
        }
      })
      .catch(() => {
        setUserId(null)
      })
  }, [])

  return userId
}

// ==================== Tracker 状态 Hooks ====================

/**
 * 获取 Tracker 状态统计
 */
export function useTrackerStatus() {
  const userId = useUserId()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tracker-status", userId],
    queryFn: async () => {
      if (!userId) return null

      const res = await fetch("/api/tracker/status")
      return res.json()
    },
    enabled: !!userId,
    staleTime: 60000, // 1分钟内认为数据新鲜
    refetchInterval: 120000, // 2分钟自动刷新
  })

  return {
    status: (data?.data || null) as TrackerStatus | null,
    isLoading,
    error,
    refetch,
    isLoggedIn: !!userId,
  }
}

// ==================== 异动事件 Hooks ====================

/**
 * 获取异动事件列表
 */
export function useTrackerAlerts(options?: AlertsQueryOptions) {
  const userId = useUserId()
  const queryClient = useQueryClient()

  // 查询异动列表
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tracker-alerts", userId, options],
    queryFn: async () => {
      if (!userId) return { alerts: [], total: 0, unreadCount: 0 }

      const params = new URLSearchParams()
      if (options?.subscriptionId) params.append("subscriptionId", String(options.subscriptionId))
      if (options?.alertType) params.append("alertType", options.alertType)
      if (options?.urgency) params.append("urgency", options.urgency)
      if (options?.isRead !== undefined) params.append("isRead", String(options.isRead))
      if (options?.isHandled !== undefined) params.append("isHandled", String(options.isHandled))
      if (options?.limit) params.append("limit", String(options.limit))
      if (options?.offset) params.append("offset", String(options.offset))

      const res = await fetch(`/api/tracker/alerts?${params.toString()}`)
      return res.json()
    },
    enabled: !!userId,
    staleTime: 30000, // 30秒内认为数据新鲜
  })

  // 标记已读
  const markAsReadMutation = useMutation({
    mutationFn: async (alertId: number) => {
      const res = await fetch(`/api/tracker/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracker-alerts"] })
      queryClient.invalidateQueries({ queryKey: ["tracker-status"] })
    },
  })

  // 全部标记已读
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tracker/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracker-alerts"] })
      queryClient.invalidateQueries({ queryKey: ["tracker-status"] })
    },
  })

  // 封装操作方法
  const markAsRead = useCallback(
    (alertId: number) => {
      return markAsReadMutation.mutateAsync(alertId)
    },
    [markAsReadMutation]
  )

  const markAllAsRead = useCallback(
    () => {
      return markAllAsReadMutation.mutateAsync()
    },
    [markAllAsReadMutation]
  )

  return {
    alerts: (data?.data?.alerts || []) as TrackerAlert[],
    total: data?.data?.total || 0,
    unreadCount: data?.data?.unreadCount || 0,
    isLoading,
    error,
    refetch,
    isLoggedIn: !!userId,
    markAsRead,
    markAllAsRead,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  }
}

/**
 * 获取单个异动详情
 */
export function useTrackerAlert(alertId: number | null) {
  const userId = useUserId()
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tracker-alert", alertId],
    queryFn: async () => {
      if (!userId || !alertId) return null

      const res = await fetch(`/api/tracker/alerts/${alertId}`)
      return res.json()
    },
    enabled: !!userId && !!alertId,
  })

  // 标记已处理
  const markAsHandledMutation = useMutation({
    mutationFn: async (handleNote?: string) => {
      if (!alertId) return null
      const res = await fetch(`/api/tracker/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHandled: true, handleNote }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracker-alerts"] })
      queryClient.invalidateQueries({ queryKey: ["tracker-alert", alertId] })
    },
  })

  const markAsHandled = useCallback(
    (handleNote?: string) => {
      return markAsHandledMutation.mutateAsync(handleNote)
    },
    [markAsHandledMutation]
  )

  return {
    alert: (data?.data || null) as TrackerAlert | null,
    isLoading,
    error,
    refetch,
    markAsHandled,
    isMarkingAsHandled: markAsHandledMutation.isPending,
  }
}

// ==================== 追踪任务控制 Hooks ====================

/**
 * 手动启动追踪任务
 */
export function useTrackerControl() {
  const userId = useUserId()
  const queryClient = useQueryClient()

  const startMutation = useMutation({
    mutationFn: async (params?: { subscriptionId?: number; frequency?: "hourly" | "daily" | "weekly" }) => {
      const res = await fetch("/api/tracker/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: params?.subscriptionId,
          immediate: true,
          frequency: params?.frequency,
        }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracker-status"] })
      queryClient.invalidateQueries({ queryKey: ["tracker-alerts"] })
    },
  })

  const startTracking = useCallback(
    (params?: { subscriptionId?: number; frequency?: "hourly" | "daily" | "weekly" }) => {
      return startMutation.mutateAsync(params)
    },
    [startMutation]
  )

  return {
    startTracking,
    isStarting: startMutation.isPending,
    result: startMutation.data,
    isLoggedIn: !!userId,
  }
}