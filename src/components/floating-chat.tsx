"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  MessageSquare,
  Send,
  X,
  Minimize2,
  Maximize2,
  User,
  Sparkles,
  Loader2,
  ChevronRight,
} from "lucide-react"
import { useChatContext } from "@/contexts/chat-context"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

// 自定义 Markdown 组件 - 增强表格和可视化效果
const markdownComponents = {
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto my-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
      <table className="w-full text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-gradient-to-r from-cyan-50 via-blue-50 to-violet-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800">
      {children}
    </thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-2 py-1.5 text-left font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600">
      {children}
    </th>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => (
    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">{children}</tr>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-2 py-1.5 text-slate-600 dark:text-slate-300">{children}</td>
  ),
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-base font-bold mt-3 mb-2 text-slate-800 dark:text-slate-100">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-sm font-semibold mt-2 mb-1 text-slate-700 dark:text-slate-200">{children}</h3>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-slate-800 dark:text-slate-100">{children}</strong>,
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
  ),
}

export function FloatingChat() {
  const {
    messages,
    isLoading,
    sendMessage,
    isFloatingChatOpen,
    setIsFloatingChatOpen,
    hasUnreadMessage,
    markAsRead,
  } = useChatContext()

  const [inputValue, setInputValue] = useState("")
  const [isMinimized, setIsMinimized] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // 打开时聚焦输入框
  useEffect(() => {
    if (isFloatingChatOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isFloatingChatOpen, isMinimized])

  // 标记已读
  useEffect(() => {
    if (isFloatingChatOpen) {
      markAsRead()
    }
  }, [isFloatingChatOpen, markAsRead])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const message = inputValue.trim()
    setInputValue("")
    await sendMessage(message)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 浮动按钮（未展开时）
  if (!isFloatingChatOpen) {
    return (
      <Button
        onClick={() => setIsFloatingChatOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white z-50"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
        {hasUnreadMessage && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full animate-pulse" />
        )}
      </Button>
    )
  }

  // 最小化状态
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-500" />
            <span className="text-sm font-medium">硫磺采购助手</span>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsMinimized(false)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsFloatingChatOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 展开的聊天窗口
  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-slate-800 dark:to-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-cyan-500" />
          <span className="font-semibold text-sm">硫磺采购助手</span>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsFloatingChatOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 消息区域 */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "agent" && (
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs">
                    <Sparkles className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                }`}
              >
                {message.role === "agent" ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {message.content || "..."}
                  </ReactMarkdown>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
              {message.role === "user" && (
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-slate-200 dark:bg-slate-700">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-2 justify-start">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs">
                  <Sparkles className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 输入区域 */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className="flex-1 text-sm"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            size="icon"
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 flex gap-1 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => setInputValue("预测未来一周硫磺价格走势")}
          >
            价格预测
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => setInputValue("请给我采购决策建议")}
          >
            采购建议
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => setInputValue("分析当前市场趋势")}
          >
            市场分析
          </Button>
        </div>
      </div>
    </div>
  )
}