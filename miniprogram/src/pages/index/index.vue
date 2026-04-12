<template>
  <view class="page">
    <view class="header">
      <view class="header-top">
        <image class="logo" src="/static/logo.png" mode="aspectFit" />
        <view class="title-wrap">
          <text class="title">硫磺价格预测</text>
          <text class="subtitle">与决策辅助系统</text>
        </view>
      </view>
      <view class="header-desc">
        <text>基于知识图谱与AI的智能价格预测平台</text>
      </view>
    </view>

    <view class="stats-grid">
      <view class="stat-card bg-cyan">
        <view class="stat-icon">
          <text class="iconfont icon-chart">📈</text>
        </view>
        <view class="stat-info">
          <text class="stat-value">{{ stats.priceTrend }}</text>
          <text class="stat-label">价格趋势</text>
        </view>
      </view>
      
      <view class="stat-card bg-violet">
        <view class="stat-icon">
          <text class="iconfont icon-box">📦</text>
        </view>
        <view class="stat-info">
          <text class="stat-value">{{ stats.inventory }}</text>
          <text class="stat-label">港口库存</text>
        </view>
      </view>
      
      <view class="stat-card bg-amber">
        <view class="stat-icon">
          <text class="iconfont icon-building">🏭</text>
        </view>
        <view class="stat-info">
          <text class="stat-value">{{ stats.enterprises }}</text>
          <text class="stat-label">服务企业</text>
        </view>
      </view>
      
      <view class="stat-card bg-emerald">
        <view class="stat-icon">
          <text class="iconfont icon-report">📊</text>
        </view>
        <view class="stat-info">
          <text class="stat-value">{{ stats.reports }}</text>
          <text class="stat-label">分析报告</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">快捷功能</text>
      </view>
      <view class="quick-actions">
        <view class="action-item" @tap="goTo('/pages/enterprise/list')">
          <view class="action-icon bg-cyan">
            <text>🏢</text>
          </view>
          <text class="action-text">企业分析</text>
        </view>
        <view class="action-item" @tap="goTo('/pages/reports/list')">
          <view class="action-icon bg-violet">
            <text>📋</text>
          </view>
          <text class="action-text">采购报告</text>
        </view>
        <view class="action-item" @tap="goTo('/pages/chat/index')">
          <view class="action-icon bg-amber">
            <text>🤖</text>
          </view>
          <text class="action-text">AI助手</text>
        </view>
        <view class="action-item" @tap="goTo('/pages/user/index')">
          <view class="action-icon bg-emerald">
            <text>⚙️</text>
          </view>
          <text class="action-text">系统设置</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">市场动态</text>
        <text class="section-more" @tap="refreshNews">刷新</text>
      </view>
      <view class="news-list">
        <view 
          class="news-item" 
          v-for="(item, index) in news" 
          :key="index"
        >
          <view class="news-dot"></view>
          <view class="news-content">
            <text class="news-title">{{ item.title }}</text>
            <text class="news-time">{{ item.time }}</text>
          </view>
        </view>
        <view class="empty-tip" v-if="news.length === 0">
          <text>暂无市场动态</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/utils/api'

const stats = ref({
  priceTrend: '↑ 2.3%',
  inventory: '125万吨',
  enterprises: '3',
  reports: '28'
})

const news = ref([])

const goTo = (url) => {
  uni.switchTab({ url })
}

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

onMounted(() => {
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

.header {
  margin-bottom: 48rpx;
}

.header-top {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.logo {
  width: 80rpx;
  height: 80rpx;
}

.title-wrap {
  display: flex;
  flex-direction: column;
}

.title {
  font-size: 40rpx;
  font-weight: 700;
  color: #f8fafc;
  background: linear-gradient(135deg, #06b6d4, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  font-size: 24rpx;
  color: #94a3b8;
  margin-top: 4rpx;
}

.header-desc {
  margin-top: 16rpx;
}

.header-desc text {
  font-size: 24rpx;
  color: #64748b;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
  margin-bottom: 48rpx;
}

.stat-card {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.1);
}

.stat-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #f8fafc;
}

.stat-label {
  font-size: 24rpx;
  color: #94a3b8;
  margin-top: 4rpx;
}

.section {
  margin-bottom: 48rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #f8fafc;
}

.section-more {
  font-size: 24rpx;
  color: #06b6d4;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24rpx;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.action-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44rpx;
}

.action-text {
  font-size: 24rpx;
  color: #94a3b8;
}

.news-list {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8));
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

.news-item:last-child {
  border-bottom: none;
}

.news-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #06b6d4;
  margin-top: 12rpx;
  flex-shrink: 0;
}

.news-content {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
}

.news-title {
  font-size: 28rpx;
  color: #e2e8f0;
  line-height: 1.4;
}

.news-time {
  font-size: 22rpx;
  color: #64748b;
}

.empty-tip {
  padding: 40rpx;
  text-align: center;
}

.empty-tip text {
  color: #64748b;
  font-size: 26rpx;
}
</style>
