> **注意：** 部署说明已整合到 [README.md](./README.md) 中，请参考最新文档。本页保留详细部署步骤供参考。

# 部署 MCP Server 到公网

## 方案 A：Railway（推荐，最简单）

Railway 支持 Docker 自动部署，且香港/新加坡机房延迟低。

### 步骤

1. 注册 [Railway](https://railway.app/)
2. 新建项目 → Deploy from GitHub repo → 选择 `sulfur-agent-web`
3. 设置环境变量（Railway → Variables）：

```
API_BASE_URL=https://sulfur-agent-web.vercel.app
API_KEY=sk_你的真实API_KEY
INDUSTRY_CODE=sulfur
MCP_TRANSPORT=http
MCP_PORT=3100
NODE_ENV=production
```

4. 在 Railway → Settings → Networking → 开启 Public Networking
5. 部署后 Railway 会分配一个公网 URL，如 `https://sulfur-mcp-production.up.railway.app`
6. MCP 端点地址：`https://sulfur-mcp-production.up.railway.app/mcp`

### 自定义域名（可选）

Railway 支持绑定自定义域名，绑定后 MCP 端点为：
`https://mcp.你的域名.com/mcp`

---

## 方案 B：Docker 自建服务器

### 本地 Docker 运行

```bash
cd D:\市场方案agent\sulfur-agent-web
docker compose -f mcp-server/docker-compose.yml up -d
```

### 部署到云服务器（VPS）

```bash
# 1. 拉取代码
git clone https://github.com/weikangceng7-ai/TrustWise-Pricing.git
cd TrustWise-Pricing

# 2. 创建 .env 文件
cat > mcp-server/.env << EOF
API_BASE_URL=https://sulfur-agent-web.vercel.app
API_KEY=sk_你的真实API_KEY
INDUSTRY_CODE=sulfur
MCP_TRANSPORT=http
MCP_PORT=3100
EOF

# 3. 启动
docker compose -f mcp-server/docker-compose.yml up -d --build

# 4. 验证
curl -s http://你的服务器IP:3100/mcp -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

---

## 方案 C：Node.js 直接运行（轻量）

```bash
# 在任何有 Node.js 的服务器上
npm install
MCP_TRANSPORT=http MCP_PORT=3100 API_BASE_URL=https://sulfur-agent-web.vercel.app API_KEY=你的KEY npx tsx mcp-server/index.ts
```

推荐使用 PM2 保持后台运行：

```bash
npm install -g pm2
pm2 start "MCP_TRANSPORT=http MCP_PORT=3100 API_BASE_URL=https://sulfur-agent-web.vercel.app API_KEY=你的KEY npx tsx mcp-server/index.ts" --name sulfur-mcp
pm2 save
pm2 startup
```

---

## 接入各客户端

部署成功后，MCP 端点地址为 `https://你的域名/mcp`。

### Cherry Studio

1. 下载 [Cherry Studio](https://cherry-ai.com/)
2. 设置 → MCP → 添加 MCP Server
3. 传输方式：HTTP/SSE
4. URL：`https://你的域名/mcp`
5. 保存后即可在聊天中使用所有硫磺工具

### Claude Desktop

Claude Desktop 的 stdio 模式配置不变，参考 `mcp-server/README.md`。

### Open WebUI

1. 设置 → MCP → 添加
2. URL：`https://你的域名/mcp`

### Continue（VS Code 插件）

在 `.continue/config.json` 中添加：

```json
{
  "mcpServers": [
    {
      "name": "sulfur-tracker",
      "url": "https://你的域名/mcp"
    }
  ]
}
```
