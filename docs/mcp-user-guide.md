# Sulfur Agent MCP Server 使用手册（小白版）

> 本手册面向完全零基础的用户，帮助你快速在 Claude Desktop 中使用硫磺市场数据 MCP 服务。

---

## 一、什么是 MCP Server？

**MCP（Model Context Protocol）** 是一种标准协议，让 AI 客户端能够调用外部工具获取实时数据。

你可以把 Sulfur Agent MCP Server 理解为一个 **"硫磺数据中转站"**：

```
你（在 Claude Desktop 中提问）
        ↓
   Claude 自动调用 MCP 工具
        ↓
   MCP Server 查询硫磺市场数据
        ↓
   数据返回给 Claude，Claude 整合后回答你
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

## 二、接入 Claude Desktop（本地 stdio 模式）

### 2.1 第一步：编译 MCP Server

Claude Desktop 需要运行**已编译好的文件**，不是源码。

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

如果能看到文件，说明编译成功，可以进入下一步。

### 2.2 第二步：获取 API Key

访问 [sulfur-agent-web.vercel.app](https://sulfur-agent-web.vercel.app) 登录并获取你的 API Key。

> API Key 格式类似 `sk_xxxxxx`。

### 2.3 第三步：配置 Claude Desktop

1. 打开 Claude Desktop → **Settings**（设置）→ **Developer**（开发者）→ **Edit Config**（编辑配置）
2. 会打开一个 `claude_desktop_config.json` 文件
3. 在其中添加以下内容：

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

4. 保存配置文件
5. **完全退出 Claude Desktop 并重新打开**（不是最小化，是退出进程）

### 2.4 第四步：验证是否生效

1. 重启 Claude Desktop 后，打开任意对话
2. 在输入框附近应该能看到一个 **工具图标**（锤子/扳手图标）
3. 点击工具图标，应该能看到 `sulfur-tracker-agent` 列出的工具列表
4. 直接提问测试：

```
最近硫磺价格走势怎么样？
```

Claude 会自动调用 MCP 工具获取真实数据后回复你。

---

## 三、浏览器扩展接入（公共 MCP 服务）

除了 Claude Desktop 本地 stdio 模式，你也可以直接在**浏览器中使用 MCP 扩展**，连接到已部署的公网 MCP 服务。这种方式无需编译代码，配置更简单，适合日常快速使用。

### 3.1 第一步：安装浏览器 MCP 扩展

在 Chrome/Edge 扩展商店搜索并安装支持 MCP 协议的浏览器扩展（例如 "硫磺市场数据助手" 或同类 MCP 客户端扩展）。

### 3.2 第二步：配置扩展

打开扩展配置页面，按以下方式填写：

1. **启用扩展**：打开开关
2. **MCP Server 地址**：填写 `https://sulfur-agent-web.vercel.app/mcp`
3. **API Key（可选）**：填写你的 API Key（格式 `sk_xxxxxx`），可在 [sulfur-agent-web.vercel.app](https://sulfur-agent-web.vercel.app) 登录后获取
4. 点击 **保存配置**

> 如果扩展支持"使用默认公共服务器"选项，勾选后可自动填入默认地址。

### 3.3 第三步：验证是否生效

1. 打开 DeepSeek / 豆包等支持的 AI 聊天页面
2. 点击页面右下角的扩展浮动按钮
3. 硫磺市场数据助手应显示为已连接状态
4. 在聊天中输入问题测试：

```
最近硫磺价格走势怎么样？
```

扩展会自动获取硫磺市场数据并注入到你的聊天输入框中。

### 3.4 浏览器扩展 vs Claude Desktop

| 对比项 | 浏览器扩展 | Claude Desktop |
|--------|-----------|---------------|
| 配置难度 | 简单，只需填地址 | 需编译和配置 JSON |
| 运行方式 | 连接公网服务 | 本地运行 MCP Server |
| 适用场景 | 日常快速查询 | 深度分析、本地开发 |
| 数据延迟 | 公网网络延迟 | 本地直连更快 |

---

## 四、常见问题

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
- **Claude Desktop**：本地 stdio 模式（见第二部分）
- **浏览器扩展**：连接公网 MCP 服务（见第三部分），兼容 DeepSeek、豆包等 AI 聊天页面

其他客户端的配置方式请参考项目仓库中的完整文档。

---

## 五、可用工具速查表

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

## 六、技术支持

- **项目地址**：https://github.com/weikangceng7-ai/TrustWise-Pricing
- **在线系统**：https://sulfur-agent-web.vercel.app
