# Sulfur Agent MCP Server 使用手册（小白版）

> 本手册面向完全零基础的用户，带你从零搭建 MCP Server、部署到公网、再到 AI 客户端中使用。

---

## 一、MCP Server 是什么？

**MCP（Model Context Protocol）** 是一种标准协议，让 AI 客户端能够调用外部工具获取实时数据。

你可以把 Sulfur Agent MCP Server 理解为一个 **"硫磺数据中转站"**：

```
AI 客户端（Claude Desktop / DeepSeek 等）
        ↓ HTTP 请求
   MCP Server（Node.js，监听 3100 端口）
        ↓ 带 API Key 调用
   主后端（vercel.app 的 Next.js API）
```

### 它能做什么？

| 工具名 | 你能问的话 | 它能回答什么 |
|--------|-----------|-------------|
| `get_prices` | "最近一周华东地区液硫价格走势？" | 价格走势、涨跌幅、历史对比 |
| `get_inventory` | "现在港口库存情况如何？" | 港口库存量、环比变化 |
| `get_news` | "最近硫磺市场有什么新闻？" | 市场新闻及情绪倾向（利好/利空） |
| `predict_prices` | "未来两周价格会怎么走？" | ARIMA+XGBoost 模型预测的价格 |
| `query_knowledge_graph` | "中东局势对硫磺价格有什么影响？" | 供应链关系、影响因子、采购建议 |
| `subscribe_alert` | "价格超过 1500 元/吨时通知我" | 创建价格/库存/新闻告警 |
| `generate_report` | "帮我生成一份市场追踪报告" | 手动触发生成报告 |
| `get_tracker_status` | "数据追踪服务还在跑吗？" | 返回服务运行状态统计 |

---

## 二、第一步：在本地搭建 MCP Server

### 2.1 安装依赖，编译

1. 打开终端（Windows 用 CMD 或 PowerShell）
2. 进入 `mcp-server` 目录：

```bash
cd D:\市场方案agent\sulfur-agent-web\mcp-server
```

3. 安装依赖并编译：

```bash
npm install
npm run build
```

4. 确认 `dist/index.js` 文件存在：

```bash
dir dist\index.js
```

如果能看到文件，说明编译成功。

> **补充说明**：MCP Server 是一个独立的 Node.js 程序，不是 Next.js 的一部分。它编译后生成 `dist/index.js`，Claude Desktop 和浏览器扩展都依赖这个文件。

### 2.2 本地测试运行

```bash
# 以 HTTP 模式启动
MCP_TRANSPORT=http npm run dev
```

启动后浏览器访问 `http://localhost:3100/health`，看到 `{"status":"ok"}` 就说明跑起来了。

---

## 三、第二步：部署到 Railway（公网）

Railway 是一个帮你托管服务器的云平台，**用 Docker 一键部署**，无需自己买服务器。

### 3.1 前置准备

- GitHub 上 fork 或关联这个仓库（[TrustWise-Pricing](https://github.com/weikangceng7-ai/TrustWise-Pricing)）
- 获取你的 API Key：访问 [sulfur-agent-web.vercel.app](https://sulfur-agent-web.vercel.app) 登录后获取，格式类似 `sk_xxxxxx`

### 3.2 部署步骤

1. 登录 [Railway](https://railway.app/) → 新建项目
2. 选择 **Deploy from GitHub repo** → 选择 `TrustWise-Pricing` 仓库
3. Railway 会自动读取项目里的 `railway.json`，里面已经写好了：
   - **构建方式**：用 `mcp-server/Dockerfile`（Dockerfile 会自动编译 TypeScript + 打包运行环境）
   - **启动命令**：`node dist/index.js`
   - **健康检查**：`/health` 路径
4. 在 Railway 项目的 **Variables** 面板设置环境变量：

| 变量名 | 值 |
|---|---|
| `API_BASE_URL` | `https://sulfur-agent-web.vercel.app` |
| `API_KEY` | `sk_你的真实API_KEY` |
| `INDUSTRY_CODE` | `sulfur` |
| `MCP_TRANSPORT` | `http` |
| `MCP_PORT` | `3100` |
| `NODE_ENV` | `production` |

5. 在 **Settings → Networking** 中开启 **Public Networking**
6. 部署完成后 Railway 会分配一个公网域名，例如：
   `https://sulfur-mcp-production.up.railway.app`

**你的 MCP 端点地址就是：** `https://你的域名.railway.app/mcp`

### 3.3 Railway 部署原理（给别人讲的时候可以提）

- `railway.json` 告诉 Railway："用 `mcp-server/Dockerfile` 来构建镜像"
- `Dockerfile` 做了两阶段构建：
  - **builder 阶段**：安装所有依赖（含 TypeScript），用 `tsc` 编译源码
  - **runtime 阶段**：只装生产依赖，复制编译好的 `dist/`，暴露 3100 端口
- Railway 自动拉取代码 → 跑 Dockerfile → 启动服务 → 分配公网域名

---

## 四、第三步：在 AI 客户端中使用

这里有 **两种用法**，根据场景选择：

### 用法 A：Claude Desktop 本地运行（stdio 模式，适合深度分析）

#### 4.1 配置

1. 确保已完成 **第二步** 的编译：`npm run build`
2. 打开 Claude Desktop → **Settings**（设置）→ **Developer**（开发者）→ **Edit Config**（编辑配置）
3. 会打开一个 `claude_desktop_config.json` 文件
4. 在其中添加以下内容：

```json
{
  "mcpServers": {
    "sulfur-tracker-agent": {
      "command": "node",
      "args": ["D:\\市场方案agent\\sulfur-agent-web\\mcp-server\\dist\\index.js"],
      "env": {
        "API_BASE_URL": "https://sulfur-agent-web.vercel.app",
        "API_KEY": "sk_你的真实API_KEY",
        "INDUSTRY_CODE": "sulfur"
      }
    }
  }
}
```

**路径说明**：

| 字段 | 说明 |
|------|------|
| `command` | 固定为 `node` |
| `args` | `dist/index.js` 的**绝对路径**，Windows 必须用双反斜杠 `\\` |
| `env.API_KEY` | 你的真实 API Key |

5. 保存配置文件
6. **完全退出 Claude Desktop 并重新打开**（不是最小化，是退出进程）

#### 4.2 验证是否生效

1. 重启 Claude Desktop 后，打开任意对话
2. 在输入框附近应该能看到一个 **工具图标**（锤子/扳手图标）
3. 点击工具图标，应该能看到 `sulfur-tracker-agent` 列出的工具列表
4. 直接提问测试：

```
最近硫磺价格走势怎么样？
```

Claude 会自动调用 MCP 工具获取真实数据后回复你。

---

### 用法 B：浏览器扩展连接公网 MCP 服务（适合日常快速查询）

除了 Claude Desktop，你也可以直接在**浏览器中使用 MCP 扩展**，连接到已部署的公网 MCP 服务。这种方式无需编译代码，配置更简单。

#### 4.3 安装与配置

1. 在 Chrome/Edge 扩展商店搜索并安装支持 MCP 协议的浏览器扩展（例如 "硫磺市场数据助手"）
2. 打开扩展配置页面，按以下方式填写：
   - **启用扩展**：打开开关
   - **MCP Server 地址**：填写 `https://sulfur-agent-web.vercel.app/mcp`（或你部署的 Railway 地址）
   - **API Key（可选）**：填写你的 API Key（格式 `sk_xxxxxx`）
   - 点击 **保存配置**
3. 如果扩展支持"使用默认公共服务器"选项，勾选后可自动填入默认地址

#### 4.4 验证是否生效

1. 打开 DeepSeek / 豆包等支持的 AI 聊天页面
2. 点击页面右下角的扩展浮动按钮
3. 硫磺市场数据助手应显示为已连接状态
4. 在聊天中输入问题测试：

```
最近硫磺价格走势怎么样？
```

扩展会自动获取硫磺市场数据并注入到你的聊天输入框中。

### 用法 A vs 用法 B 对比

| 对比项 | 浏览器扩展（用法 B） | Claude Desktop（用法 A） |
|--------|-----------|---------------|
| 配置难度 | 简单，只需填地址 | 需编译和配置 JSON |
| 运行方式 | 连接公网服务 | 本地运行 MCP Server |
| 适用场景 | 日常快速查询 | 深度分析、本地开发 |
| 数据延迟 | 公网网络延迟 | 本地直连更快 |

---

## 五、常见问题

### Q1：Claude Desktop 中没有显示 MCP 工具图标

按以下顺序排查：

1. **确认 `dist/index.js` 存在**：在终端运行 `dir D:\市场方案agent\sulfur-agent-web\mcp-server\dist\index.js`
   - 如果找不到文件，重新执行 `npm run build`
2. **确认路径格式正确**：
   - 必须是绝对路径
   - Windows 路径中反斜杠必须双写：`\\`
   - 路径不能有多余空格
3. **确认配置文件中没有语法错误**：JSON 中最后一个对象后面不能有逗号
4. **完全退出 Claude Desktop 并重新打开**
5. 在 Claude Desktop 中查看 MCP Server 状态日志

### Q2：工具调用报错 "fetch failed" 或 "API Key 无效"

1. 确认 `API_KEY` 填写正确，没有多余空格
2. 确认 `API_BASE_URL` 正确：`https://sulfur-agent-web.vercel.app`
3. 如果后端服务正在部署或维护中，可能会暂时不可用，请稍后重试

### Q3：工具返回的数据为空

说明后端数据库中暂时没有对应的数据。可以换一个工具试试，比如：

```
现在港口库存情况如何？
最近硫磺市场有什么新闻？
```

### Q4：如何查看 MCP Server 的运行日志？

Claude Desktop → Settings → Developer → View MCP Server Logs，可以看到每个工具的调用详情。

### Q5：我想用其他 AI 客户端

目前支持两种接入方式：
- **Claude Desktop**：本地 stdio 模式（见第四部分用法 A）
- **浏览器扩展**：连接公网 MCP 服务（见第四部分用法 B），兼容 DeepSeek、豆包等 AI 聊天页面

其他客户端的配置方式请参考项目仓库中的完整文档。

---

## 六、可用工具速查表

| 工具 | 分类 | 说明 |
|------|------|------|
| `get_prices` | 价格 | 查询 N 天硫磺价格走势，支持地区/市场筛选 |
| `get_inventory` | 库存 | 获取港口库存水平及环比变化 |
| `get_news` | 资讯 | 市场新闻，标注情绪倾向 |
| `predict_prices` | 预测 | ARIMA+XGBoost 模型预测未来价格 |
| `query_knowledge_graph` | 知识图谱 | 查询价格影响因子、供应链、采购建议 |
| `subscribe_alert` | 订阅 | 创建价格/库存/新闻告警 |
| `list_subscriptions` | 订阅 | 列出所有订阅 |
| `update_subscription` | 订阅 | 更新或删除订阅 |
| `get_alerts` | 告警 | 获取告警列表 |
| `generate_report` | 报告 | 手动触发追踪报告 |
| `get_tracker_status` | 状态 | Tracker 运行时统计 |

---

## 七、核心要点速记（给别人讲的时候用）

| 问题 | 答案 |
|---|---|
| **MCP Server 跑在哪？** | 一个独立的 Node.js 程序，监听 3100 端口 |
| **怎么搭建？** | 本地用 `npm run build` 编译出 `dist/index.js`；线上用 Railway + Dockerfile 一键部署 |
| **怎么接入 Claude Desktop？** | 本地模式写 `claude_desktop_config.json` 指向 `dist/index.js`；浏览器模式填公网 URL |
| **数据安全吗？** | 所有请求都带 API Key 认证，公网部署也安全 |
| **它提供哪些工具？** | 价格查询、库存查询、新闻、价格预测、知识图谱查询、告警订阅、报告生成等 11 个工具 |

---

## 八、技术支持

- **项目地址**：https://github.com/weikangceng7-ai/TrustWise-Pricing
- **在线系统**：https://sulfur-agent-web.vercel.app
