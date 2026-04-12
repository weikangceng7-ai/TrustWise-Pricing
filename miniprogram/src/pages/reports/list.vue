<template>
  <view class="page">
    <view class="header">
      <text class="header-title">采购报告</text>
      <text class="header-desc">查看历史采购分析报告</text>
    </view>

    <view class="filter-bar">
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

    <view class="report-list" v-if="reports.length > 0">
      <view 
        class="report-card" 
        v-for="item in reports" 
        :key="item.id"
        @tap="viewReport(item)"
      >
        <view class="report-header">
          <view class="report-type" :class="'type-' + item.type">
            <text>{{ getTypeText(item.type) }}</text>
          </view>
          <text class="report-date">{{ formatDate(item.createdAt) }}</text>
        </view>
        
        <text class="report-title">{{ item.title }}</text>
        
        <view class="report-meta">
          <view class="meta-item">
            <text class="meta-label">企业:</text>
            <text class="meta-value">{{ item.enterprise || '全部' }}</text>
          </view>
          <view class="meta-item">
            <text class="meta-label">状态:</text>
            <text class="meta-value status" :class="'status-' + item.status">
              {{ getStatusText(item.status) }}
            </text>
          </view>
        </view>

        <view class="report-summary" v-if="item.summary">
          <text>{{ item.summary }}</text>
        </view>
      </view>
    </view>

    <view class="empty-state" v-else-if="!loading">
      <view class="empty-icon">
        <text>📋</text>
      </view>
      <text class="empty-text">暂无报告数据</text>
    </view>

    <view class="loading-state" v-if="loading">
      <text class="loading-text">加载中...</text>
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

const onTypeChange = (e) => {
  typeIndex.value = e.detail.value
  fetchReports()
}

const onDateChange = (e) => {
  selectedDate.value = e.detail.value
  fetchReports()
}

const fetchReports = async () => {
  loading.value = true
  try {
    const params = {}
    if (typeIndex.value > 0) {
      params.type = typeOptions[typeIndex.value]
    }
    if (selectedDate.value) {
      params.date = selectedDate.value
    }
    
    const res = await api.getReports(params)
    reports.value = res.reports || []
  } catch (e) {
    console.error('获取报告列表失败:', e)
  } finally {
    loading.value = false
  }
}

const getTypeText = (type) => {
  const types = {
    weekly: '周报',
    monthly: '月报',
    quarterly: '季报',
    yearly: '年报',
    special: '专题'
  }
  return types[type] || type || '报告'
}

const getStatusText = (status) => {
  const statuses = {
    draft: '草稿',
    pending: '待审核',
    published: '已发布',
    archived: '已归档'
  }
  return statuses[status] || status || '未知'
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const viewReport = (item) => {
  uni.showToast({
    title: '报告详情开发中',
    icon: 'none'
  })
}

onMounted(() => {
  fetchReports()
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
  margin-bottom: 32rpx;
}

.header-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #f8fafc;
  display: block;
}

.header-desc {
  font-size: 24rpx;
  color: #64748b;
  margin-top: 8rpx;
  display: block;
}

.filter-bar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 24rpx;
  background: rgba(30, 41, 59, 0.6);
  border-radius: 12rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.1);
}

.filter-item text {
  font-size: 26rpx;
  color: #94a3b8;
}

.filter-item .arrow {
  font-size: 20rpx;
  color: #64748b;
}

.report-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.report-card {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
  border-radius: 24rpx;
  padding: 32rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.1);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.report-type {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.type-weekly { background: rgba(6, 182, 212, 0.2); }
.type-weekly text { color: #06b6d4; }
.type-monthly { background: rgba(139, 92, 246, 0.2); }
.type-monthly text { color: #8b5cf6; }
.type-quarterly { background: rgba(245, 158, 11, 0.2); }
.type-quarterly text { color: #f59e0b; }
.type-yearly { background: rgba(16, 185, 129, 0.2); }
.type-yearly text { color: #10b981; }
.type-special { background: rgba(244, 63, 94, 0.2); }
.type-special text { color: #f43f5e; }

.report-date {
  font-size: 24rpx;
  color: #64748b;
}

.report-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #f8fafc;
  margin-bottom: 16rpx;
  display: block;
}

.report-meta {
  display: flex;
  gap: 32rpx;
  margin-bottom: 16rpx;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.meta-label {
  font-size: 24rpx;
  color: #64748b;
}

.meta-value {
  font-size: 24rpx;
  color: #94a3b8;
}

.meta-value.status-published {
  color: #10b981;
}

.meta-value.status-draft {
  color: #f59e0b;
}

.report-summary {
  padding-top: 16rpx;
  border-top: 1rpx solid rgba(148, 163, 184, 0.1);
}

.report-summary text {
  font-size: 26rpx;
  color: #64748b;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64rpx;
  margin-bottom: 32rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #94a3b8;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 80rpx 0;
}

.loading-text {
  color: #64748b;
  font-size: 28rpx;
}
</style>
