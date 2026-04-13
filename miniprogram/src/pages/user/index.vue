<template>
  <view class="page">
    <view class="header">
      <view class="user-info" v-if="user">
        <view class="avatar">{{ user.name?.charAt(0) || 'U' }}</view>
        <view class="info">
          <text class="name">{{ user.name || '未登录' }}</text>
          <text class="email">{{ user.email || '点击登录' }}</text>
        </view>
      </view>
      <view class="user-info" v-else @tap="goLogin">
        <view class="avatar">?</view>
        <view class="info">
          <text class="name">点击登录</text>
          <text class="email">登录后享受更多功能</text>
        </view>
      </view>
    </view>

    <view class="stats-row">
      <view class="stat-item">
        <text class="stat-value">{{ stats.reports }}</text>
        <text class="stat-label">报告</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ stats.enterprises }}</text>
        <text class="stat-label">企业</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ stats.predictions }}</text>
        <text class="stat-label">预测</text>
      </view>
    </view>

    <view class="section">
      <view class="section-title">常用功能</view>
      <view class="menu-list">
        <view class="menu-item" @tap="goTo('/pages/enterprise/import')">
          <view class="menu-icon">🏢</view>
          <text class="menu-text">导入企业</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goTo('/pages/knowledge/index')">
          <view class="menu-icon">🧠</view>
          <text class="menu-text">知识图谱</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goTo('/pages/supply-demand/index')">
          <view class="menu-icon">⚖️</view>
          <text class="menu-text">供需分析</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goTo('/pages/chat/index')">
          <view class="menu-icon">🤖</view>
          <text class="menu-text">AI助手</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">系统设置</view>
      <view class="menu-list">
        <view class="menu-item" @tap="toggleNotification">
          <view class="menu-icon">🔔</view>
          <text class="menu-text">消息通知</text>
          <switch :checked="settings.notification" @change="toggleNotification" color="#06b6d4" />
        </view>
        <view class="menu-item" @tap="toggleDarkMode">
          <view class="menu-icon">🌙</view>
          <text class="menu-text">深色模式</text>
          <switch :checked="settings.darkMode" @change="toggleDarkMode" color="#06b6d4" />
        </view>
        <view class="menu-item" @tap="showLanguagePicker">
          <view class="menu-icon">🌐</view>
          <text class="menu-text">语言设置</text>
          <text class="menu-value">{{ settings.language }}</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="clearCache">
          <view class="menu-icon">🗑️</view>
          <text class="menu-text">清除缓存</text>
          <text class="menu-value">{{ cacheSize }}</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">数据同步</view>
      <view class="menu-list">
        <view class="menu-item" @tap="syncData">
          <view class="menu-icon">🔄</view>
          <text class="menu-text">同步数据</text>
          <text class="menu-value">{{ lastSync }}</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="exportData">
          <view class="menu-icon">📤</view>
          <text class="menu-text">导出数据</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="showApiConfig">
          <view class="menu-icon">🔗</view>
          <text class="menu-text">API配置</text>
          <text class="menu-value">{{ apiStatus }}</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">帮助与支持</view>
      <view class="menu-list">
        <view class="menu-item" @tap="showGuide">
          <view class="menu-icon">📖</view>
          <text class="menu-text">使用指南</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="showFeedback">
          <view class="menu-icon">💬</view>
          <text class="menu-text">意见反馈</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="showAbout">
          <view class="menu-icon">ℹ️</view>
          <text class="menu-text">关于我们</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>

    <view class="version">
      <text>版本 1.0.0</text>
    </view>

    <view class="logout-btn" v-if="user" @tap="logout">
      <text>退出登录</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { api } from '@/utils/api'

const user = ref(null)
const stats = ref({
  reports: 0,
  enterprises: 0,
  predictions: 0
})

const settings = ref({
  notification: true,
  darkMode: true,
  language: '简体中文'
})

const cacheSize = ref('0KB')
const lastSync = ref('未同步')
const apiStatus = ref('已连接')

const fetchStats = async () => {
  try {
    const [reportsRes, enterprisesRes] = await Promise.all([
      api.getReports(),
      api.getEnterprises()
    ])
    
    if (reportsRes && reportsRes.reports) {
      stats.value.reports = reportsRes.total || reportsRes.reports.length
    }
    if (enterprisesRes && enterprisesRes.enterprises) {
      stats.value.enterprises = enterprisesRes.total || enterprisesRes.enterprises.length
    }
    stats.value.predictions = stats.value.enterprises
  } catch (e) {
    console.error('获取统计数据失败:', e)
  }
}

const loadSettings = () => {
  try {
    const saved = uni.getStorageSync('user_settings')
    if (saved) {
      settings.value = { ...settings.value, ...JSON.parse(saved) }
    }
    const syncTime = uni.getStorageSync('last_sync')
    if (syncTime) {
      lastSync.value = new Date(syncTime).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
  } catch (e) {
    console.error('加载设置失败:', e)
  }
}

const saveSettings = () => {
  try {
    uni.setStorageSync('user_settings', JSON.stringify(settings.value))
  } catch (e) {
    console.error('保存设置失败:', e)
  }
}

const goTo = (url) => {
  uni.navigateTo({ url })
}

const goLogin = () => {
  uni.showToast({ title: '登录功能开发中', icon: 'none' })
}

const toggleNotification = () => {
  settings.value.notification = !settings.value.notification
  saveSettings()
  uni.showToast({ title: settings.value.notification ? '已开启通知' : '已关闭通知', icon: 'none' })
}

const toggleDarkMode = () => {
  settings.value.darkMode = !settings.value.darkMode
  saveSettings()
  uni.showToast({ title: '主题设置已保存', icon: 'none' })
}

const showLanguagePicker = () => {
  uni.showActionSheet({
    itemList: ['简体中文', 'English'],
    success: (res) => {
      settings.value.language = res.tapIndex === 0 ? '简体中文' : 'English'
      saveSettings()
    }
  })
}

const clearCache = () => {
  uni.showModal({
    title: '确认清除',
    content: '确定要清除所有缓存数据吗？',
    success: (res) => {
      if (res.confirm) {
        try {
          uni.clearStorageSync()
          cacheSize.value = '0KB'
          uni.showToast({ title: '缓存已清除', icon: 'success' })
        } catch (e) {
          uni.showToast({ title: '清除失败', icon: 'none' })
        }
      }
    }
  })
}

const syncData = async () => {
  uni.showLoading({ title: '同步中...' })
  try {
    await fetchStats()
    uni.setStorageSync('last_sync', Date.now())
    lastSync.value = new Date().toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    uni.hideLoading()
    uni.showToast({ title: '同步成功', icon: 'success' })
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '同步失败', icon: 'none' })
  }
}

const exportData = () => {
  uni.showToast({ title: '导出功能开发中', icon: 'none' })
}

const showApiConfig = () => {
  uni.showModal({
    title: 'API配置',
    content: '当前API地址: http://localhost:3000\n状态: ' + apiStatus.value,
    showCancel: false
  })
}

const showGuide = () => {
  uni.showModal({
    title: '使用指南',
    content: '1. 首页查看价格走势和预测\n2. 企业页面管理分析企业\n3. 报告页面查看采购报告\n4. AI助手提供智能咨询',
    showCancel: false
  })
}

const showFeedback = () => {
  uni.showModal({
    title: '意见反馈',
    content: '如有问题或建议，请联系客服:\nemail@example.com',
    showCancel: false
  })
}

const showAbout = () => {
  uni.showModal({
    title: '关于我们',
    content: '硫磺价格预测与决策辅助系统\n版本: 1.0.0\n基于知识图谱与AI的智能价格预测平台',
    showCancel: false
  })
}

const logout = () => {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        user.value = null
        uni.showToast({ title: '已退出登录', icon: 'success' })
      }
    }
  })
}

onMounted(() => {
  loadSettings()
  fetchStats()
})

onShow(() => {
  fetchStats()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  padding: 32rpx;
  padding-bottom: 100rpx;
}

.header { margin-bottom: 24rpx; }
.user-info { display: flex; align-items: center; gap: 20rpx; padding: 24rpx; background: rgba(30, 41, 59, 0.6); border-radius: 16rpx; border: 1rpx solid rgba(148, 163, 184, 0.1); }
.avatar { width: 96rpx; height: 96rpx; background: linear-gradient(135deg, #06b6d4, #0891b2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40rpx; color: #fff; font-weight: 700; }
.name { font-size: 32rpx; font-weight: 600; color: #f8fafc; display: block; }
.email { font-size: 24rpx; color: #64748b; margin-top: 4rpx; }

.stats-row { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.stat-item { flex: 1; padding: 20rpx; background: rgba(30, 41, 59, 0.6); border-radius: 12rpx; text-align: center; border: 1rpx solid rgba(148, 163, 184, 0.1); }
.stat-value { font-size: 36rpx; font-weight: 700; color: #06b6d4; display: block; }
.stat-label { font-size: 22rpx; color: #64748b; margin-top: 4rpx; }

.section { background: rgba(30, 41, 59, 0.6); border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; border: 1rpx solid rgba(148, 163, 184, 0.1); }
.section-title { font-size: 26rpx; font-weight: 600; color: #94a3b8; margin-bottom: 12rpx; padding-left: 8rpx; }

.menu-list { display: flex; flex-direction: column; }
.menu-item { display: flex; align-items: center; padding: 20rpx 8rpx; border-bottom: 1rpx solid rgba(148, 163, 184, 0.1); }
.menu-item:last-child { border-bottom: none; }
.menu-icon { font-size: 32rpx; margin-right: 16rpx; }
.menu-text { flex: 1; font-size: 28rpx; color: #f8fafc; }
.menu-value { font-size: 24rpx; color: #64748b; margin-right: 8rpx; }
.menu-arrow { font-size: 28rpx; color: #64748b; }

.version { text-align: center; padding: 32rpx; }
.version text { font-size: 24rpx; color: #64748b; }

.logout-btn { margin-top: 24rpx; padding: 24rpx; background: rgba(244, 63, 94, 0.1); border-radius: 12rpx; text-align: center; border: 1rpx solid rgba(244, 63, 94, 0.2); }
.logout-btn text { color: #f43f5e; font-size: 28rpx; }
</style>
