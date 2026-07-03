# API Server 设计文档

## 概述

为硫磺采购价格预测与决策辅助系统建立对外开放的 API Server，允许第三方用户通过 API Key 调用系统的核心功能（价格预测、决策建议、数据查询、AI 聊天）。

## 目标

- 提供公开开放的 API 服务，用户注册后获取 API Key
- 实现配额限制：免费额度 + 付费额度
- 支持 4 类核心 API：价格预测、决策建议、数据查询、AI 聊天

## 架构方案

**选择方案：Next.js 内嵌 API Routes**

理由：
- 项目已有 Better Auth 认证体系，直接扩展即可
- Hono 已在依赖中但主要用于特定路由，全量迁移成本高
- Next.js API Routes 足够支撑 API Server 功能
- 保持代码风格一致性

---

## 1. 数据库设计

### 1.1 API Key 表

```typescript
api_keys: {
  id: text (主键)
  userId: text (外键 -> user.id)
  key: text (唯一，API Key 值)
  name: text (Key 名称，用户自定义)
  isActive: boolean (是否启用)
  createdAt: timestamp
  lastUsedAt: timestamp (最后使用时间)
  expiresAt: timestamp (过期时间，可选)
}
```

### 1.2 配额表

```typescript
api_quotas: {
  id: serial (主键)
  userId: text (外键 -> user.id)
  freeLimit: integer (免费额度，默认 1000)
  usedFree: integer (已用免费额度)
  paidLimit: integer (付费额度)
  usedPaid: integer (已用付费额度)
  resetAt: timestamp (重置日期，每月 1 日)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### 1.3 调用日志表

```typescript
api_usage_logs: {
  id: serial (主键)
  apiKeyId: text (外键 -> api_keys.id)
  endpoint: text (调用端点)
  method: text (HTTP 方法)
  statusCode: integer (响应状态码)
  responseTime: integer (响应时间 ms)
  timestamp: timestamp
  errorMessage: text (错误信息，可选)
}
```

---

## 2. API 端点设计

### 2.1 对外开放的 API 端点（v1）

基础路径：`/api/v1`

| 端点 | 方法 | 说明 | 请求体/参数 |
|------|------|------|-------------|
| `/prices` | GET | 价格数据查询 | `?startDate=&endDate=&region=&market=` |
| `/prices/predict` | POST | 价格预测 | `{ days: number, model?: string }` |
| `/decision` | POST | 决策建议生成 | `{ enterpriseCode: string, context?: string }` |
| `/data/inventory` | GET | 港口库存数据 | `?startDate=&endDate=` |
| `/data/news` | GET | 市场新闻 | `?limit=&offset=` |
| `/chat` | POST | AI 聊天问答 | `{ message: string, conversationId?: string }` |

### 2.2 API Key 管理端点（需登录）

基础路径：`/api/api-keys`

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/api-keys` | GET | 获取用户的 API Key 列表 |
| `/api/api-keys` | POST | 创建新 API Key |
| `/api/api-keys/:id` | DELETE | 删除 API Key |
| `/api/api-keys/:id/reset` | POST | 重置 API Key（生成新 Key） |
| `/api/api-usage` | GET | 查看使用统计 |

### 2.3 认证方式

请求头选项（二选一）：
- `Authorization: Bearer <api_key>`
- `X-API-Key: <api_key>`

---

## 3. 配额与计费设计

### 3.1 配额规则

- 免费额度：每月 1000 次
- 付费额度：按需购买，1 元/100 次（示例定价，后续可调整）
- 重置周期：每月 1 日重置免费额度，付费额度不重置

### 3.2 配额检查流程

```
请求到达 → 验证 API Key → 检查配额
         ↓
    Key 无效/过期 → 401 Unauthorized
         ↓
    配额不足 → 429 Too Many Requests
         ↓
    配额充足 → 处理请求 → 记录日志 → 返回响应
```

### 3.3 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "配额已用尽，请购买更多额度",
    "quota": { "free": 0, "paid": 0 }
  }
}
```

### 3.4 标准响应格式

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "quotaRemaining": { "free": 800, "paid": 500 }
  }
}
```

### 3.5 响应头信息

每次 API 调用都会返回以下响应头：

| 响应头 | 说明 |
|--------|------|
| `X-Quota-Free` | 免费配额剩余 |
| `X-Quota-Paid` | 付费配额剩余 |
| `X-Quota-Warning` | 配额预警（低于 20% 时返回 `low`） |
| `X-RateLimit-Limit` | Rate Limit 最大值 |
| `X-RateLimit-Remaining` | Rate Limit 剩余 |
| `X-RateLimit-Reset` | Rate Limit 重置时间戳 |

---

## 4. 中间件设计

### 4.1 API Key 验证中间件

职责：
- 从请求头提取 API Key
- 查询数据库验证 Key 是否有效、未过期
- 获取用户配额信息
- 记录请求开始时间

### 4.2 配额扣减中间件

职责：
- 请求完成后扣减配额（成功/失败都扣）
- 记录响应时间、状态码到日志表

### 4.3 错误码定义

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `INVALID_API_KEY` | 401 | API Key 无效 |
| `API_KEY_EXPIRED` | 401 | API Key 已过期 |
| `API_KEY_DISABLED` | 403 | API Key 已禁用 |
| `QUOTA_EXCEEDED` | 429 | 配额已用尽 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 |
| `INVALID_REQUEST` | 400 | 请求参数错误 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

---

## 5. 用户界面设计

### 5.1 API Console 页面（`/api-console`）

公开访问，包含：
- 服务介绍、功能说明
- 定价说明
- API 文档（端点列表、参数说明、示例代码）
- 注册/登录入口

### 5.2 API Keys 管理页（`/api-keys`）

需登录访问，包含：
- API Key 列表（名称、创建时间、最后使用时间、状态）
- 创建/删除/重置 Key 操作
- 使用统计图表（调用次数趋势）
- 配额余额显示
- 购买额度入口（预留，后续对接支付）

---

## 6. 实现计划

### 阶段一：基础设施
1. 数据库 Schema 扩展（新增 3 张表）
2. 运行数据库迁移

### 阶段二：认证与中间件
3. API Key 生成与验证逻辑
4. 配额检查中间件
5. 调用日志记录中间件

### 阶段三：API 端点
6. 实现 v1 版本对外 API 端点
7. 实现 API Key 管理端点

### 阶段四：用户界面
8. API Console 页面
9. API Keys 管理页面

### 阶段五：测试与文档
10. API 文档编写
11. 端到端测试

---

## 7. 补充功能

### 7.1 API Key 数量限制
- 每个用户最多可创建 5 个 API Key
- 后端验证：`src/lib/api-auth.ts` 中的 `createApiKey` 函数
- 超限时返回 400 错误：`"API Key 数量已达上限（最多 5 个）"`

### 7.2 Rate Limiting（请求频率限制）
- 每个 API Key 每分钟最多 100 次请求
- 实现文件：`src/lib/rate-limit.ts`
- 使用内存存储（适合单实例部署，生产环境可替换为 Redis）
- 响应头返回 Rate Limit 信息：
  - `X-RateLimit-Limit`: 最大请求数
  - `X-RateLimit-Remaining`: 剩余请求数
  - `X-RateLimit-Reset`: 重置时间戳
- 超限时返回 429 错误，错误码 `RATE_LIMIT_EXCEEDED`

### 7.3 配额预警机制
- 当剩余总配额低于 20% 时，响应头返回 `X-Quota-Warning: low`
- 客户端可据此提示用户购买额度

---

## 8. 后续扩展（预留）

- 支付系统对接（支付宝/微信）
- API 套餐订阅
- Webhook 回调
- 更细粒度的 API 权限控制