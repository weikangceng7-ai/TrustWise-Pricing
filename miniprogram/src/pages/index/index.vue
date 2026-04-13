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
        <text class="section-title">价格趋势</text>
        <text class="refresh-btn" @tap="refreshPrice">刷新</text>
      </view>
      <view class="price-card" v-if="priceData">
        <view class="price-main">
          <text class="price-value">¥{{ priceData.currentPrice || '-' }}</text>
          <text class="price-unit">元/吨</text>
        </view>
        <view class="price-change" :class="priceData.trend > 0 ? 'up' : priceData.trend < 0 ? 'down' : ''">
          <text>{{ priceData.trend > 0 ? '↑' : priceData.trend < 0 ? '↓' : '→' }} {{ Math.abs(priceData.trend || 0).toFixed(2) }}%</text>
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
  { icon: '📈', value: '-', label: '价格趋势' },
  { icon: '📦', value: '-', label: '港口库存' },
  { icon: '🏭', value: '-', label: '服务企业' },
  { icon: '📊', value: '-', label: '分析报告' }
])

const actions = ref([
  { icon: '🏢', text: '企业分析', url: '/pages/enterprise/list' },
  { icon: '📋', text: '采购报告', url: '/pages/reports/list' },
  { icon: '🧠', text: '知识图谱', url: '/pages/knowledge/index' },
  { icon: '🤖', text: 'AI助手', url: '/pages/chat/index' }
])

const news = ref([])
const priceData = ref(null)

const goTo = (url) => {
  if (url.includes('knowledge')) {
    uni.navigateTo({ url })
  } else {
    uni.switchTab({ url })
  }
}

const refreshPrice = async () => {
  try {
    const res = await api.getPriceSummary()
    if (res) {
      priceData.value = {
        currentPrice: res.currentPrice || res.avgPrice || '-',
        trend: res.trend || res.changePercent || 0
      }
      stats.value[0].value = `${res.trend > 0 ? '↑' : res.trend < 0 ? '↓' : '→'} ${Math.abs(res.trend || 0).toFixed(2)}%`
    }
  } catch (e) {
    console.error('获取价格失败:', e)
  }
}

const refreshInventory = async () => {
  try {
    const res = await api.getInventorySummary()
    if (res && res.totalInventory) {
      stats.value[1].value = `${(res.totalInventory / 10000).toFixed(0)}万吨`
    }
  } catch (e) {
    console.error('获取库存失败:', e)
  }
}

const refreshEnterprises = async () => {
  try {
    const res = await api.getEnterprises()
    if (res && res.total !== undefined) {
      stats.value[2].value = res.total.toString()
    }
  } catch (e) {
    console.error('获取企业数失败:', e)
  }
}

const refreshNews = async () => {
  try {
    const res = await api.getDashboard()
    if (res && res.news) {
      news.value = res.news.slice(0, 5).map(item => ({
        title: item.title || item.content,
        time: item.date || item.createdAt
      }))
    }
  } catch (e) {
    console.error('获取新闻失败:', e)
  }
}

onMounted(() => {
  refreshPrice()
  refreshInventory()
  refreshEnterprises()
  refreshNews()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  padding: 32rpx;
  padding-bottom: 200rpx;
}

.header { margin-bottom: 32rpx; }
.header-top { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.logo { width: 64rpx; height: 64rpx; background: linear-gradient(135deg, #06b6d4, #0891b2); border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 32rpx; }
.title { font-size: 36rpx; font-weight: 700; color: #f8fafc; }
.subtitle { font-size: 24rpx; color: #64748b; margin-top: 4rpx; }
.header-desc { font-size: 24rpx; color: #64748b; }

.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; margin-bottom: 32rpx; }
.stat-card { display: flex; align-items: center; gap: 16rpx; padding: 24rpx; background: rgba(30, 41, 59, 0.6); border-radius: 16rpx; border: 1rpx solid rgba(148, 163, 184, 0.1); }
.stat-icon { width: 56rpx; height: 56rpx; background: rgba(6, 182, 212, 0.15); border-radius: 12rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.stat-value { font-size: 32rpx; font-weight: 600; color: #f8fafc; }
.stat-label { font-size: 22rpx; color: #64748b; margin-top: 4rpx; }

.section { margin-bottom: 32rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #f8fafc; }
.refresh-btn { font-size: 24rpx; color: #06b6d4; }

.quick-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; }
.action-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 24rpx 8rpx; background: rgba(30, 41, 59, 0.6); border-radius: 16rpx; border: 1rpx solid rgba(148, 163, 184, 0.1); }
.action-icon { font-size: 40rpx; }
.action-text { font-size: 22rpx; color: #94a3b8; }

.price-card { display: flex; justify-content: space-between; align-items: center; padding: 24rpx; background: rgba(30, 41, 59, 0.6); border-radius: 16rpx; border: 1rpx solid rgba(148, 163, 184, 0.1); }
.price-main { display: flex; align-items: baseline; gap: 8rpx; }
.price-value { font-size: 40rpx; font-weight: 700; color: #f8fafc; }
.price-unit { font-size: 24rpx; color: #64748b; }
.price-change { padding: 8rpx 16rpx; border-radius: 8rpx; background: rgba(148, 163, 184, 0.1); }
.price-change.up { background: rgba(16, 185, 129, 0.2); }
.price-change.up text { color: #10b981; }
.price-change.down { background: rgba(244, 63, 94, 0.2); }
.price-change.down text { color: #f43f5e; }
.price-change text { font-size: 24rpx; color: #94a3b8; }

.news-list { display: flex; flex-direction: column; gap: 16rpx; }
.news-item { display: flex; align-items: flex-start; gap: 12rpx; padding: 16rpx; background: rgba(30, 41, 59, 0.4); border-radius: 12rpx; }
.news-dot { width: 8rpx; height: 8rpx; margin-top: 12rpx; background: #06b6d4; border-radius: 50%; flex-shrink: 0; }
.news-title { font-size: 26rpx; color: #e2e8f0; line-height: 1.4; }
.news-time { font-size: 22rpx; color: #64748b; margin-top: 4rpx; }
.empty { text-align: center; padding: 32rpx; color: #64748b; }
</style>
