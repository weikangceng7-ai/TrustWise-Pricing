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
      <view class="stat-card" v-for="(stat, i) in stats" :key="i" @tap="stat.action && goTo(stat.action)">
        <view class="stat-icon">{{ stat.icon }}</view>
        <view class="stat-info">
          <text class="stat-value">{{ stat.value }}</text>
          <text class="stat-label">{{ stat.label }}</text>
        </view>
        <view class="stat-trend" v-if="stat.trend" :class="stat.trend > 0 ? 'up' : 'down'">
          <text>{{ stat.trend > 0 ? '↑' : '↓' }}{{ Math.abs(stat.trend).toFixed(1) }}%</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">📈 价格走势</text>
        <view class="time-tabs">
          <text class="time-tab" :class="{ active: timeRange === 7 }" @tap="changeTimeRange(7)">7天</text>
          <text class="time-tab" :class="{ active: timeRange === 30 }" @tap="changeTimeRange(30)">30天</text>
          <text class="time-tab" :class="{ active: timeRange === 90 }" @tap="changeTimeRange(90)">90天</text>
        </view>
      </view>
      <view class="price-chart" v-if="priceHistory.length">
        <view class="chart-bars">
          <view class="chart-bar" v-for="(p, i) in priceHistory" :key="i" :style="{ height: getBarHeight(p.price) + '%' }">
            <view class="bar-inner" :class="p.change > 0 ? 'up' : p.change < 0 ? 'down' : ''"></view>
          </view>
        </view>
        <view class="chart-labels">
          <text class="chart-label" v-for="(p, i) in priceHistory.filter((_, idx) => idx % 5 === 0)" :key="i">{{ formatDate(p.date) }}</text>
        </view>
      </view>
      <view class="price-info" v-if="latestPrice">
        <view class="price-main">
          <text class="price-value">¥{{ latestPrice.price }}</text>
          <text class="price-unit">元/吨</text>
        </view>
        <view class="price-change" :class="priceChange >= 0 ? 'up' : 'down'">
          <text>{{ priceChange >= 0 ? '↑' : '↓' }} {{ Math.abs(priceChange).toFixed(2) }}%</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">🏭 企业价格预测</text>
        <text class="more-btn" @tap="goTo('/pages/enterprise/list')">查看全部 ›</text>
      </view>
      <view class="enterprise-list">
        <view class="enterprise-card" v-for="(e, i) in enterprisePredictions" :key="i" @tap="goToEnterprise(e.code)">
          <view class="enterprise-header">
            <view class="enterprise-icon">{{ e.icon }}</view>
            <view class="enterprise-info">
              <text class="enterprise-name">{{ e.name }}</text>
              <text class="enterprise-location">{{ e.location || '未设置地区' }}</text>
            </view>
          </view>
          <view class="enterprise-price">
            <text class="price-label">预测价格</text>
            <text class="price-num">¥{{ e.predictedPrice }}</text>
            <view class="price-trend" :class="e.trend > 0 ? 'up' : e.trend < 0 ? 'down' : ''">
              <text>{{ e.trend > 0 ? '↑' : e.trend < 0 ? '↓' : '→' }} {{ Math.abs(e.trend || 0).toFixed(2) }}%</text>
            </view>
          </view>
          <view class="enterprise-confidence">
            <text class="confidence-label">置信度</text>
            <view class="confidence-bar">
              <view class="confidence-fill" :style="{ width: (e.confidence || 85) + '%' }"></view>
            </view>
            <text class="confidence-value">{{ e.confidence || 85 }}%</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">⚖️ 供需分析</text>
        <text class="more-btn" @tap="goTo('/pages/supply-demand/index')">详情 ›</text>
      </view>
      <view class="supply-demand" v-if="supplyDemand">
        <view class="sd-item">
          <view class="sd-icon supply">📦</view>
          <view class="sd-info">
            <text class="sd-label">供给指数</text>
            <text class="sd-value">{{ supplyDemand.supplyIndex || '-' }}</text>
          </view>
          <view class="sd-status" :class="supplyDemand.supplyStatus">{{ supplyDemand.supplyStatus === 'tight' ? '偏紧' : supplyDemand.supplyStatus === 'loose' ? '宽松' : '平衡' }}</view>
        </view>
        <view class="sd-divider"></view>
        <view class="sd-item">
          <view class="sd-icon demand">🏭</view>
          <view class="sd-info">
            <text class="sd-label">需求指数</text>
            <text class="sd-value">{{ supplyDemand.demandIndex || '-' }}</text>
          </view>
          <view class="sd-status" :class="supplyDemand.demandStatus">{{ supplyDemand.demandStatus === 'strong' ? '旺盛' : supplyDemand.demandStatus === 'weak' ? '疲软' : '正常' }}</view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">📋 最新报告</text>
        <text class="more-btn" @tap="goTo('/pages/reports/list')">查看全部 ›</text>
      </view>
      <view class="report-list">
        <view class="report-card" v-for="(r, i) in reports" :key="i" @tap="viewReport(r)">
          <view class="report-header">
            <view class="report-type" :class="'type-' + r.type">{{ getTypeText(r.type) }}</view>
            <text class="report-date">{{ r.date }}</text>
          </view>
          <text class="report-title">{{ r.title }}</text>
          <view class="report-meta">
            <view class="risk-tag" :class="'risk-' + (r.riskLevel || 'low')">{{ r.riskLevel === 'high' ? '高风险' : r.riskLevel === 'medium' ? '中风险' : '低风险' }}</view>
            <text class="report-trend" :class="r.trend > 0 ? 'up' : r.trend < 0 ? 'down' : ''">{{ r.trend > 0 ? '↑ 上涨' : r.trend < 0 ? '↓ 下跌' : '→ 稳定' }}</text>
          </view>
        </view>
        <view class="empty" v-if="!reports.length">
          <text>暂无报告</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">📰 市场动态</text>
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

    <view class="quick-actions">
      <view class="action-item" v-for="(action, i) in actions" :key="i" @tap="goTo(action.url)">
        <view class="action-icon">{{ action.icon }}</view>
        <text class="action-text">{{ action.text }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { api } from '@/utils/api'

const stats = ref([
  { icon: '📈', value: '-', label: '价格趋势', trend: null, action: null },
  { icon: '📦', value: '-', label: '港口库存', trend: null, action: '/pages/supply-demand/index' },
  { icon: '🏭', value: '-', label: '服务企业', action: '/pages/enterprise/list' },
  { icon: '📊', value: '-', label: '分析报告', action: '/pages/reports/list' }
])

const actions = ref([
  { icon: '🏢', text: '企业分析', url: '/pages/enterprise/list' },
  { icon: '📋', text: '采购报告', url: '/pages/reports/list' },
  { icon: '🧠', text: '知识图谱', url: '/pages/knowledge/index' },
  { icon: '⚖️', text: '供需分析', url: '/pages/supply-demand/index' },
  { icon: '🤖', text: 'AI助手', url: '/pages/chat/index' },
  { icon: '⚙️', text: '设置', url: '/pages/user/index' }
])

const priceHistory = ref([])
const latestPrice = ref(null)
const timeRange = ref(30)
const enterprisePredictions = ref([])
const supplyDemand = ref(null)
const reports = ref([])
const news = ref([])

const priceChange = computed(() => {
  if (priceHistory.value.length < 2) return 0
  const first = priceHistory.value[0].price
  const last = priceHistory.value[priceHistory.value.length - 1].price
  return ((last - first) / first) * 100
})

const fetchData = async () => {
  await Promise.all([
    fetchPrices(),
    fetchInventory(),
    fetchEnterprises(),
    fetchReports(),
    fetchNews(),
    fetchSupplyDemand(),
    fetchPredictions()
  ])
}

const fetchPrices = async () => {
  try {
    const res = await api.getPrices({ days: timeRange.value })
    if (res && res.prices) {
      priceHistory.value = res.prices.map(p => ({
        date: p.date,
        price: parseFloat(p.mainPrice) || 0,
        change: parseFloat(p.changeValue) || 0
      }))
      if (priceHistory.value.length > 0) {
        latestPrice.value = priceHistory.value[priceHistory.value.length - 1]
        const change = priceChange.value
        stats.value[0].value = `${change >= 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(2)}%`
        stats.value[0].trend = change
      }
    }
  } catch (e) {
    console.error('获取价格失败:', e)
  }
}

const fetchInventory = async () => {
  try {
    const res = await api.getInventorySummary()
    if (res && res.totalInventory) {
      stats.value[1].value = `${(res.totalInventory / 10000).toFixed(1)}万吨`
      stats.value[1].trend = res.changePercent || null
    }
  } catch (e) {
    console.error('获取库存失败:', e)
  }
}

const fetchEnterprises = async () => {
  try {
    const res = await api.getEnterprises()
    if (res && res.total !== undefined) {
      stats.value[2].value = res.total.toString()
    }
  } catch (e) {
    console.error('获取企业数失败:', e)
  }
}

const fetchReports = async () => {
  try {
    const res = await api.getReports()
    if (res && res.reports) {
      reports.value = res.reports.slice(0, 3).map(r => ({
        id: r.id,
        title: r.title,
        date: r.reportDate || r.createdAt?.split('T')[0],
        type: r.type || 'weekly',
        riskLevel: r.riskLevel,
        trend: r.priceTrend?.includes('上涨') ? 1 : r.priceTrend?.includes('下跌') ? -1 : 0
      }))
      stats.value[3].value = res.total || res.reports.length
    }
  } catch (e) {
    console.error('获取报告失败:', e)
  }
}

const fetchNews = async () => {
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

const fetchSupplyDemand = async () => {
  try {
    const res = await api.getSupplyDemand()
    if (res) {
      supplyDemand.value = {
        supplyIndex: res.supplyIndex || res.supply?.index,
        supplyStatus: res.supplyStatus || res.supply?.status,
        demandIndex: res.demandIndex || res.demand?.index,
        demandStatus: res.demandStatus || res.demand?.status
      }
    }
  } catch (e) {
    console.error('获取供需数据失败:', e)
  }
}

const fetchPredictions = async () => {
  try {
    const res = await api.getPredictionSummary()
    if (res && res.summary) {
      enterprisePredictions.value = res.summary.slice(0, 3).map(e => ({
        code: e.enterpriseCode,
        name: e.enterpriseName,
        location: e.location,
        icon: '🏭',
        predictedPrice: e.predictedPrice || e.latestPrice,
        trend: e.trend || 0,
        confidence: parseFloat(e.confidence) || 85
      }))
    }
  } catch (e) {
    console.error('获取预测数据失败:', e)
  }
}

const changeTimeRange = (days) => {
  timeRange.value = days
  fetchPrices()
}

const getBarHeight = (price) => {
  if (!priceHistory.value.length) return 50
  const prices = priceHistory.value.map(p => p.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return ((price - min) / (max - min || 1)) * 80 + 20
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const getTypeText = (type) => {
  const types = { weekly: '周报', monthly: '月报', quarterly: '季报', yearly: '年报', special: '专题' }
  return types[type] || '报告'
}

const goTo = (url) => {
  if (url.includes('supply-demand') || url.includes('knowledge')) {
    uni.navigateTo({ url })
  } else {
    uni.switchTab({ url })
  }
}

const goToEnterprise = (code) => {
  uni.navigateTo({ url: `/pages/enterprise/detail?code=${code}` })
}

const viewReport = (r) => {
  uni.navigateTo({ url: `/pages/reports/detail?id=${r.id}` })
}

const refreshNews = () => fetchNews()

onMounted(() => fetchData())
onShow(() => fetchData())
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
.stat-card { display: flex; align-items: center; gap: 16rpx; padding: 24rpx; background: rgba(30, 41, 59, 0.6); border-radius: 16rpx; border: 1rpx solid rgba(148, 163, 184, 0.1); position: relative; }
.stat-icon { width: 56rpx; height: 56rpx; background: rgba(6, 182, 212, 0.15); border-radius: 12rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.stat-value { font-size: 32rpx; font-weight: 600; color: #f8fafc; }
.stat-label { font-size: 22rpx; color: #64748b; margin-top: 4rpx; }
.stat-trend { position: absolute; right: 16rpx; top: 16rpx; padding: 4rpx 12rpx; border-radius: 8rpx; font-size: 20rpx; }
.stat-trend.up { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.stat-trend.down { background: rgba(244, 63, 94, 0.2); color: #f43f5e; }

.section { background: rgba(30, 41, 59, 0.6); border-radius: 24rpx; padding: 24rpx; margin-bottom: 24rpx; border: 1rpx solid rgba(148, 163, 184, 0.1); }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #f8fafc; }
.more-btn { font-size: 24rpx; color: #06b6d4; }
.refresh-btn { font-size: 24rpx; color: #06b6d4; }

.time-tabs { display: flex; gap: 8rpx; }
.time-tab { padding: 8rpx 16rpx; border-radius: 8rpx; font-size: 22rpx; color: #64748b; background: rgba(148, 163, 184, 0.1); }
.time-tab.active { background: #06b6d4; color: #fff; }

.price-chart { margin-bottom: 20rpx; }
.chart-bars { display: flex; align-items: flex-end; gap: 4rpx; height: 160rpx; }
.chart-bar { flex: 1; display: flex; align-items: flex-end; }
.bar-inner { width: 100%; border-radius: 4rpx 4rpx 0 0; background: #06b6d4; min-height: 8rpx; }
.bar-inner.up { background: #10b981; }
.bar-inner.down { background: #f43f5e; }
.chart-labels { display: flex; justify-content: space-between; margin-top: 8rpx; }
.chart-label { font-size: 20rpx; color: #64748b; }

.price-info { display: flex; justify-content: space-between; align-items: center; padding: 16rpx; background: rgba(15, 23, 42, 0.4); border-radius: 12rpx; }
.price-main { display: flex; align-items: baseline; gap: 8rpx; }
.price-value { font-size: 36rpx; font-weight: 700; color: #f8fafc; }
.price-unit { font-size: 22rpx; color: #64748b; }
.price-change { padding: 8rpx 16rpx; border-radius: 8rpx; }
.price-change.up { background: rgba(16, 185, 129, 0.2); }
.price-change.up text { color: #10b981; }
.price-change.down { background: rgba(244, 63, 94, 0.2); }
.price-change.down text { color: #f43f5e; }
.price-change text { font-size: 24rpx; }

.enterprise-list { display: flex; flex-direction: column; gap: 16rpx; }
.enterprise-card { padding: 20rpx; background: rgba(15, 23, 42, 0.4); border-radius: 16rpx; }
.enterprise-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.enterprise-icon { width: 48rpx; height: 48rpx; background: rgba(6, 182, 212, 0.15); border-radius: 12rpx; display: flex; align-items: center; justify-content: center; font-size: 24rpx; }
.enterprise-name { font-size: 28rpx; font-weight: 600; color: #f8fafc; }
.enterprise-location { font-size: 22rpx; color: #64748b; margin-top: 2rpx; }
.enterprise-price { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.price-label { font-size: 22rpx; color: #64748b; }
.price-num { font-size: 28rpx; font-weight: 600; color: #f8fafc; }
.price-trend { padding: 4rpx 12rpx; border-radius: 6rpx; font-size: 20rpx; }
.price-trend.up { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.price-trend.down { background: rgba(244, 63, 94, 0.2); color: #f43f5e; }
.enterprise-confidence { display: flex; align-items: center; gap: 12rpx; }
.confidence-label { font-size: 22rpx; color: #64748b; }
.confidence-bar { flex: 1; height: 8rpx; background: rgba(148, 163, 184, 0.2); border-radius: 4rpx; overflow: hidden; }
.confidence-fill { height: 100%; background: linear-gradient(90deg, #06b6d4, #10b981); border-radius: 4rpx; }
.confidence-value { font-size: 22rpx; color: #06b6d4; }

.supply-demand { display: flex; align-items: center; padding: 16rpx; background: rgba(15, 23, 42, 0.4); border-radius: 12rpx; }
.sd-item { flex: 1; display: flex; align-items: center; gap: 12rpx; }
.sd-icon { width: 48rpx; height: 48rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; font-size: 24rpx; }
.sd-icon.supply { background: rgba(6, 182, 212, 0.15); }
.sd-icon.demand { background: rgba(139, 92, 246, 0.15); }
.sd-label { font-size: 22rpx; color: #64748b; }
.sd-value { font-size: 28rpx; font-weight: 600; color: #f8fafc; margin-top: 4rpx; }
.sd-status { padding: 4rpx 12rpx; border-radius: 6rpx; font-size: 20rpx; background: rgba(148, 163, 184, 0.1); color: #94a3b8; }
.sd-status.tight { background: rgba(244, 63, 94, 0.2); color: #f43f5e; }
.sd-status.loose { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.sd-status.strong { background: rgba(244, 63, 94, 0.2); color: #f43f5e; }
.sd-status.weak { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.sd-divider { width: 1rpx; height: 60rpx; background: rgba(148, 163, 184, 0.2); margin: 0 16rpx; }

.report-list { display: flex; flex-direction: column; gap: 12rpx; }
.report-card { padding: 16rpx; background: rgba(15, 23, 42, 0.4); border-radius: 12rpx; }
.report-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.report-type { padding: 4rpx 12rpx; border-radius: 6rpx; font-size: 20rpx; }
.type-weekly { background: rgba(6, 182, 212, 0.2); color: #06b6d4; }
.type-monthly { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
.type-quarterly { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.report-date { font-size: 22rpx; color: #64748b; }
.report-title { font-size: 26rpx; color: #f8fafc; margin-bottom: 8rpx; }
.report-meta { display: flex; align-items: center; gap: 12rpx; }
.risk-tag { padding: 4rpx 12rpx; border-radius: 6rpx; font-size: 20rpx; }
.risk-high { background: rgba(244, 63, 94, 0.2); color: #f43f5e; }
.risk-medium { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.risk-low { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.report-trend { font-size: 22rpx; }
.report-trend.up { color: #10b981; }
.report-trend.down { color: #f43f5e; }

.news-list { display: flex; flex-direction: column; gap: 12rpx; }
.news-item { display: flex; align-items: flex-start; gap: 12rpx; padding: 12rpx; background: rgba(15, 23, 42, 0.4); border-radius: 8rpx; }
.news-dot { width: 8rpx; height: 8rpx; margin-top: 10rpx; background: #06b6d4; border-radius: 50%; flex-shrink: 0; }
.news-title { font-size: 24rpx; color: #e2e8f0; line-height: 1.4; }
.news-time { font-size: 20rpx; color: #64748b; margin-top: 4rpx; }

.quick-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; margin-top: 24rpx; }
.action-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 24rpx 8rpx; background: rgba(30, 41, 59, 0.6); border-radius: 16rpx; border: 1rpx solid rgba(148, 163, 184, 0.1); }
.action-icon { font-size: 36rpx; }
.action-text { font-size: 22rpx; color: #94a3b8; }

.empty { text-align: center; padding: 32rpx; color: #64748b; }
</style>
