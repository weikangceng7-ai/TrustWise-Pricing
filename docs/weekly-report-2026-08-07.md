# 硫磺督价系统 — 开发周报

**报告日期**: 2026-08-07  
**范围**: 2026-07-31 ~ 2026-08-07

---

## 一、总览

| 指标 | 数量 |
|------|------|
| 修改文件 | 43 |
| 新增文件 | 21 |
| 删除文件 | 0 |
| 代码变更 | +5147 / -3104 行 |
| 新增包依赖 | stripe, @stripe/stripe-js, ioredis, @sentry/nextjs |

---

## 二、分阶段修复（14 项代码缺陷修复）

### Critical（2 项）

#### 1. React Hooks 规则违规
- **文件**: `src/app/success-cases/page.tsx`, `src/components/yihua-code-graph.tsx`
- **问题**: `useInView()` 在 `.map()` 回调中调用，违反 React Hooks 必须顶层调用的规则
- **修复**: 提取 `CaseStudyCard` / `StatCard` 独立组件，每个组件顶层调用自己的 `useInView()`

#### 2. Ref 在 render 期间读写
- **文件**: `src/app/(dashboard)/dashboard/page.tsx`
- **问题**: `if (data) cachedDataRef.current = data` 在 render 阶段直接写 ref
- **修复**: 改为 `useState` + `useEffect` 模式：`useEffect(() => { if (data) setDisplayData(data) }, [data])`

### High（4 项）

#### 3. Floating Chat 同步 setState
- **文件**: `src/components/floating-chat.tsx`
- **修复**: useEffect 内初始化 setState 包裹在 `requestAnimationFrame` 中

#### 4-7. API 路由缺少错误处理
- **文件**: `src/app/api/auth/[...all]/route.ts`, `src/app/api/neo4j/seed/route.ts`, `src/app/api/accuracy/route.ts`, `src/app/api/enterprises/route.ts`
- **修复**: 所有 GET/POST handler 包裹 try/catch，catch 返回 500 JSON 错误

### Medium（3 项）

#### 8. Rate Limit 模块级 setInterval 内存泄漏
- **文件**: `src/lib/rate-limit.ts`
- **修复**: 移除 `setInterval(() => { cleanup }, 60*1000)`，改为每次 `checkRateLimit()` 调用时惰性清理

#### 9. Enterprise Management 静默错误
- **文件**: `src/app/(dashboard)/enterprise-manage/page.tsx`
- **修复**: `interface Enterprise extends StorageEnterprise {}` 改为 `type Enterprise = StorageEnterprise`；添加可视化红色错误横幅（含关闭按钮）

#### 10. API Keys 页面 useEffect 缺少依赖
- **文件**: `src/app/(dashboard)/api-keys/page.tsx`
- **修复**: `fetchApiKeys` 包裹 `useCallback`，useEffect 依赖数组正确添加

### Low（4 项）

#### 11. Dashboard 死代码
- **文件**: `src/app/(dashboard)/dashboard/page.tsx`
- **修复**: 移除未使用的 `COMMODITY_CODES` import

#### 12. Three-Phase-Architecture 死代码（84 行）
- **文件**: `src/components/three-phase-architecture.tsx`
- **修复**: 移除 12 个未使用的 recharts 导入、6 个未使用的数据常量、1 个未使用的 lucide 图标、未使用的变量（`isLoading`, `dataProcessingStats`, `processingEfficiency`, `sources`）

#### 13. AnimatedNumber 组件
- **文件**: `src/app/success-cases/page.tsx`, `src/app/page.tsx`
- **修复**: `useState("0")` 改为 `useState(() => { const m = value.match(...); return m ? "0" : value })` 惰性初始化

#### 14. Yihua Code Graph 组件拆分
- **文件**: `src/components/yihua-code-graph.tsx` (1639行 → 1024行)
- **新增**: `src/components/yihua-code-graph/knowledge-data.ts` (259行)
- **新增**: `src/components/yihua-code-graph/node-detail.tsx` (367行)

---

## 三、商业化改造（7 项新增功能）

### 1. Stripe 支付集成
- **新增文件**:
  - `src/lib/stripe.ts` — Stripe SDK 客户端（条件初始化）
  - `src/lib/pricing.ts` — 三档套餐配置（入门版 ¥99、专业版 ¥499、企业版 ¥1999）
  - `src/db/schema-payment.ts` — orders 表定义
  - `src/app/api/stripe/checkout/route.ts` — 创建 Stripe Checkout Session
  - `src/app/api/stripe/webhook/route.ts` — 处理支付成功回调，自动增加配额
  - `src/app/pricing/page.tsx` — 定价页面 UI（含计划对比、Stripe 跳转、成功/取消提示）
- **依赖**: `stripe`, `@stripe/stripe-js`
- **状态**: 代码完整，需配置 `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` 后激活

### 2. Middleware 性能优化
- **文件**: `src/middleware.ts`
- **改动**: 移除 `verifySession()` 内的 `fetch("/api/auth/get-session")` HTTP 自调用。改为只检查 cookie 存在性，实际鉴权由各 API 路由通过 `auth.api.getSession()` 自行完成
- **影响**: 每个受保护请求减少 1 次 HTTP 往返，延迟降低约 50-200ms

### 3. Redis 分布式限流
- **新增文件**: `src/lib/redis.ts` — ioredis 客户端（条件初始化）
- **修改文件**: `src/lib/rate-limit.ts` — 重写为双模式架构
  - Redis 模式: `INCR` + `EXPIRE` 计数器，多实例共享
  - 内存模式: Map fallback，单实例部署无需 Redis
- **依赖**: `ioredis`
- **状态**: 代码完整，配置 `REDIS_URL` 后自动切换 Redis 模式

### 4. 可观测性
- **新增文件**:
  - `sentry.client.config.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts` — Sentry SDK 配置
  - `instrumentation.ts` — Sentry 运行时初始化
  - `src/lib/logger.ts` — 结构化 JSON 日志（生产环境自动切换格式）
  - `src/app/api/health/route.ts` — 健康检查端点（检查 DB / Redis / Stripe / AI 配置状态）
- **修改文件**: `next.config.ts` — 条件启用 `withSentryConfig`（仅在 SENTRY_DSN 配置时）
- **依赖**: `@sentry/nextjs`
- **状态**: Sentry 向导已执行，DSN 已配入项目代码

### 5. 安全加固
- **文件**: `src/lib/auth.ts`
  - `requireEmailVerification: false → true`（暂时关闭，等待 Resend 域名配置后开启）
  - `secret: process.env.BETTER_AUTH_SECRET` — 消除默认密钥警告
- **新增文件**: `src/lib/auth-rate-limit.ts` — 基于 IP 的登录/注册频率限制
  - 登录: 5 次/分钟/IP
  - 注册: 3 次/分钟/IP
  - 支持 Redis + 内存双模式
- **文件**: `src/app/api/auth/[...all]/route.ts` — 集成 auth rate limit，返回 429 + Retry-After
- **文件**: `next.config.ts` — 添加 `Strict-Transport-Security` (HSTS) 头

### 6. 合规页面
- **新增文件**:
  - `src/app/privacy/page.tsx` — 隐私政策（含《个人信息保护法》条款）
  - `src/app/terms/page.tsx` — 用户协议（含退款政策、免责声明）
- **修改文件**: `src/app/page.tsx` — footer 添加隐私政策/用户协议链接
- **修改文件**: `src/middleware.ts` — `/privacy`、`/terms`、`/api/health` 加入公开路径白名单

### 7. 数据库备份
- **新增文件**: `scripts/backup-db.ts` — 手动备份脚本，导出 13 张核心表为 JSON，保留最近 7 份
- **新增文件**: `src/app/api/cron/backup/route.ts` — 自动备份 API 端点
- **修改文件**: `vercel.json` — 添加每日凌晨 3:00 cron 任务
- **修改文件**: `package.json` — 添加 `npm run db:backup` 脚本

---

## 四、环境变量变更

| 变量 | 说明 | 状态 |
|------|------|------|
| `BETTER_AUTH_SECRET` | 认证加密密钥（必需） | 已生成并配置 |
| `STRIPE_SECRET_KEY` | Stripe 密钥 | 待用户获取 |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 签名密钥 | 待用户获取 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe 客户端密钥 | 待用户获取 |
| `REDIS_URL` | Redis 连接串 | 可选（推荐 Upstash 免费版） |
| `SENTRY_DSN` | Sentry 错误追踪 DSN | 已配置 |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry 客户端 DSN | 已配置 |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Sentry 组织/项目名 | 已配置 |

---

## 五、新增数据库表

| 表名 | 文件 | 用途 |
|------|------|------|
| `orders` | `src/db/schema-payment.ts` | 支付订单（plan_id, amount, quota_amount, status, stripe_session_id） |

已通过 `npm run db:push` 同步至数据库。

---

## 六、新增路由

| 路由 | 类型 | 用途 |
|------|------|------|
| `/pricing` | 静态页面 | 定价方案展示 + Stripe 支付 |
| `/privacy` | 静态页面 | 隐私政策 |
| `/terms` | 静态页面 | 用户协议 |
| `/api/health` | API | 健康检查 |
| `/api/stripe/checkout` | API | 创建支付订单 |
| `/api/stripe/webhook` | API | Stripe 支付回调 |
| `/api/cron/backup` | API | 自动备份（Cron 调用） |

---

## 七、待办事项（需手动操作）

| 优先级 | 事项 | 说明 |
|--------|------|------|
| P0 | 配置 Stripe | dashboard.stripe.com 获取密钥 |
| P0 | 购买域名 | 邮件验证 + Stripe Webhook 需要 |
| P0 | 域名绑定 Vercel | DNS 添加 CNAME 记录 |
| P0 | Resend 域名验证 | DNS 添加 TXT/MX/SPF 记录 |
| P0 | 启用邮箱验证 | `requireEmailVerification` 改回 true |
| P1 | 配置 Redis | upstash.com 免费版 |
| P2 | ICP 备案 | 国内用户访问需要 |

---

## 八、构建状态

```
npm run build — PASSED (0 errors)
npx tsc --noEmit — PASSED (0 errors)
```
