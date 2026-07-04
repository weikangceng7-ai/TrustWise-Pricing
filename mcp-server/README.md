# Sulfur Agent MCP Server

硫磺采购价格预测 MCP Server，为 Claude / DeepSeek / 豆包 / Cherry Studio 等提供硫磺市场数据查询、价格预测、告警订阅、知识图谱检索等工具。

## 快速开始

### 方式一：零配置体验（DEMO 模式）

无需 API Key，一行命令即可体验全部工具：

```bash
# 根目录下执行
DEMO_MODE=true MCP_TRANSPORT=http npm run mcp:http
```

### 方式二：Docker 一键部署

```bash
# 克隆仓库
git clone https://github.com/weikangceng7-ai/TrustWise-Pricing.git
cd TrustWise-Pricing

# 创建 .env 文件
cat > mcp-server/.env << EOF
API_BASE_URL=https://sulfur-agent-web.vercel.app
API_KEY=sk_your_api_key
EOF

# 启动
docker compose -f mcp-server/docker-compose.yml up -d
```

### 方式三：平台一键部署

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/weikangceng7-ai/TrustWise-Pricing)  
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/weikangceng7-ai/TrustWise-Pricing)

部署后配置环境变量：
- `API_BASE_URL` — 后端地址，默认 `https://sulfur-agent-web.vercel.app`
- `API_KEY` — 在 [sulfur-agent-web.vercel.app](https://sulfur-agent-web.vercel.app) 获取
- `DEMO_MODE` — 设为 `true` 跳过认证

### 方式四：本地开发

```bash
cd sulfur-agent-web
npm install

# stdio 模式
npm run mcp:dev

# HTTP 模式
npm run mcp:http

# 双模式
npm run mcp:both
```

---

## 客户端接入

### Claude Desktop（stdio 模式）

Claude Desktop → **Settings** → **Developer** → **Edit Config**：

```json
{
  "mcpServers": {
    "sulfur-tracker-agent": {
      "command": "node",
      "args": ["<path-to-mcp-server>/dist/index.js"],
      "env": {
        "API_BASE_URL": "https://sulfur-agent-web.vercel.app",
        "API_KEY": "sk_你的API_KEY",
        "INDUSTRY_CODE": "sulfur"
      }
    }
  }
}
```

### Continue（VS Code 插件）

```json
{
  "mcpServers": [{ "name": "sulfur-tracker", "url": "https://你的域名/mcp" }]
}
```

### Cherry Studio

设置 → MCP → 添加服务器 → URL: `https://你的域名/mcp`

### Open WebUI

设置 → MCP → 添加 → URL: `https://你的域名/mcp`

### 浏览器扩展

在 Chrome 中加载 `mcp-browser-extension/` 为 unpacked 扩展，配置 MCP Server 地址后在 DeepSeek/豆包/ChatGPT 页面点击浮动按钮即可注入硫磺市场数据。

---

## 工具目录

| 工具 | 分类 | 说明 |
|------|------|------|
| `get_prices` | 价格 | 查询 N 天硫磺价格走势，支持地区/市场筛选 |
| `get_inventory` | 库存 | 获取港口库存水平及环比变化 |
| `get_news` | 资讯 | 市场新闻，标注情绪倾向 |
| `predict_prices` | 预测 | ARIMA+XGBoost 模型预测未来价格 |
| `query_knowledge_graph` | 知识图谱 | 自然语言查询价格影响因子、供应链、采购建议 |
| `subscribe_alert` | 订阅 | 创建价格/库存/新闻告警 |
| `list_subscriptions` | 订阅 | 列出所有订阅 |
| `update_subscription` | 订阅 | 更新或删除订阅 |
| `get_alerts` | 告警 | 获取告警列表 |
| `generate_report` | 报告 | 手动触发追踪报告 |
| `get_tracker_status` | 状态 | Tracker 运行时统计 |

---

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `API_BASE_URL` | 否 | `https://sulfur-agent-web.vercel.app` | 后端 API 地址 |
| `API_KEY` | 是（DEMO 模式除外） | — | 用户 API Key |
| `INDUSTRY_CODE` | 否 | `sulfur` | 行业代码 |
| `MCP_TRANSPORT` | 否 | `stdio` | 传输方式：stdio / http / both |
| `MCP_PORT` | 否 | `3100` | HTTP 监听端口 |
| `DEMO_MODE` | 否 | `false` | 设为 `true` 跳过 API_KEY 认证 |

---

## 健康检查

服务提供 `/health` 端点用于健康检查：

```bash
curl http://localhost:3100/health
# {"status":"ok","version":"0.2.0"}
```

---

## 文件结构

```
mcp-server/
├── index.ts              # 入口，根据 MCP_TRANSPORT 选择传输方式
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
├── Dockerfile            # 多阶段构建，编译 + 运行
├── docker-compose.yml    # Docker 编排
├── railway.json          # Railway 部署配置
└── render.yaml           # Render 部署配置
```
