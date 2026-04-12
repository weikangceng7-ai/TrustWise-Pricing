<template>
  <view class="page">
    <view class="enterprise-header" v-if="enterprise">
      <view class="header-main">
        <view class="enterprise-icon" :class="'bg-' + enterprise.tailwindColor">
          <text>🏭</text>
        </view>
        <view class="enterprise-info">
          <text class="enterprise-name">{{ enterprise.name }}</text>
          <text class="enterprise-location">{{ enterprise.location || enterprise.province || '未设置地区' }}</text>
        </view>
      </view>
      <view class="header-stats">
        <view class="stat-badge" :class="'bg-' + enterprise.tailwindColor">
          <text>产能: {{ enterprise.capacity || '-' }} 万吨/年</text>
        </view>
        <view class="stat-badge" :class="'bg-' + enterprise.tailwindColor">
          <text>库存: {{ enterprise.currentStock || '-' }} 吨</text>
        </view>
      </view>
    </view>

    <view class="section" v-if="predictions.length > 0">
      <view class="section-header">
        <text class="section-title">价格预测</text>
        <view class="period-tabs">
          <text 
            class="tab" 
            :class="{ active: period === 30 }"
            @tap="changePeriod(30)"
          >30天</text>
          <text 
            class="tab" 
            :class="{ active: period === 60 }"
            @tap="changePeriod(60)"
          >60天</text>
          <text 
            class="tab" 
            :class="{ active: period === 90 }"
            @tap="changePeriod(90)"
          >90天</text>
        </view>
      </view>
      
      <view class="chart-container">
        <view class="chart-placeholder">
          <view class="chart-bars">
            <view 
              class="bar" 
              v-for="(pred, index) in predictions.slice(0, 10)" 
              :key="index"
              :style="{ height: getBarHeight(pred.predictedPrice) + '%' }"
            >
              <text class="bar-value">{{ formatPrice(pred.predictedPrice) }}</text>
            </view>
          </view>
          <view class="chart-labels">
            <text class="label" v-for="(pred, index) in predictions.slice(0, 10)" :key="index">
              {{ formatDate(pred.date) }}
            </text>
          </view>
        </view>
      </view>

      <view class="prediction-summary">
        <view class="summary-item">
          <text class="summary-label">预测趋势</text>
          <text class="summary-value up" v-if="trend > 0">↑ 上涨</text>
          <text class="summary-value down" v-else-if="trend < 0">↓ 下跌</text>
          <text class="summary-value" v-else>→ 持平</text>
        </view>
        <view class="summary-item">
          <text class="summary-label">预测幅度</text>
          <text class="summary-value">{{ Math.abs(trend).toFixed(2) }}%</text>
        </view>
        <view class="summary-item">
          <text class="summary-label">置信度</text>
          <text class="summary-value">{{ enterprise?.modelAccuracy || 85 }}%</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">企业信息</text>
      </view>
      <view class="info-list">
        <view class="info-item">
          <text class="info-label">运输方式</text>
          <text class="info-value">{{ transportModeText }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">库存策略</text>
          <text class="info-value">{{ inventoryStrategyText }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">最大仓储能力</text>
          <text class="info-value">{{ enterprise?.maxCapacity || '-' }} 吨</text>
        </view>
        <view class="info-item">
          <text class="info-label">安全库存天数</text>
          <text class="info-value">{{ enterprise?.safetyDays || '-' }} 天</text>
        </view>
        <view class="info-item">
          <text class="info-label">日均消耗量</text>
          <text class="info-value">{{ enterprise?.avgConsumption || '-' }} 吨/天</text>
        </view>
        <view class="info-item">
          <text class="info-label">距港口距离</text>
          <text class="info-value">{{ enterprise?.portDistance || '-' }} 公里</text>
        </view>
      </view>
    </view>

    <view class="section" v-if="enterprise?.description">
      <view class="section-header">
        <text class="section-title">企业描述</text>
      </view>
      <view class="description-card">
        <text>{{ enterprise.description }}</text>
      </view>
    </view>

    <view class="chat-fab" @tap="openChat">
      <text>💬</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { api } from '@/utils/api'

const enterprise = ref(null)
const predictions = ref([])
const period = ref(90)
const loading = ref(false)

const enterpriseCode = ref('')

const trend = computed(() => {
  if (predictions.value.length < 2) return 0
  const first = predictions.value[0].predictedPrice
  const last = predictions.value[predictions.value.length - 1].predictedPrice
  return ((last - first) / first) * 100
})

const transportModeText = computed(() => {
  const modes = {
    water: '水运',
    rail: '铁路',
    road: '公路'
  }
  return modes[enterprise.value?.transportMode] || '未设置'
})

const inventoryStrategyText = computed(() => {
  const strategies = {
    aggressive: '激进型',
    moderate: '稳健型',
    conservative: '保守型'
  }
  return strategies[enterprise.value?.inventoryStrategy] || '稳健型'
})

const fetchEnterprise = async () => {
  if (!enterpriseCode.value) return
  
  loading.value = true
  try {
    const res = await api.getEnterprise(enterpriseCode.value)
    enterprise.value = res.enterprise
  } catch (e) {
    console.error('获取企业详情失败:', e)
    uni.showToast({
      title: '获取企业详情失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

const fetchPredictions = async () => {
  if (!enterpriseCode.value) return
  
  try {
    const res = await api.getPredictions(enterpriseCode.value, period.value)
    predictions.value = res.predictions || []
  } catch (e) {
    console.error('获取预测数据失败:', e)
  }
}

const changePeriod = (days) => {
  period.value = days
  fetchPredictions()
}

const getBarHeight = (price) => {
  if (!predictions.value.length) return 50
  const prices = predictions.value.map(p => p.predictedPrice)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1
  return ((price - min) / range) * 80 + 20
}

const formatPrice = (price) => {
  if (!price) return '-'
  return (price / 100).toFixed(0)
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const openChat = () => {
  uni.switchTab({
    url: '/pages/chat/index'
  })
}

onLoad((options) => {
  enterpriseCode.value = options.code
  fetchEnterprise()
  fetchPredictions()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  padding: 32rpx;
  padding-bottom: 200rpx;
}

.enterprise-header {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.1);
}

.header-main {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.enterprise-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44rpx;
}

.bg-cyan { background: rgba(6, 182, 212, 0.15); }
.bg-violet { background: rgba(139, 92, 246, 0.15); }
.bg-amber { background: rgba(245, 158, 11, 0.15); }
.bg-emerald { background: rgba(16, 185, 129, 0.15); }
.bg-rose { background: rgba(244, 63, 94, 0.15); }
.bg-blue { background: rgba(59, 130, 246, 0.15); }

.enterprise-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.enterprise-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #f8fafc;
}

.enterprise-location {
  font-size: 26rpx;
  color: #94a3b8;
}

.header-stats {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}

.stat-badge {
  padding: 12rpx 24rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
}

.stat-badge text {
  color: #94a3b8;
}

.section {
  margin-bottom: 32rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #f8fafc;
}

.period-tabs {
  display: flex;
  gap: 16rpx;
}

.tab {
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #64748b;
  background: rgba(148, 163, 184, 0.1);
}

.tab.active {
  background: rgba(6, 182, 212, 0.2);
  color: #06b6d4;
}

.chart-container {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8));
  border-radius: 24rpx;
  padding: 32rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.1);
  margin-bottom: 24rpx;
}

.chart-placeholder {
  height: 320rpx;
  display: flex;
  flex-direction: column;
}

.chart-bars {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
  padding-bottom: 16rpx;
}

.bar {
  flex: 1;
  background: linear-gradient(180deg, #06b6d4, #0891b2);
  border-radius: 8rpx 8rpx 0 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 8rpx;
  min-height: 40rpx;
}

.bar-value {
  font-size: 18rpx;
  color: #f8fafc;
  margin-bottom: 4rpx;
}

.chart-labels {
  display: flex;
  gap: 16rpx;
}

.label {
  flex: 1;
  text-align: center;
  font-size: 20rpx;
  color: #64748b;
}

.prediction-summary {
  display: flex;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8));
  border-radius: 24rpx;
  padding: 24rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.1);
}

.summary-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.summary-label {
  font-size: 24rpx;
  color: #64748b;
}

.summary-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #f8fafc;
}

.summary-value.up {
  color: #10b981;
}

.summary-value.down {
  color: #f43f5e;
}

.info-list {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8));
  border-radius: 24rpx;
  padding: 8rpx 32rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.1);
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid rgba(148, 163, 184, 0.1);
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 28rpx;
  color: #94a3b8;
}

.info-value {
  font-size: 28rpx;
  color: #f8fafc;
}

.description-card {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8));
  border-radius: 24rpx;
  padding: 32rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.1);
}

.description-card text {
  font-size: 28rpx;
  color: #94a3b8;
  line-height: 1.6;
}

.chat-fab {
  position: fixed;
  right: 32rpx;
  bottom: 200rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44rpx;
  box-shadow: 0 8rpx 32rpx rgba(6, 182, 212, 0.4);
}
</style>
