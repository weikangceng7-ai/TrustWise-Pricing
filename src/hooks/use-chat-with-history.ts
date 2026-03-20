"use client"

import { useState, useCallback, useRef, useEffect } from "react"

export interface ChatMessage {
  id: string
  role: "user" | "agent"
  content: string
  timestamp: Date
  conversationId?: string
}

export interface Conversation {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
}

interface UseChatWithHistoryOptions {
  userId?: string
  conversationId?: string
}


export function useChatWithHistory(options: UseChatWithHistoryOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "agent",
      content: "您好！我是硫磺采购决策助手。我可以帮您分析价格趋势、提供采购建议、解读市场动态。请问有什么可以帮您的？",
      timestamp: new Date(),
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  // 加载对话列表
  const loadConversations = useCallback(async () => {
    if (!options.userId) return

    try {
      const res = await fetch("/api/conversations")
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch (err) {
      console.error("加载对话列表失败:", err)
    }
  }, [options.userId])

  // 加载特定对话的消息
  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`)
      if (res.ok) {
        const data = await res.json()
        const loadedMessages = data.messages.map((msg: { id: string; role: string; content: string; createdAt: string }) => ({
          id: msg.id,
          role: msg.role as "user" | "agent",
          content: msg.content,
          timestamp: new Date(msg.createdAt),
          conversationId,
        }))
        setMessages(loadedMessages)
        setCurrentConversationId(conversationId)
      }
    } catch (err) {
      console.error("加载对话失败:", err)
    }
  }, [])

  // 创建新对话
  const createNewConversation = useCallback(async (firstMessage?: string) => {
    if (!options.userId) {
      // 未登录用户，使用本地状态
      setCurrentConversationId(null)
      setMessages([
        {
          id: "welcome",
          role: "agent",
          content: "您好！我是硫磺采购决策助手。我可以帮您分析价格趋势、提供采购建议、解读市场动态。请问有什么可以帮您的？",
          timestamp: new Date(),
        },
      ])
      return null
    }

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: firstMessage?.slice(0, 50) || "新对话",
          firstMessage,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        await loadConversations()
        setCurrentConversationId(data.conversation.id)
        return data.conversation.id
      }
    } catch (err) {
      console.error("创建对话失败:", err)
    }
    return null
  }, [options.userId, loadConversations])

  // 保存消息到数据库
  const saveMessage = useCallback(async (conversationId: string, role: string, content: string) => {
    if (!options.userId) return

    try {
      await fetch(`/api/conversations/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, content }),
      })
    } catch (err) {
      console.error("保存消息失败:", err)
    }
  }, [options.userId])

  // 删除对话
  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== conversationId))
        if (currentConversationId === conversationId) {
          setCurrentConversationId(null)
          setMessages([
            {
              id: "welcome",
              role: "agent",
              content: "对话已删除。请问有什么可以帮您的？",
              timestamp: new Date(),
            },
          ])
        }
      }
    } catch (err) {
      console.error("删除对话失败:", err)
    }
  }, [currentConversationId])

  // 发送消息
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
      conversationId: currentConversationId || undefined,
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    // 如果没有当前对话，创建一个
    let conversationId = currentConversationId
    if (!conversationId && options.userId) {
      conversationId = await createNewConversation(content.trim())
      if (conversationId) {
        userMessage.conversationId = conversationId
      }
    } else if (conversationId && options.userId) {
      // 保存用户消息
      await saveMessage(conversationId, "user", content.trim())
    }

    const agentMessageId = generateId()
    const tempAgentMessage: ChatMessage = {
      id: agentMessageId,
      role: "agent",
      content: "",
      timestamp: new Date(),
      conversationId: conversationId || undefined,
    }
    setMessages((prev) => [...prev, tempAgentMessage])

    try {
      abortControllerRef.current = new AbortController()

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages
            .filter((m) => m.id !== "welcome")
            .map((m) => ({ role: m.role, content: m.content }))
            .concat({ role: "user", content: content.trim() }),
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "请求失败" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No response body")
      }

      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        fullContent += chunk

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === agentMessageId ? { ...msg, content: fullContent } : msg
          )
        )
      }

      // 保存 AI 回复到数据库
      if (conversationId && options.userId && fullContent) {
        await saveMessage(conversationId, "assistant", fullContent)
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return
      }

      const errorMessage = err instanceof Error ? err.message : "发送消息失败，请重试"
      setError(errorMessage)

      const errorMessageObj: ChatMessage = {
        id: generateId(),
        role: "agent",
        content: `抱歉，发生了错误：${errorMessage}。请稍后重试。`,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessageObj])
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [isLoading, messages, currentConversationId, options.userId, createNewConversation, saveMessage])

  // 重新生成回答
  const regenerateMessage = useCallback(async (messageId: string) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId)
    if (messageIndex === -1 || messages[messageIndex].role !== "agent") return

    // 找到对应的用户消息
    let userMessageIndex = messageIndex - 1
    while (userMessageIndex >= 0 && messages[userMessageIndex].role !== "user") {
      userMessageIndex--
    }

    if (userMessageIndex < 0) return

    const userContent = messages[userMessageIndex].content

    // 移除当前的 AI 回复
    setMessages((prev) => prev.filter((m) => m.id !== messageId))

    // 直接重新请求 AI 回复
    const agentMessageId = generateId()
    const tempAgentMessage: ChatMessage = {
      id: agentMessageId,
      role: "agent",
      content: "",
      timestamp: new Date(),
      conversationId: currentConversationId || undefined,
    }
    setMessages((prev) => [...prev, tempAgentMessage])

    setIsLoading(true)
    try {
      abortControllerRef.current = new AbortController()

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages
            .filter((m) => m.id !== "welcome" && m.id !== messageId)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "请求失败" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No response body")
      }

      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        fullContent += chunk

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === agentMessageId ? { ...msg, content: fullContent } : msg
          )
        )
      }

      // 保存 AI 回复到数据库
      if (currentConversationId && options.userId && fullContent) {
        await saveMessage(currentConversationId, "assistant", fullContent)
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return
      }

      const errorMessage = err instanceof Error ? err.message : "重新生成失败，请重试"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [messages, currentConversationId, options.userId, saveMessage])

  // 清空当前对话
  const clearMessages = useCallback(() => {
    setCurrentConversationId(null)
    setMessages([
      {
        id: "welcome",
        role: "agent",
        content: "新对话已开始。我是硫磺采购决策助手，请问有什么可以帮您的？",
        timestamp: new Date(),
      },
    ])
    setError(null)
  }, [])

  // 初始加载对话列表
  useEffect(() => {
    if (options.userId) {
      loadConversations()
    }
  }, [options.userId, loadConversations])

  // 加载指定的对话
  useEffect(() => {
    if (options.conversationId) {
      loadConversation(options.conversationId)
    }
  }, [options.conversationId, loadConversation])

  return {
    messages,
    isLoading,
    error,
    conversations,
    currentConversationId,
    sendMessage,
    regenerateMessage,
    clearMessages,
    loadConversation,
    createNewConversation,
    deleteConversation,
    loadConversations,
  }
}