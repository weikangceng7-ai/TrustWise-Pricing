<script>
export default {
  onLaunch: function() {
    console.log('App Launch')
  },
  onShow: function() {
    console.log('App Show')
  },
  onHide: function() {
    console.log('App Hide')
  }
}
</script>

<style>
@import './styles/common.css';

page {
  background-color: #0f172a;
  color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 28rpx;
  line-height: 1.5;
}

.container {
  padding: 24rpx;
}

.card {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.1);
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.3);
}

.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #f8fafc;
  margin-bottom: 16rpx;
}

.card-content {
  font-size: 28rpx;
  color: #94a3b8;
}

.text-cyan {
  color: #06b6d4;
}

.text-violet {
  color: #8b5cf6;
}

.text-amber {
  color: #f59e0b;
}

.text-emerald {
  color: #10b981;
}

.bg-cyan {
  background-color: rgba(6, 182, 212, 0.1);
}

.bg-violet {
  background-color: rgba(139, 92, 246, 0.1);
}

.bg-amber {
  background-color: rgba(245, 158, 11, 0.1);
}

.bg-emerald {
  background-color: rgba(16, 185, 129, 0.1);
}

.btn-primary {
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  color: white;
  border: none;
  border-radius: 16rpx;
  padding: 24rpx 48rpx;
  font-size: 28rpx;
  font-weight: 500;
}

.btn-primary:active {
  opacity: 0.8;
}

.flex-row {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.flex-col {
  display: flex;
  flex-direction: column;
}

.flex-between {
  justify-content: space-between;
}

.flex-center {
  justify-content: center;
  align-items: center;
}

.gap-8 {
  gap: 16rpx;
}

.gap-16 {
  gap: 32rpx;
}

.mt-8 {
  margin-top: 16rpx;
}

.mt-16 {
  margin-top: 32rpx;
}

.mb-8 {
  margin-bottom: 16rpx;
}

.mb-16 {
  margin-bottom: 32rpx;
}
</style>
