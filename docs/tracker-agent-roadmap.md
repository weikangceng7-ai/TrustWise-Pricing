# Tracker Agent 未来方案文档

> 作者：尔康 | 日期：2026-06-19
> 项目：大宗商品/行业数据追踪 Tracker Agent

---

## 一、背景与目标

### 1.1 项目定位

**核心定位**：大宗商品/行业数据追踪 Tracker Agent

**基础赛道**：初期聚焦硫磺化工品类行情追踪

**长期拓展**：
- 不局限单一化工品类，延伸覆盖药材、石油、黄金、期货等全行业标的
- 依托项目统一可复用架构，底层逻辑不变，仅替换对应行业数据源即可快速适配不同赛道
- 统一架构能大幅降低多行业拓展成本，受众与信息覆盖面更广，落地价值更高

### 1.2 目标用户与商业模式

| 用户群体 | 使用场景 | 付费意愿 |
|----------|----------|----------|
| **企业采购人员** | 价格追踪、采购决策支持 | 高（订阅付费） |
| **行业分析师** | 市场研究、报告生成 | 中（按次付费） |
| **投资机构** | 趋势分析、风险评估 | 高（高级订阅） |
| **个人投资者** | 价格监控、简易分析 | 低（免费+少量付费） |

**商业模式**：
- **订阅制**：按月/年订阅，获取定时报告 + 异动推送
- **按次付费**：复用现有 API Server 配额体系
- **增值服务**：企业定制配置、多品类追踪

### 1.3 与现有 API Server 的关系

项目已实现 API Server（参考 `docs/superpowers/specs/2026-06-14-api-server-design.md`），Tracker Agent 与 API Server 的关系：

```
┌─────────────────────────────────────────────────────────────┐
│                    Tracker Agent 架构                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Web 前端                    Claude Desktop                 │
│   (用户订阅界面)              (MCP Host 入口)                 │
│         │                           │                        │
│         ▼                           ▼                        │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              Tracker Agent Core                      │   │
│   │  - Scheduler (定时调度)                              │   │
│   │  - AlertDetector (异动检测)                          │   │
│   │  - ReportGenerator (报告生成)                        │   │
│   └─────────────────────────────────────────────────────┘   │
│         │                           │                        │
│         ▼                           ▼                        │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              API Server (复用现有)                    │   │
│   │  /api/v1/prices        - 价格数据                     │   │
│   │  /api/v1/prices/predict - 价格预测                    │   │
│   │  /api/v1/decision      - 决策建议                     │   │
│   │  /api/v1/chat          - AI 聊天                      │   │
│   │  /api/v1/data/news     - 新闻舆情                     │   │
│   └─────────────────────────────────────────────────────┘   │
│         │                           │                        │
│         ▼                           ▼                        │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              Data Layer                              │   │
│   │  PostgreSQL + Neo4j + 外部数据源                      │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**核心关系**：
- Tracker Agent **复用** API Server 的所有核心 API 端点
- Tracker Agent **新增**：调度层、异动检测、订阅管理、推送通知
- API Server 的配额体系可用于 Tracker Agent 的按次付费

### 1.4 当前项目基础

sulfur-agent-web 已具备成熟的硫磺决策系统：

| 能力层 | 现有实现 | 可复用程度 | 关键文件 |
|--------|----------|-----------|----------|
| **数据获取** | EIA/FRED/GDELT/AkShare API | ✅ 高复用 | `src/app/api/external-data/*` |
| **数据存储** | PostgreSQL + Drizzle ORM | ✅ 高复用 | `src/db/schema.ts` |
| **知识图谱** | Neo4j + 因子关系推理 | ✅ 高复用 | `src/lib/neo4j.ts` |
| **价格预测** | Python Flask + ARIMA-XGBoost | ✅ 高复用 | `src/services/prediction.ts` |
| **AI 调用** | OpenRouter SDK + DeepSeek-V3 | ✅ 高复用 | `src/app/api/chat/route.ts` |
| **企业配置** | 差异化权重计算系统 | ✅ 高复用 | `src/services/enterprise-knowledge-config.ts` |
| **System Prompt** | 双板块结构化输出模板 | ✅ 高复用 | `src/lib/system-prompt.ts` |
| **API Server** | 配额管理 + 认证体系 | ✅ 高复用 | `src/lib/api-auth.ts`, `src/lib/rate-limit.ts` |

---

## 二、技术概念澄清

### 2.1 MCP (Model Context Protocol) 是什么？

**定义**：MCP 是 Anthropic 于 2024 年底推出的开放协议，旨在标准化 LLM 应用与外部数据源、工具之间的连接方式。

**核心能力**：

| 能力 | 描述 | Tracker Agent 应用示例 |
|------|------|----------------------|
| **Tools** | 可执行的函数，LLM 可主动调用 | `get_sulfur_prices`、`analyze_trend`、`check_inventory` |
| **Resources** | 可读取的数据源 | 价格历史、知识图谱数据、预测结果 |
| **Prompts** | 预定义的交互模板 | 日报模板、周分析模板、异动预警模板 |

**MCP 的价值**：
1. **工具自动发现**：LLM 自动获取可用工具列表，无需人工查阅 API 文档
2. **标准化接口**：不同数据源统一封装，LLM 使用相同调用方式
3. **上下文增强**：Resources 提供背景数据，LLM 分析更精准
4. **Claude Desktop 集成**：原生支持，用户可直接在 Claude Desktop 使用 Tracker Agent

### 2.2 MCP Server 与 API Server 的核心区别

| 维度 | 传统 API Server | MCP Server |
|------|----------------|------------|
| **设计目标** | 服务人类用户 | 服务 LLM/AI Agent |
| **交互模式** | 请求-响应，由人类发起 | LLM 主动发现并调用 |
| **接口描述** | REST/OpenAPI，面向开发者 | 自然语言描述，面向 LLM |
| **返回格式** | 结构化 JSON，需人类解析 | 结构化数据 + 自然语言解释 |
| **能力发现** | 需人工查阅 API 文档 | LLM 自动获取可用工具列表 |
| **上下文理解** | 无上下文 | 可访问 Resources 获取相关背景 |
| **调用入口** | Web/CLI/代码调用 | Claude Desktop/IDE/MCP Host |

**关键差异举例**：

```
// 传统 API Server 响应
GET /api/v1/prices
Response: {
  "success": true,
  "data": [{ "date": "2025-03-20", "price": 985 }],
  "meta": { "quotaRemaining": { "free": 800 } }
}

// MCP Server Tool 响应
Tool: get_sulfur_prices(days: 7)
Response: {
  "content": [
    { 
      "type": "text", 
      "text": "硫磺价格近7日走势：当前985元/吨，较上周上涨2.3%。主要港口库存45万吨，处于中等水平..." 
    },
    { 
      "type": "data", 
      "data": [
        { "date": "2025-03-20", "price": 985, "change": 2.3 },
        { "date": "2025-03-19", "price": 963, "change": -0.5 }
      ]
    }
  ]
}
```

**本质差异**：API Server 返回原始数据 + 配额信息（面向人类开发者），MCP Server 返回数据 + 自然语言解释（面向 LLM）。

### 2.3 MCP Server 在 Tracker Agent 中的角色

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Desktop                            │
│  用户输入: "帮我追踪硫磺价格，超过1000元时提醒我"             │
└──────────────────────┬──────────────────────────────────────┘
                       │ MCP Protocol
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Tracker MCP Server                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Tools:                                               │    │
│  │ - get_prices(industry, days)                        │    │
│  │ - subscribe_alert(industry, threshold)              │    │
│  │ - generate_report(industry, type)                   │    │
│  │ - check_inventory(industry)                         │    │
│  │ - analyze_trend(industry)                           │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Resources:                                           │    │
│  │ - price_history://sulfur/30d                        │    │
│  │ - knowledge_graph://sulfur/factors                  │    │
│  │ - prediction_result://sulfur/7d                     │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────────┘
                       │ 内部调用
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Server (现有)                         │
│  /api/v1/prices        /api/v1/prices/predict               │
│  /api/v1/decision      /api/v1/data/news                    │
└─────────────────────────────────────────────────────────────┘
```

**Tracker MCP Server 职责**：
1. **封装 API Server**：将现有 `/api/v1/*` 端点封装为 MCP Tools
2. **增强订阅功能**：新增 `subscribe_alert`、`generate_report` 等 Tracker 特有工具
3. **提供 Resources**：暴露价格历史、知识图谱等数据供 LLM 参考
4. **自然语言描述**：每个 Tool 用中文描述用途，便于 Claude 理解

### 2.4 当前项目是否适合引入 MCP？

**评估结论**：适合，但分阶段实施

| 场景 | MCP 适用性 | 建议 |
|------|------------|------|
| 单一 Web 入口 | 低必要性 | Phase 1 保持现有 API Server |
| Claude Desktop 集成 | **高必要性** | Phase 2 引入 MCP Server |
| 多 Agent 协作 | 高必要性 | Phase 3 引入 |
| 可插拔数据源 | 中必要性 | MCP Server + Adapter 结合 |
| 工具自动发现 | **高必要性** | MCP 可大幅简化 |

**推荐策略**：
- **Phase 1**：在现有 API Server 基础上，新增 Tracker Agent 核心模块（调度、异动检测）
- **Phase 2**：创建 MCP Server，封装 API Server，支持 Claude Desktop 入口
- **Phase 3**：MCP Server 独立部署，支持多行业 MCP Server Pool

---

## 三、Tracker Agent 架构设计

### 3.1 核心能力定义

```
┌─────────────────────────────────────────────────────────────┐
│                    Tracker Agent 五大核心能力                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 数据追踪           2. 异动感知           3. 趋势分析      │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐    │
│  │ 多源采集    │     │ 智能阈值    │     │ 因果推理    │    │
│  │ 定时更新    │     │ 实时预警    │     │ 知识图谱    │    │
│  │ 数据融合    │     │ 推送通知    │     │ 预测模型    │    │
│  └─────────────┘     └─────────────┘     └─────────────┘    │
│                                                              │
│  4. 决策支持           5. 报告生成                           │
│  ┌─────────────┐     ┌─────────────┐                        │
│  │ 企业适配    │     │ 结构化输出  │                        │
│  │ 个性化建议  │     │ 多格式导出  │                        │
│  │ 权重计算    │     │ 定时发送    │                        │
│  └─────────────┘     └─────────────┘                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**能力详细说明**：

| 能力 | 核心功能 | 实现方式 | 调用现有 API |
|------|----------|----------|-------------|
| **数据追踪** | 定时采集价格、库存、新闻数据 | Scheduler + DataAdapter | `/api/v1/prices`, `/api/v1/data/*` |
| **异动感知** | 阈值检测 + ML 异常检测 + 即时推送 | AlertDetector + Notification | 新增模块 |
| **趋势分析** | 价格预测 + 因果推理 + 趋势识别 | Python 服务 + Neo4j | `/api/v1/prices/predict` |
| **决策支持** | 企业配置 + 权重计算 + 个性化建议 | EnterpriseConfig + 权重算法 | `/api/v1/decision` |
| **报告生成** | 日/周/月报 + 异动报告 + 多格式导出 | ReportGenerator + jsPDF/docx | `/api/v1/chat` 生成内容 |

### 3.2 Input/Output 逻辑设计

**输入层 (Input)**：

```
┌─────────────────────────────────────────────┐
│ 1. 自然语言查询                              │
│    例: "硫磺价格最近走势如何？"               │
│    例: "库存降到多少了，是否需要补货？"        │
│    来源: Web Chat / Claude Desktop           │
├─────────────────────────────────────────────┤
│ 2. 企业上下文                                │
│    - 企业代码: yihua/luxi/jinzhengda         │
│    - 库存参数: 当前库存、安全天数             │
│    - 采购偏好: 激进/稳健/保守                  │
│    来源: 用户配置 / 知识图谱                  │
├─────────────────────────────────────────────┤
│ 3. 订阅配置                                  │
│    - 追踪品类: 硫磺/药材/石油/黄金            │
│    - 关注指标: 价格/库存/新闻                 │
│    - 预警阈值: 价格波动>5%/库存<20天          │
│    - 通知渠道: Web推送/邮件/SMS/微信          │
│    来源: 新增订阅管理 API                     │
├─────────────────────────────────────────────┤
│ 4. 定时触发                                  │
│    - 每日行情简报 (08:00)                    │
│    - 每周趋势分析 (周一 09:00)               │
│    - 异动即时推送 (阈值触发)                 │
│    来源: Scheduler 定时任务                   │
└─────────────────────────────────────────────┘
```

**输出层 (Output)**：

```
┌─────────────────────────────────────────────┐
│ 1. 实时问答响应                              │
│    - 第一板块: 宏观市场分析                   │
│    - 第二板块: 企业专项建议                   │
│    - 格式: Markdown 表格 + 图标              │
│    输出至: Web Chat / Claude Desktop         │
├─────────────────────────────────────────────┤
│ 2. 异动预警通知                              │
│    - 渠道: Web推送/邮件/SMS/微信              │
│    - 内容: 异动类型 + 影响分析 + 建议行动     │
│    - 优先级: 高/中/低                         │
│    输出至: Notification 系统                  │
├─────────────────────────────────────────────┤
│ 3. 定期报告                                  │
│    - 日度: 市场快报 (价格+库存+新闻摘要)      │
│    - 周度: 趋势深度分析                       │
│    - 月度: 行业综合报告                       │
│    - 格式: PDF/Word/Markdown/Email           │
│    输出至: 邮件 / Web 报告列表                │
├─────────────────────────────────────────────┤
│ 4. 结构化数据 API                            │
│    - JSON API 供第三方集成                    │
│    - 图谱数据供可视化展示                     │
│    输出至: 现有 /api/v1/* 端点                │
└─────────────────────────────────────────────┘
```

### 3.3 数据流架构

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            Tracker Agent 数据流                           │
└──────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────┐     ┌─────────────┐
                    │  Web 前端   │     │ Claude Desktop│
                    │ (订阅界面)  │     │ (MCP 入口)   │
                    └──────┬──────┘     └──────┬──────┘
                           │                   │
                           │    MCP Protocol   │
                           │                   ▼
                           │           ┌─────────────┐
                           │           │ MCP Server  │
                           │           │ (Tools/Res) │
                           │           └──────┬──────┘
                           │                  │
                           └──────────────────┼──────────────────┐
                                              │                  │
                    ┌─────────────────────────▼──────────────────▼───┐
                    │                 Tracker Agent Core              │
                    │  ┌──────────────┐  ┌──────────────┐            │
                    │  │ Scheduler    │  │ AlertDetector │            │
                    │  │ (定时调度)    │  │ (异动检测)    │            │
                    │  └──────────────┘  └──────────────┘            │
                    │  ┌──────────────┐  ┌──────────────┐            │
                    │  │ ReportGen    │  │ Subscription │            │
                    │  │ (报告生成)    │  │ Manager      │            │
                    │  └──────────────┘  └──────────────┘            │
                    └─────────────────────────┬──────────────────────┘
                                              │
                                              ▼
                    ┌─────────────────────────────────────────────────┐
                    │                 API Server (复用现有)            │
                    │  /api/v1/prices          /api/v1/prices/predict │
                    │  /api/v1/decision        /api/v1/data/news      │
                    │  /api/v1/chat            /api/v1/data/inventory │
                    │                                                 │
                    │  配额管理: api_quotas + rate_limit             │
                    └─────────────────────────┬──────────────────────┘
                                              │
          ┌───────────────────────────────────┼───────────────────────┐
          │                                   │                       │
    ┌─────▼─────┐                      ┌─────▼─────┐           ┌─────▼─────┐
    │ PostgreSQL│                      │   Neo4j   │           │ Python    │
    │ prices    │                      │ 知识图谱   │           │ 预测服务  │
    │ inventory │                      │ 因子关系   │           │ ARIMA-XGB │
    │ quotas    │                      │ 企业权重   │           │           │
    └─────┬─────┘                      └─────┬─────┘           └─────┬─────┘
          │                                   │                       │
          └───────────────────────────────────┼───────────────────────┘
                                              │
                    ┌─────────────────────────▼─────────────────────────┐
                    │                 Notification System               │
                    │  Web Push  │  Email  │  SMS  │  微信 (预留)       │
                    └───────────────────────────────────────────────────┘
```

### 3.4 与现有系统的集成点

| 集成点 | 现有实现 | Tracker Agent 调用方式 | 是否新增 |
|--------|----------|------------------------|----------|
| **价格数据** | `/api/v1/prices` | Scheduler 定时调用 | 复用 |
| **价格预测** | `/api/v1/prices/predict` | AlertDetector 调用 | 复用 |
| **决策建议** | `/api/v1/decision` | ReportGenerator 调用 | 复用 |
| **新闻数据** | `/api/v1/data/news` | Scheduler 定时调用 | 复用 |
| **库存数据** | `/api/v1/data/inventory` | AlertDetector 调用 | 复用 |
| **AI 聊天** | `/api/v1/chat` | ReportGenerator 生成报告内容 | 复用 |
| **配额管理** | `api_quotas` 表 | 订阅用户配额检查 | 复用 |
| **认证体系** | `api_auth.ts` | MCP Server 认证 | 复用 |
| **订阅管理** | 无 | 新增订阅 CRUD API | **新增** |
| **异动检测** | 无 | 新增 AlertDetector 模块 | **新增** |
| **定时调度** | 无 | 新增 Scheduler 模块 | **新增** |
| **通知推送** | 现有 Notification 表 | 扩展支持 Tracker 告警 | **扩展** |

---

## 四、多行业拓展架构

### 4.1 统一架构 + 可插拔数据源

**核心设计原则**：
1. **Agent Core 不变**：调度、异动检测、报告生成逻辑通用
2. **Industry Config 驱动**：通过配置模板定义行业差异
3. **DataSourceAdapter 抽象**：数据获取接口统一，实现可替换
4. **知识图谱模板化**：不同行业因子定义不同，图谱结构可复用

```
┌───────────────────────────────────────────────────────────────────────┐
│                     Tracker Agent Universal Architecture              │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                 Agent Core (完全不变)                          │   │
│  │                                                               │   │
│  │  Scheduler          AlertDetector        ReportGenerator      │   │
│  │  ┌─────────┐        ┌─────────┐          ┌─────────┐         │   │
│  │  │定时任务 │        │阈值检测 │          │日/周/月报│         │   │
│  │  │数据采集 │        │异常检测 │          │异动报告 │         │   │
│  │  └─────────┘        └─────────┘          └─────────┘         │   │
│  │                                                               │   │
│  │  SubscriptionManager          MCP Server Host                │   │
│  │  ┌─────────┐                  ┌─────────┐                    │   │
│  │  │订阅CRUD │                  │Tool注册 │                    │   │
│  │  │阈值配置 │                  │资源暴露 │                    │   │
│  │  └─────────┘                  └─────────┘                    │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                │                                      │
│                                ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │               Industry Config Layer (配置驱动)                 │   │
│  │                                                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │   │
│  │  │ Sulfur     │  │ Herb       │  │ Oil        │            │   │
│  │  │ Config     │  │ Config     │  │ Config     │            │   │
│  │  │------------│  │------------│  │------------│            │   │
│  │  │ 因子定义   │  │ 因子定义   │  │ 因子定义   │            │   │
│  │  │ 企业模板   │  │ 企业模板   │  │ 企业模板   │            │   │
│  │  │ 预警规则   │  │ 预警规则   │  │ 预警规则   │            │   │
│  │  │ 报告模板   │  │ 报告模板   │  │ 报告模板   │            │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘            │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                │                                      │
│                                ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │             Data Source Abstraction Layer                      │   │
│  │                                                               │   │
│  │  interface DataSourceAdapter {                                │   │
│  │    fetchPrices()      // 价格数据                              │   │
│  │    fetchInventory()   // 库存数据                              │   │
│  │    fetchNews()        // 新闻舆情                              │   │
│  │    fetchMacro()       // 宏观指标                              │   │
│  │  }                                                            │   │
│  │                                                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │   │
│  │  │ Sulfur     │  │ Herb       │  │ Oil        │            │   │
│  │  │ Adapter    │  │ Adapter    │  │ Adapter    │            │   │
│  │  │------------│  │------------│  │------------│            │   │
│  │  │复用现有API │  │ 药材API   │  │复用EIA API │            │   │
│  │  │EIA/FRED   │  │产地库存   │  │扩展原油API │            │   │
│  │  │GDELT/AkSh │  │行业新闻   │  │            │            │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘            │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                │                                      │
│                                ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │            Knowledge Graph Template Layer                      │   │
│  │                                                               │   │
│  │  - Industry Ontology (行业本体定义)                             │   │
│  │  - Factor Definitions (价格影响因子)                            │   │
│  │  - Enterprise Templates (企业差异化配置)                        │   │
│  │  - Relation Rules (因子间影响关系)                              │   │
│  │                                                               │   │
│  │  参考: src/services/enterprise-knowledge-config.ts            │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### 4.2 数据源抽象接口

```typescript
// src/services/tracker/adapter-interface.ts

/**
 * 数据源适配器接口 - 所有行业数据源需实现此接口
 * 
 * 设计原则：
 * 1. 接口方法统一，便于 Agent Core 调用
 * 2. 返回数据格式统一，便于数据融合层处理
 * 3. 配置可动态更新，支持阈值调整
 */
export interface DataSourceAdapter {
  // ========== 基础信息 ==========
  industryCode: string;          // 行业代码: 'sulfur' | 'herb' | 'oil' | 'gold'
  industryName: string;          // 行业名称: '硫磺化工' | '药材中药' | '石油原油'
  description: string;           // 描述

  // ========== 核心数据获取方法 ==========
  
  /**
   * 获取价格数据
   * @param options 查询选项
   * @returns 统一格式的价格数据
   */
  fetchPrices(options?: PriceQueryOptions): Promise<PriceData[]>;
  
  /**
   * 获取库存数据（可选，部分行业无公开库存数据）
   */
  fetchInventory?(options?: InventoryQueryOptions): Promise<InventoryData[]>;
  
  /**
   * 获取新闻舆情
   */
  fetchNews(options?: NewsQueryOptions): Promise<NewsData[]>;
  
  /**
   * 获取宏观经济指标
   */
  fetchMacroIndicators?(options?: MacroQueryOptions): Promise<MacroIndicatorData[]>;

  // ========== 配置方法 ==========
  getConfig(): DataSourceConfig;
  updateConfig(config: Partial<DataSourceConfig>): void;

  // ========== 健康检查 ==========
  healthCheck(): Promise<HealthCheckResult>;
}

// ========== 统一数据类型定义 ==========

export interface PriceData {
  date: string;                  // ISO 日期
  price: number;                 // 价格数值
  unit: string;                  // 单位: '元/吨' | '美元/桶' | '元/克'
  market?: string;               // 市场: '华东' | '华北' | '国际'
  region?: string;               // 区域
  specification?: string;        // 规格: '颗粒硫磺' | 'WTI原油'
  change?: number;               // 价格变化
  changePercent?: number;        // 变化百分比
  source: string;                // 数据来源标识
}

export interface InventoryData {
  date: string;
  quantity: number;
  unit: string;
  location?: string;             // 地点: '主要港口' | '产地'
  capacity?: number;             // 仓储容量
  utilization?: number;          // 利用率百分比
  source: string;
}

export interface NewsData {
  id: string;
  title: string;
  content?: string;
  source: string;                // 新闻来源
  date: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  relevanceScore?: number;       // 与行业相关度 0-1
  url?: string;
}

// ========== 查询选项 ==========

export interface PriceQueryOptions {
  startDate?: string;
  endDate?: string;
  days?: number;                 // 最近N天
  market?: string;
  region?: string;
}
```

### 4.3 行业配置模板结构

参考现有 `enterprise-knowledge-config.ts` 的设计模式：

```typescript
// src/services/tracker/industry-config.ts

/**
 * 行业配置模板 - 定义一个行业的完整追踪配置
 * 
 * 设计原则：
 * 1. 参考 enterprise-knowledge-config.ts 的结构
 * 2. 所有配置项可被 Tracker Agent Core 直接使用
 * 3. 支持多行业并存，互不干扰
 */
export interface IndustryConfig {
  // ========== 基础信息 ==========
  code: string;                  // 'sulfur' | 'herb' | 'oil' | 'gold'
  name: string;                  // '硫磺化工' | '药材中药' | '石油原油'
  category: 'commodity' | 'medicine' | 'energy' | 'finance';
  description: string;

  // ========== 数据源配置 ==========
  dataSources: {
    priceSource: DataSourceAdapter;
    inventorySource?: DataSourceAdapter;
    newsSource: DataSourceAdapter;
    macroSources?: DataSourceAdapter[];
  };

  // ========== 因子定义（参考 FACTOR_DEFINITIONS）==========
  factors: FactorDefinition[];

  // ========== 企业模板（参考 ENTERPRISE_CONFIGS）==========
  enterpriseTemplates: EnterpriseTemplate[];

  // ========== 知识图谱本体 ==========
  ontology: {
    nodeTypes: string[];         // ['Enterprise', 'Factor', 'Price', 'News']
    relationTypes: string[];     // ['HAS_FACTOR', 'INFLUENCES', 'CORRELATES_WITH']
    factorCategories: string[];  // ['supply', 'demand', 'inventory', 'external']
  };

  // ========== System Prompt 模板（参考现有 SYSTEM_PROMPT）==========
  systemPromptTemplate: string;

  // ========== 报告模板 ==========
  reportTemplates: {
    daily: string;               // 日报模板
    weekly: string;              // 周报模板
    monthly: string;             // 月报模板
    alert: string;               // 异动预警模板
  };

  // ========== 预警规则 ==========
  alertRules: AlertRule[];
}

// ========== 预警规则定义 ==========

export interface AlertRule {
  type: 'price_high' | 'price_low' | 'price_change' | 'inventory_low' | 'news_negative';
  condition: string;             // 条件表达式: 'price > 1000' | 'changePercent < -5'
  priority: 'high' | 'medium' | 'low';
  channels: ('web' | 'email' | 'sms' | 'wechat')[];
  template: string;              // 预警内容模板
}

// ========== 硫磺行业配置实例 ==========

export const SULFUR_CONFIG: IndustryConfig = {
  code: 'sulfur',
  name: '硫磺化工',
  category: 'commodity',
  description: '硫磺采购价格追踪与决策支持',

  dataSources: {
    priceSource: new SulfurDataSourceAdapter(),
    inventorySource: new SulfurInventoryAdapter(),
    newsSource: new GDELTAdapter({ keywords: ['硫磺', 'sulfur', '化肥'] }),
    macroSources: [
      new EIAAdapter({ series: ['DCOILWTICO', 'DCOILBRENTEU'] }),
      new FREDAdapter({ series: ['DEXCHUS'] }),
      new AkShareAdapter({ types: ['oil', 'brent', 'usdcny', 'bdi'] }),
    ],
  },

  // 复用现有因子定义
  factors: FACTOR_DEFINITIONS,

  // 复用现有企业配置
  enterpriseTemplates: ENTERPRISE_CONFIGS,

  ontology: {
    nodeTypes: ['Enterprise', 'Factor', 'Price', 'News', 'Event'],
    relationTypes: ['HAS_FACTOR', 'INFLUENCES', 'CORRELATES_WITH', 'REPORTED_IN'],
    factorCategories: ['supply', 'demand', 'inventory', 'external', 'internal'],
  },

  // 复用现有 System Prompt
  systemPromptTemplate: SYSTEM_PROMPT,

  reportTemplates: {
    daily: `## {date} 硫磺市场快报\n\n{price_summary}\n\n{inventory_summary}\n\n{news_summary}`,
    weekly: `## {date_range} 硫磺周度趋势分析\n\n{trend_analysis}\n\n{factor_analysis}\n\n{recommendation}`,
    monthly: `## {month} 硫磺行业综合报告\n\n{comprehensive_analysis}`,
    alert: `⚠️ {alert_type} 预警\n\n{alert_content}\n\n建议行动: {action}`,
  },

  alertRules: [
    { type: 'price_high', condition: 'price > 1000', priority: 'high', channels: ['web', 'email'] },
    { type: 'price_change', condition: 'changePercent < -5', priority: 'medium', channels: ['web'] },
    { type: 'inventory_low', condition: 'inventory < 40', priority: 'high', channels: ['web', 'email', 'sms'] },
    { type: 'news_negative', condition: 'sentiment === "negative" && relevance > 0.8', priority: 'medium', channels: ['web'] },
  ],
};
```

### 4.4 新行业接入流程

```
新行业接入 (以药材为例):

┌─────────────────────────────────────────────────────────────┐
│ Step 1: 定义行业配置                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 创建 src/services/tracker/configs/herb-config.ts       │ │
│ │                                                         │ │
│ │ export const HERB_CONFIG: IndustryConfig = {            │ │
│ │   code: 'herb',                                         │ │
│ │   name: '药材中药',                                      │ │
│ │   category: 'medicine',                                 │ │
│ │                                                         │ │
│ │   factors: [                                            │ │
│ │     { id: 'weather', name: '天气气候', category: 'external' },│ │
│ │     { id: 'origin_supply', name: '产地供应', category: 'supply' },│ │
│ │     { id: 'pharma_demand', name: '药厂需求', category: 'demand' },│ │
│ │     { id: 'policy_regulation', name: '药典政策', category: 'external' },│ │
│ │     ...                                                 │ │
│ │   ],                                                    │ │
│ │                                                         │ │
│ │   enterpriseTemplates: [                                │ │
│ │     { code: 'tcm_factory_1', name: 'XX药厂', ... },     │ │
│ │     { code: 'tcm_factory_2', name: 'YY药业', ... },     │ │
│ │   ],                                                    │ │
│ │                                                         │ │
│ │   alertRules: [                                         │ │
│ │     { type: 'price_change', condition: 'changePercent > 10' },│ │
│ │     { type: 'weather_impact', condition: '...' },       │ │
│ │   ],                                                    │ │
│ │ }                                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Step 2: 实现数据适配器                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 创建 src/services/tracker/adapters/herb-adapter.ts     │ │
│ │                                                         │ │
│ │ export class HerbDataSourceAdapter implements DataSourceAdapter {│ │
│ │   industryCode = 'herb';                                │ │
│ │   industryName = '药材中药';                             │ │
│ │                                                         │ │
│ │   async fetchPrices(options) {                          │ │
│ │     // 对接药材价格 API (如康美中药网、中药材天地网)        │ │
│ │     const response = await fetch('https://herb-price-api/prices');│ │
│ │     return this.transformToPriceData(response);         │ │
│ │   }                                                     │ │
│ │                                                         │ │
│ │   async fetchNews(options) {                            │ │
│ │     // 对接药材行业新闻源                                 │ │
│ │   }                                                     │ │
│ │                                                         │ │
│ │   async fetchMacroIndicators(options) {                 │ │
│ │     // 天气数据、产地库存等                               │ │
│ │   }                                                     │ │
│ │ }                                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Step 3: 注册到 Agent                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ src/services/tracker/registry.ts                       │ │
│ │                                                         │ │
│ │ TrackerAgentRegistry.register(                          │ │
│ │   HERB_CONFIG,                                          │ │
│ │   HerbDataSourceAdapter                                 │ │
│ │ );                                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Step 4: 初始化知识图谱                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Neo4j.seedIndustryGraph(HERB_CONFIG)                    │ │
│ │                                                         │ │
│ │ // 创建企业节点                                          │ │
│ │ CREATE (e:Enterprise {code: 'tcm_factory_1', name: 'XX药厂'})│ │
│ │                                                         │ │
│ │ // 创建因子节点                                          │ │
│ │ CREATE (f:Factor {id: 'weather', name: '天气气候'})       │ │
│ │                                                         │ │
│ │ // 创建关系                                              │ │
│ │ CREATE (e)-[:HAS_FACTOR {weight: 30}]->(f)              │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Step 5: 启动追踪                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ TrackerAgent.startTracking('herb')                      │ │
│ │                                                         │ │
│ │ // Scheduler 开始定时采集                                │ │
│ │ // AlertDetector 开始监控异动                            │ │
│ │ // 用户可以订阅药材追踪                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

接入完成时间估计：1-2 天（如果数据源 API 已就绪）
```

---

## 五、MCP Server 设计

### 5.1 MCP Tools 定义

```typescript
// src/services/tracker/mcp/sulfur-mcp-server.ts

/**
 * Tracker MCP Server - 为 Claude Desktop 提供工具
 * 
 * 核心设计：
 * 1. 封装现有 API Server 端点
 * 2. 提供自然语言描述，便于 Claude 理解
 * 3. 返回数据 + 解释，而非纯数据
 */
export const TRACKER_MCP_TOOLS = {
  
  // ========== 价格数据工具 ==========
  get_sulfur_prices: {
    name: 'get_sulfur_prices',
    description: '获取硫磺价格数据，包括近N天的价格走势、变化幅度',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: '查询最近多少天的数据，默认7天' },
        market: { type: 'string', description: '市场区域，如华东、华北' },
      },
      required: ['days'],
    },
    handler: async (params: { days: number; market?: string }) => {
      // 调用现有 API Server
      const response = await fetch(`/api/v1/prices?days=${params.days}`);
      const data = await response.json();
      
      // 返回 MCP 格式（数据 + 解释）
      return {
        content: [
          { type: 'text', text: `硫磺价格近${params.days}天走势分析：\n当前价格${data.data[0].price}元/吨，变化${data.data[0].changePercent}%...` },
          { type: 'data', data: data.data },
        ],
      };
    },
  },

  // ========== 预警订阅工具 ==========
  subscribe_price_alert: {
    name: 'subscribe_price_alert',
    description: '订阅硫磺价格预警，当价格达到阈值时自动通知',
    inputSchema: {
      type: 'object',
      properties: {
        threshold: { type: 'number', description: '预警阈值价格' },
        direction: { type: 'string', enum: ['above', 'below'], description: '高于或低于阈值' },
        channels: { type: 'array', items: { type: 'string' }, description: '通知渠道' },
      },
      required: ['threshold', 'direction'],
    },
    handler: async (params) => {
      // 调用新增订阅 API
      const response = await fetch('/api/tracker/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          industryCode: 'sulfur',
          alertRules: [{ type: 'price_threshold', ...params }],
        }),
      });
      return { content: [{ type: 'text', text: `已成功订阅价格预警，阈值${params.threshold}元/吨` }] };
    },
  },

  // ========== 报告生成工具 ==========
  generate_daily_report: {
    name: 'generate_daily_report',
    description: '生成硫磺市场日报，包含价格、库存、新闻摘要',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: '报告日期，默认今天' },
      },
    },
    handler: async (params) => {
      // 调用 ReportGenerator
      const report = await ReportGenerator.generateDaily('sulfur', params.date);
      return { content: [{ type: 'text', text: report }, { type: 'data', data: report }] };
    },
  },

  // ========== 价格预测工具 ==========
  predict_price_trend: {
    name: 'predict_price_trend',
    description: '预测硫磺未来价格走势，基于机器学习模型',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: '预测未来多少天' },
      },
      required: ['days'],
    },
    handler: async (params) => {
      const response = await fetch('/api/v1/prices/predict', {
        method: 'POST',
        body: JSON.stringify({ days: params.days }),
      });
      const data = await response.json();
      return {
        content: [
          { type: 'text', text: `未来${params.days}天价格预测：预计价格区间${data.prediction.range}...` },
          { type: 'data', data: data.prediction },
        ],
      };
    },
  },

  // ========== 决策建议工具 ==========
  get_purchase_decision: {
    name: 'get_purchase_decision',
    description: '根据企业库存情况生成采购决策建议',
    inputSchema: {
      type: 'object',
      properties: {
        enterpriseCode: { type: 'string', description: '企业代码，如yihua、luxi' },
      },
      required: ['enterpriseCode'],
    },
    handler: async (params) => {
      const response = await fetch('/api/v1/decision', {
        method: 'POST',
        body: JSON.stringify({ enterpriseCode: params.enterpriseCode }),
      });
      const data = await response.json();
      return {
        content: [
          { type: 'text', text: `为${params.enterpriseCode}生成的采购建议：\n${data.decision.suggestion}...` },
          { type: 'data', data: data.decision },
        ],
      };
    },
  },

  // ========== 知识图谱查询工具 ==========
  query_knowledge_graph: {
    name: 'query_knowledge_graph',
    description: '查询硫磺价格影响因子及其关系网络',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '查询问题' },
      },
      required: ['query'],
    },
    handler: async (params) => {
      const context = await generateKnowledgeGraphContext(params.query);
      return { content: [{ type: 'text', text: context }] };
    },
  },
};
```

### 5.2 MCP Resources 定义

```typescript
// src/services/tracker/mcp/resources.ts

/**
 * MCP Resources - 可被 Claude 主动访问的数据源
 */
export const TRACKER_MCP_RESOURCES = {
  
  // 价格历史资源
  'price_history://sulfur/30d': {
    name: '硫磺价格历史（近30天）',
    description: '硫磺价格数据，可用于趋势分析',
    mimeType: 'application/json',
    read: async () => {
      const response = await fetch('/api/v1/prices?days=30');
      return await response.json();
    },
  },

  // 知识图谱资源
  'knowledge_graph://sulfur/factors': {
    name: '硫磺价格影响因子图谱',
    description: '价格影响因子及其关系网络',
    mimeType: 'application/json',
    read: async () => {
      return await getAllFactorsWithRelations();
    },
  },

  // 预测结果资源
  'prediction://sulfur/7d': {
    name: '硫磺7日价格预测',
    description: '基于机器学习模型的预测结果',
    mimeType: 'application/json',
    read: async () => {
      const response = await fetch('/api/v1/prices/predict', {
        method: 'POST',
        body: JSON.stringify({ days: 7 }),
      });
      return await response.json();
    },
  },
};
```

### 5.3 Claude Desktop 配置

```json
// Claude Desktop MCP 配置文件
// 位置: ~/AppData/Roaming/Claude/claude_desktop_config.json (Windows)
// 或: ~/Library/Application Support/Claude/claude_desktop_config.json (Mac)

{
  "mcpServers": {
    "tracker-sulfur": {
      "command": "node",
      "args": ["D:/市场方案agent/sulfur-agent-web/mcp-server/index.js"],
      "env": {
        "API_BASE_URL": "https://sulfur-agent-web.vercel.app/api/v1",
        "API_KEY": "your-api-key-here"
      }
    }
  }
}
```

---

## 六、技术选型建议

### 6.1 Agent 框架选择

| 框架 | 优势 | 劣势 | 适用场景 | 项目适配度 |
|------|------|------|----------|-----------|
| LangChain | 生态成熟、工具丰富 | 抽象层多、调试复杂 | 复杂 Agent 链式调用 | ⭐⭐ 低 |
| LlamaIndex | 数据索引能力强、RAG 优化 | Agent 能力弱 | 知识库密集型应用 | ⭐⭐ 低 |
| **自研轻量框架** | 贴合项目需求、可控性强 | 需自建组件 | 定制化 Agent | ⭐⭐⭐⭐⭐ 高 |
| AI SDK (Vercel) | 与 Next.js 集成简单 | Agent 抽象弱 | 简单聊天场景 | ⭐⭐⭐ 中 |
| **MCP TypeScript SDK** | 标准化、Claude Desktop 原生支持 | 需学习新协议 | MCP Server 实现 | ⭐⭐⭐⭐⭐ 高 |

**推荐方案**：

```
┌─────────────────────────────────────────────────────────────┐
│                  Tracker Agent 技术栈                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Agent Core: 自研轻量框架                                 │
│     - TrackerAgent.ts (编排核心)                             │
│     - Scheduler.ts (定时调度)                                │
│     - AlertDetector.ts (异动检测)                            │
│     - ReportGenerator.ts (报告生成)                          │
│                                                             │
│  2. MCP Server: MCP TypeScript SDK                          │
│     - @modelcontextprotocol/sdk                             │
│     - 封装 API Server 为 MCP Tools                           │
│                                                             │
│  3. AI 调用: 复用现有 OpenRouter SDK                         │
│     - DeepSeek-V3 (主模型)                                   │
│     - StepFun/Qwen (备用)                                    │
│                                                             │
│  4. 数据获取: 复用现有 API Server                             │
│     - /api/v1/* 端点                                         │
│                                                             │
│  5. 配额管理: 复用现有 api_quotas 表                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**理由**：
- 项目已有成熟的数据层、API Server、配额体系
- Tracker Agent 核心需求是调度 + 异动检测，无复杂 Agent 链
- MCP SDK 用于 Claude Desktop 集成，与自研框架互补

### 6.2 数据存储方案

| 存储 | 当前用途 | Tracker Agent 需求 | 建议 |
|------|----------|---------------------|------|
| **PostgreSQL** | 价格、库存、用户、API配额 | 新增订阅表、追踪记录表 | ✅ 保持 + 扩展 |
| **Neo4j** | 知识图谱 | 支持多行业图谱 | ✅ 保持 + 扩展 |
| **Redis** | Rate Limit 存储 | 缓存新闻、外部 API 响应 | 🆕 新增 |
| **文件系统** | 报告导出 PDF/Word | 继续使用 | ✅ 保持 |

**新增数据表设计**：

```typescript
// src/db/schema-tracker.ts

/**
 * 追踪订阅配置表
 */
export const trackerSubscriptions = pgTable("tracker_subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  industryCode: varchar("industry_code", { length: 50 }).notNull(), // 'sulfur' | 'herb' | 'oil'
  targetCode: varchar("target_code", { length: 100 }),              // 具体标的，如 'granular_sulfur'
  alertRules: jsonb("alert_rules").$type<AlertRule[]>().notNull().default([]),
  notificationChannels: jsonb("notification_channels").$type<string[]>().notNull().default(['web']),
  reportFrequency: varchar("report_frequency", { length: 20 }).default('daily'), // 'daily' | 'weekly' | 'monthly'
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * 追踪记录表 - 每次 Tracker 执行的记录
 */
export const trackerRecords = pgTable("tracker_records", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").references(() => trackerSubscriptions.id),
  industryCode: varchar("industry_code", { length: 50 }).notNull(),
  recordType: varchar("record_type", { length: 30 }).notNull(), // 'price_check' | 'inventory_check' | 'news_scan' | 'report_gen'
  recordTime: timestamp("record_time").notNull(),
  dataSnapshot: jsonb("data_snapshot").notNull(),               // 当时数据快照
  analysisResult: jsonb("analysis_result"),                     // 分析结果
  alertTriggered: boolean("alert_triggered").default(false),
  alertContent: text("alert_content"),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * 异动日志表
 */
export const trackerAlerts = pgTable("tracker_alerts", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").references(() => trackerSubscriptions.id),
  alertType: varchar("alert_type", { length: 50 }).notNull(),    // 'price_high' | 'inventory_low' | 'news_negative'
  severity: varchar("severity", { length: 20 }).notNull(),       // 'high' | 'medium' | 'low'
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  recommendation: text("recommendation"),
  channelsSent: jsonb("channels_sent").$type<string[]>(),
  sentAt: timestamp("sent_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

---

## 七、实施路线图

### Phase 1: 硫磺赛道 MVP (Week 1-2)

**目标**：在现有 API Server 基础上，新增 Tracker Agent 核心模块

**Week 1**：

| Day | 任务 | 输出文件 | 调用现有 API |
|-----|------|----------|-------------|
| 1-2 | 创建 TrackerAgent.ts 编排核心 | `src/services/tracker/TrackerAgent.ts` | 调用 `/api/v1/*` |
| 3-4 | 创建 AlertDetector.ts 异动检测 | `src/services/tracker/AlertDetector.ts` | 调用 `/api/v1/prices/predict` |
| 5 | 创建 Scheduler.ts 定时调度 | `src/services/tracker/Scheduler.ts` | 定时调用数据 API |

**Week 2**：

| Day | 任务 | 输出文件 |
|-----|------|----------|
| 1-2 | 新增订阅管理 API | `src/app/api/tracker/subscriptions/route.ts` |
| 3-4 | 扩展 Notification 支持 Tracker 告警 | 扩展 `src/db/schema.ts` notifications 表 |
| 5 | 创建 Tracker 仪表盘页面 | `src/app/(dashboard)/tracker/page.tsx` |

**Phase 1 文件结构**：

```
src/services/tracker/
├── TrackerAgent.ts           # Agent 编排核心（调用现有 API Server）
├── AlertDetector.ts          # 异动检测（阈值规则 + 调用预测 API）
├── ReportGenerator.ts        # 报告生成（调用 /api/v1/chat 生成内容）
├── Scheduler.ts              # 定时调度（使用 Next.js Cron 或 Vercel Cron）
└── SubscriptionManager.ts    # 订阅管理

src/app/api/tracker/
├── subscriptions/route.ts    #订阅 CRUD
├── alerts/route.ts           # 异动日志查询
└── start/route.ts            # 手动触发追踪

src/app/(dashboard)/tracker/
├── page.tsx                  # 追踪仪表盘
└── subscribe/page.tsx        #订阅配置页面

src/db/
├── schema-tracker.ts         # 新增追踪相关表
└── migrations/               # 数据库迁移文件
```

### Phase 2: MCP Server + 多赛道拓展 (Week 3-4)

**Week 3**：

| Day | 任务 | 输出文件 |
|-----|------|----------|
| 1-2 | 创建 DataSourceAdapter 接口 + SulfurAdapter | `src/services/tracker/adapter-interface.ts`, `src/services/tracker/adapters/sulfur-adapter.ts` |
| 3-4 | 学习 MCP SDK + 创建 SulfurMCPServer | `src/services/tracker/mcp/sulfur-mcp-server.ts` |
| 5 | 创建 MCP Client（简化版 MCP Host） | `src/services/tracker/mcp/mcp-client.ts` |

**Week 4**：

| Day | 任务 | 输出文件 |
|-----|------|----------|
| 1-3 | 药材赛道配置 + Adapter | `src/services/tracker/configs/herb-config.ts`, `src/services/tracker/adapters/herb-adapter.ts` |
| 4-5 | 石油赛道配置 + Adapter | `src/services/tracker/configs/oil-config.ts`, `src/services/tracker/adapters/oil-adapter.ts` |

**Phase 2 文件结构**：

```
src/services/tracker/
├── adapter-interface.ts      # 数据源抽象接口
├── adapters/
│   ├── sulfur-adapter.ts     # 复用现有 API Server
│   ├── herb-adapter.ts       # 药材数据源
│   └── oil-adapter.ts        # 石油数据源（复用 EIA）
├── configs/
│   ├── sulfur-config.ts      # 硫磺配置（复用现有 FACTOR_DEFINITIONS）
│   ├── herb-config.ts        # 药材配置
│   └── oil-config.ts         # 石油配置
├── industry-config.ts        # IndustryConfig 类型定义
├── mcp/
│   ├── sulfur-mcp-server.ts  # MCP Server 实现
│   ├── mcp-client.ts         # MCP Host（简化版）
│   └── mcp-types.ts          # MCP 类型定义
└── registry.ts               # 行业注册中心
```

### Phase 3: 生产级优化 + Claude Desktop 集成 (Week 5-6)

**Week 5**：

| Day | 任务 |
|-----|------|
| 1-2 | 引入 Redis 缓存 + 数据库索引优化 |
| 3-4 | 日志系统 + 监控指标 + 告警机制 |
| 5 | 容错与恢复机制（数据源故障降级） |

**Week 6**：

| Day | 任务 |
|-----|------|
| 1-2 | MCP Server 独立部署（Node.js 服务） |
| 3-4 | Claude Desktop 配置 + 测试 |
| 5 | Web + Claude Desktop 双入口统一 |

---

## 八、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| **数据源不稳定** | 追踪中断 | 多数据源备份 + 降级机制 + 错误通知 |
| **LLM 响应延迟** | 用户等待 | 流式输出 + 缓存常见分析 + 异步生成报告 |
| **MCP 学习曲线** | 开发延期 | Phase 1 先不引入，Phase 2 逐步迁移 |
| **多行业数据获取** | 成本增加 | 优先复用免费 API，付费数据按需接入 |
| **配额滥用** | 成本失控 | 复用现有 Rate Limit + API Key 管理 |
| **通知推送延迟** | 预警失效 | 多渠道备份（Web + Email + SMS） |

---

## 九、关键决策总结

| 决策项 | 选择 | 理由 |
|--------|------|------|
| **与 API Server 关系** | 复用 + 扩展 | API Server 已成熟，Tracker Agent 调用其端点 |
| **MCP 引入时机** | Phase 2 | Phase 1 先验证 Tracker 逻辑 |
| **Agent 框架** | 自研轻量框架 + MCP SDK | 无复杂编排需求，MCP 用于 Claude Desktop |
| **数据抽象层** | DataSourceAdapter 接口 | 支持多行业可插拔 |
| **多行业方案** | IndustryConfig 模板 | 统一架构 + 配置驱动 |
| **部署方式** | Next.js 内嵌 + MCP Server 独立 | Web 与 Claude Desktop 双入口 |
| **配额管理** | 复用现有 api_quotas | 避免重复开发 |

---

## 十、下一步行动

本周优先完成：

1. **技术调研**：
   - 阅读 MCP TypeScript SDK 文档：https://github.com/modelcontextprotocol/typescript-sdk
   - 理解 Claude Desktop MCP 配置方式

2. **方案细化**：
   - 基于 Phase 1 文件结构，细化每个文件的实现细节
   - 确认 Scheduler 实现方式（Next.js Cron vs Vercel Cron）

3. **架构验证**：
   - 创建 `adapter-interface.ts` 原型
   - 创建 `TrackerAgent.ts` 原型，验证调用现有 API Server 的可行性

---

## 参考资料

- MCP 官方文档：https://modelcontextprotocol.io
- MCP TypeScript SDK：https://github.com/modelcontextprotocol/typescript-sdk
- Anthropic MCP 介绍：https://www.anthropic.com/news/model-context-problem
- Claude Desktop MCP 配置：https://docs.anthropic.com/claude-desktop/mcp
- 现有 API Server 设计：`docs/superpowers/specs/2026-06-14-api-server-design.md`
- 现有企业配置：`src/services/enterprise-knowledge-config.ts`
- 现有 System Prompt：`src/lib/system-prompt.ts`