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

    <view class="graph-visual" v-if="graphData && graphData.nodes && graphData.nodes.length">
      <canvas 
        canvas-id="graphCanvas" 
        id="graphCanvas"
        class="graph-canvas"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      ></canvas>
      <view class="graph-legend">
        <view class="legend-item">
          <view class="legend-dot enterprise"></view>
          <text>企业</text>
        </view>
        <view class="legend-item">
          <view class="legend-dot supply"></view>
          <text>供给因子</text>
        </view>
        <view class="legend-item">
          <view class="legend-dot demand"></view>
          <text>需求因子</text>
        </view>
        <view class="legend-item">
          <view class="legend-dot external"></view>
          <text>外部因子</text>
        </view>
      </view>
    </view>

    <view class="graph-container" v-if="graphData && graphData.nodes && graphData.nodes.length">
      <view class="graph-section">
        <view class="section-header">
          <text class="section-title">🔷 核心节点</text>
          <text class="section-count">共 {{ graphData.nodes.length }} 个</text>
        </view>
        <view class="nodes-grid">
          <view class="node-card" v-for="(node, i) in displayNodes" :key="i" :class="'type-' + getNodeCategory(node)" @tap="showNodeDetail(node)">
            <view class="node-icon">{{ getNodeIcon(node) }}</view>
            <view class="node-info">
              <text class="node-name">{{ node.label || node.id }}</text>
              <text class="node-type">{{ getNodeTypeName(node) }}</text>
            </view>
            <view class="node-weight" v-if="node.properties?.baseWeight">
              <text>{{ (node.properties.baseWeight * 100).toFixed(0) }}%</text>
            </view>
          </view>
        </view>
        <view class="show-more" v-if="graphData.nodes.length > 6" @tap="showAllNodes = !showAllNodes">
          <text>{{ showAllNodes ? '收起' : `展开全部 (${graphData.nodes.length}个)` }}</text>
        </view>
      </view>

      <view class="graph-section">
        <view class="section-header">
          <text class="section-title">🔗 关系网络</text>
          <text class="section-count">共 {{ graphData.links?.length || 0 }} 条</text>
        </view>
        <view class="relations-list">
          <view class="relation-item" v-for="(link, i) in displayLinks" :key="i">
            <view class="relation-node source">
              <text class="node-label">{{ getNodeLabel(link.source) }}</text>
            </view>
            <view class="relation-line">
              <view class="line-arrow"></view>
              <text class="line-type">{{ getRelationType(link.type) }}</text>
            </view>
            <view class="relation-node target">
              <text class="node-label">{{ getNodeLabel(link.target) }}</text>
            </view>
            <view class="relation-weight" v-if="link.weight">
              <text>{{ (link.weight * 100).toFixed(0) }}%</text>
            </view>
          </view>
        </view>
        <view class="show-more" v-if="(graphData.links?.length || 0) > 8" @tap="showAllLinks = !showAllLinks">
          <text>{{ showAllLinks ? '收起' : `展开全部 (${graphData.links.length}条)` }}</text>
        </view>
      </view>

      <view class="graph-section">
        <view class="section-header">
          <text class="section-title">📊 关键指标</text>
        </view>
        <view class="metrics-grid">
          <view class="metric-item">
            <text class="metric-value">{{ graphData.nodes?.length || 0 }}</text>
            <text class="metric-label">节点数量</text>
          </view>
          <view class="metric-item">
            <text class="metric-value">{{ graphData.links?.length || 0 }}</text>
            <text class="metric-label">关系数量</text>
          </view>
          <view class="metric-item">
            <text class="metric-value">{{ supplyFactorCount }}</text>
            <text class="metric-label">供给因子</text>
          </view>
          <view class="metric-item">
            <text class="metric-value">{{ demandFactorCount }}</text>
            <text class="metric-label">需求因子</text>
          </view>
        </view>
      </view>

      <view class="graph-section" v-if="enterpriseInfo">
        <view class="section-header">
          <text class="section-title">🏭 企业信息</text>
        </view>
        <view class="enterprise-info">
          <view class="info-item" v-if="enterpriseInfo.location">
            <text class="info-label">所在地区</text>
            <text class="info-value">{{ enterpriseInfo.location }}</text>
          </view>
          <view class="info-item" v-if="enterpriseInfo.capacity">
            <text class="info-label">年产能</text>
            <text class="info-value">{{ enterpriseInfo.capacity }} 万吨</text>
          </view>
          <view class="info-item" v-if="enterpriseInfo.transportMode">
            <text class="info-label">运输方式</text>
            <text class="info-value">{{ getTransportMode(enterpriseInfo.transportMode) }}</text>
          </view>
          <view class="info-item" v-if="enterpriseInfo.inventoryStrategy">
            <text class="info-label">库存策略</text>
            <text class="info-value">{{ getStrategy(enterpriseInfo.inventoryStrategy) }}</text>
          </view>
        </view>
        <view class="enterprise-desc" v-if="enterpriseInfo.description">
          <text>{{ enterpriseInfo.description }}</text>
        </view>
      </view>
    </view>

    <view class="loading" v-if="loading">
      <text>加载知识图谱...</text>
    </view>

    <view class="empty" v-if="!loading && (!graphData || !graphData.nodes || !graphData.nodes.length)">
      <text class="empty-icon">🧠</text>
      <text class="empty-text">请选择企业查看知识图谱</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { api } from '@/utils/api'

const enterpriseList = ref([
  { code: 'yihua', name: '宜化集团' },
  { code: 'luxi', name: '鲁西化工' },
  { code: 'jinzhengda', name: '金正大' }
])

const currentEnterprise = ref(null)
const graphData = ref(null)
const loading = ref(false)
const showAllNodes = ref(false)
const showAllLinks = ref(false)
const canvasWidth = ref(350)
const canvasHeight = ref(300)

const enterpriseInfo = computed(() => {
  if (!graphData.value?.nodes) return null
  const enterpriseNode = graphData.value.nodes.find(n => n.type === 'Enterprise')
  return enterpriseNode?.properties || null
})

const displayNodes = computed(() => {
  if (!graphData.value?.nodes) return []
  return showAllNodes.value ? graphData.value.nodes : graphData.value.nodes.slice(0, 6)
})

const displayLinks = computed(() => {
  if (!graphData.value?.links) return []
  return showAllLinks.value ? graphData.value.links : graphData.value.links.slice(0, 8)
})

const supplyFactorCount = computed(() => {
  if (!graphData.value?.nodes) return 0
  return graphData.value.nodes.filter(n => n.properties?.category === 'supply').length
})

const demandFactorCount = computed(() => {
  if (!graphData.value?.nodes) return 0
  return graphData.value.nodes.filter(n => n.properties?.category === 'demand').length
})

const nodeMap = computed(() => {
  const map = new Map()
  if (graphData.value?.nodes) {
    graphData.value.nodes.forEach(n => map.set(n.id, n))
  }
  return map
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
    await nextTick()
    drawGraph()
  } catch (e) {
    console.error('获取知识图谱失败:', e)
    uni.showToast({ title: '获取知识图谱失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const getNodeCategory = (node) => {
  if (node.type === 'Enterprise') return 'enterprise'
  return node.properties?.category || 'external'
}

const getNodeIcon = (node) => {
  if (node.type === 'Enterprise') return '🏭'
  const category = node.properties?.category
  const icons = {
    supply: '📦',
    demand: '🏭',
    external: '🌐',
    internal: '⚙️'
  }
  return icons[category] || '🔷'
}

const getNodeTypeName = (node) => {
  if (node.type === 'Enterprise') return '企业'
  const category = node.properties?.category
  const names = {
    supply: '供给因子',
    demand: '需求因子',
    external: '外部因子',
    internal: '内部因子'
  }
  return names[category] || '因子'
}

const getNodeLabel = (id) => {
  const node = nodeMap.value.get(id)
  return node?.label || node?.id || id
}

const getRelationType = (type) => {
  const types = {
    'HAS_FACTOR': '影响',
    'INFLUENCES': '作用于',
    'SUPPLIES_TO': '供应',
    'DEMANDS_FROM': '需求',
    'CORRELATES_WITH': '关联'
  }
  return types[type] || type
}

const getTransportMode = (mode) => {
  const modes = { water: '水运', rail: '铁路', road: '公路' }
  return modes[mode] || mode
}

const getStrategy = (strategy) => {
  const strategies = { aggressive: '激进型', moderate: '稳健型', conservative: '保守型' }
  return strategies[strategy] || strategy
}

const showNodeDetail = (node) => {
  const info = []
  info.push(`名称: ${node.label || node.id}`)
  info.push(`类型: ${getNodeTypeName(node)}`)
  if (node.properties?.baseWeight) {
    info.push(`权重: ${(node.properties.baseWeight * 100).toFixed(1)}%`)
  }
  if (node.properties?.trend) {
    info.push(`趋势: ${node.properties.trend === 'up' ? '上升' : node.properties.trend === 'down' ? '下降' : '稳定'}`)
  }
  if (node.properties?.description) {
    info.push(`描述: ${node.properties.description}`)
  }
  
  uni.showModal({
    title: '节点详情',
    content: info.join('\n'),
    showCancel: false
  })
}

const drawGraph = () => {
  if (!graphData.value?.nodes || !graphData.value.nodes.length) return
  
  const ctx = uni.createCanvasContext('graphCanvas')
  const width = canvasWidth.value
  const height = canvasHeight.value
  const centerX = width / 2
  const centerY = height / 2
  
  ctx.setFillStyle('#0f172a')
  ctx.fillRect(0, 0, width, height)
  
  const nodes = graphData.value.nodes
  const links = graphData.value.links || []
  
  const positions = []
  const enterpriseNode = nodes.find(n => n.type === 'Enterprise')
  const factorNodes = nodes.filter(n => n.type !== 'Enterprise')
  
  if (enterpriseNode) {
    positions.push({ id: enterpriseNode.id, x: centerX, y: centerY, r: 25 })
  }
  
  const angleStep = (2 * Math.PI) / Math.max(factorNodes.length, 1)
  const radius = Math.min(width, height) * 0.35
  factorNodes.forEach((node, i) => {
    const angle = angleStep * i - Math.PI / 2
    positions.push({
      id: node.id,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      r: 15
    })
  })
  
  const getPos = (id) => positions.find(p => p.id === id) || { x: 0, y: 0 }
  
  ctx.setStrokeStyle('rgba(148, 163, 184, 0.3)')
  ctx.setLineWidth(1)
  links.forEach(link => {
    const source = getPos(link.source)
    const target = getPos(link.target)
    ctx.beginPath()
    ctx.moveTo(source.x, source.y)
    ctx.lineTo(target.x, target.y)
    ctx.stroke()
  })
  
  positions.forEach((pos, i) => {
    const node = nodes.find(n => n.id === pos.id)
    const category = getNodeCategory(node)
    
    const colors = {
      enterprise: '#06b6d4',
      supply: '#10b981',
      demand: '#f59e0b',
      external: '#8b5cf6',
      internal: '#ec4899'
    }
    const color = colors[category] || '#64748b'
    
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, pos.r, 0, 2 * Math.PI)
    ctx.setFillStyle(color)
    ctx.fill()
    
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, pos.r, 0, 2 * Math.PI)
    ctx.setStrokeStyle('rgba(255, 255, 255, 0.3)')
    ctx.setLineWidth(2)
    ctx.stroke()
  })
  
  ctx.draw()
}

const onTouchStart = () => {}
const onTouchMove = () => {}
const onTouchEnd = () => {}

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

.graph-visual { background: rgba(30, 41, 59, 0.6); border-radius: 16rpx; padding: 16rpx; margin-bottom: 24rpx; border: 1rpx solid rgba(148, 163, 184, 0.1); }
.graph-canvas { width: 100%; height: 300px; }
.graph-legend { display: flex; justify-content: center; gap: 24rpx; margin-top: 16rpx; flex-wrap: wrap; }
.legend-item { display: flex; align-items: center; gap: 8rpx; }
.legend-dot { width: 16rpx; height: 16rpx; border-radius: 50%; }
.legend-dot.enterprise { background: #06b6d4; }
.legend-dot.supply { background: #10b981; }
.legend-dot.demand { background: #f59e0b; }
.legend-dot.external { background: #8b5cf6; }
.legend-item text { font-size: 22rpx; color: #94a3b8; }

.graph-container { display: flex; flex-direction: column; gap: 24rpx; }
.graph-section { background: rgba(30, 41, 59, 0.6); border-radius: 16rpx; padding: 24rpx; border: 1rpx solid rgba(148, 163, 184, 0.1); }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #f8fafc; }
.section-count { font-size: 22rpx; color: #64748b; }

.nodes-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; }
.node-card { display: flex; align-items: center; gap: 12rpx; padding: 16rpx; background: rgba(15, 23, 42, 0.6); border-radius: 12rpx; border-left: 4rpx solid; }
.node-card.type-enterprise { border-color: #06b6d4; background: rgba(6, 182, 212, 0.1); }
.node-card.type-supply { border-color: #10b981; }
.node-card.type-demand { border-color: #f59e0b; }
.node-card.type-external { border-color: #8b5cf6; }
.node-icon { font-size: 28rpx; }
.node-info { flex: 1; min-width: 0; }
.node-name { font-size: 26rpx; color: #f8fafc; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.node-type { font-size: 22rpx; color: #64748b; margin-top: 2rpx; }
.node-weight { padding: 4rpx 12rpx; background: rgba(6, 182, 212, 0.2); border-radius: 8rpx; }
.node-weight text { font-size: 20rpx; color: #06b6d4; }

.show-more { text-align: center; padding: 16rpx; margin-top: 12rpx; }
.show-more text { font-size: 24rpx; color: #06b6d4; }

.relations-list { display: flex; flex-direction: column; gap: 12rpx; }
.relation-item { display: flex; align-items: center; gap: 8rpx; padding: 12rpx 16rpx; background: rgba(15, 23, 42, 0.4); border-radius: 8rpx; }
.relation-node { flex: 1; min-width: 0; }
.relation-node.source text { color: #06b6d4; }
.relation-node.target text { color: #10b981; }
.node-label { font-size: 24rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.relation-line { display: flex; flex-direction: column; align-items: center; padding: 0 8rpx; }
.line-arrow { width: 0; height: 0; border-left: 8rpx solid transparent; border-right: 8rpx solid transparent; border-top: 8rpx solid #64748b; }
.line-type { font-size: 18rpx; color: #64748b; margin-top: 4rpx; }
.relation-weight { padding: 4rpx 8rpx; background: rgba(148, 163, 184, 0.1); border-radius: 4rpx; }
.relation-weight text { font-size: 18rpx; color: #94a3b8; }

.metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; }
.metric-item { display: flex; flex-direction: column; align-items: center; padding: 20rpx; background: rgba(15, 23, 42, 0.4); border-radius: 12rpx; }
.metric-value { font-size: 36rpx; font-weight: 700; color: #06b6d4; }
.metric-label { font-size: 22rpx; color: #64748b; margin-top: 8rpx; }

.enterprise-info { display: flex; flex-direction: column; gap: 12rpx; margin-bottom: 16rpx; }
.info-item { display: flex; justify-content: space-between; align-items: center; padding: 12rpx 16rpx; background: rgba(15, 23, 42, 0.4); border-radius: 8rpx; }
.info-label { font-size: 24rpx; color: #64748b; }
.info-value { font-size: 24rpx; color: #f8fafc; }
.enterprise-desc { padding: 16rpx; background: rgba(15, 23, 42, 0.4); border-radius: 8rpx; }
.enterprise-desc text { font-size: 24rpx; color: #94a3b8; line-height: 1.6; }

.loading { display: flex; justify-content: center; padding: 80rpx 0; color: #64748b; }
.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 64rpx; margin-bottom: 24rpx; }
.empty-text { font-size: 28rpx; color: #64748b; }
</style>
