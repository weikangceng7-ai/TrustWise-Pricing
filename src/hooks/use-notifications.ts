"use client"

import { useState, useCallback, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export interface Notification {
  id: number
  userId: string
  type: string
  title: string
  content: string
  priority: string
  isRead: boolean
  link: string | null
  metadata: Record<string, unknown>
  createdAt: string
  readAt: string | null
}

export interface PublicNews {
  title: string
  url: string
  source: string
  date: string
  language: string
  tone: number
  category: string
  label: string
}

export function useNotifications() {
  const queryClient = useQueryClient()
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

  // 公开新闻 - 无需登录即可获取
  const { data: publicNewsData } = useQuery({
    queryKey: ["public-news"],
    queryFn: async () => {
      const res = await fetch("/api/public-news")
      return res.json()
    },
    refetchInterval: 300000, // 5分钟刷新一次
    staleTime: 180000, // 3分钟内认为数据新鲜
  })

  const publicNews = (publicNewsData?.data || []) as PublicNews[]

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      if (!userId) return { data: [] }
      const res = await fetch("/api/notifications?limit=20")
      return res.json()
    },
    enabled: !!userId,
    refetchInterval: 60000,
  })

  const { data: unreadCountData } = useQuery({
    queryKey: ["notifications", "count", userId],
    queryFn: async () => {
      if (!userId) return { count: 0 }
      const res = await fetch("/api/notifications?count=true")
      return res.json()
    },
    enabled: !!userId,
    refetchInterval: 30000,
  })

  const notifications = (notificationsData?.data || []) as Notification[]
  const unreadCount = unreadCountData?.count || 0

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const createDemoMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createDemo" }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const markAsRead = useCallback(
    (notificationId: number) => {
      markAsReadMutation.mutate(notificationId)
    },
    [markAsReadMutation]
  )

  const markAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate()
  }, [markAllAsReadMutation])

  const deleteNotification = useCallback(
    (notificationId: number) => {
      deleteMutation.mutate(notificationId)
    },
    [deleteMutation]
  )

  const createDemoNotifications = useCallback(() => {
    createDemoMutation.mutate()
  }, [createDemoMutation])

  return {
    notifications,
    unreadCount,
    isLoading,
    isLoggedIn: !!userId,
    publicNews,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createDemoNotifications,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isCreatingDemo: createDemoMutation.isPending,
  }
}
