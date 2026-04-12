<template>
  <view class="page">
    <view class="user-header">
      <view class="user-avatar">
        <text>👤</text>
      </view>
      <view class="user-info">
        <text class="user-name">{{ user.name || '未登录' }}</text>
        <text class="user-role">{{ user.role || '请登录以获取更多功能' }}</text>
      </view>
    </view>

    <view class="menu-section">
      <view class="menu-item" @tap="goToSetting('enterprise')">
        <view class="menu-icon bg-cyan">
          <text>🏢</text>
        </view>
        <text class="menu-text">企业管理</text>
        <text class="menu-arrow">›</text>
      </view>
      
      <view class="menu-item" @tap="goToSetting('api')">
        <view class="menu-icon bg-violet">
          <text>🔗</text>
        </view>
        <text class="menu-text">API 配置</text>
        <text class="menu-arrow">›</text>
      </view>
      
      <view class="menu-item" @tap="goToSetting('notification')">
        <view class="menu-icon bg-amber">
          <text>🔔</text>
        </view>
        <text class="menu-text">消息通知</text>
        <text class="menu-arrow">›</text>
      </view>
      
      <view class="menu-item" @tap="goToSetting('data')">
        <view class="menu-icon bg-emerald">
          <text>📊</text>
        </view>
        <text class="menu-text">数据管理</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view class="menu-section">
      <view class="menu-item" @tap="showAbout">
        <view class="menu-icon">
          <text>ℹ️</text>
        </view>
        <text class="menu-text">关于系统</text>
        <text class="menu-arrow">›</text>
      </view>
      
      <view class="menu-item" @tap="clearCache">
        <view class="menu-icon">
          <text>🗑️</text>
        </view>
        <text class="menu-text">清除缓存</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view class="version-info">
      <text>版本 1.0.0</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const user = ref({
  name: '',
  role: ''
})

const goToSetting = (type) => {
  uni.showToast({
    title: `${type} 设置开发中`,
    icon: 'none'
  })
}

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
          uni.showToast({
            title: '缓存已清除',
            icon: 'success'
          })
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
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
  border-radius: 24rpx;
  margin-bottom: 32rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.1);
}

.user-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56rpx;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.user-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #f8fafc;
}

.user-role {
  font-size: 26rpx;
  color: #64748b;
}

.menu-section {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8));
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

.menu-item:last-child {
  border-bottom: none;
}

.menu-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: rgba(148, 163, 184, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
}

.bg-cyan { background: rgba(6, 182, 212, 0.15); }
.bg-violet { background: rgba(139, 92, 246, 0.15); }
.bg-amber { background: rgba(245, 158, 11, 0.15); }
.bg-emerald { background: rgba(16, 185, 129, 0.15); }

.menu-text {
  flex: 1;
  font-size: 30rpx;
  color: #f8fafc;
}

.menu-arrow {
  font-size: 36rpx;
  color: #64748b;
}

.version-info {
  text-align: center;
  padding: 48rpx 0;
}

.version-info text {
  font-size: 24rpx;
  color: #64748b;
}
</style>
