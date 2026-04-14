<template>
  <view class="page">
    <view class="header">
      <view class="back-btn" @tap="goBack">‹ 返回</view>
      <text class="title">企业导入</text>
      <text class="desc">导入新的企业信息进行分析</text>
    </view>

    <view class="form-section">
      <text class="section-title">企业基本信息</text>
      
      <view class="form-item">
        <text class="label">企业代码 *</text>
        <input class="input" v-model="form.code" placeholder="如: HX001" />
      </view>
      
      <view class="form-item">
        <text class="label">企业名称 *</text>
        <input class="input" v-model="form.name" placeholder="请输入企业名称" />
      </view>
      
      <view class="form-item">
        <text class="label">所在地区</text>
        <input class="input" v-model="form.location" placeholder="如: 湖北省宜昌市" />
      </view>
      
      <view class="form-item">
        <text class="label">年产能(万吨)</text>
        <input class="input" v-model="form.capacity" type="number" placeholder="请输入年产能" />
      </view>
      
      <view class="form-item">
        <text class="label">运输方式</text>
        <picker mode="selector" :range="transportOptions" @change="onTransportChange">
          <view class="picker-btn">
            <text>{{ transportOptions[transportIndex] || '请选择' }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="form-section">
      <text class="section-title">库存信息</text>
      
      <view class="form-item">
        <text class="label">当前库存(吨)</text>
        <input class="input" v-model="form.currentStock" type="number" placeholder="请输入当前库存" />
      </view>
      
      <view class="form-item">
        <text class="label">最大仓储能力(吨)</text>
        <input class="input" v-model="form.maxCapacity" type="number" placeholder="请输入最大仓储能力" />
      </view>
      
      <view class="form-item">
        <text class="label">安全库存天数</text>
        <input class="input" v-model="form.safetyDays" type="number" placeholder="请输入安全库存天数" />
      </view>
      
      <view class="form-item">
        <text class="label">日均消耗量(吨)</text>
        <input class="input" v-model="form.avgConsumption" type="number" placeholder="请输入日均消耗量" />
      </view>
      
      <view class="form-item">
        <text class="label">库存策略</text>
        <picker mode="selector" :range="strategyOptions" @change="onStrategyChange">
          <view class="picker-btn">
            <text>{{ strategyOptions[strategyIndex] || '请选择' }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="form-section">
      <text class="section-title">其他信息</text>
      
      <view class="form-item">
        <text class="label">距港口距离(公里)</text>
        <input class="input" v-model="form.portDistance" type="number" placeholder="请输入距港口距离" />
      </view>
      
      <view class="form-item">
        <text class="label">供应商数量</text>
        <input class="input" v-model="form.supplierCount" type="number" placeholder="请输入供应商数量" />
      </view>
      
      <view class="form-item">
        <text class="label">企业描述</text>
        <textarea class="textarea" v-model="form.description" placeholder="请输入企业描述" />
      </view>
    </view>

    <view class="actions">
      <view class="btn btn-secondary" @tap="resetForm">
        <text>重置</text>
      </view>
      <view class="btn btn-primary" @tap="submitForm">
        <text>提交</text>
      </view>
    </view>

    <view class="batch-section">
      <text class="section-title">批量导入</text>
      <view class="batch-tips">
        <text>支持JSON格式批量导入企业数据</text>
      </view>
      <view class="btn btn-outline" @tap="showBatchImport">
        <text>批量导入</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { api } from '@/utils/api'

const form = ref({
  code: '',
  name: '',
  location: '',
  capacity: '',
  transportMode: '',
  currentStock: '',
  maxCapacity: '',
  safetyDays: '',
  avgConsumption: '',
  inventoryStrategy: 'moderate',
  portDistance: '',
  supplierCount: '',
  description: ''
})

const transportOptions = ['水运', '铁路', '公路']
const transportIndex = ref(0)
const strategyOptions = ['激进型', '稳健型', '保守型']
const strategyIndex = ref(1)

const onTransportChange = (e) => {
  transportIndex.value = e.detail.value
  form.value.transportMode = ['water', 'rail', 'road'][e.detail.value]
}

const onStrategyChange = (e) => {
  strategyIndex.value = e.detail.value
  form.value.inventoryStrategy = ['aggressive', 'moderate', 'conservative'][e.detail.value]
}

const resetForm = () => {
  form.value = {
    code: '',
    name: '',
    location: '',
    capacity: '',
    transportMode: '',
    currentStock: '',
    maxCapacity: '',
    safetyDays: '',
    avgConsumption: '',
    inventoryStrategy: 'moderate',
    portDistance: '',
    supplierCount: '',
    description: ''
  }
  transportIndex.value = 0
  strategyIndex.value = 1
  uni.showToast({ title: '已重置', icon: 'none' })
}

const submitForm = async () => {
  if (!form.value.code || !form.value.name) {
    uni.showToast({ title: '请填写必填项', icon: 'none' })
    return
  }

  try {
    const data = {
      code: form.value.code,
      name: form.value.name,
      location: form.value.location || null,
      capacity: form.value.capacity ? Number(form.value.capacity) : null,
      transportMode: form.value.transportMode || null,
      currentStock: form.value.currentStock ? Number(form.value.currentStock) : null,
      maxCapacity: form.value.maxCapacity ? Number(form.value.maxCapacity) : null,
      safetyDays: form.value.safetyDays ? Number(form.value.safetyDays) : null,
      avgConsumption: form.value.avgConsumption ? Number(form.value.avgConsumption) : null,
      inventoryStrategy: form.value.inventoryStrategy,
      portDistance: form.value.portDistance ? Number(form.value.portDistance) : null,
      supplierCount: form.value.supplierCount ? Number(form.value.supplierCount) : null,
      description: form.value.description || null,
      isActive: true
    }

    await api.createEnterprise(data)
    uni.showToast({ title: '添加成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1500)
  } catch (e) {
    console.error('添加企业失败:', e)
    uni.showToast({ title: '添加失败', icon: 'none' })
  }
}

const showBatchImport = () => {
  uni.showModal({
    title: '批量导入',
    content: '请在网页端使用批量导入功能，支持Excel和JSON格式导入。',
    showCancel: false,
    confirmText: '知道了'
  })
}

const goBack = () => uni.navigateBack()
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  padding: 32rpx;
  padding-bottom: 100rpx;
}

.header { margin-bottom: 24rpx; }
.back-btn { font-size: 28rpx; color: #06b6d4; margin-bottom: 16rpx; }
.title { font-size: 36rpx; font-weight: 700; color: #f8fafc; }
.desc { font-size: 24rpx; color: #64748b; margin-top: 8rpx; }

.form-section { background: rgba(30, 41, 59, 0.6); border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; border: 1rpx solid rgba(148, 163, 184, 0.1); }
.section-title { font-size: 28rpx; font-weight: 600; color: #f8fafc; margin-bottom: 20rpx; }

.form-item { margin-bottom: 20rpx; }
.form-item:last-child { margin-bottom: 0; }
.label { font-size: 26rpx; color: #94a3b8; margin-bottom: 8rpx; display: block; }
.input { width: 100%; height: 80rpx; padding: 0 24rpx; background: rgba(15, 23, 42, 0.8); border-radius: 12rpx; border: 1rpx solid rgba(148, 163, 184, 0.2); font-size: 28rpx; color: #f8fafc; box-sizing: border-box; }
.textarea { width: 100%; min-height: 160rpx; padding: 20rpx 24rpx; background: rgba(15, 23, 42, 0.8); border-radius: 12rpx; border: 1rpx solid rgba(148, 163, 184, 0.2); font-size: 28rpx; color: #f8fafc; box-sizing: border-box; }
.picker-btn { display: flex; justify-content: space-between; align-items: center; height: 80rpx; padding: 0 24rpx; background: rgba(15, 23, 42, 0.8); border-radius: 12rpx; border: 1rpx solid rgba(148, 163, 184, 0.2); }
.picker-btn text { font-size: 28rpx; color: #f8fafc; }
.arrow { font-size: 20rpx; color: #64748b; }

.actions { display: flex; gap: 24rpx; margin-bottom: 32rpx; }
.btn { flex: 1; height: 88rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.btn-primary { background: linear-gradient(135deg, #06b6d4, #0891b2); }
.btn-primary text { color: #fff; font-size: 32rpx; font-weight: 600; }
.btn-secondary { background: rgba(148, 163, 184, 0.2); }
.btn-secondary text { color: #94a3b8; font-size: 32rpx; }
.btn-outline { border: 2rpx solid rgba(6, 182, 212, 0.5); background: transparent; }
.btn-outline text { color: #06b6d4; font-size: 28rpx; }

.batch-section { background: rgba(30, 41, 59, 0.4); border-radius: 16rpx; padding: 24rpx; border: 1rpx solid rgba(148, 163, 184, 0.1); }
.batch-tips { margin-bottom: 16rpx; }
.batch-tips text { font-size: 24rpx; color: #64748b; }
</style>
