# MCP Server 部署问题汇总

## 问题清单

### 1. Dockerfile 生产环境无法运行
**现象**：Docker 容器启动后 `tsx` 命令找不到，服务无法启动。

**原因**：`tsx` 是 devDependency，`npm install --production` 不会安装它。

**解决**：改为多阶段构建。Stage 1 编译 TypeScript，Stage 2 运行 `node dist/index.js`。

### 2. package.json 脚本路径错误
**现象**：`npm run start` 指向 `mcp-server/index.ts`，但 package.json 本身就在 `mcp-server/` 内。

**解决**：修正为 `node dist/index.js`、`tsc`、`tsx index.ts`。

### 3. 多客户端 "Server already initialized" 冲突
**现象**：Cherry Studio 连接时报错 `Invalid Request: Server already initialized`。

**原因**：原实现使用单一 `StreamableHTTPServerTransport`（stateful 模式），要求 session ID 管理。多个客户端或重复初始化请求导致冲突。

**解决**：改为 stateless 模式，每个 HTTP 请求创建新的 server + transport 实例。

### 4. 每个请求 "Already connected to transport" 错误
**现象**：stateless 改造后报 `Already connected to a transport. Call close() before connecting to a new transport`。

**原因**：`createRequestHandler` 只在启动时创建一次 server/transport，但每次请求都调用 `server.connect(transport)`。

**解决**：在 HTTP handler 内部每次请求都创建全新的 server + transport + connect。

### 5. Windows 下 `MCP_TRANSPORT=http npm run mcp:http` 环境变量不生效
**现象**：cmd/bash 中 `VAR=value command` 语法无效，报 `MCP_TRANSPORT: command not found`。

**原因**：Windows CMD 不支持 Unix 风格的环境变量前缀语法。

**解决**：使用 `npx tsx` 直接传环境变量，或改用 `.env` 文件。

### 6. Cherry Studio 请求头格式问题
**现象**：Cherry Studio 配置请求头用 `Authorization=Bearer xxx`（等号）无法识别。

**原因**：Cherry Studio 的请求头输入框需要标准 HTTP 格式 `Authorization: Bearer xxx`（冒号+空格）或 JSON 格式。

### 7. Cherry Studio 工具调用不生效
**现象**：MCP Server 正常返回工具列表（curl 验证通过），但 Cherry Studio 中 AI 无法调用工具，显示"当前没有可用的工具"。

**原因**：Cherry Studio 的 MCP 功能可能只支持连接，不支持完整的工具调用（tool calling）协议；或当前模型不支持。

**替代方案**：使用 Claude Desktop（官方支持 MCP，100% 兼容）。

---

## 解决后的最终架构

```
┌─────────────┐    HTTP     ┌──────────────┐    fetch     ┌──────────────
│ Cherry Studio│ ─────────→ │  MCP Server  │ ─────────→  │ Next.js API  │
│ Claude Desktop│            │ (stateless)  │              │ (Vercel)     │
│ Continue      │ ←───────── │              │ ←────────── │              │
└─────────────┘    JSON-RPC  └──────────────┘   JSON       ──────────────┘
```

- 每个 HTTP 请求独立创建 server + transport，无 session 冲突
- 支持多客户端同时接入
- 提供 `/health` 健康检查端点
- 支持 DEMO 模式零配置体验
