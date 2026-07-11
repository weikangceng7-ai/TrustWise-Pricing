# TrustWise Pricing — 硫磺采购价格预测与决策辅助系统

**在线地址**: [sulfur-agent-web.vercel.app](https://sulfur-agent-web.vercel.app)  
**GitHub**: [github.com/weikangceng7-ai/TrustWise-Pricing](https://github.com/weikangceng7-ai/TrustWise-Pricing)

企业级大宗原料采购智能辅助系统，覆盖硫磺/磷矿/钾肥/尿素四大品种，通过 Hybrid ARIMA + XGBoost + Transformer 模型进行价格预测，结合双层知识图谱和双引擎决策系统，为企业提供差异化采购建议。

---

## MCP Server — 让 AI 客户端直接调用市场数据

[![MCP](https://img.shields.io/badge/MCP-v0.3.0-green)](./mcp-server) [![Tools](https://img.shields.io/badge/Tools-18-blue)](./mcp-server) [![License](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE)

MCP Server 为系统提供标准化的 **Model Context Protocol** 接口，让 Claude Desktop、Cherry Studio、Continue、Open WebUI 等 AI 客户端能够直接调用多品种市场数据查询、价格预测（含深度学习）、告警订阅等 **18 个工具**。

### 快速体验

```bash
# 零配置 DEMO 模式，无需 API Key
DEMO_MODE=true MCP_TRANSPORT=http npm run mcp:http
```

启动后访问 `http://localhost:3100/health` 确认运行状态。

### 支持 AI 客户端

| 客户端 | 接入方式 | 配置 |
|--------|----------|------|
| **Claude Desktop** | stdio | `claude_desktop_config.json` → mcpServers |
| **Cherry Studio** | HTTP | 设置 → MCP → 添加 → `http://host:3100/mcp` |
| **Continue (VS Code)** | HTTP | `mcpServers` → `{ url: "http://host:3100/mcp" }` |
| **Open WebUI** | HTTP | 设置 → MCP → 添加 → `http://host:3100/mcp` |
| **浏览器扩展** | HTTP | Chrome 加载 `mcp-browser-extension/`，注入 DeepSeek/豆包/ChatGPT |

### Claude Desktop 接入示例

```json
{
  "mcpServers": {
    "sulfur-tracker-agent": {
      "command": "node",
      "args": ["<path-to-mcp-server>/dist/index.js"],
      "env": {
        "API_BASE_URL": "https://sulfur-agent-web.vercel.app",
        "API_KEY": "sk_your_api_key",
        "INDUSTRY_CODE": "sulfur"
      }
    }
  }
}
```

### 18 个工具一览

| 分类 | 工具 | 说明 |
|------|------|------|
| **价格 & 数据** | `get_prices`, `get_inventory`, `get_news` | 多品种价格走势、港口库存、市场新闻 |
| **预测** | `predict_prices`, `predict_with_transformer`, `get_combined_prediction` | ARIMA+XGBoost + Transformer/PatchTST 双模型融合预测 |
| **多品种** | `list_commodities`, `get_commodity_analysis`, `cross_commodity_analysis` | 硫磺/磷矿/钾肥/尿素品种列表、详情、跨品种对比 |
| **精度** | `get_accuracy_metrics` | MAPE/MAE/RMSE/R² 模型精度评估 |
| **知识图谱** | `query_knowledge_graph` | Neo4j 自然语言查询供应链、影响因子 |
| **订阅 & 告警** | `subscribe_alert`, `list_subscriptions`, `update_subscription`, `get_alerts` | 价格/库存/新闻告警管理 |
| **报告 & 案例** | `generate_report`, `get_tracker_status`, `get_success_cases` | 追踪报告、运行状态、客户成功案例 |

### 部署方式

| 方式 | 命令 | 适用场景 |
|------|------|----------|
| **本地开发** | `npm run mcp:dev` (stdio) / `npm run mcp:http` | 本地调试 |
| **Docker** | `docker compose -f mcp-server/docker-compose.yml up -d` | 自托管部署 |
| **Railway** | [![Deploy](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/weikangceng7-ai/TrustWise-Pricing) | 一键云部署 |
| **Render** | [![Deploy](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/weikangceng7-ai/TrustWise-Pricing) | 一键云部署 |

详细文档参见 [MCP Server README](./mcp-server/README.md) 和 [设计文档](./docs/mcp-server-design.md)。

---

## 项目开发

### 环境要求

- Node.js 18+
- PostgreSQL（Neon）
- Neo4j（可选，知识图谱）
- Python 预测服务（可选，默认 localhost:5001）

### 开始开发

```bash
npm install
npm run dev        # 开发服务器（Turbopack）
npm run build      # 生产构建
npm run start      # 启动生产服务器
npm run lint       # 代码检查

# 数据库
npm run db:generate   # 生成迁移
npm run db:push       # 推送 schema 到数据库

# 种子数据
npm run db:seed:yihua       # 宜化知识库
npm run db:seed:yihua-code  # 宜化代码库元数据
```

### 环境变量

`.env.local` 中配置：

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | 是 | PostgreSQL 连接串 |
| `BETTER_AUTH_URL` | 是 | 认证服务基础 URL |
| `NEO4J_URI` / `NEO4J_USER` / `NEO4J_PASSWORD` | 否 | Neo4j 连接配置 |
| `OPENROUTER_API_KEY` | 是 | AI 模型访问密钥 |
| `PREDICTION_SERVICE_URL` | 否 | Python 预测服务地址 |

### 技术栈

- **框架**: Next.js 16 + Turbopack, React 19
- **样式**: Tailwind CSS 4, Shadcn UI, Lucide
- **数据库**: Drizzle ORM + PostgreSQL（Neon）
- **认证**: Better Auth
- **AI**: OpenRouter SDK + AI SDK（DeepSeek、StepFun、Qwen）
- **图数据库**: Neo4j
- **图表**: Recharts
- **MCP**: `@modelcontextprotocol/sdk`

---

## 系统架构

### 三层架构

- **展示层**: Next.js App Router，路由分组 `(auth)`、`(dashboard)`
- **业务层**: API Routes、服务层、AI 集成、双引擎决策系统
- **数据层**: PostgreSQL + Neo4j 知识图谱 + 外部数据源（EIA/FRED/GDELT）

### 核心组件

**双引擎决策系统**:
1. **宏观分析引擎**: Hybrid ARIMA + XGBoost 价格预测、趋势分析、市场新闻
2. **企业决策引擎**: 影响因子权重计算、库存分析、个性化采购建议

**双层知识图谱（Neo4j）**:
- 宏观层：价格影响因子关系网络、产业链结构、市场动态事件
- 企业层：三类典型企业个性化参数、权重矩阵、历史决策记录

### 路由结构

| 路由 | 功能 |
|------|------|
| `/` | 首页落地页 |
| `/(auth)/login`, `/(auth)/register` | 登录注册 |
| `/(dashboard)/dashboard` | 主仪表盘 |
| `/(dashboard)/agent-chat` | AI 聊天界面 |
| `/(dashboard)/enterprises` | 企业管理 |
| `/(dashboard)/reports` | 报告生成 |
| `/(dashboard)/yihua-code-graph` | 代码知识图谱可视化 |

---

## 项目背景

### I. 项目背景

硫磺是磷肥生产的关键原材料，其价格波动直接影响企业采购成本、库存安排和经营风险。采购工作的难点不仅在于价格波动本身，还在于市场信息来源混乱、更新速度快、数据量大。

在全球工业格局中，硫磺跨越化肥、化工、医药等核心产业链，价格波动影响万亿级市场。传统定价依赖人工经验和碎片化信息，导致决策滞后、风险难控；面对同样的市场变化，不同企业会做出不同的采购选择，这一痛点尚未被有效解决。

### II. 双引擎决策系统

本项目采用双引擎协同设计，将市场判断和企业决策整合在一个分析链中：

1. **宏观分析引擎**负责价格预测、信息分析和趋势判断，回答"当前市场是什么状态"
2. **企业决策引擎**负责影响因子计算、动态权重更新和个性化建议生成，回答"当前企业应该如何行动"

两个能力依次联动，系统既能看见市场，又能看见企业。

### III. 双层知识图谱

- **第一层 — 宏观知识图谱**: 价格影响因子关系网络、宏观经济指标关联、产业链结构、市场动态事件
- **第二层 — 企业知识图谱**: 三类典型企业（A/B/C）个性化参数、影响因子权重矩阵、历史采购决策记录

通过本体框架与实例数据的结合，配合知识图谱的自动学习更新，系统能从市场变化进一步推理出企业建议。

### IV. Hybrid ARIMA + XGBoost 价格预测

系统围绕供应侧因素、需求因素、库存信息三个维度建立企业影响因子权重模型。通过不同规模企业的差异化权重设置，统一的趋势判断能够为不同企业生成不同的采购建议。

系统可完整实现"市场分析 — 企业判断 — 结果输出"的流程，最终输出采用两段式结构：
- **第一部分**关注市场层面分析（价格趋势、供需判断、风险因素、趋势预测）
- **第二部分**关注企业层面建议（基于当前选中企业的库存、需求、权重结构生成差异化采购判断）

### V. 创新点

1. **双引擎协同决策**: 市场判断与企业决策整合在一个分析链中
2. **双层知识图谱**: 市场信息与企业信息在同一关系结构中组织
3. **Hybrid ARIMA + XGBoost + Transformer**: 多模型融合价格预测
4. **企业差异化权重模型**: 统一趋势判断 → 不同企业不同建议
5. **MCP 标准化接口**: 18 个工具供任意 AI 客户端调用

### VI. 关键文件

- `src/db/schema.ts` — 数据库 schema 和类型定义
- `src/lib/auth.ts` — Better Auth 配置（含 RBAC 权限）
- `src/lib/neo4j.ts` — Neo4j 驱动和查询辅助函数
- `src/services/prediction.ts` — Python 预测服务 API 客户端
- `src/services/chat.ts` — 聊天响应服务
- `src/lib/chat-models.ts` — AI 模型配置
- `mcp-server/` — MCP Server 完整实现
- `drizzle.config.ts` — Drizzle ORM 配置
