<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @tap="goBack">‹ 返回</view>
      <text class="title">供需分析</text>
      <text class="desc">硫磺市场供需平衡分析</text>
    </view>

    <view class="summary-cards">
      <view class="summary-card supply">
        <view class="card-header">
          <view class="card-icon">📦</view>
          <text class="card-title">供给端</text>
        </view>
        <view class="card-value">{{ supplyData.index || '-' }}</view>
        <view class="card-status" :class="supplyData.status">{{ getStatusText('supply', supplyData.status) }}</view>
        <view class="card-items">
          <view class="item" v-for="(item, i) in supplyData.factors" :key="i">
            <text class="item-label">{{ item.name }}</text>
            <text class="item-value" :class="item.trend > 0 ? 'up' : item.trend < 0 ? 'down' : ''">{{ item.value }}{{ item.trend ? (item.trend > 0 ? ' ↑' : ' ↓') : '' }}</text>
          </view>
        </view>
      </view>

      <view class="summary-card demand">
        <view class="card-header">
          <view class="card-icon">🏭</view>
          <text class="card-title">需求端</text>
        </view>
        <view class="card-value">{{ demandData.index || '-' }}</view>
        <view class="card-status" :class="demandData.status">{{ getStatusText('demand', demandData.status) }}</view>
        <view class="card-items">
          <view class="item" v-for="(item, i) in demandData.factors" :key="i">
            <text class="item-label">{{ item.name }}</text>
            <text class="item-value" :class="item.trend > 0 ? 'up' : item.trend < 0 ? 'down' : ''">{{ item.value }}{{ item.trend ? (item.trend > 0 ? ' ↑' : ' ↓') : '' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">⚖️ 供需平衡</text>
      </view>
      <view class="balance-chart">
        <view class="balance-bar">
          <view class="balance-fill supply" :style="{ width: supplyPercent + '%' }"></view>
          <view class="balance-fill demand" :style="{ width: demandPercent + '%' }"></view>
        </view>
        <view class="balance-labels">
          <text class="balance-label supply">供给 {{ supplyPercent.toFixed(0) }}%</text>
          <text class="balance-label demand">需求 {{ demandPercent.toFixed(0) }}%</text>
        </view>
      </view>
      <view class="balance-status" :class="balanceStatus">
        <view class="status-icon">{{ balanceStatus === 'surplus' ? '📉' : balanceStatus === 'shortage' ? '📈' : '⚖️' }}</view>
        <view class="status-text">
          <text class="status-title">{{ balanceStatus === 'surplus' ? '供给过剩' : balanceStatus === 'shortage' ? '供给紧张' : '供需平衡' }}</text>
          <text class="status-desc">{{ balanceDescription }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">📊 历史趋势</text>
      </view>
      <view class="trend-chart">
        <view class="chart-area">
          <view class="chart-line" v-for="(line, i) in trendLines" :key="i">
            <view class="line-label">{{ line.label }}</view>
            <view class="line-bars">
              <view class="bar" v-for="(v, j) in line.values" :key="j" :style="{ height: getBarHeight(v, line.max) + 'rpx' }" :class="line.type"></view>
            </view>
          </view>
        </view>
        <view class="chart-legend">
          <view class="legend-item" v-for="(line, i) in trendLines" :key="i">
            <view class="legend-color" :class="line.type"></view>
            <text class="legend-text">{{ line.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">🏭 企业库存分布</text>
      </view>
      <view class="inventory-list">
        <view class="inventory-item" v-for="(inv, i) in inventoryData" :key="i">
          <view class="inv-header">
            <text class="inv-name">{{ inv.name }}</text>
            <view class="inv-status" :class="inv.status">{{ inv.statusText }}</view>
          </view>
          <view class="inv-bar">
            <view class="inv-fill" :style="{ width: inv.percent + '%' }" :class="inv.status"></view>
          </view>
          <view class="inv-info">
            <text class="inv-current">当前: {{ inv.current }}万吨</text>
            <text class="inv-max">最大: {{ inv.max }}万吨</text>
            <text class="inv-safety">安全线: {{ inv.safety }}万吨</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">📈 价格影响预测</text>
      </view>
      <view class="prediction-cards">
        <view class="prediction-card" v-for="(pred, i) in predictions" :key="i">
          <view class="pred-period">{{ pred.period }}</view>
          <view class="pred-trend" :class="pred.trend > 0 ? 'up' : pred.trend < 0 ? 'down' : ''">
            <text class="pred-icon">{{ pred.trend > 0 ? '↑' : pred.trend < 0 ? '↓' : '→' }}</text>
            <text class="pred-value">{{ Math.abs(pred.trend).toFixed(1) }}%</text>
          </view>
          <text class="pred-reason">{{ pred.reason }}</text>
          <view class="pred-confidence">
            <text class="confidence-label">置信度</text>
            <view class="confidence-bar">
              <view class="confidence-fill" :style="{ width: pred.confidence + '%' }"></view>
            </view>
            <text class="confidence-value">{{ pred.confidence }}%</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/utils/api'

const supplyData = ref({
  index: 0,
  status: 'balanced',
  factors: []
})

const demandData = ref({
  index: 0,
  status: 'normal',
  factors: []
})

const inventoryData = ref([])
const predictions = ref([])

const supplyPercent = computed(() => {
  const total = (supplyData.value.index || 50) + (demandData.value.index || 50)
  return total > 0 ? (supplyData.value.index / total) * 100 : 50
})

const demandPercent = computed(() => {
  const total = (supplyData.value.index || 50) + (demandData.value.index || 50)
  return total > 0 ? (demandData.value.index / total) * 100 : 50
})

const balanceStatus = computed(() => {
  const diff = supplyPercent.value - demandPercent.value
  if (diff > 10) return 'surplus'
  if (diff < -10) return 'shortage'
  return 'balanced'
})

const balanceDescription = computed(() => {
  if (balanceStatus.value === 'surplus') return '市场供给充足，价格可能承压下行'
  if (balanceStatus.value === 'shortage') return '市场供给紧张，价格可能上涨'
  return '供需基本平衡，价格预期稳定'
})

const trendLines = ref([
  { label: '供给', type: 'supply', values: [], max: 100 },
  { label: '需求', type: 'demand', values: [], max: 100 }
])

const getStatusText = (type, status) => {
  if (type === 'supply') {
    if (status === 'tight') return '偏紧'
    if (status === 'loose') return '宽松'
    return '平衡'
  }
  if (status === 'strong') return '旺盛'
  if (status === 'weak') return '疲软'
  return '正常'
}

const getBarHeight = (value, max) => {
  return Math.max(20, (value / (max || 100)) * 120)
}

const fetchData = async () => {
  try {
    const res = await api.getSupplyDemand()
    if (res) {
      supplyData.value = {
        index: res.supplyIndex || res.supply?.index || 50,
        status: res.supplyStatus || res.supply?.status || 'balanced',
        factors: res.supplyFactors || [
          { name: '国内开工率', value: '78%', trend: 1 },
          { name: '进口到港量', value: '45万吨', trend: -1 },
          { name: '港口库存', value: '120万吨', trend: 0 }
        ]
      }
      demandData.value = {
        index: res.demandIndex || res.demand?.index || 50,
        status: res.demandStatus || res.demand?.status || 'normal',
        factors: res.demandFactors || [
          { name: '磷肥开工率', value: '65%', trend: 1 },
          { name: '工业需求', value: '稳定', trend: 0 },
          { name: '农业需求', value: '旺季', trend: 1 }
        ]
      }
      
      if (res.trend) {
        trendLines.value = [
          { label: '供给', type: 'supply', values: res.trend.supply || [60, 65, 70, 68, 72, 75, 78], max: 100 },
          { label: '需求', type: 'demand', values: res.trend.demand || [55, 58, 62, 65, 68, 70, 72], max: 100 }
        ]
      }
    }
  } catch (e) {
    console.error('获取供需数据失败:', e)
    supplyData.value = {
      index: 65,
      status: 'balanced',
      factors: [
        { name: '国内开工率', value: '78%', trend: 1 },
        { name: '进口到港量', value: '45万吨', trend: -1 },
        { name: '港口库存', value: '120万吨', trend: 0 }
      ]
    }
    demandData.value = {
      index: 58,
      status: 'normal',
      factors: [
        { name: '磷肥开工率', value: '65%', trend: 1 },
        { name: '工业需求', value: '稳定', trend: 0 },
        { name: '农业需求', value: '旺季', trend: 1 }
      ]
    }
  }

  try {
    const invRes = await api.getInventory()
    if (invRes && invRes.inventory) {
      inventoryData.value = invRes.inventory.slice(0, 5).map(inv => ({
        name: inv.location || inv.name,
        current: (inv.currentStock / 10000).toFixed(1),
        max: (inv.maxCapacity / 10000).toFixed(1),
        safety: (inv.safetyStock / 10000).toFixed(1),
        percent: (inv.currentStock / inv.maxCapacity) * 100,
        status: inv.currentStock < inv.safetyStock ? 'warning' : inv.currentStock > inv.maxCapacity * 0.8 ? 'high' : 'normal',
        statusText: inv.currentStock < inv.safetyStock ? '偏低' : inv.currentStock > inv.maxCapacity * 0.8 ? '充足' : '正常'
      }))
    }
  } catch (e) {
    console.error('获取库存数据失败:', e)
    inventoryData.value = [
      { name: '华东港口', current: '45.2', max: '60', safety: '20', percent: 75, status: 'normal', statusText: '正常' },
      { name: '华南港口', current: '32.8', max: '50', safety: '15', percent: 66, status: 'normal', statusText: '正常' },
      { name: '华北港口', current: '18.5', max: '40', safety: '12', percent: 46, status: 'normal', statusText: '正常' }
    ]
  }

  predictions.value = [
    { period: '短期(1-2周)', trend: balanceStatus.value === 'shortage' ? 2.5 : balanceStatus.value === 'surplus' ? -1.5 : 0.5, reason: balanceDescription.value, confidence: 75 },
    { period: '中期(1-3月)', trend: balanceStatus.value === 'shortage' ? 5 : balanceStatus.value === 'surplus' ? -3 : 1, reason: '季节性需求变化与供应调整', confidence: 65 },
    { period: '长期(3-6月)', trend: balanceStatus.value === 'shortage' ? 3 : balanceStatus.value === 'surplus' ? -2 : 0, reason: '产能扩张与市场平衡', confidence: 55 }
  ]
}

const goBack = () => uni.navigateBack()

onMounted(() => fetchData())
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  padding: 32rpx;
  padding-bottom: 100rpx;
}

.header { margin-bottom: 32rpx; }
.back-btn { font-size: 28rpx; color: #06b6d4; margin-bottom: 16rpx; }
.title { font-size: 36rpx; font-weight: 700; color: #f8fafc; display: block; }
.desc { font-size: 24rpx; color: #64748b; margin-top: 8rpx; }

.summary-cards { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.summary-card { flex: 1; padding: 20rpx; background: rgba(30, 41, 59, 0.6); border-radius: 16rpx; border: 1rpx solid rgba(148, 163, 184, 0.1); }
.card-header { display: flex; align-items: center; gap: 8rpx; margin-bottom: 12rpx; }
.card-icon { font-size: 28rpx; }
.card-title { font-size: 24rpx; color: #94a3b8; }
.card-value { font-size: 48rpx; font-weight: 700; color: #f8fafc; margin-bottom: 8rpx; }
.card-status { display: inline-block; padding: 4rpx 12rpx; border-radius: 6rpx; font-size: 20rpx; margin-bottom: 12rpx; }
.card-status.tight, .card-status.strong { background: rgba(244, 63, 94, 0.2); color: #f43f5e; }
.card-status.loose, .card-status.weak { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.card-status.balanced, .card-status.normal { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }
.card-items { border-top: 1rpx solid rgba(148, 163, 184, 0.1); padding-top: 12rpx; }
.item { display: flex; justify-content: space-between; margin-bottom: 8rpx; }
.item-label { font-size: 22rpx; color: #64748b; }
.item-value { font-size: 22rpx; color: #f8fafc; }
.item-value.up { color: #10b981; }
.item-value.down { color: #f43f5e; }

.section { background: rgba(30, 41, 59, 0.6); border-radius: 24rpx; padding: 24rpx; margin-bottom: 24rpx; border: 1rpx solid rgba(148, 163, 184, 0.1); }
.section-header { margin-bottom: 20rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #f8fafc; }

.balance-chart { margin-bottom: 20rpx; }
.balance-bar { display: flex; height: 24rpx; background: rgba(148, 163, 184, 0.1); border-radius: 12rpx; overflow: hidden; }
.balance-fill.supply { background: linear-gradient(90deg, #06b6d4, #0891b2); }
.balance-fill.demand { background: linear-gradient(90deg, #8b5cf6, #7c3aed); }
.balance-labels { display: flex; justify-content: space-between; margin-top: 8rpx; }
.balance-label { font-size: 22rpx; }
.balance-label.supply { color: #06b6d4; }
.balance-label.demand { color: #8b5cf6; }

.balance-status { display: flex; align-items: center; gap: 16rpx; padding: 20rpx; background: rgba(15, 23, 42, 0.4); border-radius: 12rpx; }
.balance-status.surplus { border-left: 4rpx solid #10b981; }
.balance-status.shortage { border-left: 4rpx solid #f43f5e; }
.balance-status.balanced { border-left: 4rpx solid #06b6d4; }
.status-icon { font-size: 36rpx; }
.status-title { font-size: 26rpx; font-weight: 600; color: #f8fafc; display: block; }
.status-desc { font-size: 22rpx; color: #64748b; margin-top: 4rpx; }

.trend-chart { padding: 16rpx 0; }
.chart-area { display: flex; gap: 32rpx; margin-bottom: 16rpx; }
.chart-line { flex: 1; }
.line-label { font-size: 22rpx; color: #64748b; margin-bottom: 8rpx; text-align: center; }
.line-bars { display: flex; align-items: flex-end; gap: 4rpx; height: 160rpx; }
.bar { flex: 1; min-height: 8rpx; border-radius: 4rpx 4rpx 0 0; }
.bar.supply { background: #06b6d4; }
.bar.demand { background: #8b5cf6; }
.chart-legend { display: flex; justify-content: center; gap: 32rpx; }
.legend-item { display: flex; align-items: center; gap: 8rpx; }
.legend-color { width: 24rpx; height: 8rpx; border-radius: 4rpx; }
.legend-color.supply { background: #06b6d4; }
.legend-color.demand { background: #8b5cf6; }
.legend-text { font-size: 22rpx; color: #64748b; }

.inventory-list { display: flex; flex-direction: column; gap: 16rpx; }
.inventory-item { padding: 16rpx; background: rgba(15, 23, 42, 0.4); border-radius: 12rpx; }
.inv-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.inv-name { font-size: 26rpx; font-weight: 600; color: #f8fafc; }
.inv-status { padding: 4rpx 12rpx; border-radius: 6rpx; font-size: 20rpx; }
.inv-status.warning { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.inv-status.normal { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.inv-status.high { background: rgba(6, 182, 212, 0.2); color: #06b6d4; }
.inv-bar { height: 12rpx; background: rgba(148, 163, 184, 0.1); border-radius: 6rpx; overflow: hidden; margin-bottom: 8rpx; }
.inv-fill { height: 100%; border-radius: 6rpx; }
.inv-fill.warning { background: #f59e0b; }
.inv-fill.normal { background: #10b981; }
.inv-fill.high { background: #06b6d4; }
.inv-info { display: flex; justify-content: space-between; font-size: 20rpx; color: #64748b; }

.prediction-cards { display: flex; flex-direction: column; gap: 12rpx; }
.prediction-card { padding: 16rpx; background: rgba(15, 23, 42, 0.4); border-radius: 12rpx; }
.pred-period { font-size: 22rpx; color: #64748b; margin-bottom: 8rpx; }
.pred-trend { display: flex; align-items: center; gap: 8rpx; margin-bottom: 8rpx; }
.pred-icon { font-size: 32rpx; }
.pred-value { font-size: 32rpx; font-weight: 700; }
.pred-trend.up .pred-icon, .pred-trend.up .pred-value { color: #10b981; }
.pred-trend.down .pred-icon, .pred-trend.down .pred-value { color: #f43f5e; }
.pred-reason { font-size: 22rpx; color: #94a3b8; margin-bottom: 12rpx; }
.pred-confidence { display: flex; align-items: center; gap: 12rpx; }
.confidence-label { font-size: 20rpx; color: #64748b; }
.confidence-bar { flex: 1; height: 8rpx; background: rgba(148, 163, 184, 0.2); border-radius: 4rpx; overflow: hidden; }
.confidence-fill { height: 100%; background: linear-gradient(90deg, #06b6d4, #10b981); border-radius: 4rpx; }
.confidence-value { font-size: 20rpx; color: #06b6d4; }
</style>
