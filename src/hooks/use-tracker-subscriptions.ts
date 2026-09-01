/**
 * Tracker 订阅管理 Hooks
 *
 * 使用 @tanstack/react-query 实现订阅数据的查询和操作
 */

"use client"

import { useState, useCallback, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { TrackerSubscription, AlertRuleConfig, NotificationChannelConfig } from "@/db/schema-tracker"
import type { TrackerStatus } from "./use-tracker"

// ==================== 类型定义 ====================

export interface CreateSubscriptionInput {
  name: string
  description?: string
  targetType: "price" | "inventory" | "news" | "all"
  targetRegion?: string
  targetMarket?: string
  frequency: "hourly" | "daily" | "weekly"
  scheduleTime?: string
  alertRules: AlertRuleConfig[]
  reportEnabled?: boolean
  reportType?: "daily" | "weekly" | "monthly"
  notificationChannels?: NotificationChannelConfig
}

export interface UpdateSubscriptionInput {
  name?: string
  description?: string
  targetType?: "price" | "inventory" | "news" | "all"
  targetRegion?: string
  targetMarket?: string
  frequency?: "hourly" | "daily" | "weekly"
  scheduleTime?: string
  alertRules?: AlertRuleConfig[]
  reportEnabled?: boolean
  reportType?: "daily" | "weekly" | "monthly"
  notificationChannels?: NotificationChannelConfig
  isActive?: boolean
}

// ==================== 订阅列表 Hooks ====================

/**
 * 获取订阅列表
 */
export function useTrackerSubscriptions(options?: {
  activeOnly?: boolean
  includeStatus?: boolean
}) {
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState<string | null>(null)

  // 获取用户ID
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

  // 查询订阅列表
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tracker-subscriptions", userId, options],
    queryFn: async () => {
      if (!userId) return { subscriptions: [], total: 0, status: null }

      const params = new URLSearchParams()
      if (options?.activeOnly) params.append("activeOnly", "true")
      if (options?.includeStatus) params.append("includeStatus", "true")

      const res = await fetch(`/api/tracker/subscriptions?${params.toString()}`)
      return res.json()
    },
    enabled: !!userId,
    staleTime: 30000, // 30秒内认为数据新鲜
  })

  // 创建订阅
  const createMutation = useMutation({
    mutationFn: async (input: CreateSubscriptionInput) => {
      const res = await fetch("/api/tracker/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracker-subscriptions"] })
    },
  })

  // 更新订阅
  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: number; input: UpdateSubscriptionInput }) => {
      const res = await fetch(`/api/tracker/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracker-subscriptions"] })
    },
  })

  // 删除订阅
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/tracker/subscriptions/${id}`, {
        method: "DELETE",
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracker-subscriptions"] })
    },
  })

  // 激活/停用订阅
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await fetch(`/api/tracker/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracker-subscriptions"] })
    },
  })

  // 手动执行订阅
  const runMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch("/api/tracker/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: id }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracker-subscriptions"] })
      queryClient.invalidateQueries({ queryKey: ["tracker-alerts"] })
      queryClient.invalidateQueries({ queryKey: ["tracker-status"] })
    },
  })

  // 封装操作方法
  const createSubscription = useCallback(
    (input: CreateSubscriptionInput) => {
      return createMutation.mutateAsync(input)
    },
    [createMutation]
  )

  const updateSubscription = useCallback(
    (id: number, input: UpdateSubscriptionInput) => {
      return updateMutation.mutateAsync({ id, input })
    },
    [updateMutation]
  )

  const deleteSubscription = useCallback(
    (id: number) => {
      return deleteMutation.mutateAsync(id)
    },
    [deleteMutation]
  )

  const toggleSubscription = useCallback(
    (id: number, isActive: boolean) => {
      return toggleMutation.mutateAsync({ id, isActive })
    },
    [toggleMutation]
  )

  const runSubscription = useCallback(
    (id: number) => {
      return runMutation.mutateAsync(id)
    },
    [runMutation]
  )

  return {
    subscriptions: (data?.data?.subscriptions || []) as TrackerSubscription[],
    total: data?.data?.total || 0,
    status: (data?.data?.status || null) as any,
    isLoading,
    error,
    isLoggedIn: !!userId,
    refetch,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    toggleSubscription,
    runSubscription,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isToggling: toggleMutation.isPending,
    isRunning: runMutation.isPending,
  }
}

// ==================== 单个订阅 Hooks ====================

/**
 * 获取单个订阅详情
 */
export function useTrackerSubscription(subscriptionId: number | null) {
  const [userId, setUserId] = useState<string | null>(null)
  const queryClient = useQueryClient()

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

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tracker-subscription", subscriptionId],
    queryFn: async () => {
      if (!subscriptionId) return null

      const res = await fetch(`/api/tracker/subscriptions/${subscriptionId}`)
      return res.json()
    },
    enabled: !!userId && !!subscriptionId,
  })

  // 更新订阅
  const updateMutation = useMutation({
    mutationFn: async (input: UpdateSubscriptionInput) => {
      if (!subscriptionId) return null
      const res = await fetch(`/api/tracker/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracker-subscription", subscriptionId] })
      queryClient.invalidateQueries({ queryKey: ["tracker-subscriptions"] })
    },
  })

  const updateSubscription = useCallback(
    (input: UpdateSubscriptionInput) => {
      return updateMutation.mutateAsync(input)
    },
    [updateMutation]
  )

  return {
    subscription: (data?.data || null) as TrackerSubscription | null,
    isLoading,
    error,
    refetch,
    updateSubscription,
    isUpdating: updateMutation.isPending,
  }
}

// ==================== Tracker 状态 Hooks ====================

/**
 * 获取 Tracker 状态统计
 */
export function useTrackerStatus() {
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

  const { data, isLoading, refetch } = useQuery({
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
    refetch,
  }
}