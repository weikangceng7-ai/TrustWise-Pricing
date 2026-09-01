"use client"

import { useState, useRef, useEffect, useMemo, memo } from "react"
import { toast } from "sonner"
import { useSearchParams } from "next/navigation"
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
  Image as ImageIcon,
  X,
} from "lucide-react"
import { ThreePhaseArchitectureCarousel } from "@/components/three-phase-architecture-carousel"
import { MultiAgentView } from "@/components/multi-agent-view"
import { useChatContext, type ChatMessage, type Conversation } from "@/contexts/chat-context"
import { useLanguage } from "@/contexts/language-context"
import { AuthDialog } from "@/components/auth-dialog"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Suspense } from "react"

// 自定义 Markdown 组件 - 增强表格和可视化效果
const markdownComponents = {
  // 表格容器 - 添加滚动
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto my-4 rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  // 表头 - 渐变背景
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-gradient-to-r from-cyan-50 via-blue-50 to-violet-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800">
      {children}
    </thead>
  ),
  // 表头单元格
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600 whitespace-nowrap">
      {children}
    </th>
  ),
  // 表格行 - 斑马纹效果
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-cyan-50/50 dark:hover:bg-cyan-900/10 transition-colors">
      {children}
    </tr>
  ),
  // 表格单元格
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
      {children}
    </td>
  ),
  // 标题 - 增强样式
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-lg font-bold mt-4 mb-3 pb-2 border-b-2 border-cyan-200 dark:border-cyan-800 text-slate-800 dark:text-white flex items-center gap-2">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-base font-semibold mt-3 mb-2 text-slate-700 dark:text-slate-200 flex items-center gap-2">
      {children}
    </h3>
  ),
  // 段落
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="my-2 leading-relaxed text-slate-700 dark:text-slate-200">{children}</p>
  ),
  // 列表
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="my-2 ml-4 list-disc space-y-1 text-slate-700 dark:text-slate-200">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="my-2 ml-4 list-decimal space-y-1 text-slate-700 dark:text-slate-200">{children}</ol>
  ),
  // 行内代码
  code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode }) => {
    const isInline = !className
    if (isInline) {
      return (
        <code className="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 px-1.5 py-0.5 rounded text-xs font-medium" {...props}>
          {children}
        </code>
      )
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
  // 分隔线
  hr: () => (
    <hr className="my-4 border-slate-200 dark:border-slate-700" />
  ),
  // 引用块
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 pl-4 py-2 my-3 rounded-r-lg">
      {children}
    </blockquote>
  ),
  // 粗体
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>
  ),
}

// Prose styling for markdown content - enhanced table styling
const proseClassName = `prose prose-sm prose-zinc dark:prose-invert max-w-none
  prose-headings:text-foreground prose-headings:font-semibold
  prose-p:my-2 prose-p:text-slate-700 dark:prose-p:text-slate-200
  prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-li:text-slate-700 dark:prose-li:text-slate-200
  prose-table:my-3 prose-table:text-sm prose-table:w-full
  prose-thead:bg-gradient-to-r prose-thead:from-slate-100 prose-thead:to-slate-50
  dark:prose-thead:from-slate-800 dark:prose-thead:to-slate-700
  prose-th:p-2.5 prose-th:text-left prose-th:font-semibold prose-th:text-slate-700 dark:prose-th:text-slate-200
  prose-th:border prose-th:border-slate-200 dark:prose-th:border-slate-600
  prose-td:p-2.5 prose-td:text-slate-600 dark:prose-td:text-slate-300
  prose-td:border prose-td:border-slate-200 dark:prose-td:border-slate-700
  prose-tr:hover:bg-slate-50 dark:prose-tr:hover:bg-slate-800/50
  prose-border-slate-200 dark:prose-border-slate-700
  prose-strong:text-foreground prose-strong:font-semibold
  prose-code:bg-cyan-100 dark:prose-code:bg-cyan-900/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-cyan-700 dark:prose-code:text-cyan-300 prose-code:before:content-none prose-code:after:content-none
  prose-hr:border-slate-200 dark:prose-hr:border-slate-700
  prose-blockquote:border-l-cyan-500 prose-blockquote:bg-cyan-50 dark:prose-blockquote:bg-cyan-900/20 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:text-slate-700 dark:prose-blockquote:text-slate-200`

// Time format options - stable reference
const timeFormatOptions: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" }

const suggestedQuestions = [
  "chat.suggested.trend",
  "chat.suggested.weekAdvice",
  "chat.suggested.inventory",
  "chat.suggested.supplierCompare",
  "chat.suggested.volatilityCause",
  "chat.suggested.nextMonth",
  "chat.suggested.report",
  "chat.suggested.freightCost",
]

// 追问建议 - 根据关键词匹配（关键词保持中文，用于匹配中文回复内容）
const followUpQuestions: Record<string, readonly string[]> = {
  "价格": [
    "chat.followUp.price.rise",
    "chat.followUp.price.factors",
    "chat.followUp.price.yoy",
    "chat.followUp.price.timing",
  ],
  "库存": [
    "chat.followUp.stock.turnover",
    "chat.followUp.stock.safety",
    "chat.followUp.stock.cost",
    "chat.followUp.stock.port",
  ],
  "采购": [
    "chat.followUp.purchase.nowOrWait",
    "chat.followUp.purchase.quantity",
    "chat.followUp.purchase.splitOrCentral",
    "chat.followUp.purchase.risk",
  ],
  "趋势": [
    "chat.followUp.trend.month",
    "chat.followUp.trend.seasonal",
    "chat.followUp.trend.international",
    "chat.followUp.trend.demand",
  ],
  "风险": [
    "chat.followUp.risk.main",
    "chat.followUp.risk.priceHedge",
    "chat.followUp.risk.supplyChain",
    "chat.followUp.risk.exchange",
  ],
} as const

// 根据消息内容获取追问建议（返回翻译 key）
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
      "chat.followUp.default.elaborate",
      "chat.followUp.default.basis",
      "chat.followUp.default.action",
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
  const { t, lang } = useLanguage()
  const isUser = message.role === "user"
  const [mounted, setMounted] = useState(false)
  const followUps = useMemo(
    () => !isUser && message.id !== "welcome" ? getFollowUpSuggestions(message.content) : [],
    [isUser, message.id, message.content]
  )

  useEffect(() => {
    setMounted(true)
  }, [])

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
              ? "bg-gradient-to-br from-cyan-500 via-blue-500 to-violet-500 text-white shadow-lg shadow-cyan-500/25 dark:shadow-cyan-500/20"
              : "bg-white dark:bg-slate-800 border border-indigo-100/50 dark:border-slate-700/50 hover:border-cyan-300/50 dark:hover:border-cyan-500/30"
          }`}
        >
          {isUser ? (
            <div className="space-y-2">
              {message.images && message.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {message.images.map((img, index) => (
                    <div key={index} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt={`${t("chat.uploadImage")} ${index + 1}`}
                        className="max-w-[200px] max-h-[150px] rounded-lg object-cover border border-white/20"
                      />
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
            </div>
          ) : (
            <div className={proseClassName}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
          <p className={`mt-3 text-xs ${isUser ? "text-white/70" : "text-slate-400 dark:text-slate-500"}`}>
            {mounted ? message.timestamp.toLocaleTimeString(lang === "en" ? "en-US" : "zh-CN", timeFormatOptions) : "\u00A0"}
          </p>
        </div>

        {/* AI 回答的操作按钮 */}
        {!isUser && message.id !== "welcome" && (
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs bg-gradient-to-r from-slate-50 to-indigo-50 dark:bg-slate-800 dark:from-slate-800 dark:to-slate-800 border border-indigo-100/50 dark:border-slate-700 text-indigo-600 dark:text-slate-300 hover:from-cyan-50 hover:to-blue-50 dark:hover:bg-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-700 hover:border-cyan-300 dark:hover:border-cyan-500/40 hover:text-cyan-600 dark:hover:text-cyan-300 transition-all shadow-sm dark:shadow-none"
              onClick={onRegenerate}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              {t("chat.regenerateAnswer")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs bg-gradient-to-r from-slate-50 to-indigo-50 dark:bg-slate-800 dark:from-slate-800 dark:to-slate-800 border border-indigo-100/50 dark:border-slate-700 text-indigo-600 dark:text-slate-300 hover:from-violet-50 hover:to-pink-50 dark:hover:bg-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-700 hover:border-violet-300 dark:hover:border-violet-500/40 hover:text-violet-600 dark:hover:text-violet-300 transition-all shadow-sm dark:shadow-none"
              onClick={onCopy}
            >
              {copiedId === message.id ? (
                <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500 dark:text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 mr-1.5" />
              )}
              {copiedId === message.id ? t("chat.copied") : t("chat.copy")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs bg-gradient-to-r from-slate-50 to-indigo-50 dark:bg-slate-800 dark:from-slate-800 dark:to-slate-800 border border-indigo-100/50 dark:border-slate-700 text-indigo-600 dark:text-slate-300 hover:from-emerald-50 hover:to-teal-50 dark:hover:bg-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-300 transition-all shadow-sm dark:shadow-none"
              onClick={onGenerateReport}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              {t("chat.generateReport")}
            </Button>
          </div>
        )}

        {/* 追问建议 */}
        {!isUser && message.id !== "welcome" && followUps.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-violet-400 blur-lg opacity-60 dark:opacity-30" />
                <Sparkles className="relative h-4 w-4 text-cyan-500 dark:text-cyan-400" />
              </div>
              <span className="text-xs text-indigo-500/80 dark:text-slate-400 font-medium">{t("chat.mayAlsoAsk")}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {followUps.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs bg-gradient-to-r from-slate-50 to-indigo-50 dark:bg-slate-800 dark:from-slate-800 dark:to-slate-800 border border-indigo-100/50 dark:border-slate-700 text-indigo-600 dark:text-slate-300 hover:from-cyan-50 hover:to-violet-50 dark:hover:bg-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-700 hover:border-cyan-300 dark:hover:border-cyan-500/40 hover:text-cyan-600 dark:hover:text-cyan-300 transition-all shadow-sm dark:shadow-none"
                  onClick={() => onFollowUp?.(t(question))}
                >
                  {t(question)}
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
  const { t } = useLanguage()
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
          <span className="font-medium">{t("chat.agentThinking")}</span>
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
        isActive 
          ? "bg-gradient-to-r from-cyan-50 via-blue-50 to-violet-50 dark:bg-cyan-500/10 border-cyan-300/50 dark:border-cyan-500/30 shadow-sm" 
          : "bg-gradient-to-r from-white to-indigo-50/30 dark:bg-slate-800/30 border-indigo-100/50 dark:border-slate-700/30 hover:from-cyan-50/50 hover:to-violet-50/50 dark:hover:bg-slate-700/50 hover:border-cyan-200 dark:hover:border-slate-600/50"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="relative">
          {isActive ? (
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-violet-400 blur-lg opacity-40" />
          ) : null}
          <MessageSquare className={`relative size-4 ${isActive ? 'text-cyan-500 dark:text-cyan-400' : 'text-indigo-400 group-hover:text-cyan-500 dark:group-hover:text-slate-300 transition-colors'}`} />
        </div>
        <span className={`truncate text-sm font-medium ${isActive ? 'text-cyan-700 dark:text-cyan-300' : 'text-indigo-600 dark:text-slate-300'}`}>{conversation.title}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-indigo-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
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

function AgentChatPage() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const [userId, setUserId] = useState<string | undefined>()
  const [copiedId, setCopiedId] = useState<string | undefined>()
  const [showAuthDialog, setShowAuthDialog] = useState(false)

  // 使用全局聊天上下文
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
    setIsFloatingChatOpen,
  } = useChatContext()

  const [inputValue, setInputValue] = useState("")
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showHistory, setShowHistory] = useState(true)
  const [showArchitecture, setShowArchitecture] = useState(false)
  const hasAppliedUrlPrompt = useRef(false)

  useEffect(() => {
    if (hasAppliedUrlPrompt.current) return
    const promptFromUrl = searchParams.get("prompt")
    if (promptFromUrl) {
      // 使用 setTimeout 避免 effect 内同步 setState
      setTimeout(() => setInputValue(promptFromUrl), 0)
      hasAppliedUrlPrompt.current = true
    }
  }, [searchParams])

  // 处理图片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const base64 = event.target?.result as string
          setUploadedImages((prev) => [...prev, base64])
        }
        reader.readAsDataURL(file)
      }
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // 移除已上传的图片
  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index))
  }

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

  // 在 agent-chat 页面时，关闭浮动聊天窗口
  useEffect(() => {
    setIsFloatingChatOpen(false)
  }, [setIsFloatingChatOpen])

  // 自动滚动到底部（仅当用户在底部附近时）
  useEffect(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150
      if (isNearBottom) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }
  }, [messages])

  const handleSend = async () => {
    if ((!inputValue.trim() && uploadedImages.length === 0) || isLoading) return
    const message = inputValue || "请分析这张图片"
    const images = [...uploadedImages]
    setInputValue("")
    setUploadedImages([])
    await sendMessage(message, images.length > 0 ? images : undefined)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 处理粘贴图片
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (event) => {
            const base64 = event.target?.result as string
            setUploadedImages((prev) => [...prev, base64])
          }
          reader.readAsDataURL(file)
        }
      }
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
      toast.warning(t("chat.noContentReport"))
      return
    }

    try {
      const { generateChatReport } = await import("@/lib/report-generator")
      const fileName = await generateChatReport(reportMessages)
      toast.success(`${t("chat.reportGeneratedPrefix")}${fileName}`)
    } catch (err) {
      console.error("生成报告失败:", err)
      toast.error(t("chat.reportFailed"))
    }
  }

  const handleNewChat = async () => {
    clearMessages()
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-sky-50 via-indigo-50/50 to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-rose-200/40 via-violet-200/30 to-transparent dark:from-violet-500/10 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-300/40 via-teal-200/30 to-transparent dark:from-cyan-500/10 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent dark:from-transparent -z-10" />
      <div className="fixed top-20 right-20 w-96 h-96 bg-gradient-to-br from-pink-300/20 to-violet-300/20 rounded-full blur-3xl dark:hidden -z-10" />
      <div className="fixed bottom-20 left-20 w-80 h-80 bg-gradient-to-tr from-cyan-300/20 to-emerald-300/20 rounded-full blur-3xl dark:hidden -z-10" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-indigo-200/10 to-transparent rounded-full blur-3xl dark:hidden -z-10" />

      <div className="relative h-screen flex flex-col min-h-0">
        {/* 顶部标题区 */}
        <div className="shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex items-center justify-between border-b border-indigo-100/50 dark:border-slate-700/30 bg-white/30 dark:bg-transparent backdrop-blur-sm">
          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-violet-400 blur-lg opacity-50 dark:opacity-30" />
                <h2 className="relative text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-600 via-blue-600 to-violet-600 dark:from-cyan-400 dark:via-blue-400 dark:to-violet-400 bg-clip-text text-transparent">
                  {t("chat.title")}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-px w-8 sm:w-12 bg-gradient-to-r from-cyan-400 via-blue-400 to-transparent dark:from-cyan-500 dark:via-blue-500" />
              <p className="text-indigo-600/70 dark:text-slate-400 text-xs sm:text-sm font-medium">
                {t("chat.subtitle")}
                {userId ? ` · ${t("chat.synced")}` : ` · ${t("chat.savePrompt")}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              className="border-indigo-200/50 dark:border-slate-600/50 bg-white/60 dark:bg-slate-800/30 text-indigo-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-violet-50 dark:hover:bg-cyan-500/10 hover:border-cyan-300 dark:hover:border-cyan-500/40 hover:text-cyan-700 dark:hover:text-cyan-300 transition-all text-xs sm:text-sm shadow-sm hover:shadow-md"
              onClick={handleNewChat}
            >
              <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t("chat.newConversation")}
            </Button>
            {!userId && (
              <Button
                variant="outline"
                size="sm"
                className="border-indigo-200/50 dark:border-slate-600/50 bg-white/60 dark:bg-slate-800/30 text-indigo-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-violet-50 hover:to-pink-50 dark:hover:bg-violet-500/10 hover:border-violet-300 dark:hover:border-violet-500/40 hover:text-violet-700 dark:hover:text-violet-300 transition-all text-xs sm:text-sm shadow-sm hover:shadow-md"
                onClick={() => setShowAuthDialog(true)}
              >
                {t("chat.login")}
              </Button>
            )}
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 overflow-hidden px-4 sm:px-6 py-4">
          <div className="h-full grid gap-4 sm:gap-5 lg:grid-cols-5">
          {/* 对话历史侧边栏 - 仅登录用户显示 */}
          {userId && showHistory && (
            <Card className="lg:col-span-1 hidden lg:flex flex-col bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 overflow-hidden max-h-full">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700/50 px-4 py-4 shrink-0">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="text-slate-900 dark:text-white">{t("chat.newConversation")}</span>
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
                      {t("chat.noHistory")}
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
          <Card className={`${userId ? "lg:col-span-3" : "lg:col-span-4"} ${userId && showHistory ? "col-span-1 lg:col-span-3" : "col-span-1 lg:col-span-4"} flex flex-col bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 max-h-full`}>
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
                  <CardTitle className="text-base text-slate-900 dark:text-white">{t("chat.advisorTitle")}</CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400">{t("chat.onlineStatus")}</CardDescription>
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

            {/* 系统架构轮播 - 可折叠 */}
            <div className="border-b border-slate-200 dark:border-slate-700/50 shrink-0">
              <button
                onClick={() => setShowArchitecture(!showArchitecture)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("chat.systemArchitecture")}</span>
                <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${showArchitecture ? 'rotate-90' : ''}`} />
              </button>
              {showArchitecture && (
                <ThreePhaseArchitectureCarousel className="rounded-none border-0 border-t border-slate-200 dark:border-slate-700/50" autoPlay={true} interval={5000} />
              )}
            </div>

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
              {/* 图片预览区域 */}
              {uploadedImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {uploadedImages.map((img, index) => (
                    <div key={index} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt={`${t("chat.previewImage")} ${index + 1}`}
                        className="w-20 h-20 rounded-lg object-cover border border-slate-200 dark:border-slate-600"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="shrink-0 bg-slate-100 dark:bg-slate-700/30 border-slate-300 dark:border-slate-600/50 hover:bg-slate-200 dark:hover:bg-slate-700/50"
                  title={t("chat.uploadImage")}
                >
                  <ImageIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </Button>
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={uploadedImages.length > 0 ? t("chat.inputPlaceholderImage") : t("chat.inputPlaceholderPaste")}
                  disabled={isLoading}
                  className="flex-1 bg-slate-100 dark:bg-slate-700/30 border-slate-300 dark:border-slate-600/50 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-700/50 focus:border-cyan-500/50"
                />
                <Button
                  onClick={handleSend}
                  disabled={(!inputValue.trim() && uploadedImages.length === 0) || isLoading}
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
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 hover:border-cyan-400/50 dark:hover:border-cyan-500/30 transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-white">
                  <div className="relative">
                    <div className="absolute inset-0 bg-cyan-400/30 blur-lg" />
                    <Sparkles className="relative h-5 w-5 text-cyan-500 dark:text-cyan-400" />
                  </div>
                  {t("chat.quickQuestions")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-start text-sm h-auto py-3 px-4 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-cyan-50 dark:hover:bg-cyan-500/10 border border-transparent hover:border-cyan-300 dark:hover:border-cyan-500/30 transition-all text-left"
                    onClick={() => handleSuggestedQuestion(t(question))}
                    disabled={isLoading}
                  >
                    <ChevronRight className="h-4 w-4 mr-2 opacity-50" />
                    {t(question)}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 hover:border-violet-400/50 dark:hover:border-violet-500/30 transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-white">
                  <Lightbulb className="h-5 w-5 text-violet-500 dark:text-violet-400" />
                  {t("chat.usageTips")}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">{t("chat.howToUse")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 mt-1.5 shrink-0" />
                  {t("chat.tip.specific")}
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 mt-1.5 shrink-0" />
                  {t("chat.tip.table")}
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 mt-1.5 shrink-0" />
                  {t("chat.tip.followUp")}
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 mt-1.5 shrink-0" />
                  {t("chat.tip.report")}
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 mt-1.5 shrink-0" />
                  {t("chat.tip.clickFollowUp")}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 hover:border-amber-400/50 dark:hover:border-amber-500/30 transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-white">
                  <TrendingUp className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                  {t("chat.deepAnalysis")}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">{t("chat.advancedTips")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400 mt-1.5 shrink-0" />
                  {t("chat.tip.explainSource")}
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400 mt-1.5 shrink-0" />
                  {t("chat.tip.scenarios")}
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400 mt-1.5 shrink-0" />
                  {t("chat.tip.compare")}
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400 mt-1.5 shrink-0" />
                  {t("chat.tip.risks")}
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

function AgentChatPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-indigo-50/50 to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    }>
      <AgentChatPage />
    </Suspense>
  )
}

export default AgentChatPageWrapper
