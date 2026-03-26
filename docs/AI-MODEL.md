# 大模型使用说明

## 模型选择

本项目使用 **DeepSeek (deepseek-v3-0324)** 作为主要 AI 模型。

## 访问方式

通过 **OpenAI 兼容 API** 方式访问，使用第三方 API 代理服务：

| 配置项 | 值 |
|--------|-----|
| API Base URL | `https://api.qnaigc.com/v1` |
| 主模型 | `deepseek-v3-0324` |
| 图像分析模型 | `gpt-4o-mini` |

## 代码实现位置

- API 路由: [src/app/api/chat/route.ts](../src/app/api/chat/route.ts)
- 使用 OpenAI SDK 客户端，配置自定义 baseURL

```typescript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.qnaigc.com/v1",
})
```

## 模型用途

| 模型 | 用途 |
|------|------|
| deepseek-v3-0324 | 文本对话、硫磺采购决策分析、价格趋势预测 |
| gpt-4o-mini | 图像分析（当用户上传图片时自动切换） |

## 环境变量配置

```env
# OpenAI 兼容 API (如 DeepSeek、QnAI 等)
OPENAI_API_KEY=sk-xxxxx
OPENAI_BASE_URL=https://api.qnaigc.com/v1
```

## 备注

- 未使用参赛主办方提供的特定 API，而是通过第三方代理服务 `qnaigc.com` 访问 DeepSeek 模型
- 该方式兼容 OpenAI API 标准，便于切换不同的模型提供商