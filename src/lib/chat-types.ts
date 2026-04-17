// 共享聊天类型定义

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

// 欢迎消息常量 - 避免每次渲染重新创建对象
export const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "agent",
  content: "您好！我是硫磺采购决策助手。我可以帮您分析价格趋势、提供采购建议、解读市场动态。请问有什么可以帮您的？",
  timestamp: new Date(),
}