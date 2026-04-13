<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @tap="goBack">‹ 返回</view>
      <view class="report-meta">
        <view class="report-type" :class="'type-' + report.type">{{ getTypeText(report.type) }}</view>
        <text class="report-date">{{ report.date }}</text>
      </view>
      <text class="title">{{ report.title }}</text>
    </view>

    <view class="summary-card" v-if="report.summary">
      <view class="card-header">
        <text class="card-icon">📋</text>
        <text class="card-title">报告摘要</text>
      </view>
      <text class="summary-text">{{ report.summary }}</text>
    </view>

    <view class="stats-row">
      <view class="stat-item">
        <view class="stat-icon trend">📈</view>
        <text class="stat-label">价格趋势</text>
        <text class="stat-value" :class="report.trend > 0 ? 'up' : report.trend < 0 ? 'down' : ''">{{ report.priceTrend || '稳定' }}</text>
      </view>
      <view class="stat-item">
        <view class="stat-icon risk">⚠️</view>
        <text class="stat-label">风险等级</text>
        <view class="risk-tag" :class="'risk-' + (report.riskLevel || 'low')">{{ report.riskLevel === 'high' ? '高风险' : report.riskLevel === 'medium' ? '中风险' : '低风险' }}</view>
      </view>
      <view class="stat-item">
        <view class="stat-icon confidence">📊</view>
        <text class="stat-label">预测置信度</text>
        <text class="stat-value">{{ report.confidence || 85 }}%</text>
      </view>
    </view>

    <view class="section" v-if="report.priceAnalysis">
      <view class="section-header">
        <text class="section-title">💰 价格分析</text>
      </view>
      <view class="price-info">
        <view class="price-item">
          <text class="price-label">当前价格</text>
          <text class="price-value">¥{{ report.priceAnalysis.current || '-' }}</text>
          <text class="price-unit">元/吨</text>
        </view>
        <view class="price-item">
          <text class="price-label">预测价格</text>
          <text class="price-value">¥{{ report.priceAnalysis.predicted || '-' }}</text>
          <text class="price-unit">元/吨</text>
        </view>
        <view class="price-change" :class="priceChangeClass">
          <text>{{ priceChangeText }}</text>
        </view>
      </view>
      <view class="price-chart" v-if="report.priceAnalysis.history">
        <view class="chart-bars">
          <view class="chart-bar" v-for="(p, i) in report.priceAnalysis.history" :key="i" :style="{ height: getBarHeight(p) + '%' }">
            <view class="bar-inner"></view>
          </view>
        </view>
      </view>
    </view>

    <view class="section" v-if="report.marketAnalysis">
      <view class="section-header">
        <text class="section-title">📊 市场分析</text>
      </view>
      <view class="analysis-content">
        <view class="analysis-item" v-for="(item, i) in report.marketAnalysis" :key="i">
          <view class="analysis-header">
            <view class="analysis-icon">{{ item.icon || '📌' }}</view>
            <text class="analysis-title">{{ item.title }}</text>
          </view>
          <text class="analysis-text">{{ item.content }}</text>
        </view>
      </view>
    </view>

    <view class="section" v-if="report.supplyDemand">
      <view class="section-header">
        <text class="section-title">⚖️ 供需状况</text>
      </view>
      <view class="sd-cards">
        <view class="sd-card supply">
          <view class="sd-header">
            <text class="sd-icon">📦</text>
            <text class="sd-title">供给端</text>
          </view>
          <view class="sd-items">
            <view class="sd-item" v-for="(item, i) in report.supplyDemand.supply" :key="'s' + i">
              <text class="sd-label">{{ item.label }}</text>
              <text class="sd-value">{{ item.value }}</text>
            </view>
          </view>
        </view>
        <view class="sd-card demand">
          <view class="sd-header">
            <text class="sd-icon">🏭</text>
            <text class="sd-title">需求端</text>
          </view>
          <view class="sd-items">
            <view class="sd-item" v-for="(item, i) in report.supplyDemand.demand" :key="'d' + i">
              <text class="sd-label">{{ item.label }}</text>
              <text class="sd-value">{{ item.value }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="section" v-if="report.risks && report.risks.length">
      <view class="section-header">
        <text class="section-title">⚠️ 风险提示</text>
      </view>
      <view class="risk-list">
        <view class="risk-item" v-for="(risk, i) in report.risks" :key="i" :class="'risk-' + risk.level">
          <view class="risk-indicator"></view>
          <view class="risk-content">
            <text class="risk-title">{{ risk.title }}</text>
            <text class="risk-desc">{{ risk.description }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section" v-if="report.recommendations">
      <view class="section-header">
        <text class="section-title">💡 采购建议</text>
      </view>
      <view class="recommendations">
        <view class="rec-item" v-for="(rec, i) in report.recommendations" :key="i">
          <view class="rec-number">{{ i + 1 }}</view>
          <view class="rec-content">
            <text class="rec-title">{{ rec.title }}</text>
            <text class="rec-desc">{{ rec.description }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section" v-if="report.dataPoints">
      <view class="section-header">
        <text class="section-title">📈 关键数据</text>
      </view>
      <view class="data-grid">
        <view class="data-item" v-for="(dp, i) in report.dataPoints" :key="i">
          <text class="data-label">{{ dp.label }}</text>
          <text class="data-value">{{ dp.value }}</text>
          <text class="data-change" v-if="dp.change" :class="dp.change > 0 ? 'up' : 'down'">{{ dp.change > 0 ? '↑' : '↓' }}{{ Math.abs(dp.change) }}%</text>
        </view>
      </view>
    </view>

    <view class="actions">
      <view class="btn btn-secondary" @tap="shareReport">
        <text>分享报告</text>
      </view>
      <view class="btn btn-primary" @tap="askAI">
        <text>咨询AI助手</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/utils/api'

const reportId = ref('')
const report = ref({
  id: '',
  title: '',
  type: 'weekly',
  date: '',
  summary: '',
  priceTrend: '稳定',
  trend: 0,
  riskLevel: 'low',
  confidence: 85,
  priceAnalysis: null,
  marketAnalysis: [],
  supplyDemand: null,
  risks: [],
  recommendations: [],
  dataPoints: []
})

const priceChangeClass = computed(() => {
  if (!report.value.priceAnalysis) return ''
  const change = report.value.priceAnalysis.changePercent || 0
  return change > 0 ? 'up' : change < 0 ? 'down' : ''
})

const priceChangeText = computed(() => {
  if (!report.value.priceAnalysis) return ''
  const change = report.value.priceAnalysis.changePercent || 0
  return `${change > 0 ? '↑' : change < 0 ? '↓' : '→'} ${Math.abs(change).toFixed(2)}%`
})

const getTypeText = (type) => {
  const types = { weekly: '周报', monthly: '月报', quarterly: '季报', yearly: '年报', special: '专题' }
  return types[type] || '报告'
}

const getBarHeight = (price) => {
  if (!report.value.priceAnalysis?.history) return 50
  const prices = report.value.priceAnalysis.history
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return ((price - min) / (max - min || 1)) * 80 + 20
}

const fetchReport = async () => {
  try {
    const res = await api.getReports({ id: reportId.value })
    if (res && res.reports && res.reports[0]) {
      const r = res.reports[0]
      report.value = {
        id: r.id,
        title: r.title,
        type: r.type || 'weekly',
        date: r.reportDate || r.createdAt?.split('T')[0],
        summary: r.summary || r.content,
        priceTrend: r.priceTrend || '稳定',
        trend: r.priceTrend?.includes('上涨') ? 1 : r.priceTrend?.includes('下跌') ? -1 : 0,
        riskLevel: r.riskLevel || 'low',
        confidence: r.confidence || 85,
        priceAnalysis: r.priceAnalysis || {
          current: 1850,
          predicted: 1920,
          changePercent: 3.8,
          history: [1780, 1800, 1820, 1810, 1830, 1840, 1850]
        },
        marketAnalysis: r.marketAnalysis || [
          { icon: '🌏', title: '国际市场', content: '中东地区硫磺供应稳定，国际价格维持高位运行。' },
          { icon: '🚢', title: '进口动态', content: '本月进口量环比增加5%，港口到货量充足。' },
          { icon: '🏭', title: '下游需求', content: '磷肥企业开工率提升，工业需求保持稳定。' }
        ],
        supplyDemand: r.supplyDemand || {
          supply: [
            { label: '国内开工率', value: '78%' },
            { label: '进口量', value: '45万吨' },
            { label: '港口库存', value: '120万吨' }
          ],
          demand: [
            { label: '磷肥开工率', value: '65%' },
            { label: '工业需求', value: '稳定' },
            { label: '农业需求', value: '旺季' }
          ]
        },
        risks: r.risks || [
          { level: 'medium', title: '国际油价波动', description: '原油价格波动可能影响硫磺生产成本' },
          { level: 'low', title: '汇率风险', description: '人民币汇率波动影响进口成本' }
        ],
        recommendations: r.recommendations || [
          { title: '适度增加库存', description: '建议在价格回调时适度增加库存，应对后期需求增长' },
          { title: '关注进口动态', description: '密切关注国际市场动态，把握采购时机' },
          { title: '优化采购节奏', description: '建议分批采购，降低价格波动风险' }
        ],
        dataPoints: r.dataPoints || [
          { label: '港口库存', value: '120万吨', change: 2.5 },
          { label: '进口均价', value: '$185/吨', change: -1.2 },
          { label: '国内产量', value: '85万吨', change: 3.1 },
          { label: '下游开工率', value: '72%', change: 1.5 }
        ]
      }
    }
  } catch (e) {
    console.error('获取报告详情失败:', e)
    report.value = {
      id: reportId.value,
      title: '硫磺市场周度分析报告',
      type: 'weekly',
      date: '2026-04-13',
      summary: '本周硫磺市场整体呈现稳中偏强态势。国际市场供应稳定，国内需求逐步回暖，港口库存处于合理区间。预计短期内价格将维持震荡上行趋势。',
      priceTrend: '震荡上行',
      trend: 1,
      riskLevel: 'medium',
      confidence: 85,
      priceAnalysis: {
        current: 1850,
        predicted: 1920,
        changePercent: 3.8,
        history: [1780, 1800, 1820, 1810, 1830, 1840, 1850]
      },
      marketAnalysis: [
        { icon: '🌏', title: '国际市场', content: '中东地区硫磺供应稳定，国际价格维持高位运行。' },
        { icon: '🚢', title: '进口动态', content: '本月进口量环比增加5%，港口到货量充足。' },
        { icon: '🏭', title: '下游需求', content: '磷肥企业开工率提升，工业需求保持稳定。' }
      ],
      supplyDemand: {
        supply: [
          { label: '国内开工率', value: '78%' },
          { label: '进口量', value: '45万吨' },
          { label: '港口库存', value: '120万吨' }
        ],
        demand: [
          { label: '磷肥开工率', value: '65%' },
          { label: '工业需求', value: '稳定' },
          { label: '农业需求', value: '旺季' }
        ]
      },
      risks: [
        { level: 'medium', title: '国际油价波动', description: '原油价格波动可能影响硫磺生产成本' },
        { level: 'low', title: '汇率风险', description: '人民币汇率波动影响进口成本' }
      ],
      recommendations: [
        { title: '适度增加库存', description: '建议在价格回调时适度增加库存，应对后期需求增长' },
        { title: '关注进口动态', description: '密切关注国际市场动态，把握采购时机' },
        { title: '优化采购节奏', description: '建议分批采购，降低价格波动风险' }
      ],
      dataPoints: [
        { label: '港口库存', value: '120万吨', change: 2.5 },
        { label: '进口均价', value: '$185/吨', change: -1.2 },
        { label: '国内产量', value: '85万吨', change: 3.1 },
        { label: '下游开工率', value: '72%', change: 1.5 }
      ]
    }
  }
}

const goBack = () => uni.navigateBack()

const shareReport = () => {
  uni.showToast({ title: '分享功能开发中', icon: 'none' })
}

const askAI = () => {
  uni.navigateTo({ url: `/pages/chat/index?context=report_${reportId.value}` })
}

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  reportId.value = currentPage.options?.id || ''
  if (reportId.value) {
    fetchReport()
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

.header { margin-bottom: 24rpx; }
.back-btn { font-size: 28rpx; color: #06b6d4; margin-bottom: 16rpx; }
.report-meta { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.report-type { padding: 6rpx 16rpx; border-radius: 8rpx; font-size: 22rpx; }
.type-weekly { background: rgba(6, 182, 212, 0.2); color: #06b6d4; }
.type-monthly { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
.type-quarterly { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.report-date { font-size: 24rpx; color: #64748b; }
.title { font-size: 36rpx; font-weight: 700; color: #f8fafc; line-height: 1.4; }

.summary-card { background: rgba(30, 41, 59, 0.6); border-radius: 16rpx; padding: 20rpx; margin-bottom: 24rpx; border: 1rpx solid rgba(148, 163, 184, 0.1); }
.card-header { display: flex; align-items: center; gap: 8rpx; margin-bottom: 12rpx; }
.card-icon { font-size: 28rpx; }
.card-title { font-size: 26rpx; font-weight: 600; color: #f8fafc; }
.summary-text { font-size: 26rpx; color: #cbd5e1; line-height: 1.6; }

.stats-row { display: flex; gap: 12rpx; margin-bottom: 24rpx; }
.stat-item { flex: 1; padding: 16rpx; background: rgba(30, 41, 59, 0.6); border-radius: 12rpx; text-align: center; border: 1rpx solid rgba(148, 163, 184, 0.1); }
.stat-icon { font-size: 28rpx; margin-bottom: 8rpx; }
.stat-label { font-size: 22rpx; color: #64748b; display: block; margin-bottom: 8rpx; }
.stat-value { font-size: 26rpx; font-weight: 600; color: #f8fafc; }
.stat-value.up { color: #10b981; }
.stat-value.down { color: #f43f5e; }
.risk-tag { display: inline-block; padding: 4rpx 12rpx; border-radius: 6rpx; font-size: 22rpx; }
.risk-high { background: rgba(244, 63, 94, 0.2); color: #f43f5e; }
.risk-medium { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.risk-low { background: rgba(16, 185, 129, 0.2); color: #10b981; }

.section { background: rgba(30, 41, 59, 0.6); border-radius: 24rpx; padding: 24rpx; margin-bottom: 24rpx; border: 1rpx solid rgba(148, 163, 184, 0.1); }
.section-header { margin-bottom: 20rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #f8fafc; }

.price-info { display: flex; align-items: center; justify-content: space-between; padding: 16rpx; background: rgba(15, 23, 42, 0.4); border-radius: 12rpx; margin-bottom: 16rpx; }
.price-item { text-align: center; }
.price-label { font-size: 22rpx; color: #64748b; display: block; }
.price-value { font-size: 32rpx; font-weight: 700; color: #f8fafc; }
.price-unit { font-size: 20rpx; color: #64748b; }
.price-change { padding: 8rpx 16rpx; border-radius: 8rpx; }
.price-change.up { background: rgba(16, 185, 129, 0.2); }
.price-change.up text { color: #10b981; }
.price-change.down { background: rgba(244, 63, 94, 0.2); }
.price-change.down text { color: #f43f5e; }
.price-change text { font-size: 24rpx; font-weight: 600; }

.price-chart { margin-top: 16rpx; }
.chart-bars { display: flex; align-items: flex-end; gap: 4rpx; height: 120rpx; }
.chart-bar { flex: 1; display: flex; align-items: flex-end; }
.bar-inner { width: 100%; border-radius: 4rpx 4rpx 0 0; background: linear-gradient(180deg, #06b6d4, #0891b2); min-height: 8rpx; }

.analysis-content { display: flex; flex-direction: column; gap: 16rpx; }
.analysis-item { padding: 16rpx; background: rgba(15, 23, 42, 0.4); border-radius: 12rpx; }
.analysis-header { display: flex; align-items: center; gap: 8rpx; margin-bottom: 8rpx; }
.analysis-icon { font-size: 24rpx; }
.analysis-title { font-size: 24rpx; font-weight: 600; color: #f8fafc; }
.analysis-text { font-size: 24rpx; color: #94a3b8; line-height: 1.5; }

.sd-cards { display: flex; gap: 16rpx; }
.sd-card { flex: 1; padding: 16rpx; background: rgba(15, 23, 42, 0.4); border-radius: 12rpx; }
.sd-header { display: flex; align-items: center; gap: 8rpx; margin-bottom: 12rpx; }
.sd-icon { font-size: 24rpx; }
.sd-title { font-size: 24rpx; font-weight: 600; color: #f8fafc; }
.sd-items { display: flex; flex-direction: column; gap: 8rpx; }
.sd-item { display: flex; justify-content: space-between; }
.sd-label { font-size: 22rpx; color: #64748b; }
.sd-value { font-size: 22rpx; color: #f8fafc; }

.risk-list { display: flex; flex-direction: column; gap: 12rpx; }
.risk-item { display: flex; gap: 12rpx; padding: 16rpx; background: rgba(15, 23, 42, 0.4); border-radius: 12rpx; }
.risk-indicator { width: 4rpx; border-radius: 2rpx; }
.risk-item.risk-high .risk-indicator { background: #f43f5e; }
.risk-item.risk-medium .risk-indicator { background: #f59e0b; }
.risk-item.risk-low .risk-indicator { background: #10b981; }
.risk-content { flex: 1; }
.risk-title { font-size: 24rpx; font-weight: 600; color: #f8fafc; display: block; margin-bottom: 4rpx; }
.risk-desc { font-size: 22rpx; color: #64748b; }

.recommendations { display: flex; flex-direction: column; gap: 12rpx; }
.rec-item { display: flex; gap: 12rpx; padding: 16rpx; background: rgba(15, 23, 42, 0.4); border-radius: 12rpx; }
.rec-number { width: 40rpx; height: 40rpx; background: linear-gradient(135deg, #06b6d4, #0891b2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22rpx; color: #fff; font-weight: 600; flex-shrink: 0; }
.rec-content { flex: 1; }
.rec-title { font-size: 24rpx; font-weight: 600; color: #f8fafc; display: block; margin-bottom: 4rpx; }
.rec-desc { font-size: 22rpx; color: #64748b; }

.data-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; }
.data-item { padding: 16rpx; background: rgba(15, 23, 42, 0.4); border-radius: 12rpx; text-align: center; }
.data-label { font-size: 22rpx; color: #64748b; display: block; margin-bottom: 8rpx; }
.data-value { font-size: 28rpx; font-weight: 600; color: #f8fafc; display: block; }
.data-change { font-size: 20rpx; margin-top: 4rpx; }
.data-change.up { color: #10b981; }
.data-change.down { color: #f43f5e; }

.actions { display: flex; gap: 16rpx; margin-top: 24rpx; }
.btn { flex: 1; padding: 24rpx; border-radius: 12rpx; text-align: center; }
.btn-secondary { background: rgba(30, 41, 59, 0.6); border: 1rpx solid rgba(148, 163, 184, 0.2); }
.btn-secondary text { color: #94a3b8; font-size: 26rpx; }
.btn-primary { background: linear-gradient(135deg, #06b6d4, #0891b2); }
.btn-primary text { color: #fff; font-size: 26rpx; font-weight: 600; }
</style>
