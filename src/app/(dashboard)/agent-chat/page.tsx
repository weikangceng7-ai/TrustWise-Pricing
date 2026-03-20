"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  Trash2,
  Plus,
  MessageSquare,
  Copy,
  RefreshCw,
  FileText,
  Check,
} from "lucide-react"
import { useChatWithHistory, type ChatMessage, type Conversation } from "@/hooks/use-chat-with-history"
import { generateChatReport } from "@/lib/report-generator"
import { AuthDialog } from "@/components/auth-dialog"

const suggestedQuestions = [
  "当前硫磺市场趋势如何？",
  "未来一周采购建议是什么？",
  "库存水平是否需要调整？",
  "主要供应商报价对比",
]

// 消息气泡组件
function MessageBubble({
  message,
  onRegenerate,
  onCopy,
  onGenerateReport,
  copiedId,
}: {
  message: ChatMessage
  onRegenerate?: () => void
  onCopy?: () => void
  onGenerateReport?: () => void
  copiedId?: string
}) {
  const isUser = message.role === "user"

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={isUser ? "bg-secondary" : "bg-primary text-primary-foreground"}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`max-w-[80%] rounded-lg px-4 py-3 ${
            isUser ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          <p className={`mt-1 text-xs ${isUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            {message.timestamp.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {/* AI 回答的操作按钮 */}
        {!isUser && message.id !== "welcome" && (
          <div className="flex gap-1 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onRegenerate}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              重新回答
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onCopy}
            >
              {copiedId === message.id ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              {copiedId === message.id ? "已复制" : "复制"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onGenerateReport}
            >
              <FileText className="h-3 w-3 mr-1" />
              生成报告
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Loading 指示器
function LoadingIndicator() {
  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-primary text-primary-foreground">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="rounded-lg bg-muted px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Agent 思考中...</span>
        </div>
      </div>
    </div>
  )
}

// 对话历史项
function ConversationItem({
  conversation,
  isActive,
  onClick,
  onDelete,
}: {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`group flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors ${
        isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <MessageSquare className="h-4 w-4 shrink-0" />
        <span className="truncate text-sm">{conversation.title}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}

export default function AgentChatPage() {
  const [userId, setUserId] = useState<string | undefined>()
  const [copiedId, setCopiedId] = useState<string | undefined>()
  const [showAuthDialog, setShowAuthDialog] = useState(false)

  const {
    messages,
    isLoading,
    conversations,
    currentConversationId,
    sendMessage,
    regenerateMessage,
    clearMessages,
    loadConversation,
    deleteConversation,
  } = useChatWithHistory({ userId })

  const [inputValue, setInputValue] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showHistory, setShowHistory] = useState(true)

  // 检查登录状态
  useEffect(() => {
    fetch("/api/auth/get-session")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.id) {
          setUserId(data.user.id)
        }
      })
      .catch(() => {
        setUserId(undefined)
      })
  }, [])

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return
    const message = inputValue
    setInputValue("")
    await sendMessage(message)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question)
  }

  const handleCopy = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(messageId)
      setTimeout(() => setCopiedId(undefined), 2000)
    } catch (err) {
      console.error("复制失败:", err)
    }
  }

  const handleGenerateReport = async () => {
    // 过滤掉欢迎消息，准备报告数据
    const reportMessages = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }))

    if (reportMessages.length === 0) {
      alert("暂无对话内容可生成报告")
      return
    }

    try {
      const fileName = await generateChatReport(reportMessages)
      alert(`报告已生成：${fileName}\n\n文件已保存到下载目录`)
    } catch (err) {
      console.error("生成报告失败:", err)
      alert("生成报告失败，请稍后重试")
    }
  }

  const handleNewChat = async () => {
    clearMessages()
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Agent 决策助手</h2>
          <p className="text-muted-foreground">
            基于 AI 的智能采购决策支持
            {userId ? " · 历史记录已同步" : " · 登录后可保存对话"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleNewChat}>
            <Plus className="mr-2 h-4 w-4" />
            新对话
          </Button>
          {!userId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAuthDialog(true)}
            >
              登录保存记录
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 grid gap-4 lg:grid-cols-5">
        {/* 对话历史侧边栏 - 仅登录用户显示 */}
        {userId && showHistory && (
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>对话历史</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 lg:hidden"
                  onClick={() => setShowHistory(false)}
                >
                  ×
                </Button>
              </CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    暂无历史对话
                  </p>
                ) : (
                  conversations.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={currentConversationId === conv.id}
                      onClick={() => loadConversation(conv.id)}
                      onDelete={() => deleteConversation(conv.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        )}

        {/* 聊天区域 */}
        <Card className={`${userId ? "lg:col-span-3" : "lg:col-span-4"} flex flex-col`}>
          <CardHeader className="border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">硫磺采购顾问</CardTitle>
                <CardDescription className="text-xs">在线 · 随时为您解答</CardDescription>
              </div>
              {userId && !showHistory && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setShowHistory(true)}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>

          {/* 消息滚动区域 */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onRegenerate={() => regenerateMessage(message.id)}
                  onCopy={() => handleCopy(message.content, message.id)}
                  onGenerateReport={handleGenerateReport}
                  copiedId={copiedId}
                />
              ))}
              {isLoading && <LoadingIndicator />}
            </div>
          </div>

          {/* 输入区域 */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入您的问题..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={!inputValue.trim() || isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* 快捷提问侧边栏 */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4" />
                快捷提问
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestedQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="w-full justify-start text-sm h-auto py-2 px-3 text-left"
                  onClick={() => handleSuggestedQuestion(question)}
                  disabled={isLoading}
                >
                  {question}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">使用提示</CardTitle>
              <CardDescription className="text-xs">如何更好地使用助手</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• 提问时尽量具体，包含时间范围</p>
              <p>• 可以要求生成数据对比表格</p>
              <p>• 支持追问和多轮对话</p>
              <p>• 可请求生成采购建议报告</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 登录弹窗 */}
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </div>
  )
}