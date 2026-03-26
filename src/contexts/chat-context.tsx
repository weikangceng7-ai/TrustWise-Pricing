"use client"

import { createContext, useContext, useCallback, useRef, useState, useEffect, ReactNode } from "react"

export interface ImageContent {
  type: "image_url"
  imageUrl: {
    url: string
  }
}

export interface TextContent {
  type: "text"
  text: string
}

export type MessageContent = string | (TextContent | ImageContent)[]

export interface ChatMessage {
  id: string
  role: "user" | "agent"
  content: string
  timestamp: Date
  conversationId?: string
  images?: string[]
}

export interface Conversation {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
}

interface ChatContextType {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  conversations: Conversation[]
  currentConversationId: string | null
  currentEnterprise: string | null
  sendMessage: (content: string, images?: string[]) => Promise<void>
  regenerateMessage: (messageId: string) => Promise<void>
  clearMessages: () => void
  loadConversation: (conversationId: string) => Promise<void>
  createNewConversation: (firstMessage?: string) => Promise<string | null>
  deleteConversation: (conversationId: string) => Promise<void>
  loadConversations: () => Promise<void>
  setCurrentEnterprise: (enterprise: string | null) => void
  isFloatingChatOpen: boolean
  setIsFloatingChatOpen: (open: boolean) => void
  hasUnreadMessage: boolean
  markAsRead: () => void
}

const ChatContext = createContext<ChatContextType | null>(null)

export function useChatContext() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider")
  }
  return context
}

interface ChatProviderProps {
  children: ReactNode
  userId?: string
}

const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

export function ChatProvider({ children, userId }: ChatProviderProps) {
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
  const [currentEnterprise, setCurrentEnterprise] = useState<string | null>(null)
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false)
  const [hasUnreadMessage, setHasUnreadMessage] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)

  // 加载对话列表
  const loadConversations = useCallback(async () => {
    if (!userId) return

    try {
      const res = await fetch("/api/conversations")
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch (err) {
      console.error("加载对话列表失败:", err)
    }
  }, [userId])

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
        setHasUnreadMessage(false)
      }
    } catch (err) {
      console.error("加载对话失败:", err)
    }
  }, [])

  // 创建新对话
  const createNewConversation = useCallback(async (firstMessage?: string) => {
    if (!userId) {
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
  }, [userId, loadConversations])

  // 保存消息到数据库
  const saveMessage = useCallback(async (conversationId: string, role: string, content: string) => {
    if (!userId) return

    try {
      await fetch(`/api/conversations/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, content }),
      })
    } catch (err) {
      console.error("保存消息失败:", err)
    }
  }, [userId])

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
  const sendMessage = useCallback(async (content: string, images?: string[]) => {
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
      images,
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    // 如果没有当前对话，创建一个
    let conversationId = currentConversationId
    if (!conversationId && userId) {
      conversationId = await createNewConversation(content.trim())
      if (conversationId) {
        userMessage.conversationId = conversationId
      }
    } else if (conversationId && userId) {
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

      // 构建消息内容
      const formattedMessages = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => {
          if (m.images && m.images.length > 0) {
            return {
              role: m.role,
              content: [
                { type: "text", text: m.content },
                ...m.images.map((img) => ({
                  type: "image_url",
                  imageUrl: { url: img },
                })),
              ],
            }
          }
          return { role: m.role, content: m.content }
        })

      // 添加当前消息
      const currentMsg: { role: string; content: string | (TextContent | ImageContent)[] } = images && images.length > 0
        ? {
            role: "user",
            content: [
              { type: "text", text: content.trim() },
              ...images.map((img) => ({
                type: "image_url" as const,
                imageUrl: { url: img },
              })),
            ],
          }
        : { role: "user", content: content.trim() }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...formattedMessages, currentMsg],
          enterprise: currentEnterprise,
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

        // 标记有新消息未读（如果用户不在聊天页面）
        setHasUnreadMessage(true)
      }

      // 保存 AI 回复到数据库
      if (conversationId && userId && fullContent) {
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
  }, [isLoading, messages, currentConversationId, currentEnterprise, userId, createNewConversation, saveMessage])

  // 重新生成回答
  const regenerateMessage = useCallback(async (messageId: string) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId)
    if (messageIndex === -1 || messages[messageIndex].role !== "agent") return

    let userMessageIndex = messageIndex - 1
    while (userMessageIndex >= 0 && messages[userMessageIndex].role !== "user") {
      userMessageIndex--
    }

    if (userMessageIndex < 0) return

    const userContent = messages[userMessageIndex].content

    setMessages((prev) => prev.filter((m) => m.id !== messageId))

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
          enterprise: currentEnterprise,
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

        setHasUnreadMessage(true)
      }

      if (currentConversationId && userId && fullContent) {
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
  }, [messages, currentConversationId, currentEnterprise, userId, saveMessage])

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
    setHasUnreadMessage(false)
  }, [])

  const markAsRead = useCallback(() => {
    setHasUnreadMessage(false)
  }, [])

  // 初始加载对话列表
  useEffect(() => {
    if (userId) {
      loadConversations()
    }
  }, [userId, loadConversations])

  const value: ChatContextType = {
    messages,
    isLoading,
    error,
    conversations,
    currentConversationId,
    currentEnterprise,
    sendMessage,
    regenerateMessage,
    clearMessages,
    loadConversation,
    createNewConversation,
    deleteConversation,
    loadConversations,
    setCurrentEnterprise,
    isFloatingChatOpen,
    setIsFloatingChatOpen,
    hasUnreadMessage,
    markAsRead,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}