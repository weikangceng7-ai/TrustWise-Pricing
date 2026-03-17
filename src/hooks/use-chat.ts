"use client"

import { useState, useCallback, useRef } from "react"

export interface ChatMessage {
  id: string
  role: "user" | "agent"
  content: string
  timestamp: Date
}

export function useChat() {
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
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // 生成唯一 ID
    const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    // 创建临时消息用于流式更新
    const agentMessageId = generateId()
    const tempAgentMessage: ChatMessage = {
      id: agentMessageId,
      role: "agent",
      content: "",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, tempAgentMessage])

    try {
      abortControllerRef.current = new AbortController()

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            ...messages,
            {
              role: "user",
              content: content.trim(),
            },
          ],
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // 处理流式响应（纯文本流）
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
            msg.id === agentMessageId
              ? { ...msg, content: fullContent }
              : msg
          )
        )
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // 用户取消了请求
        return
      }

      const errorMessage = err instanceof Error ? err.message : "发送消息失败，请重试"
      setError(errorMessage)

      // 添加错误消息
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
  }, [isLoading, messages])

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: "welcome",
        role: "agent",
        content: "对话已清空。我是硫磺采购决策助手，请问有什么可以帮您的？",
        timestamp: new Date(),
      },
    ])
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  }
}
