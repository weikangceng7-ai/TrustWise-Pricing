<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @tap="goBack">‹ 返回</view>
      <text class="title">知识图谱</text>
      <text class="desc">企业供应链知识图谱可视化</text>
    </view>

    <view class="enterprise-selector">
      <picker mode="selector" :range="enterpriseList" range-key="name" @change="onEnterpriseChange">
        <view class="selector-btn">
          <text>{{ currentEnterprise?.name || '选择企业' }}</text>
          <text class="arrow">▼</text>
        </view>
      </picker>
    </view>

    <view class="graph-container" v-if="graphData">
      <view class="graph-section">
        <text class="section-title">核心节点</text>
        <view class="nodes-grid">
          <view class="node-card" v-for="(node, i) in coreNodes" :key="i" :class="'type-' + node.type">
            <view class="node-icon">{{ getNodeIcon(node.type) }}</view>
            <view class="node-info">
              <text class="node-name">{{ node.name }}</text>
              <text class="node-type">{{ getNodeTypeName(node.type) }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="graph-section">
        <text class="section-title">关系网络</text>
        <view class="relations-list">
          <view class="relation-item" v-for="(rel, i) in relations" :key="i">
            <view class="relation-source">{{ rel.source }}</view>
            <view class="relation-arrow">{{ rel.type }}</view>
            <view class="relation-target">{{ rel.target }}</view>
          </view>
        </view>
      </view>

      <view class="graph-section">
        <text class="section-title">关键指标</text>
        <view class="metrics-grid">
          <view class="metric-item" v-for="(m, i) in metrics" :key="i">
            <text class="metric-value">{{ m.value }}</text>
            <text class="metric-label">{{ m.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="loading" v-if="loading">
      <text>加载知识图谱...</text>
    </view>

    <view class="empty" v-if="!loading && !graphData">
      <text class="empty-icon">🧠</text>
      <text class="empty-text">请选择企业查看知识图谱</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/utils/api'

const enterpriseList = ref([
  { code: 'yihua', name: '宜化集团' },
  { code: 'luxi', name: '鲁西化工' },
  { code: 'jinzhengda', name: '金正大' }
])

const currentEnterprise = ref(null)
const graphData = ref(null)
const loading = ref(false)

const coreNodes = computed(() => {
  if (!graphData.value?.nodes) return []
  return graphData.value.nodes.slice(0, 6).map(n => ({
    name: n.name || n.label || n.id,
    type: n.type || n.category || 'entity'
  }))
})

const relations = computed(() => {
  if (!graphData.value?.edges) return []
  return graphData.value.edges.slice(0, 8).map(e => ({
    source: e.source?.name || e.from || e.source,
    type: e.type || e.relation || '→',
    target: e.target?.name || e.to || e.target
  }))
})

const metrics = computed(() => {
  if (!graphData.value) return []
  return [
    { label: '节点数量', value: graphData.value.nodes?.length || 0 },
    { label: '关系数量', value: graphData.value.edges?.length || 0 },
    { label: '核心实体', value: graphData.value.coreEntities || '-' },
    { label: '关联企业', value: graphData.value.relatedCompanies || '-' }
  ]
})

const onEnterpriseChange = async (e) => {
  const index = e.detail.value
  currentEnterprise.value = enterpriseList.value[index]
  await fetchGraph()
}

const fetchGraph = async () => {
  if (!currentEnterprise.value) return
  loading.value = true
  try {
    const res = await api.getKnowledgeGraph(currentEnterprise.value.code)
    graphData.value = res
  } catch (e) {
    console.error('获取知识图谱失败:', e)
    uni.showToast({ title: '获取知识图谱失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const getNodeIcon = (type) => {
  const icons = {
    enterprise: '🏭',
    supplier: '📦',
    product: '🛢️',
    location: '📍',
    material: '⚗️',
    market: '📊',
    entity: '🔷'
  }
  return icons[type] || '🔷'
}

const getNodeTypeName = (type) => {
  const names = {
    enterprise: '企业',
    supplier: '供应商',
    product: '产品',
    location: '地点',
    material: '原料',
    market: '市场',
    entity: '实体'
  }
  return names[type] || type
}

const goBack = () => uni.navigateBack()

onMounted(() => {
  currentEnterprise.value = enterpriseList.value[0]
  fetchGraph()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  padding: 32rpx;
}

.header { margin-bottom: 24rpx; }
.back-btn { font-size: 28rpx; color: #06b6d4; margin-bottom: 16rpx; }
.title { font-size: 36rpx; font-weight: 700; color: #f8fafc; }
.desc { font-size: 24rpx; color: #64748b; margin-top: 8rpx; }

.enterprise-selector { margin-bottom: 24rpx; }
.selector-btn { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 24rpx; background: rgba(30, 41, 59, 0.8); border-radius: 12rpx; border: 1rpx solid rgba(148, 163, 184, 0.2); }
.selector-btn text { font-size: 28rpx; color: #f8fafc; }
.arrow { font-size: 20rpx; color: #64748b; }

.graph-container { display: flex; flex-direction: column; gap: 24rpx; }
.graph-section { background: rgba(30, 41, 59, 0.6); border-radius: 16rpx; padding: 24rpx; border: 1rpx solid rgba(148, 163, 184, 0.1); }
.section-title { font-size: 28rpx; font-weight: 600; color: #f8fafc; margin-bottom: 16rpx; }

.nodes-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; }
.node-card { display: flex; align-items: center; gap: 12rpx; padding: 16rpx; background: rgba(15, 23, 42, 0.6); border-radius: 12rpx; border-left: 4rpx solid; }
.node-card.type-enterprise { border-color: #06b6d4; }
.node-card.type-supplier { border-color: #10b981; }
.node-card.type-product { border-color: #f59e0b; }
.node-card.type-location { border-color: #8b5cf6; }
.node-icon { font-size: 28rpx; }
.node-name { font-size: 26rpx; color: #f8fafc; }
.node-type { font-size: 22rpx; color: #64748b; margin-top: 2rpx; }

.relations-list { display: flex; flex-direction: column; gap: 12rpx; }
.relation-item { display: flex; align-items: center; gap: 12rpx; padding: 12rpx 16rpx; background: rgba(15, 23, 42, 0.4); border-radius: 8rpx; }
.relation-source { font-size: 24rpx; color: #06b6d4; }
.relation-arrow { font-size: 22rpx; color: #64748b; padding: 4rpx 12rpx; background: rgba(148, 163, 184, 0.1); border-radius: 4rpx; }
.relation-target { font-size: 24rpx; color: #10b981; }

.metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; }
.metric-item { display: flex; flex-direction: column; align-items: center; padding: 20rpx; background: rgba(15, 23, 42, 0.4); border-radius: 12rpx; }
.metric-value { font-size: 36rpx; font-weight: 700; color: #06b6d4; }
.metric-label { font-size: 22rpx; color: #64748b; margin-top: 8rpx; }

.loading { display: flex; justify-content: center; padding: 80rpx 0; color: #64748b; }
.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 64rpx; margin-bottom: 24rpx; }
.empty-text { font-size: 28rpx; color: #64748b; }
</style>
