<template>
  <view class="page">
    <view class="header">
      <text class="title">定制化企业服务</text>
      <text class="desc">选择企业查看专属价格预测分析</text>
    </view>

    <view class="list" v-if="enterprises.length">
      <view class="card" v-for="item in enterprises" :key="item.id" @tap="goDetail(item.code)">
        <view class="card-header">
          <view class="icon">🏭</view>
          <view class="info">
            <text class="name">{{ item.name }}</text>
            <text class="location">{{ item.location || item.province || '未设置地区' }}</text>
          </view>
          <text class="arrow">›</text>
        </view>
        <view class="stats">
          <view class="stat">
            <text class="value">{{ item.capacity || '-' }}</text>
            <text class="label">产能(万吨)</text>
          </view>
          <view class="divider"></view>
          <view class="stat">
            <text class="value">{{ item.currentStock || '-' }}</text>
            <text class="label">库存(吨)</text>
          </view>
          <view class="divider"></view>
          <view class="stat">
            <text class="value">{{ item.supplierCount || '-' }}</text>
            <text class="label">供应商</text>
          </view>
        </view>
      </view>
    </view>

    <view class="empty" v-else-if="!loading">
      <text class="empty-icon">🏢</text>
      <text class="empty-text">暂无企业数据</text>
      <text class="empty-tip">请在网页端添加企业信息</text>
    </view>

    <view class="loading" v-if="loading">
      <text>加载中...</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/utils/api'

const enterprises = ref([])
const loading = ref(false)

const fetchData = async () => {
  loading.value = true
  try {
    const res = await api.getEnterprises()
    enterprises.value = res.enterprises || []
  } catch (e) {
    uni.showToast({ title: '获取企业列表失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const goDetail = (code) => {
  uni.navigateTo({ url: `/pages/enterprise/detail?code=${code}` })
}

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

.list { display: flex; flex-direction: column; gap: 24rpx; }

.card {
  background: rgba(30, 41, 59, 0.8);
  border-radius: 24rpx;
  padding: 32rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.1);
  border-left: 6rpx solid #06b6d4;
}

.card-header { display: flex; align-items: center; gap: 20rpx; margin-bottom: 24rpx; }
.icon { width: 80rpx; height: 80rpx; border-radius: 20rpx; background: rgba(6, 182, 212, 0.15); display: flex; align-items: center; justify-content: center; font-size: 36rpx; }
.name { font-size: 32rpx; font-weight: 600; color: #f8fafc; }
.location { font-size: 24rpx; color: #64748b; margin-top: 4rpx; }
.arrow { font-size: 40rpx; color: #64748b; margin-left: auto; }

.stats { display: flex; align-items: center; padding: 20rpx 0; border-top: 1rpx solid rgba(148, 163, 184, 0.1); border-bottom: 1rpx solid rgba(148, 163, 184, 0.1); }
.stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.value { font-size: 32rpx; font-weight: 700; color: #06b6d4; }
.label { font-size: 22rpx; color: #64748b; }
.divider { width: 1rpx; height: 48rpx; background: rgba(148, 163, 184, 0.2); }

.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 64rpx; margin-bottom: 32rpx; }
.empty-text { font-size: 32rpx; color: #94a3b8; margin-bottom: 16rpx; }
.empty-tip { font-size: 24rpx; color: #64748b; }

.loading { display: flex; justify-content: center; padding: 80rpx 0; color: #64748b; }
</style>
