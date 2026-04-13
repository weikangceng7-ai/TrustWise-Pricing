<template>
  <view class="page">
    <view class="user-header">
      <view class="avatar">👤</view>
      <view class="info">
        <text class="name">{{ user.name || '未登录' }}</text>
        <text class="role">{{ user.role || '请登录以获取更多功能' }}</text>
      </view>
    </view>

    <view class="menu-section">
      <view class="menu-item" v-for="(item, i) in menuItems" :key="i" @tap="handleMenu(item.type)">
        <view class="menu-icon">{{ item.icon }}</view>
        <text class="menu-text">{{ item.text }}</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view class="menu-section">
      <view class="menu-item" @tap="showAbout">
        <view class="menu-icon">ℹ️</view>
        <text class="menu-text">关于系统</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="clearCache">
        <view class="menu-icon">🗑️</view>
        <text class="menu-text">清除缓存</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view class="version">
      <text>版本 1.0.0</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const user = ref({ name: '', role: '' })

const menuItems = [
  { icon: '🏢', text: '企业管理', type: 'enterprise' },
  { icon: '🔗', text: 'API 配置', type: 'api' },
  { icon: '🔔', text: '消息通知', type: 'notification' },
  { icon: '📊', text: '数据管理', type: 'data' }
]

const handleMenu = (type) => uni.showToast({ title: `${type} 设置开发中`, icon: 'none' })

const showAbout = () => {
  uni.showModal({
    title: '关于系统',
    content: '硫磺价格预测与决策辅助系统\n\n基于知识图谱与AI的智能价格预测平台，为企业提供定制化的价格分析、采购建议和决策支持服务。',
    showCancel: false,
    confirmText: '知道了'
  })
}

const clearCache = () => {
  uni.showModal({
    title: '清除缓存',
    content: '确定要清除所有缓存数据吗？',
    success: (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '清除中...' })
        setTimeout(() => {
          uni.hideLoading()
          uni.showToast({ title: '缓存已清除', icon: 'success' })
        }, 1000)
      }
    }
  })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  padding: 32rpx;
  padding-bottom: 200rpx;
}

.user-header {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
  background: rgba(30, 41, 59, 0.8);
  border-radius: 24rpx;
  margin-bottom: 32rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.1);
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56rpx;
}

.name { font-size: 36rpx; font-weight: 600; color: #f8fafc; }
.role { font-size: 26rpx; color: #64748b; margin-top: 8rpx; }

.menu-section {
  background: rgba(30, 41, 59, 0.6);
  border-radius: 24rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
  border: 1rpx solid rgba(148, 163, 184, 0.1);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid rgba(148, 163, 184, 0.1);
}

.menu-item:last-child { border-bottom: none; }

.menu-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: rgba(6, 182, 212, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
}

.menu-text { flex: 1; font-size: 30rpx; color: #f8fafc; }
.menu-arrow { font-size: 36rpx; color: #64748b; }

.version { text-align: center; padding: 48rpx 0; }
.version text { font-size: 24rpx; color: #64748b; }
</style>
