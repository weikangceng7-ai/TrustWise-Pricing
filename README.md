# 宜化硫磺价格预测与本体知识图谱系统

本项目是一个面向采购决策场景的业务系统，围绕「硫磺价格预测 + 知识资产管理 + 本体知识图谱展示」建设。

核心目标：

- 统一管理宜化资料、图表、文献、代码资产
- 将静态文件预处理后入库，形成可检索、可统计的数据资产
- 在仪表盘与知识图谱页面中进行可视化展示，提升决策效率

---

## 一、功能总览

### 1) 仪表盘

- 价格概览卡片（当前价、均价、建议动作）
- 价格趋势图（近 60 天 + 预测走势）
- 宜化知识库统计面板（文档、数据表、图表、文献）

### 2) 代码知识图谱

- 多层关系：目录 -> 类型 -> 主题 -> 文件
- 本体视图切换：业务本体 / 算法本体 / 数据本体
- 交互能力：缩放、平移、节点拖拽、Shift 框选、固定节点、局部高亮
- 视觉能力：默认主题 / 黑金大屏主题
- 导出能力：SVG / PNG

### 3) 决策辅助

- Agent 对话助手（多轮问答）
- 采购报告页面

---

## 二、技术栈

- 前端：Next.js 16 (App Router) + React 19 + TypeScript
- UI：自定义组件 + Lucide 图标 + Recharts
- 数据层：PostgreSQL + Drizzle ORM + Drizzle Kit
- 状态/请求：TanStack Query

---

## 三、目录与关键文件

- `src/app/(dashboard)/dashboard/page.tsx`：仪表盘页面
- `src/app/(dashboard)/yihua-code-graph/page.tsx`：代码知识图谱页面
- `src/components/yihua-code-graph.tsx`：图谱核心渲染与交互
- `src/services/yihua-code-graph.ts`：图谱数据聚合与本体模板
- `src/services/yihua-knowledge.ts`：知识库统计服务
- `src/lib/yihua-preprocess.ts`：文献/资料预处理逻辑
- `src/app/api/yihua/code-graph/route.ts`：图谱 API
- `src/app/api/yihua/knowledge/route.ts`：知识库统计 API
- `src/db/schema.ts`：数据表定义
- `scripts/seed-yihua-knowledge.ts`：知识库元数据入库
- `scripts/seed-yihua-code.ts`：代码资产元数据入库

---

## 四、环境准备

### 1) 安装依赖

```bash
npm install
```

### 2) 配置环境变量（`.env.local`）

最小可用配置示例：

```bash
OPENROUTER_API_KEY=your_key
DATABASE_URL=postgresql://postgres:password@localhost:5432/sulfur_agent
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=please_use_a_real_secret
NODE_ENV=development
```

> 注意：`BETTER_AUTH_SECRET` 请务必使用真实安全值，避免默认 secret 警告。

---

## 五、本地运行

```bash
npm run dev
```

访问：

- 仪表盘：`http://localhost:3000/dashboard`
- 知识图谱：`http://localhost:3000/yihua-code-graph`

---

## 六、数据库初始化与数据导入

### 1) 生成/同步数据库结构

```bash
npm run db:push
```

### 2) 导入知识库元数据（资料/图/文献）

```bash
npm run db:seed:yihua
```

### 3) 导入代码资产元数据（代码目录）

```bash
npm run db:seed:yihua-code
```

---

## 七、脚本命令

```bash
npm run dev             # 本地开发
npm run build           # 生产构建检查
npm run start           # 生产模式启动
npm run lint            # 代码检查
npm run db:generate     # 生成 drizzle 迁移
npm run db:push         # 同步表结构到数据库
npm run db:seed:yihua   # 导入知识库元数据
npm run db:seed:yihua-code # 导入代码资产元数据
```

---

## 八、核心 API

- `GET /api/prices`
- `GET /api/prices/summary`
- `GET /api/inventory`
- `GET /api/inventory/summary`
- `GET /api/yihua/knowledge`
- `GET /api/yihua/code-graph`

图谱 API 关键参数：

- `topFolder`: 目录筛选
- `kind`: 类型筛选（python/notebook/matlab/markdown）
- `theme`: 主题筛选（LSTM/ARIMA/EEMD 等）
- `ontologyView`: 本体视图（business/algorithm/data）
- `q`: 关键词
- `maxFiles`: 最大文件节点数

---

## 九、常见问题

### 1) `ECONNREFUSED 5432`

数据库未启动或连接串错误，检查 `DATABASE_URL` 与 PostgreSQL 服务状态。

### 2) `BETTER_AUTH_SECRET` 默认值警告

请在 `.env.local` 中配置真实 `BETTER_AUTH_SECRET`。

### 3) 图谱无数据

先确认已执行：

```bash
npm run db:push
npm run db:seed:yihua-code
```

---

## 十、说明

本 README 为项目当前业务化版本说明，后续若新增模块（如自动训练、模型评估、数据质量看板），请同步更新本文件，确保团队成员可快速上手与交接。
