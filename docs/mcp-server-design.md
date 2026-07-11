# MCP Server 设计方案

> **当前版本**: v0.3.0 | **工具数量**: 18 个 | **更新日期**: 2026-07-10

## 0. v0.3 更新亮点 (What's New)

### 0.1 四大新增能力

| 能力 | 工具 | 说明 |
|------|------|------|
| 🆕 多品种支持 | `list_commodities`, `get_commodity_analysis`, `cross_commodity_analysis` | 硫磺/磷矿/钾肥/尿素四大品种全生命周期覆盖 |
| 🆕 Transformer 预测 | `predict_with_transformer`, `get_combined_prediction` | PatchTST 深度学习 + ARIMA+XGBoost 双模型加权融合 |
| 🆕 精度评估 | `get_accuracy_metrics` | MAPE/MAE/RMSE/R² 核心指标 + 各企业精度分布 |
| 🆕 客户案例 | `get_success_cases` | 真实客户 ROI 数据，按行业筛选 |

### 0.2 架构变化

```
v0.2 (11 tools)                        v0.3 (18 tools)
┌───────────────────┐                  ┌──────────────────────────┐
│ 价格 / 库存 / 新闻 │                  │ 价格 / 库存 / 新闻         │
│ 预测 (ARIMA+XGB)   │        →         │ 预测 (ARIMA+XGB + Transf) │
│ 知识图谱 / 订阅    │                  │ 知识图谱 / 订阅            │
│ 报告 / 状态        │                  │ 报告 / 状态               │
└───────────────────┘                  │ 🆕 多品种 / 精度 / 案例   │
                                       └──────────────────────────┘
```

### 0.3 向下兼容

所有 v0.2 的 11 个工具保持不变，已有集成（Claude Desktop / Cherry Studio / Continue）无需任何修改。

---

## 1. 概述

### 1.1 目标
为大宗原料采购价格预测系统提供标准化的 MCP（Model Context Protocol）接口，让各类 AI 客户端（Claude Desktop、Cherry Studio、Continue 等）能够直接调用多品种市场数据查询、价格预测（含 Transformer 深度学习）、告警订阅等工具。

### 1.2 设计原则
- **无状态优先**：每个 HTTP 请求独立处理，避免 session 管理复杂度
- **最小依赖**：仅依赖 `@modelcontextprotocol/sdk`，不引入 Express/Fastify 等框架
- **双传输支持**：同时支持 stdio（本地）和 HTTP（远程）两种传输方式
- **零配置体验**：通过 DEMO 模式让用户无需 API Key 即可试用
- **多品种原生支持**：所有工具原生支持 sulfur/phosphate/potash/urea 品种参数

---

## 2. 架构设计

### 2.1 三层架构

```
┌─────────────────────────────────────────────────────┐
│                   MCP Clients                        │
│  Claude Desktop  |  Cherry Studio  |  Continue       │
─────────────────┬───────────────────────────────────┘
                  │ stdio / HTTP (JSON-RPC 2.0)
─────────────────▼───────────────────────────────────
│                  MCP Server                          │
│  ┌──────────────────────────────────────────────┐  │
│  │  McpServer + StreamableHTTPServerTransport   │  │
│  │  (每个请求新建实例，stateless 模式)           │  │
│  └──────────────────────────────────────────────┘  │
│  11 个工具：价格/库存/新闻/预测/知识图谱/订阅/告警  │
─────────────────┬───────────────────────────────────┘
                  │ HTTP fetch + Bearer Token
┌─────────────────▼───────────────────────────────────┐
│               Next.js Backend API                    │
│  (Vercel: https://sulfur-agent-web.vercel.app)      │
│  /api/v1/prices, /api/prediction, /api/neo4j ...    │
└─────────────────────────────────────────────────────┘
```

### 2.2 工具分类

| 分类 | 工具 | 说明 |
|------|------|------|
| 价格 & 数据 | `get_prices`, `get_inventory`, `get_news` | 查询多品种价格、库存、新闻 |
| 预测 | `predict_prices`, `predict_with_transformer`, `get_combined_prediction` | ARIMA+XGBoost + Transformer 双模型预测 |
| 多品种 | `list_commodities`, `get_commodity_analysis`, `cross_commodity_analysis` | 品种列表、详情分析、跨品种对比 |
| 精度 | `get_accuracy_metrics` | 模型 MAPE/MAE/RMSE/R² 评估 |
| 知识图谱 | `query_knowledge_graph` | Neo4j 查询供应链、影响因子 |
| 订阅 & 告警 | `subscribe_alert`, `list_subscriptions`, `update_subscription`, `get_alerts` | 价格告警管理 |
| 报告 & 案例 | `generate_report`, `get_tracker_status`, `get_success_cases` | 追踪报告、运行状态、客户案例 |

---

## 3. 传输协议设计

### 3.1 stdio 模式（Claude Desktop）
- 通过 stdin/stdout 传输 JSON-RPC 2.0 消息
- 客户端 spawn 子进程，自动加载工具
- 环境变量由客户端配置文件注入

### 3.2 HTTP 模式（远程客户端）
- 使用 `StreamableHTTPServerTransport`
- Endpoint: `http://host:3100/mcp`
- **stateless 模式**：每个 HTTP 请求创建新实例
- 避免 session ID 管理和多客户端冲突

### 3.3 为什么选择 stateless 而非 stateful

| 特性 | stateful (session) | stateless (无状态) |
|------|-------------------|-------------------|
| 多客户端 | ❌ 冲突 | ✅ 支持 |
| Session 管理 | 需要 UUID 管理 | 不需要 |
| 初始化冲突 | 可能 "Already initialized" | 不会 |
| 性能 | 略高（复用实例） | 略低（每请求新建） |
| 复杂度 | 高 | 低 |
| 适用场景 | 单个客户端长连接 | 多客户端短连接 |

**决策**：MCP Server 面向多客户端场景，选择 stateless 模式。

---

## 4. 部署方案

### 4.1 本地开发
```bash
npm run mcp:dev    # stdio
npm run mcp:http   # HTTP
npm run mcp:both   # 双模式
```

### 4.2 Docker 多阶段构建
```
Stage 1 (builder)   → 安装依赖 + tsc 编译
Stage 2 (runtime)   → 仅装生产依赖 + node dist/index.js
```

### 4.3 云平台部署
- **Railway**: `railway.json` 配置
- **Render**: `render.yaml` 配置
- **健康检查**: `/health` 端点

---

## 5. 安全设计

### 5.1 认证
- API Key 通过 `Authorization: Bearer <key>` 传递
- 环境变量注入，不写入代码
- DEMO 模式可跳过认证（仅用于体验）

### 5.2 配额
- 每次工具调用消耗 1 次 API 配额
- 默认每月 1000 次免费配额

---

## 6. 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `API_BASE_URL` | 否 | `https://sulfur-agent-web.vercel.app` | 后端 API 地址 |
| `API_KEY` | 是* | — | 用户 API Key (*DEMO 模式除外) |
| `INDUSTRY_CODE` | 否 | `sulfur` | 行业代码 |
| `MCP_TRANSPORT` | 否 | `stdio` | 传输方式 |
| `MCP_PORT` | 否 | `3100` | HTTP 端口 |
| `DEMO_MODE` | 否 | `false` | 跳过认证 |

---

## 7. 文件结构

```
mcp-server/
├── index.ts              # 入口：加载配置 + 选择传输方式
├── config.ts             # 环境变量加载 + 校验
├── client.ts             # HTTP 客户端封装（v0.3: 新增多品种/精度/Transformer API）
├── http-server.ts        # HTTP 传输层（stateless）
├── stdio-server.ts       # stdio 传输层
├── tools/                # 18 个工具实现
│   ├── prices.ts         # get_prices
│   ├── inventory.ts      # get_inventory
│   ├── news.ts           # get_news
│   ├── prediction.ts     # predict_prices
│   ├── transformer.ts    # 🆕 predict_with_transformer, get_combined_prediction
│   ├── commodities.ts    # 🆕 list_commodities, get_commodity_analysis
│   ├── cross-commodity.ts # 🆕 cross_commodity_analysis
│   ├── accuracy.ts       # 🆕 get_accuracy_metrics
│   ├── success-cases.ts  # 🆕 get_success_cases
│   ├── knowledge-graph.ts # query_knowledge_graph
│   ├── subscriptions.ts  # subscribe_alert, list_subscriptions, update_subscription
│   ├── report.ts         # generate_report
│   └── status.ts         # get_tracker_status
├── Dockerfile            # 多阶段构建
├── docker-compose.yml    # Docker 编排
├── railway.json          # Railway 部署配置
├── render.yaml           # Render 部署配置
└── README.md             # 使用文档
```

---

## 8. 技术选型

| 组件 | 选型 | 原因 |
|------|------|------|
| SDK | `@modelcontextprotocol/sdk` | 官方 MCP 标准实现 |
| 传输层 | Node.js `http` + `StreamableHTTPServerTransport` | 轻量，无需 Express |
| 编译 | TypeScript | 类型安全，与项目一致 |
| 容器 | Docker multi-stage | 生产最佳实践 |
| 部署 | Railway / Render | 一键部署，免费额度 |

---

## 9. 已知限制

1. **Cherry Studio 兼容性**：连接正常，但工具调用可能不生效（取决于客户端实现）
2. **HTTP header 格式**：部分客户端请求头格式不标准，需要调试
3. **Windows 环境变量**：CMD 不支持 `VAR=value cmd` 语法，需要改用 `.env` 或直接传参
