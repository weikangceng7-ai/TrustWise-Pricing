<template>
  <view class="page">
    <view class="header">
      <view class="header-top">
        <view class="logo">📊</view>
        <view class="title-wrap">
          <text class="title">硫磺价格预测</text>
          <text class="subtitle">与决策辅助系统</text>
        </view>
      </view>
      <text class="header-desc">基于知识图谱与AI的智能价格预测平台</text>
    </view>

    <view class="stats-grid">
      <view class="stat-card" v-for="(stat, i) in stats" :key="i">
        <view class="stat-icon">{{ stat.icon }}</view>
        <view class="stat-info">
          <text class="stat-value">{{ stat.value }}</text>
          <text class="stat-label">{{ stat.label }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">快捷功能</text>
      <view class="quick-actions">
        <view class="action-item" v-for="(action, i) in actions" :key="i" @tap="goTo(action.url)">
          <view class="action-icon">{{ action.icon }}</view>
          <text class="action-text">{{ action.text }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">市场动态</text>
        <text class="refresh-btn" @tap="refreshNews">刷新</text>
      </view>
      <view class="news-list">
        <view class="news-item" v-for="(item, i) in news" :key="i">
          <view class="news-dot"></view>
          <view class="news-content">
            <text class="news-title">{{ item.title }}</text>
            <text class="news-time">{{ item.time }}</text>
          </view>
        </view>
        <view class="empty" v-if="!news.length">
          <text>暂无市场动态</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/utils/api'

const stats = ref([
  { icon: '📈', value: '↑ 2.3%', label: '价格趋势' },
  { icon: '📦', value: '125万吨', label: '港口库存' },
  { icon: '🏭', value: '3', label: '服务企业' },
  { icon: '📊', value: '28', label: '分析报告' }
])

const actions = [
  { icon: '🏢', text: '企业分析', url: '/pages/enterprise/list' },
  { icon: '📋', text: '采购报告', url: '/pages/reports/list' },
  { icon: '🤖', text: 'AI助手', url: '/pages/chat/index' },
  { icon: '⚙️', text: '系统设置', url: '/pages/user/index' }
]

const news = ref([])

const goTo = (url) => uni.switchTab({ url })

const refreshNews = async () => {
  try {
    const res = await api.getDashboard()
    if (res.news) {
      news.value = res.news.slice(0, 5).map(item => ({
        title: item.title || item.content,
        time: item.date || item.createdAt
      }))
    }
  } catch (e) {
    console.error('获取新闻失败:', e)
  }
}

onMounted(() => refreshNews())
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  padding: 32rpx;
  padding-bottom: 200rpx;
}

.header { margin-bottom: 48rpx; }
.header-top { display: flex; align-items: center; gap: 24rpx; }
.logo { width: 80rpx; height: 80rpx; font-size: 40rpx; }
.title { font-size: 40rpx; font-weight: 700; color: #f8fafc; }
.subtitle { font-size: 24rpx; color: #94a3b8; margin-top: 4rpx; }
.header-desc { font-size: 24rpx; color: #64748b; margin-top: 16rpx; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
  margin-bottom: 48rpx;
}

.stat-card {
  background: rgba(30, 41, 59, 0.8);
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.1);
}

.stat-icon { font-size: 40rpx; }
.stat-value { font-size: 36rpx; font-weight: 700; color: #f8fafc; }
.stat-label { font-size: 24rpx; color: #94a3b8; margin-top: 4rpx; }

.section { margin-bottom: 48rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.section-title { font-size: 32rpx; font-weight: 600; color: #f8fafc; margin-bottom: 24rpx; }
.refresh-btn { font-size: 24rpx; color: #06b6d4; }

.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24rpx;
}

.action-item { display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.action-icon { width: 100rpx; height: 100rpx; border-radius: 24rpx; background: rgba(6, 182, 212, 0.15); display: flex; align-items: center; justify-content: center; font-size: 44rpx; }
.action-text { font-size: 24rpx; color: #94a3b8; }

.news-list {
  background: rgba(30, 41, 59, 0.6);
  border-radius: 24rpx;
  padding: 24rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.1);
}

.news-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid rgba(148, 163, 184, 0.1);
}

.news-item:last-child { border-bottom: none; }
.news-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: #06b6d4; margin-top: 12rpx; }
.news-title { font-size: 28rpx; color: #e2e8f0; line-height: 1.4; }
.news-time { font-size: 22rpx; color: #64748b; margin-top: 8rpx; }
.empty { padding: 40rpx; text-align: center; color: #64748b; font-size: 26rpx; }
</style>
