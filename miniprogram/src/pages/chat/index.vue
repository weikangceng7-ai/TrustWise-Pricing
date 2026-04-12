<template>
  <view class="page">
    <view class="chat-header">
      <view class="bot-info">
        <view class="bot-avatar">
          <text>🤖</text>
        </view>
        <view class="bot-text">
          <text class="bot-name">硫磺采购助手</text>
          <text class="bot-desc">AI 智能决策助手</text>
        </view>
      </view>
    </view>

    <scroll-view 
      class="chat-messages" 
      scroll-y 
      :scroll-top="scrollTop"
      @scrolltoupper="loadMoreMessages"
    >
      <view class="message-list">
        <view 
          class="message-item" 
          v-for="(msg, index) in messages" 
          :key="index"
          :class="msg.role"
        >
          <view class="message-avatar" v-if="msg.role === 'assistant'">
            <text>🤖</text>
          </view>
          <view class="message-content">
            <view class="message-bubble">
              <text>{{ msg.content }}</text>
            </view>
            <text class="message-time">{{ formatTime(msg.timestamp) }}</text>
          </view>
          <view class="message-avatar" v-if="msg.role === 'user'">
            <text>👤</text>
          </view>
        </view>
        
        <view class="typing-indicator" v-if="isTyping">
          <view class="typing-avatar">
            <text>🤖</text>
          </view>
          <view class="typing-dots">
            <view class="dot"></view>
            <view class="dot"></view>
            <view class="dot"></view>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="quick-actions">
      <scroll-view scroll-x class="actions-scroll">
        <view class="action-list">
          <view 
            class="action-chip" 
            v-for="(action, index) in quickActions" 
            :key="index"
            @tap="sendQuickMessage(action)"
          >
            <text>{{ action }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="chat-input">
      <input 
        class="input-field"
        v-model="inputText"
        placeholder="输入您的问题..."
        :adjust-position="true"
        @confirm="sendMessage"
      />
      <view class="send-btn" :class="{ active: inputText.trim() }" @tap="sendMessage">
        <text>发送</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { api } from '@/utils/api'

const messages = ref([
  {
    role: 'assistant',
    content: '您好！我是硫磺采购智能助手，可以为您提供价格预测、市场分析、采购建议等服务。请问有什么可以帮您的？',
    timestamp: Date.now()
  }
])

const inputText = ref('')
const isTyping = ref(false)
const scrollTop = ref(0)

const quickActions = [
  '最新价格走势',
  '库存分析',
  '采购建议',
  '市场预测',
  '供应商分析'
]

const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text || isTyping.value) return

  messages.value.push({
    role: 'user',
    content: text,
    timestamp: Date.now()
  })
  
  inputText.value = ''
  scrollToBottom()

  isTyping.value = true
  
  try {
    const chatMessages = messages.value.map(m => ({
      role: m.role,
      content: m.content
    }))
    
    const res = await api.chat(chatMessages)
    
    messages.value.push({
      role: 'assistant',
      content: res.message || res.content || '抱歉，我暂时无法回答这个问题。',
      timestamp: Date.now()
    })
  } catch (e) {
    console.error('发送消息失败:', e)
    messages.value.push({
      role: 'assistant',
      content: '网络连接失败，请稍后重试。',
      timestamp: Date.now()
    })
  } finally {
    isTyping.value = false
    scrollToBottom()
  }
}

const sendQuickMessage = (text) => {
  inputText.value = text
  sendMessage()
}

const scrollToBottom = () => {
  nextTick(() => {
    scrollTop.value = 99999
  })
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const loadMoreMessages = () => {
  console.log('加载更多消息')
}
</script>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
}

.chat-header {
  padding: 24rpx 32rpx;
  background: rgba(30, 41, 59, 0.8);
  border-bottom: 1rpx solid rgba(148, 163, 184, 0.1);
}

.bot-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.bot-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
}

.bot-text {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.bot-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #f8fafc;
}

.bot-desc {
  font-size: 24rpx;
  color: #64748b;
}

.chat-messages {
  flex: 1;
  padding: 24rpx;
  overflow-y: auto;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.message-item {
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  flex-shrink: 0;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  max-width: 70%;
}

.message-item.user .message-content {
  align-items: flex-end;
}

.message-bubble {
  padding: 20rpx 28rpx;
  border-radius: 20rpx;
  background: rgba(30, 41, 59, 0.8);
  border: 1rpx solid rgba(148, 163, 184, 0.1);
}

.message-item.user .message-bubble {
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  border: none;
}

.message-bubble text {
  font-size: 28rpx;
  color: #f8fafc;
  line-height: 1.5;
}

.message-time {
  font-size: 22rpx;
  color: #64748b;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.typing-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
}

.typing-dots {
  display: flex;
  gap: 8rpx;
  padding: 16rpx 24rpx;
  background: rgba(30, 41, 59, 0.8);
  border-radius: 20rpx;
}

.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #06b6d4;
  animation: typing 1.4s infinite;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-8rpx);
    opacity: 1;
  }
}

.quick-actions {
  padding: 16rpx 0;
  background: rgba(15, 23, 42, 0.5);
  border-top: 1rpx solid rgba(148, 163, 184, 0.1);
}

.actions-scroll {
  white-space: nowrap;
}

.action-list {
  display: inline-flex;
  gap: 16rpx;
  padding: 0 32rpx;
}

.action-chip {
  padding: 12rpx 24rpx;
  background: rgba(30, 41, 59, 0.8);
  border-radius: 24rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.2);
}

.action-chip text {
  font-size: 26rpx;
  color: #94a3b8;
  white-space: nowrap;
}

.chat-input {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 32rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: rgba(30, 41, 59, 0.8);
  border-top: 1rpx solid rgba(148, 163, 184, 0.1);
}

.input-field {
  flex: 1;
  height: 72rpx;
  padding: 0 24rpx;
  background: rgba(15, 23, 42, 0.8);
  border-radius: 36rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.2);
  font-size: 28rpx;
  color: #f8fafc;
}

.send-btn {
  width: 120rpx;
  height: 72rpx;
  border-radius: 36rpx;
  background: rgba(148, 163, 184, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-btn text {
  font-size: 28rpx;
  color: #64748b;
}

.send-btn.active {
  background: linear-gradient(135deg, #06b6d4, #0891b2);
}

.send-btn.active text {
  color: #fff;
}
</style>
