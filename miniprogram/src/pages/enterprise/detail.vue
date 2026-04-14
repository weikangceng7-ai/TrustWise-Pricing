<template>
  <view class="page">
    <view class="header" v-if="enterprise">
      <view class="header-main">
        <view class="icon">🏭</view>
        <view class="info">
          <text class="name">{{ enterprise.name }}</text>
          <text class="location">{{ enterprise.location || enterprise.province || '未设置地区' }}</text>
        </view>
      </view>
      <view class="badges">
        <text class="badge">产能: {{ enterprise.capacity || '-' }} 万吨/年</text>
        <text class="badge">库存: {{ enterprise.currentStock || '-' }} 吨</text>
      </view>
    </view>

    <view class="section" v-if="predictions.length">
      <view class="section-header">
        <text class="section-title">价格预测</text>
        <view class="tabs">
          <text class="tab" :class="{ active: period === 30 }" @tap="changePeriod(30)">30天</text>
          <text class="tab" :class="{ active: period === 60 }" @tap="changePeriod(60)">60天</text>
          <text class="tab" :class="{ active: period === 90 }" @tap="changePeriod(90)">90天</text>
        </view>
      </view>
      
      <view class="chart">
        <view class="bars">
          <view class="bar" v-for="(p, i) in predictions.slice(0, 10)" :key="i" :style="{ height: getBarHeight(p.predictedPrice) + '%' }">
            <text class="bar-value">{{ formatPrice(p.predictedPrice) }}</text>
          </view>
        </view>
        <view class="labels">
          <text class="label" v-for="(p, i) in predictions.slice(0, 10)" :key="i">{{ formatDate(p.date) }}</text>
        </view>
      </view>

      <view class="summary">
        <view class="item">
          <text class="label">预测趋势</text>
          <text class="value" :class="trend > 0 ? 'up' : trend < 0 ? 'down' : ''">{{ trend > 0 ? '↑ 上涨' : trend < 0 ? '↓ 下跌' : '→ 持平' }}</text>
        </view>
        <view class="item">
          <text class="label">预测幅度</text>
          <text class="value">{{ Math.abs(trend).toFixed(2) }}%</text>
        </view>
        <view class="item">
          <text class="label">置信度</text>
          <text class="value">{{ enterprise?.modelAccuracy || 85 }}%</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">企业信息</text>
      <view class="info-list">
        <view class="info-item">
          <text class="label">运输方式</text>
          <text class="value">{{ transportModeText }}</text>
        </view>
        <view class="info-item">
          <text class="label">库存策略</text>
          <text class="value">{{ inventoryStrategyText }}</text>
        </view>
        <view class="info-item">
          <text class="label">最大仓储能力</text>
          <text class="value">{{ enterprise?.maxCapacity || '-' }} 吨</text>
        </view>
        <view class="info-item">
          <text class="label">安全库存天数</text>
          <text class="value">{{ enterprise?.safetyDays || '-' }} 天</text>
        </view>
        <view class="info-item">
          <text class="label">日均消耗量</text>
          <text class="value">{{ enterprise?.avgConsumption || '-' }} 吨/天</text>
        </view>
        <view class="info-item">
          <text class="label">距港口距离</text>
          <text class="value">{{ enterprise?.portDistance || '-' }} 公里</text>
        </view>
      </view>
    </view>

    <view class="section" v-if="enterprise?.description">
      <text class="section-title">企业描述</text>
      <view class="desc-card">
        <text>{{ enterprise.description }}</text>
      </view>
    </view>

    <view class="action-bar">
      <view class="action-btn" @tap="openKnowledge">
        <text>🧠 查看知识图谱</text>
      </view>
    </view>

    <view class="fab" @tap="openChat">💬</view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { api } from '@/utils/api'

const enterprise = ref(null)
const predictions = ref([])
const period = ref(90)
const code = ref('')

const trend = computed(() => {
  if (predictions.value.length < 2) return 0
  const first = predictions.value[0].predictedPrice
  const last = predictions.value[predictions.value.length - 1].predictedPrice
  return ((last - first) / first) * 100
})

const transportModeText = computed(() => ({ water: '水运', rail: '铁路', road: '公路' }[enterprise.value?.transportMode] || '未设置'))
const inventoryStrategyText = computed(() => ({ aggressive: '激进型', moderate: '稳健型', conservative: '保守型' }[enterprise.value?.inventoryStrategy] || '稳健型'))

const fetchData = async () => {
  if (!code.value) return
  try {
    const res = await api.getEnterprise(code.value)
    enterprise.value = res.enterprise
  } catch (e) {
    console.error('获取企业详情失败:', e)
    uni.showToast({ title: '获取企业详情失败', icon: 'none' })
  }
}

const fetchPredictions = async () => {
  if (!code.value) return
  try {
    const res = await api.getPredictions(code.value, period.value)
    predictions.value = res.data || res.predictions || []
  } catch (e) {
    console.error('获取预测数据失败:', e)
  }
}

const changePeriod = (days) => { period.value = days; fetchPredictions() }

const getBarHeight = (price) => {
  if (!predictions.value.length) return 50
  const prices = predictions.value.map(p => p.predictedPrice)
  const min = Math.min(...prices), max = Math.max(...prices)
  return ((price - min) / (max - min || 1)) * 80 + 20
}

const formatPrice = (price) => price ? (price / 100).toFixed(0) : '-'
const formatDate = (dateStr) => { if (!dateStr) return ''; const d = new Date(dateStr); return `${d.getMonth() + 1}/${d.getDate()}` }
const openChat = () => uni.switchTab({ url: '/pages/chat/index' })
const openKnowledge = () => uni.navigateTo({ url: `/pages/knowledge/index?code=${code.value}` })

onLoad((options) => {
  code.value = options.code
  fetchData()
  fetchPredictions()
})

onShow(() => {
  if (code.value) {
    fetchData()
    fetchPredictions()
  }
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
  background: rgba(30, 41, 59, 0.8);
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.1);
}

.header-main { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.icon { width: 80rpx; height: 80rpx; background: linear-gradient(135deg, #06b6d4, #0891b2); border-radius: 20rpx; display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
.name { font-size: 36rpx; font-weight: 700; color: #f8fafc; }
.location { font-size: 24rpx; color: #64748b; margin-top: 4rpx; }
.badges { display: flex; gap: 12rpx; flex-wrap: wrap; }
.badge { padding: 8rpx 16rpx; background: rgba(6, 182, 212, 0.15); border-radius: 8rpx; font-size: 22rpx; color: #06b6d4; }

.section { background: rgba(30, 41, 59, 0.6); border-radius: 24rpx; padding: 24rpx; margin-bottom: 24rpx; border: 1rpx solid rgba(148, 163, 184, 0.1); }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #f8fafc; }
.tabs { display: flex; gap: 8rpx; }
.tab { padding: 8rpx 16rpx; border-radius: 8rpx; font-size: 24rpx; color: #64748b; background: rgba(148, 163, 184, 0.1); }
.tab.active { background: #06b6d4; color: #fff; }

.chart { margin-bottom: 20rpx; }
.bars { display: flex; align-items: flex-end; gap: 8rpx; height: 200rpx; padding: 0 8rpx; }
.bar { flex: 1; background: linear-gradient(180deg, #06b6d4, #0891b2); border-radius: 8rpx 8rpx 0 0; display: flex; align-items: flex-start; justify-content: center; padding-top: 8rpx; min-height: 40rpx; }
.bar-value { font-size: 18rpx; color: #fff; }
.labels { display: flex; gap: 8rpx; padding: 8rpx 8rpx 0; }
.label { flex: 1; text-align: center; font-size: 20rpx; color: #64748b; }

.summary { display: flex; gap: 16rpx; }
.item { flex: 1; text-align: center; padding: 16rpx; background: rgba(15, 23, 42, 0.4); border-radius: 12rpx; }
.item .label { font-size: 22rpx; color: #64748b; }
.item .value { font-size: 28rpx; font-weight: 600; color: #f8fafc; margin-top: 8rpx; }
.item .value.up { color: #10b981; }
.item .value.down { color: #f43f5e; }

.info-list { display: flex; flex-direction: column; gap: 16rpx; }
.info-item { display: flex; justify-content: space-between; align-items: center; padding: 16rpx; background: rgba(15, 23, 42, 0.4); border-radius: 12rpx; }
.info-item .label { font-size: 26rpx; color: #64748b; }
.info-item .value { font-size: 26rpx; color: #f8fafc; }

.desc-card { padding: 20rpx; background: rgba(15, 23, 42, 0.4); border-radius: 12rpx; }
.desc-card text { font-size: 26rpx; color: #94a3b8; line-height: 1.6; }

.action-bar { margin-bottom: 24rpx; }
.action-btn { display: flex; align-items: center; justify-content: center; padding: 24rpx; background: rgba(139, 92, 246, 0.2); border-radius: 16rpx; border: 1rpx solid rgba(139, 92, 246, 0.3); }
.action-btn text { font-size: 28rpx; color: #8b5cf6; }

.fab { position: fixed; right: 32rpx; bottom: 200rpx; width: 100rpx; height: 100rpx; background: linear-gradient(135deg, #06b6d4, #0891b2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 48rpx; box-shadow: 0 8rpx 24rpx rgba(6, 182, 212, 0.4); }
</style>
