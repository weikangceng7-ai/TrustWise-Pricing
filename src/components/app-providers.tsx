"use client"

import { ChatProvider } from "@/contexts/chat-context"
import { FloatingChat } from "@/components/floating-chat"
import { usePathname } from "next/navigation"

function FloatingChatWrapper() {
  const pathname = usePathname()

  // 在 agent-chat 页面不显示浮动聊天按钮（因为已经在聊天页面了）
  if (pathname?.includes("/agent-chat")) {
    return null
  }

  return <FloatingChat />
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      {children}
      <FloatingChatWrapper />
    </ChatProvider>
  )
}