<template>
  <view class="page">
    <view class="header">
      <text class="header-title">定制化企业服务</text>
      <text class="header-desc">选择企业查看专属价格预测分析</text>
    </view>

    <view class="enterprise-list" v-if="enterprises.length > 0">
      <view 
        class="enterprise-card" 
        v-for="item in enterprises" 
        :key="item.id"
        :class="'border-' + item.tailwindColor"
        @tap="goToDetail(item.code)"
      >
        <view class="card-header">
          <view class="enterprise-icon" :class="'bg-' + item.tailwindColor">
            <text>🏭</text>
          </view>
          <view class="enterprise-info">
            <text class="enterprise-name">{{ item.name }}</text>
            <text class="enterprise-location">{{ item.location || item.province || '未设置地区' }}</text>
          </view>
          <view class="arrow">
            <text>›</text>
          </view>
        </view>
        
        <view class="card-stats">
          <view class="stat-item">
            <text class="stat-value" :class="'text-' + item.tailwindColor">{{ item.capacity || '-' }}</text>
            <text class="stat-label">产能(万吨)</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-value" :class="'text-' + item.tailwindColor">{{ item.currentStock || '-' }}</text>
            <text class="stat-label">库存(吨)</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-value" :class="'text-' + item.tailwindColor">{{ item.supplierCount || '-' }}</text>
            <text class="stat-label">供应商</text>
          </view>
        </view>

        <view class="card-desc" v-if="item.shortDescription">
          <text>{{ item.shortDescription }}</text>
        </view>
      </view>
    </view>

    <view class="empty-state" v-else-if="!loading">
      <view class="empty-icon">
        <text>🏢</text>
      </view>
      <text class="empty-text">暂无企业数据</text>
      <text class="empty-tip">请在网页端添加企业信息</text>
    </view>

    <view class="loading-state" v-if="loading">
      <text class="loading-text">加载中...</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/utils/api'

const enterprises = ref([])
const loading = ref(false)

const fetchEnterprises = async () => {
  loading.value = true
  try {
    const res = await api.getEnterprises()
    enterprises.value = res.enterprises || []
  } catch (e) {
    console.error('获取企业列表失败:', e)
    uni.showToast({
      title: '获取企业列表失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

const goToDetail = (code) => {
  uni.navigateTo({
    url: `/pages/enterprise/detail?code=${code}`
  })
}

onMounted(() => {
  fetchEnterprises()
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

.enterprise-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.enterprise-card {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
  border-radius: 24rpx;
  padding: 32rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.1);
}

.border-cyan { border-left: 6rpx solid #06b6d4; }
.border-violet { border-left: 6rpx solid #8b5cf6; }
.border-amber { border-left: 6rpx solid #f59e0b; }
.border-emerald { border-left: 6rpx solid #10b981; }
.border-rose { border-left: 6rpx solid #f43f5e; }
.border-blue { border-left: 6rpx solid #3b82f6; }

.card-header {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.enterprise-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
}

.bg-cyan { background: rgba(6, 182, 212, 0.15); }
.bg-violet { background: rgba(139, 92, 246, 0.15); }
.bg-amber { background: rgba(245, 158, 11, 0.15); }
.bg-emerald { background: rgba(16, 185, 129, 0.15); }
.bg-rose { background: rgba(244, 63, 94, 0.15); }
.bg-blue { background: rgba(59, 130, 246, 0.15); }

.enterprise-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.enterprise-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #f8fafc;
}

.enterprise-location {
  font-size: 24rpx;
  color: #64748b;
}

.arrow {
  font-size: 40rpx;
  color: #64748b;
}

.card-stats {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-top: 1rpx solid rgba(148, 163, 184, 0.1);
  border-bottom: 1rpx solid rgba(148, 163, 184, 0.1);
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stat-value {
  font-size: 32rpx;
  font-weight: 700;
}

.text-cyan { color: #06b6d4; }
.text-violet { color: #8b5cf6; }
.text-amber { color: #f59e0b; }
.text-emerald { color: #10b981; }
.text-rose { color: #f43f5e; }
.text-blue { color: #3b82f6; }

.stat-label {
  font-size: 22rpx;
  color: #64748b;
}

.stat-divider {
  width: 1rpx;
  height: 48rpx;
  background: rgba(148, 163, 184, 0.2);
}

.card-desc {
  margin-top: 20rpx;
}

.card-desc text {
  font-size: 24rpx;
  color: #94a3b8;
  line-height: 1.5;
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
  margin-bottom: 16rpx;
}

.empty-tip {
  font-size: 24rpx;
  color: #64748b;
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
