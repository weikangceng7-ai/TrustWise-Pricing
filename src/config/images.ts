/**
 * 图片资源配置
 *
 * 使用 Cloudflare R2 存储图片
 *
 * 步骤：
 * 1. 登录 Cloudflare Dashboard -> R2
 * 2. 创建 bucket (例如: sulfur-agent-images)
 * 3. 上传图片
 * 4. 开启 Public Access，获取域名
 * 5. 将图片 URL 填入下方配置
 */

export const IMAGE_CONFIG = {
  // Dashboard 页面背景图片
  // 格式: https://your-r2-domain.com/filename.jpg
  dashboardBackground: {
    // R2 图片 URL（替换为您的实际 URL）
    url: "",

    // 备用图片（如果 R2 未配置，使用 Unsplash 占位图）
    fallback: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80",

    // 图片位置
    position: "center" as const,

    // 图片尺寸
    size: "cover" as const,
  },

  // 其他页面背景图片可以在这里添加
  // agentChatBackground: { ... }
}

/**
 * 获取背景图片 URL
 */
export function getBackgroundImage(key: keyof typeof IMAGE_CONFIG): string {
  const config = IMAGE_CONFIG[key]
  return config.url || config.fallback
}