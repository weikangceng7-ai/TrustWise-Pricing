# TrustWise 智能硫磺定价决策系统 - 模块规格说明书

---

## 一、系统概述

TrustWise 是一个面向化工企业的智能硫磺定价决策系统，采用三层架构设计，结合大语言模型、知识图谱和机器学习预测模型，为企业提供价格预测、采购建议和市场分析等智能决策支持。

---

## 二、模块架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                         表现层 (Presentation)                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   仪表盘    │ │ Agent助手   │ │  企业分析   │ │  报告管理 │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         业务层 (Business)                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ 宏观分析引擎    │  │ 企业决策引擎    │  │ 知识图谱引擎    │ │
│  │ - 价格预测      │  │ - 影响因子计算  │  │ - Neo4j推理     │ │
│  │ - 资讯分析      │  │ - 权重动态更新  │  │ - 关系网络      │ │
│  │ - 供需分析      │  │ - 个性化建议    │  │ - 节点查询      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         数据层 (Data)                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ PostgreSQL  │ │   Neo4j     │ │  外部API    │ │  文件存储 │ │
│  │ - 企业数据  │ │ - 知识图谱  │ │ - AKShare   │ │ - R2      │ │
│  │ - 价格数据  │ │ - 关系网络  │ │ - GDELT     │ │ - 报告    │ │
│  │ - 库存数据  │ │ - 影响因子  │ │ - EIA       │ │           │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、核心模块详细规格

### 3.1 表现层模块

#### 3.1.1 仪表盘模块 (Dashboard)

| 属性 | 说明 |
|:-----|:-----|
| **路径** | `src/app/(dashboard)/dashboard/page.tsx` |
| **功能** | 展示价格走势、供需分析、企业预测等核心数据 |
| **组件** | PriceChart, SupplyDemandAnalysis, SummaryCards, EnterprisePredictionChart |

**子功能模块：**

| 子模块 | 组件路径 | 功能说明 |
|:-------|:---------|:---------|
| 价格走势 | `src/components/price-chart.tsx` | 展示硫磺价格历史走势，支持日/周/月切换 |
| 供需分析 | `src/components/supply-demand-analysis.tsx` | 展示当前供需状态、港口库存、价格指数 |
| 企业预测 | `src/components/enterprise-prediction-chart.tsx` | 展示企业价格预测曲线 |
| 汇总卡片 | `src/components/summary-cards.tsx` | 展示关键指标汇总 |

---

#### 3.1.2 Agent决策助手模块 (Agent Chat)

| 属性 | 说明 |
|:-----|:-----|
| **路径** | `src/app/(dashboard)/agent-chat/page.tsx` |
| **功能** | 提供自然语言交互的智能问答服务 |
| **组件** | FloatingChat, ThreePhaseArchitectureCarousel |

**核心功能：**

| 功能 | API路径 | 说明 |
|:-----|:--------|:-----|
| 对话接口 | `/api/chat` | 处理用户问题，返回AI回复 |
| 会话管理 | `/api/conversations` | 管理对话历史 |
| 系统架构 | `ThreePhaseArchitectureCarousel` | 展示系统三阶段架构 |

---

#### 3.1.3 企业分析模块 (Enterprise)

| 属性 | 说明 |
|:-----|:-----|
| **路径** | `src/app/(dashboard)/enterprise/[code]/page.tsx` |
| **功能** | 展示单个企业的详细分析数据 |
| **组件** | EnterpriseDetail, Neo4jKnowledgeGraph, YihuaCodeGraph |

**支持企业：**

| 企业代码 | 企业名称 | 路由 |
|:---------|:---------|:-----|
| yihua | 湖北宜化 | `/enterprise/yihua` |
| luxi | 鲁西化工 | `/enterprise/luxi` |
| jinzhengda | 金正大 | `/enterprise/jinzhengda` |

**子功能模块：**

| 子模块 | 组件路径 | 功能说明 |
|:-------|:---------|:---------|
| 企业详情 | `src/components/enterprise-detail.tsx` | 展示企业基本信息、价格预测 |
| 知识图谱 | `src/components/neo4j-knowledge-graph.tsx` | 展示企业影响因子图谱 |
| 代码图谱 | `src/components/yihua-code-graph.tsx` | 展示企业知识代码图谱 |

---

#### 3.1.4 采购报告模块 (Reports)

| 属性 | 说明 |
|:-----|:-----|
| **路径** | `src/app/(dashboard)/reports/page.tsx` |
| **功能** | 管理和导出采购分析报告 |
| **API** | `/api/reports` |

**报告功能：**

| 功能 | 说明 |
|:-----|:-----|
| 报告列表 | 展示历史生成的报告 |
| 报告详情 | 查看报告完整内容 |
| 报告导出 | 导出为PDF/Word格式 |

---

#### 3.1.5 文档模块 (Document)

| 属性 | 说明 |
|:-----|:-----|
| **路径** | `src/app/(dashboard)/document/page.tsx` |
| **功能** | 展示系统技术文档和说明 |

---

### 3.2 业务层模块

#### 3.2.1 价格预测模块

| 属性 | 说明 |
|:-----|:-----|
| **服务路径** | `src/services/prediction.ts` |
| **API路径** | `/api/prediction`, `/api/enterprise-predictions` |
| **模型** | Hybrid ARIMA + XGBoost |

**输入参数：**

| 参数 | 类型 | 说明 |
|:-----|:-----|:-----|
| enterprise | string | 企业代码 |
| days | number | 预测天数 (30/60/90) |

**输出数据：**

| 字段 | 类型 | 说明 |
|:-----|:-----|:-----|
| date | string | 预测日期 |
| actualPrice | number | 实际价格 |
| predictedPrice | number | 预测价格 |
| confidence | number | 置信度 |
| modelType | string | 模型类型 |

---

#### 3.2.2 知识图谱模块

| 属性 | 说明 |
|:-----|:-----|
| **服务路径** | `src/services/knowledge-graph.ts` |
| **API路径** | `/api/neo4j`, `/api/neo4j/graph` |
| **数据库** | Neo4j |

**核心功能：**

| 功能 | API | 说明 |
|:-----|:----|:-----|
| 获取图谱 | `/api/neo4j/graph` | 获取企业影响因子图谱 |
| 节点查询 | `/api/neo4j` | 查询节点详情 |
| 种子数据 | `/api/neo4j/seed` | 初始化图谱数据 |

**图谱节点类型：**

| 节点类型 | 说明 |
|:---------|:-----|
| Price | 价格节点 |
| Supply | 供应节点 |
| Demand | 需求节点 |
| Inventory | 库存节点 |
| Factor | 影响因子节点 |
| Enterprise | 企业节点 |

---

#### 3.2.3 供需分析模块

| 属性 | 说明 |
|:-----|:-----|
| **API路径** | `/api/supply-demand` |
| **功能** | 提供供需分析数据 |

**输出数据：**

| 字段 | 类型 | 说明 |
|:-----|:-----|:-----|
| currentPrice | number | 当前价格 |
| priceChange | number | 价格变化 |
| portInventory | number | 港口库存 |
| inventoryChange | number | 库存变化 |
| supplyIndex | number | 供应指数 |
| demandIndex | number | 需求指数 |

---

#### 3.2.4 聊天服务模块

| 属性 | 说明 |
|:-----|:-----|
| **服务路径** | `src/services/chat.ts` |
| **API路径** | `/api/chat` |
| **模型** | DeepSeek-V3 |

**核心功能：**

| 功能 | 说明 |
|:-----|:-----|
| 意图识别 | 识别用户查询意图 |
| 知识检索 | 检索相关数据 |
| 推理生成 | 生成分析结论 |
| 建议输出 | 生成采购建议 |

---

#### 3.2.5 报告生成模块

| 属性 | 说明 |
|:-----|:-----|
| **服务路径** | `src/services/reports.ts` |
| **工具路径** | `src/lib/report-generator.ts`, `src/lib/report-export.ts` |

**报告结构：**

| 板块 | 内容 |
|:-----|:-----|
| 市场分析 | 价格走势、供需判断、风险因素 |
| 企业建议 | 采购建议、库存策略、风险提示 |

---

### 3.3 数据层模块

#### 3.3.1 数据库模块

| 属性 | 说明 |
|:-----|:-----|
| **配置路径** | `src/db/index.ts` |
| **Schema路径** | `src/db/schema.ts` |
| **数据库** | PostgreSQL |
| **ORM** | Drizzle ORM |

**数据表：**

| 表名 | 说明 |
|:-----|:-----|
| users | 用户信息 |
| enterprises | 企业数据 |
| prices | 价格数据 |
| inventory | 库存数据 |
| reports | 报告数据 |
| conversations | 对话记录 |

---

#### 3.3.2 外部数据接入模块

| 属性 | 说明 |
|:-----|:-----|
| **API路径** | `/api/external-data/` |
| **服务路径** | `src/services/realtime-data.ts` |

**数据源：**

| 数据源 | API路径 | 数据内容 |
|:-------|:--------|:---------|
| AKShare | `/api/external-data/akshare` | 原油价格、BDI指数、汇率 |
| EIA | `/api/external-data/eia/oil-price` | 美国能源信息署油价 |
| FRED | `/api/external-data/fred` | 美联储经济数据 |
| GDELT | `/api/external-data/gdelt` | 全球新闻事件 |

---

#### 3.3.3 企业数据模块

| 属性 | 说明 |
|:-----|:-----|
| **数据路径** | `src/data/enterprises.ts` |
| **API路径** | `/api/enterprises` |

**企业数据字段：**

| 字段 | 类型 | 说明 |
|:-----|:-----|:-----|
| id | number | 企业ID |
| name | string | 企业名称 |
| code | string | 企业代码 |
| industry | string | 行业 |
| location | string | 所在地 |
| sulfurDemand | number | 硫磺需求量 |
| mainProducts | string[] | 主要产品 |

---

### 3.4 认证授权模块

| 属性 | 说明 |
|:-----|:-----|
| **配置路径** | `src/lib/auth.ts` |
| **客户端路径** | `src/lib/auth-client.ts` |
| **中间件** | `src/middleware/auth.ts` |

**认证方式：**

| 方式 | API路径 | 说明 |
|:-----|:--------|:-----|
| 账号密码 | `/api/auth/login` | 传统登录 |
| 手机验证码 | `/api/auth/send-sms` | 短信登录 |
| 邮箱验证 | `/api/auth/send-email` | 邮箱验证 |
| 密码重置 | `/api/auth/reset-password` | 重置密码 |

---

### 3.5 UI组件模块

| 属性 | 说明 |
|:-----|:-----|
| **组件路径** | `src/components/` |
| **UI库** | Shadcn UI + Tailwind CSS |

**核心组件：**

| 组件 | 路径 | 功能 |
|:-----|:-----|:-----|
| AppSidebar | `app-sidebar.tsx` | 侧边导航栏 |
| TopNav | `top-nav.tsx` | 顶部导航栏 |
| DashboardLayout | `dashboard-layout.tsx` | 仪表盘布局 |
| PriceChart | `price-chart.tsx` | 价格走势图表 |
| SupplyDemandAnalysis | `supply-demand-analysis.tsx` | 供需分析组件 |
| EnterpriseDetail | `enterprise-detail.tsx` | 企业详情组件 |
| Neo4jKnowledgeGraph | `neo4j-knowledge-graph.tsx` | 知识图谱组件 |
| FloatingChat | `floating-chat.tsx` | 浮动聊天组件 |
| NotificationPanel | `notification-panel.tsx` | 通知面板 |
| ExternalDataPanel | `external-data-panel.tsx` | 外部数据面板 |

---

### 3.6 Hooks模块

| 属性 | 说明 |
|:-----|:-----|
| **路径** | `src/hooks/` |

**自定义Hooks：**

| Hook | 路径 | 功能 |
|:-----|:-----|:-----|
| useChat | `use-chat.ts` | 聊天功能 |
| useChatWithHistory | `use-chat-with-history.ts` | 带历史的聊天 |
| usePrices | `use-prices.ts` | 价格数据 |
| useReports | `use-reports.ts` | 报告数据 |
| useNotifications | `use-notifications.ts` | 通知数据 |
| useExternalData | `use-external-data.ts` | 外部数据 |
| useYihuaCodeGraph | `use-yihua-code-graph.ts` | 宜化代码图谱 |
| useYihuaKnowledge | `use-yihua-knowledge.ts` | 宜化知识数据 |

---

## 四、API接口规格

### 4.1 核心API列表

| 模块 | API路径 | 方法 | 功能 |
|:-----|:--------|:-----|:-----|
| 聊天 | `/api/chat` | POST | AI对话 |
| 会话 | `/api/conversations` | GET/POST | 会话管理 |
| 价格预测 | `/api/prediction` | GET | 价格预测 |
| 企业预测 | `/api/enterprise-predictions` | GET | 企业预测 |
| 供需分析 | `/api/supply-demand` | GET | 供需数据 |
| 知识图谱 | `/api/neo4j/graph` | GET | 图谱数据 |
| 企业数据 | `/api/enterprises` | GET | 企业列表 |
| 报告 | `/api/reports` | GET/POST | 报告管理 |
| 库存 | `/api/inventory` | GET | 库存数据 |
| 价格 | `/api/prices` | GET | 价格数据 |

### 4.2 外部数据API

| 数据源 | API路径 | 参数 |
|:-------|:--------|:-----|
| 原油价格 | `/api/external-data/akshare?type=oil` | type=oil |
| BDI指数 | `/api/external-data/akshare?type=bdi` | type=bdi |
| 布伦特原油 | `/api/external-data/akshare?type=brent` | type=brent |
| 美元汇率 | `/api/external-data/akshare?type=usdcny` | type=usdcny |
| GDELT新闻 | `/api/external-data/gdelt` | - |
| EIA油价 | `/api/external-data/eia/oil-price` | - |
| FRED数据 | `/api/external-data/fred` | - |

---

## 五、数据流规格

### 5.1 用户问答数据流

```
用户输入 → 意图识别 → 知识检索 → 推理引擎 → 结果生成 → 用户输出
    │           │           │           │           │
    ↓           ↓           ↓           ↓           ↓
  提取实体   判断意图   检索数据   分析推理   组织回答
```

### 5.2 价格预测数据流

```
历史价格 → 特征工程 → Hybrid ARIMA + XGBoost → 预测结果 → 可视化
    │           │               │               │           │
    ↓           ↓               ↓               ↓           ↓
  数据清洗   特征提取      模型预测      置信计算    图表展示
```

### 5.3 知识图谱数据流

```
企业选择 → Neo4j查询 → 节点关系 → 图谱渲染 → 交互展示
    │           │           │           │           │
    ↓           ↓           ↓           ↓           ↓
  参数传递   Cypher执行  数据转换   D3渲染    点击交互
```

---

## 六、配置规格

### 6.1 环境变量

| 变量名 | 必需 | 说明 |
|:-------|:-----|:-----|
| OPENAI_API_KEY | 是 | OpenAI API密钥 |
| OPENAI_BASE_URL | 是 | API基础URL |
| DATABASE_URL | 否 | PostgreSQL连接字符串 |
| NEO4J_URI | 否 | Neo4j连接URI |
| NEO4J_USER | 否 | Neo4j用户名 |
| NEO4J_PASSWORD | 否 | Neo4j密码 |
| BETTER_AUTH_URL | 是 | 认证服务URL |
| NODE_ENV | 是 | 运行环境 |

### 6.2 模型配置

| 模型 | 用途 | 配置位置 |
|:-----|:-----|:---------|
| DeepSeek-V3 | 对话生成 | `src/lib/chat-models.ts` |
| Hybrid ARIMA + XGBoost | 价格预测 | `src/services/prediction.ts` |

---

## 七、性能规格

| 指标 | 目标值 |
|:-----|:-------|
| 页面加载时间 | < 2s |
| API响应时间 | < 500ms |
| AI对话响应 | < 5s |
| 图谱渲染时间 | < 1s |
| 并发用户数 | ≥ 100 |

---

## 八、安全规格

| 安全措施 | 说明 |
|:---------|:-----|
| 身份认证 | Better Auth + JWT |
| 权限控制 | RBAC角色权限 |
| 数据加密 | HTTPS传输加密 |
| SQL注入防护 | Drizzle ORM参数化查询 |
| XSS防护 | React自动转义 |

---

## 九、版本信息

| 项目 | 版本 |
|:-----|:-----|
| Next.js | 16.1.6 |
| React | 18.x |
| Node.js | ≥ 18.17.0 |
| PostgreSQL | ≥ 14.0 |
| Neo4j | ≥ 4.4 |

---

**TrustWise——构建硫磺定价决策的智能护城河。**
