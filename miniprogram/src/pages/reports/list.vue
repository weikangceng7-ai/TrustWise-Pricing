<template>
  <view class="page">
    <view class="header">
      <text class="title">采购报告</text>
      <text class="desc">查看历史采购分析报告</text>
    </view>

    <view class="filters">
      <picker mode="selector" :range="typeOptions" @change="onTypeChange">
        <view class="filter-item">
          <text>{{ typeOptions[typeIndex] }}</text>
          <text class="arrow">▼</text>
        </view>
      </picker>
      <picker mode="date" @change="onDateChange">
        <view class="filter-item">
          <text>{{ selectedDate || '选择日期' }}</text>
          <text class="arrow">▼</text>
        </view>
      </picker>
    </view>

    <view class="list" v-if="reports.length">
      <view class="card" v-for="item in reports" :key="item.id" @tap="viewReport(item)">
        <view class="card-header">
          <view class="type-tag" :class="'type-' + item.type">{{ getTypeText(item.type) }}</view>
          <text class="date">{{ formatDate(item.createdAt) }}</text>
        </view>
        <text class="card-title">{{ item.title }}</text>
        <view class="meta">
          <text class="meta-item">企业: {{ item.enterprise || '全部' }}</text>
          <text class="meta-item" :class="'status-' + item.status">{{ getStatusText(item.status) }}</text>
        </view>
        <text class="summary" v-if="item.summary">{{ item.summary }}</text>
      </view>
    </view>

    <view class="empty" v-else-if="!loading">
      <text class="empty-icon">📋</text>
      <text class="empty-text">暂无报告数据</text>
    </view>

    <view class="loading" v-if="loading">
      <text>加载中...</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/utils/api'

const reports = ref([])
const loading = ref(false)
const typeIndex = ref(0)
const selectedDate = ref('')
const typeOptions = ['全部类型', '周报', '月报', '季报', '年报', '专题报告']

const onTypeChange = (e) => { typeIndex.value = e.detail.value; fetchData() }
const onDateChange = (e) => { selectedDate.value = e.detail.value; fetchData() }

const fetchData = async () => {
  loading.value = true
  try {
    const params = {}
    if (typeIndex.value > 0) params.type = typeOptions[typeIndex.value]
    if (selectedDate.value) params.date = selectedDate.value
    const res = await api.getReports(params)
    reports.value = res.reports || []
  } catch (e) {
    console.error('获取报告列表失败:', e)
  } finally {
    loading.value = false
  }
}

const getTypeText = (type) => ({ weekly: '周报', monthly: '月报', quarterly: '季报', yearly: '年报', special: '专题' }[type] || type || '报告')
const getStatusText = (status) => ({ draft: '草稿', pending: '待审核', published: '已发布', archived: '已归档' }[status] || status || '未知')
const formatDate = (dateStr) => { if (!dateStr) return ''; const d = new Date(dateStr); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const viewReport = (item) => uni.navigateTo({ url: `/pages/reports/detail?id=${item.id}` })

onMounted(() => fetchData())
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  padding: 32rpx;
  padding-bottom: 200rpx;
}

.header { margin-bottom: 32rpx; }
.title { font-size: 36rpx; font-weight: 700; color: #f8fafc; }
.desc { font-size: 24rpx; color: #64748b; margin-top: 8rpx; }

.filters { display: flex; gap: 16rpx; margin-bottom: 32rpx; }
.filter-item { display: flex; align-items: center; gap: 8rpx; padding: 16rpx 24rpx; background: rgba(30, 41, 59, 0.6); border-radius: 12rpx; border: 1rpx solid rgba(148, 163, 184, 0.1); }
.filter-item text { font-size: 26rpx; color: #94a3b8; }
.arrow { font-size: 20rpx; color: #64748b; }

.list { display: flex; flex-direction: column; gap: 24rpx; }

.card {
  background: rgba(30, 41, 59, 0.8);
  border-radius: 24rpx;
  padding: 32rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.1);
}

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.type-tag { padding: 8rpx 16rpx; border-radius: 8rpx; font-size: 22rpx; }
.type-weekly { background: rgba(6, 182, 212, 0.2); color: #06b6d4; }
.type-monthly { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
.type-quarterly { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.type-yearly { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.type-special { background: rgba(244, 63, 94, 0.2); color: #f43f5e; }
.date { font-size: 24rpx; color: #64748b; }

.card-title { font-size: 32rpx; font-weight: 600; color: #f8fafc; margin-bottom: 16rpx; }
.meta { display: flex; gap: 32rpx; margin-bottom: 16rpx; }
.meta-item { font-size: 24rpx; color: #94a3b8; }
.status-published { color: #10b981; }
.status-draft { color: #f59e0b; }

.summary {
  padding-top: 16rpx;
  border-top: 1rpx solid rgba(148, 163, 184, 0.1);
  font-size: 26rpx;
  color: #64748b;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 64rpx; margin-bottom: 32rpx; }
.empty-text { font-size: 32rpx; color: #94a3b8; }
.loading { display: flex; justify-content: center; padding: 80rpx 0; color: #64748b; }
</style>
