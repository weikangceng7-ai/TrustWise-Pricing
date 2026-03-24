"use client"

import { useState, useRef, useEffect, useMemo, memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Send,
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
  Lightbulb,
  TrendingUp,
  ChevronRight,
} from "lucide-react"
import { useChatWithHistory, type ChatMessage, type Conversation } from "@/hooks/use-chat-with-history"
import { generateChatReport } from "@/lib/report-generator"
import { AuthDialog } from "@/components/auth-dialog"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

// Prose styling for markdown content
const proseClassName = "prose prose-sm prose-zinc dark:prose-invert max-w-none prose-headings:text-foreground prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-table:my-2 prose-th:bg-muted prose-th:p-2 prose-td:p-2 prose-th:border prose-td:border prose-border-border prose-strong:text-foreground prose-code:bg-muted-foreground/10 prose-code:px-1 prose-code:rounded"

// Time format options - stable reference
const timeFormatOptions: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" }

const suggestedQuestions = [
  "当前硫磺市场趋势如何？",
  "未来一周采购建议是什么？",
  "库存水平是否需要调整？",
  "主要供应商报价对比",
  "分析近期价格波动原因",
  "预测下个月价格走势",
  "生成采购决策分析报告",
  "国际运费对成本的影响",
]

// 追问建议 - 根据关键词匹配
const followUpQuestions: Record<string, readonly string[]> = {
  "价格": [
    "价格还会继续上涨吗？",
    "什么因素影响价格波动？",
    "与去年同期价格对比如何？",
    "最佳采购时机是什么时候？",
  ],
  "库存": [
    "当前库存周转天数是多少？",
    "建议的安全库存量是多少？",
    "如何优化库存成本？",
    "各港口库存分布情况？",
  ],
  "采购": [
    "应该立即采购还是观望？",
    "建议采购数量是多少？",
    "分散采购还是集中采购？",
    "如何降低采购风险？",
  ],
  "趋势": [
    "未来一个月趋势预测？",
    "季节性因素如何影响？",
    "国际市场趋势如何？",
    "需求端变化趋势？",
  ],
  "风险": [
    "主要风险因素有哪些？",
    "如何规避价格风险？",
    "供应链风险如何应对？",
    "汇率波动影响多大？",
  ],
} as const

// 根据消息内容获取追问建议
function getFollowUpSuggestions(content: string): string[] {
  const suggestions: string[] = []

  for (const [keyword, questions] of Object.entries(followUpQuestions)) {
    if (content.includes(keyword)) {
      suggestions.push(...questions.slice(0, 2))
    }
  }

  // 默认追问
  if (suggestions.length === 0) {
    suggestions.push(
      "能否详细解释一下？",
      "这个结论的数据依据是什么？",
      "有什么行动建议？",
    )
  }

  return suggestions.slice(0, 4)
}

// 消息气泡组件
const MessageBubble = memo(function MessageBubble({
  message,
  onRegenerate,
  onCopy,
  onGenerateReport,
  copiedId,
  onFollowUp,
}: {
  message: ChatMessage
  onRegenerate?: () => void
  onCopy?: () => void
  onGenerateReport?: () => void
  copiedId?: string
  onFollowUp?: (question: string) => void
}) {
  const isUser = message.role === "user"
  const followUps = useMemo(
    () => !isUser && message.id !== "welcome" ? getFollowUpSuggestions(message.content) : [],
    [isUser, message.id, message.content]
  )

  return (
    <div className={`flex gap-4 ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar className="h-10 w-10 shrink-0 relative">
        {isUser ? (
          <AvatarFallback className="bg-slate-600 dark:bg-slate-700 text-white border border-slate-500 dark:border-slate-600">
            <User className="h-5 w-5" />
          </AvatarFallback>
        ) : (
          <AvatarFallback className="relative bg-linear-to-br from-[#0a0a1a] to-[#1b263b] p-0.5 border border-cyan-500/30">
            <div className="absolute inset-0 bg-cyan-500/10 blur-sm" />
            <svg viewBox="0 0 32 32" className="h-full w-full relative">
              <defs>
                <linearGradient id={`msgCenter-${message.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24"/>
                  <stop offset="100%" stopColor="#f59e0b"/>
                </linearGradient>
                <linearGradient id={`msgLine-${message.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00d4ff"/>
                  <stop offset="100%" stopColor="#a855f7"/>
                </linearGradient>
                <filter id={`glow-${message.id}`}>
                  <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <g stroke={`url(#msgLine-${message.id})`} strokeWidth="2" strokeLinecap="round" filter={`url(#glow-${message.id})`}>
                <line x1="16" y1="16" x2="16" y2="5"/>
                <line x1="16" y1="16" x2="26" y2="10"/>
                <line x1="16" y1="16" x2="26" y2="22"/>
                <line x1="16" y1="16" x2="16" y2="27"/>
                <line x1="16" y1="16" x2="6" y2="22"/>
                <line x1="16" y1="16" x2="6" y2="10"/>
              </g>
              <polygon points="16,5 26,10 26,22 16,27 6,22 6,10" fill="none" stroke="#00d4ff" strokeWidth="0.5" opacity="0.4"/>
              <circle cx="16" cy="5" r="2.5" fill="#00d4ff"/>
              <circle cx="26" cy="10" r="2" fill="#a855f7"/>
              <circle cx="26" cy="22" r="2" fill="#22d3ee"/>
              <circle cx="16" cy="27" r="2.5" fill="#00d4ff"/>
              <circle cx="6" cy="22" r="2" fill="#a855f7"/>
              <circle cx="6" cy="10" r="2" fill="#22d3ee"/>
              <circle cx="16" cy="16" r="6" fill={`url(#msgCenter-${message.id})`}/>
              <text x="16" y="19.5" fontFamily="Arial" fontSize="8" fontWeight="bold" fill="#0a0a1a" textAnchor="middle">S</text>
            </svg>
          </AvatarFallback>
        )}
      </Avatar>
      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} w-full max-w-[85%]`}>
        <div
          className={`rounded-2xl px-5 py-4 transition-all duration-300 ${
            isUser
              ? "bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
              : "bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm hover:border-cyan-400/50 dark:hover:border-cyan-500/30"
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className={proseClassName}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
          <p className={`mt-3 text-xs ${isUser ? "text-white/70" : "text-slate-400 dark:text-slate-500"}`}>
            {message.timestamp.toLocaleTimeString("zh-CN", timeFormatOptions)}
          </p>
        </div>

        {/* AI 回答的操作按钮 */}
        {!isUser && message.id !== "welcome" && (
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs bg-slate-100 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600/50 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:border-cyan-400 dark:hover:border-cyan-500/30 transition-all"
              onClick={onRegenerate}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              重新回答
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs bg-slate-100 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600/50 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:border-cyan-400 dark:hover:border-cyan-500/30 transition-all"
              onClick={onCopy}
            >
              {copiedId === message.id ? (
                <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500 dark:text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 mr-1.5" />
              )}
              {copiedId === message.id ? "已复制" : "复制"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs bg-slate-100 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600/50 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:border-cyan-400 dark:hover:border-cyan-500/30 transition-all"
              onClick={onGenerateReport}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              生成报告
            </Button>
          </div>
        )}

        {/* 追问建议 */}
        {!isUser && message.id !== "welcome" && followUps.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-400/30 blur-lg" />
                <Sparkles className="relative h-4 w-4 text-cyan-500 dark:text-cyan-400" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">您可能还想了解：</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {followUps.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 hover:border-cyan-400 dark:hover:border-cyan-500/40 hover:text-cyan-700 dark:hover:text-cyan-300 transition-all"
                  onClick={() => onFollowUp?.(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

// Loading 指示器
function LoadingIndicator() {
  return (
    <div className="flex gap-4">
      <Avatar className="h-10 w-10 shrink-0 relative">
        <AvatarFallback className="relative bg-linear-to-br from-[#0a0a1a] to-[#1b263b] p-0.5 border border-cyan-500/30">
          <div className="absolute inset-0 bg-cyan-500/10 blur-sm animate-pulse" />
          <svg viewBox="0 0 32 32" className="h-full w-full relative">
            <defs>
              <linearGradient id="loadingCenter" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24"/>
                <stop offset="100%" stopColor="#f59e0b"/>
              </linearGradient>
              <linearGradient id="loadingLine" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00d4ff"/>
                <stop offset="100%" stopColor="#a855f7"/>
              </linearGradient>
            </defs>
            <g stroke="url(#loadingLine)" strokeWidth="2" strokeLinecap="round">
              <line x1="16" y1="16" x2="16" y2="5"/>
              <line x1="16" y1="16" x2="26" y2="10"/>
              <line x1="16" y1="16" x2="26" y2="22"/>
              <line x1="16" y1="16" x2="16" y2="27"/>
              <line x1="16" y1="16" x2="6" y2="22"/>
              <line x1="16" y1="16" x2="6" y2="10"/>
            </g>
            <circle cx="16" cy="5" r="2.5" fill="#00d4ff"/>
            <circle cx="26" cy="10" r="2" fill="#a855f7"/>
            <circle cx="26" cy="22" r="2" fill="#22d3ee"/>
            <circle cx="16" cy="27" r="2.5" fill="#00d4ff"/>
            <circle cx="6" cy="22" r="2" fill="#a855f7"/>
            <circle cx="6" cy="10" r="2" fill="#22d3ee"/>
            <circle cx="16" cy="16" r="6" fill="url(#loadingCenter)"/>
            <text x="16" y="19.5" fontFamily="Arial" fontSize="8" fontWeight="bold" fill="#0a0a1a" textAnchor="middle">S</text>
          </svg>
        </AvatarFallback>
      </Avatar>
      <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm px-5 py-4">
        <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-500 dark:text-cyan-400" />
          <span className="font-medium">Agent 思考中...</span>
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
      className={`group relative flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition-all duration-300 border ${
        isActive ? "bg-cyan-50 dark:bg-cyan-500/10 border-cyan-400 dark:border-cyan-500/30" : "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600/50"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="relative">
          {isActive ? (
            <div className="absolute inset-0 bg-cyan-400/20 blur-lg" />
          ) : null}
          <MessageSquare className={`relative size-4 ${isActive ? 'text-cyan-500 dark:text-cyan-400' : 'text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors'}`} />
        </div>
        <span className={`truncate text-sm font-medium ${isActive ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-700 dark:text-slate-300'}`}>{conversation.title}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
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

  const handleFollowUp = async (question: string) => {
    if (isLoading) return
    await sendMessage(question)
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
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-slate-100 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-200/30 via-transparent to-transparent dark:from-violet-500/10 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-200/30 via-transparent to-transparent dark:from-cyan-500/10 -z-10" />

      <div className="relative h-screen flex flex-col min-h-0">
        {/* 顶部标题区 */}
        <div className="shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700/30">
          <div className="space-y-0.5 sm:space-y-1">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-600 via-blue-600 to-violet-600 dark:from-cyan-400 dark:via-blue-400 dark:to-violet-400 bg-clip-text text-transparent">
              Agent 决策助手
            </h2>
            <div className="flex items-center gap-2">
              <div className="h-px w-8 sm:w-12 bg-gradient-to-r from-cyan-500 to-transparent" />
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                基于 AI 的智能采购决策支持
                {userId ? " · 历史记录已同步" : " · 登录后可保存对话"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-300 dark:border-slate-600/50 text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 hover:border-cyan-400 dark:hover:border-cyan-500/40 hover:text-cyan-700 dark:hover:text-cyan-300 transition-all text-xs sm:text-sm"
              onClick={handleNewChat}
            >
              <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              新对话
            </Button>
            {!userId && (
              <Button
                variant="outline"
                size="sm"
                className="border-slate-300 dark:border-slate-600/50 text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 hover:border-cyan-400 dark:hover:border-cyan-500/40 hover:text-cyan-700 dark:hover:text-cyan-300 transition-all text-xs sm:text-sm"
                onClick={() => setShowAuthDialog(true)}
              >
                登录
              </Button>
            )}
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 overflow-hidden px-4 sm:px-6 py-4">
          <div className="h-full grid gap-4 sm:gap-5 lg:grid-cols-5">
          {/* 对话历史侧边栏 - 仅登录用户显示 */}
          {userId && showHistory && (
            <Card className="lg:col-span-1 hidden lg:flex flex-col bg-white/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 backdrop-blur-md overflow-hidden max-h-full">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700/50 px-4 py-4 shrink-0">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="text-slate-900 dark:text-white">对话历史</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 lg:hidden text-slate-400 hover:text-white"
                    onClick={() => setShowHistory(false)}
                  >
                    ×
                  </Button>
                </CardTitle>
              </CardHeader>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  {conversations.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">
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
          <Card className={`${userId ? "lg:col-span-3" : "lg:col-span-4"} ${userId && showHistory ? "col-span-1 lg:col-span-3" : "col-span-1 lg:col-span-4"} flex flex-col bg-white/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 backdrop-blur-md max-h-full`}>
            <CardHeader className="border-b border-slate-200 dark:border-slate-700/50 px-4 sm:px-5 py-3 sm:py-4 shrink-0">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 relative">
                  <AvatarFallback className="relative bg-linear-to-br from-[#0a0a1a] to-[#1b263b] p-0.5 border border-cyan-500/30">
                    <div className="absolute inset-0 bg-cyan-500/10 blur-sm" />
                    <svg viewBox="0 0 32 32" className="h-full w-full relative">
                      <defs>
                        <linearGradient id="headerCenter" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fbbf24"/>
                          <stop offset="100%" stopColor="#f59e0b"/>
                        </linearGradient>
                        <linearGradient id="headerLine" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#00d4ff"/>
                          <stop offset="100%" stopColor="#a855f7"/>
                        </linearGradient>
                      </defs>
                      <g stroke="url(#headerLine)" strokeWidth="2" strokeLinecap="round">
                        <line x1="16" y1="16" x2="16" y2="5"/>
                        <line x1="16" y1="16" x2="26" y2="10"/>
                        <line x1="16" y1="16" x2="26" y2="22"/>
                        <line x1="16" y1="16" x2="16" y2="27"/>
                        <line x1="16" y1="16" x2="6" y2="22"/>
                        <line x1="16" y1="16" x2="6" y2="10"/>
                      </g>
                      <circle cx="16" cy="5" r="2.5" fill="#00d4ff"/>
                      <circle cx="26" cy="10" r="2" fill="#a855f7"/>
                      <circle cx="26" cy="22" r="2" fill="#22d3ee"/>
                      <circle cx="16" cy="27" r="2.5" fill="#00d4ff"/>
                      <circle cx="6" cy="22" r="2" fill="#a855f7"/>
                      <circle cx="6" cy="10" r="2" fill="#22d3ee"/>
                      <circle cx="16" cy="16" r="6" fill="url(#headerCenter)"/>
                      <text x="16" y="19.5" fontFamily="Arial" fontSize="8" fontWeight="bold" fill="#0a0a1a" textAnchor="middle">S</text>
                    </svg>
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base text-slate-900 dark:text-white">硫磺采购顾问</CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">在线 · 随时为您解答</CardDescription>
                </div>
                {userId && !showHistory && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
                    onClick={() => setShowHistory(true)}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>

            {/* 消息滚动区域 */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-0">
              <div className="space-y-6">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onRegenerate={() => regenerateMessage(message.id)}
                    onCopy={() => handleCopy(message.content, message.id)}
                    onGenerateReport={handleGenerateReport}
                    copiedId={copiedId}
                    onFollowUp={handleFollowUp}
                  />
                ))}
                {isLoading && <LoadingIndicator />}
              </div>
            </div>

            {/* 输入区域 */}
            <div className="border-t border-slate-200 dark:border-slate-700/50 p-4 sm:p-5 shrink-0">
              <div className="flex gap-3">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入您的问题..."
                  disabled={isLoading}
                  className="flex-1 bg-slate-100 dark:bg-slate-700/30 border-slate-300 dark:border-slate-600/50 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-700/50 focus:border-cyan-500/50"
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/30 border border-cyan-400/20 shrink-0"
                >
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
          <div className="hidden lg:block space-y-5 overflow-y-auto max-h-full">
            <Card className="bg-white/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 backdrop-blur-md hover:border-cyan-400/50 dark:hover:border-cyan-500/30 transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-white">
                  <div className="relative">
                    <div className="absolute inset-0 bg-cyan-400/30 blur-lg" />
                    <Sparkles className="relative h-5 w-5 text-cyan-500 dark:text-cyan-400" />
                  </div>
                  快捷提问
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-start text-sm h-auto py-3 px-4 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-cyan-50 dark:hover:bg-cyan-500/10 border border-transparent hover:border-cyan-300 dark:hover:border-cyan-500/30 transition-all text-left"
                    onClick={() => handleSuggestedQuestion(question)}
                    disabled={isLoading}
                  >
                    <ChevronRight className="h-4 w-4 mr-2 opacity-50" />
                    {question}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 backdrop-blur-md hover:border-violet-400/50 dark:hover:border-violet-500/30 transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-white">
                  <Lightbulb className="h-5 w-5 text-violet-500 dark:text-violet-400" />
                  使用提示
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">如何更好地使用助手</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 mt-1.5 shrink-0" />
                  提问时尽量具体，包含时间范围
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 mt-1.5 shrink-0" />
                  可以要求生成数据对比表格
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 mt-1.5 shrink-0" />
                  支持追问和多轮对话
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 mt-1.5 shrink-0" />
                  可请求生成采购建议报告
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 mt-1.5 shrink-0" />
                  点击追问按钮快速深入了解
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 backdrop-blur-md hover:border-amber-400/50 dark:hover:border-amber-500/30 transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-white">
                  <TrendingUp className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                  深度分析
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">进阶提问技巧</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400 mt-1.5 shrink-0" />
                  要求解释数据来源和计算方法
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400 mt-1.5 shrink-0" />
                  询问不同情景下的分析
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400 mt-1.5 shrink-0" />
                  请求对比多个供应商/地区
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400 mt-1.5 shrink-0" />
                  让 AI 列出风险和不确定性
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </div>

      {/* 登录弹窗 */}
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </div>
  )
}
