<template>
  <view class="page">
    <view class="header">
      <text class="title">定制化企业服务</text>
      <text class="desc">选择企业查看专属价格预测分析</text>
    </view>

    <view class="action-bar">
      <view class="add-btn" @tap="goToImport">
        <text>+ 导入新企业</text>
      </view>
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
      <view class="empty-btn" @tap="goToImport">
        <text>导入新企业</text>
      </view>
    </view>

    <view class="loading" v-if="loading">
      <text>加载中...</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { api } from '@/utils/api'

const enterprises = ref([])
const loading = ref(false)

const fetchData = async () => {
  loading.value = true
  try {
    const res = await api.getEnterprises()
    enterprises.value = res.enterprises || []
  } catch (e) {
    console.error('获取企业列表失败:', e)
    uni.showToast({ title: '获取企业列表失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const goDetail = (code) => {
  uni.navigateTo({ url: `/pages/enterprise/detail?code=${code}` })
}

const goToImport = () => {
  uni.navigateTo({ url: '/pages/enterprise/import' })
}

onMounted(() => fetchData())
onShow(() => fetchData())
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  padding: 32rpx;
  padding-bottom: 200rpx;
}

.header { margin-bottom: 24rpx; }
.title { font-size: 36rpx; font-weight: 700; color: #f8fafc; }
.desc { font-size: 24rpx; color: #64748b; margin-top: 8rpx; }

.action-bar { margin-bottom: 24rpx; }
.add-btn { display: inline-flex; padding: 16rpx 32rpx; background: linear-gradient(135deg, #06b6d4, #0891b2); border-radius: 24rpx; }
.add-btn text { font-size: 28rpx; color: #fff; font-weight: 500; }

.list { display: flex; flex-direction: column; gap: 24rpx; }

.card {
  background: rgba(30, 41, 59, 0.8);
  border-radius: 24rpx;
  padding: 32rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.1);
}

.card-header { display: flex; align-items: center; gap: 16rpx; margin-bottom: 24rpx; }
.icon { width: 72rpx; height: 72rpx; background: linear-gradient(135deg, #06b6d4, #0891b2); border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 36rpx; }
.info { flex: 1; }
.name { font-size: 32rpx; font-weight: 600; color: #f8fafc; }
.location { font-size: 24rpx; color: #64748b; margin-top: 4rpx; }
.arrow { font-size: 40rpx; color: #64748b; }

.stats { display: flex; align-items: center; }
.stat { flex: 1; display: flex; flex-direction: column; align-items: center; }
.stat .value { font-size: 32rpx; font-weight: 600; color: #f8fafc; }
.stat .label { font-size: 22rpx; color: #64748b; margin-top: 4rpx; }
.divider { width: 1rpx; height: 48rpx; background: rgba(148, 163, 184, 0.2); }

.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 24rpx; }
.empty-text { font-size: 32rpx; color: #94a3b8; margin-bottom: 32rpx; }
.empty-btn { padding: 16rpx 48rpx; background: linear-gradient(135deg, #06b6d4, #0891b2); border-radius: 24rpx; }
.empty-btn text { font-size: 28rpx; color: #fff; }

.loading { display: flex; justify-content: center; padding: 80rpx 0; color: #64748b; }
</style>
