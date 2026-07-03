# sulfur-tracker-agent MCP Server

硫磺采购价格预测 MCP Server，为 Claude Desktop / DeepSeek / 豆包 提供硫磺市场价格查询、预测、告警、报告等工具。

## 快速开始

### 1. 安装依赖 & 编译

```bash
cd D:\市场方案agent\sulfur-agent-web
npm install
cd mcp-server
npx tsc
```

编译产物输出到 `mcp-server/dist/`。

### 2. 传输模式

MCP Server 支持两种传输方式，通过 `MCP_TRANSPORT` 环境变量选择：

| 模式 | 适用场景 | 说明 |
|------|---------|------|
| `stdio`（默认） | Claude Desktop 等本地客户端 | 客户端 spawn 子进程，通过 stdin/stdout 通信 |
| `http` | DeepSeek / 豆包等远程客户端 | HTTP 服务器，客户端通过 HTTP/SSE 协议连接 |

#### 2.1 Claude Desktop 配置（stdio 模式）

打开 Claude Desktop → **Settings** → **Developer** → **Edit Config**，写入：

```json
{
  "mcpServers": {
    "sulfur-tracker-agent": {
      "command": "node",
      "args": ["D:\\市场方案agent\\sulfur-agent-web\\mcp-server\\dist\\index.js"],
      "env": {
        "API_BASE_URL": "http://host.docker.internal:3000",
        "API_KEY": "sk_你的API_KEY",
        "INDUSTRY_CODE": "sulfur"
      }
    }
  }
}
```

保存后 Claude Desktop 自动加载。如果用生产环境，`API_BASE_URL` 改为 `https://sulfur-agent-web.vercel.app`。

#### 2.2 DeepSeek / 豆包接入（HTTP 模式）

HTTP 模式将 MCP Server 作为 HTTP 服务运行，DeepSeek / 豆包等远程客户端可通过 HTTP 协议连接。

**本地启动：**

```bash
# 方式 1：使用 npm script（自动注入 MCP_TRANSPORT=http）
npm run mcp:http

# 方式 2：手动设置环境变量
MCP_TRANSPORT=http npx tsx mcp-server/index.ts
```

服务器默认监听 `0.0.0.0:3100`，MCP 端点为 `http://localhost:3100/mcp`。

**DeepSeek 配置：**

在 DeepSeek MCP 配置中添加：

```json
{
  "mcpServers": {
    "sulfur-tracker-agent": {
      "url": "http://你的服务器地址:3100/mcp",
      "headers": {
        "Authorization": "Bearer sk_你的API_KEY",
        "X-Api-Base-Url": "https://sulfur-agent-web.vercel.app",
        "X-Industry-Code": "sulfur"
      }
    }
  }
}
```

> 注意：DeepSeek 的具体配置方式请参考其官方文档。核心是确保 HTTP 请求能到达 MCP Server，且 `API_BASE_URL` 和 `API_KEY` 环境变量正确传递。

**豆包配置：**

在豆包 MCP 配置中添加（具体格式请参考豆包官方文档）：

```json
{
  "mcpServers": {
    "sulfur-tracker-agent": {
      "url": "http://你的服务器地址:3100/mcp",
      "headers": {
        "Authorization": "Bearer sk_你的API_KEY"
      }
    }
  }
}
```

**部署到公网：**

要让 DeepSeek / 豆包等远程客户端连接，你需要：

1. 将 HTTP Server 部署到公网可达的服务器（如自有 VPS、Railway、Fly.io 等）
2. 确保 `API_BASE_URL` 指向你的 Next.js 后端（生产环境为 `https://sulfur-agent-web.vercel.app`）
3. 设置 `API_KEY` 环境变量用于认证

#### 2.3 环境变量（HTTP 模式）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `API_BASE_URL` | API Server 地址 | 必填 |
| `API_KEY` | 用户的 API Key | 必填 |
| `INDUSTRY_CODE` | 行业代码（可选） | `sulfur` |
| `MCP_TRANSPORT` | 传输方式：`stdio` / `http` / `both` | `stdio` |
| `MCP_PORT` | HTTP 监听端口 | `3100` |

### 3. 本地开发测试

```bash
# stdio 模式（Claude Desktop 调试）
npx tsx mcp-server/index.ts

# HTTP 模式
npm run mcp:http

# 同时启动两种模式
npm run mcp:both
```

日志输出到 stderr，看到 `服务器已启动` 即正常。

---

## 工具列表

共 **11 个工具**，分为 5 大类：

### 价格 & 数据

#### `get_prices` — 查询硫磺价格

获取 N 天硫磺价格趋势，支持按地区、市场筛选。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `days` | number | 否 | 7 | 查询天数 |
| `region` | string | 否 | — | 地区筛选（如"华东地区"） |
| `market` | string | 否 | — | 市场/港口筛选（如"镇江港"） |

**输出**：当前价格 + 涨跌幅 + 最多 10 条价格明细（JSON 格式）。

---

#### `get_inventory` — 查询港口库存

获取主要港口硫磺库存水平及变化趋势。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `limit` | number | 否 | 2 | 获取记录数 |

**输出**：当前库存（吨）+ 环比变化 + 数据明细。

---

#### `get_news` — 查询市场新闻

获取硫磺市场行业动态和新闻。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `limit` | number | 否 | 10 | 新闻条数 |
| `category` | string | 否 | — | 分类筛选 |

**输出**：每条标注情绪倾向（看涨 / 看跌 / 中性）、标题、来源、时间。

---

### 预测

#### `predict_prices` — 价格预测

使用 ARIMA + XGBoost 混合模型预测未来价格趋势。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `days` | number | 否 | 7 | 预测天数 |

**输出**：当前价格、预测趋势方向、置信度、价格区间、平均预测价。

---

### 知识图谱

#### `query_knowledge_graph` — 查询知识图谱

根据自然语言问题查询价格影响因子关系网络、供应链影响链、市场洞察与采购建议。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | string | 是 | 用户关于硫磺市场、价格、企业采购的自然语言问题 |

**示例查询**：
- "宜化集团采购硫磺需要注意什么"
- "当前价格趋势如何"
- "运输成本对采购的影响"

**输出**：相关企业、关键影响因子（含权重、趋势、类别）、供应链影响链、图谱洞察、采购建议（Markdown 格式）。

---

### 订阅 & 告警

#### `subscribe_alert` — 创建价格告警订阅

当价格达到指定阈值时触发告警。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `name` | string | 否 | 自动生成 | 订阅名称 |
| `threshold` | number | 是 | — | 价格阈值 |
| `direction` | `"above"` / `"below"` | 是 | — | 告警方向（高于/低于） |
| `frequency` | `"hourly"` / `"daily"` / `"weekly"` | 否 | `daily` | 告警频率 |
| `targetType` | `"price"` / `"inventory"` / `"news"` / `"all"` | 否 | `price` | 监控类型 |
| `reportEnabled` | boolean | 否 | `true` | 是否启用报告 |

---

#### `list_subscriptions` — 列出所有订阅

查看当前用户的所有跟踪订阅。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `activeOnly` | boolean | 否 | `true` | 仅显示活跃订阅 |

**输出**：每条包含名称、状态、类型、频率、最近执行时间。

---

#### `update_subscription` — 更新 / 删除订阅

对已有订阅执行更新或删除操作。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `subscriptionId` | number | 是 | 订阅 ID |
| `action` | `"update"` / `"delete"` | 是 | 操作类型 |
| `isActive` | boolean | 否 | 新活跃状态（update 时可用） |
| `name` | string | 否 | 新名称（update 时可用） |

---

### 报告 & 状态

#### `generate_report` — 生成报告

手动触发追踪任务并生成报告。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `subscriptionId` | string | 否 | 指定订阅 ID |
| `frequency` | `"hourly"` / `"daily"` / `"weekly"` | 否 | 按频率筛选 |

**输出**：执行结果汇总（总执行数、成功数、失败数）。

---

#### `get_tracker_status` — 查看 Tracker 状态

获取 Tracker 运行时统计信息。

**无参数**。

**输出**：活跃订阅数、未读告警数、最近/下次调度时间。

---

## 配额说明

每次工具调用消耗 1 次 API 配额。默认每月 1000 次免费配额，次月 1 日自动重置。配额余量在价格/库存等接口返回的 `meta.quotaRemaining` 中体现。

## 文件结构

```
mcp-server/
├── index.ts              # Server 入口，根据 MCP_TRANSPORT 选择传输方式
├── stdio-server.ts       # StdioServerTransport 封装
├── http-server.ts        # StreamableHTTPServerTransport HTTP 服务器
├── config.ts             # 环境变量加载 & 校验
├── client.ts             # HTTP 客户端，封装所有 API 调用
├── tools/
│   ├── prices.ts         # get_prices
│   ├── inventory.ts      # get_inventory
│   ├── news.ts           # get_news
│   ├── prediction.ts     # predict_prices
│   ├── knowledge-graph.ts # query_knowledge_graph
│   ├── subscriptions.ts  # subscribe_alert, list_subscriptions, update_subscription
│   ├── report.ts         # generate_report
│   └── status.ts         # get_tracker_status
└── tsconfig.json
```
