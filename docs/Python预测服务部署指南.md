# Python 预测服务部署指南

## 问题说明

MCP Server 的预测工具（predict_prices、predict_with_transformer、get_combined_prediction）调用链路：

```
MCP 工具 → Vercel API (/api/prediction/*) → Python 服务 (PREDICTION_SERVICE_URL)
```

**当前问题**：
- Vercel 上没有 `PREDICTION_SERVICE_URL` 环境变量
- 默认值 `http://localhost:5001` 在 Vercel 上不可达
- 导致所有预测工具返回 `fetch failed`

---

## 解决方案

### 方案 A：部署到 Render（推荐，有现成配置）

Python 服务已有 `render.yaml` 配置，可直接部署。

**步骤**：

1. **在 Render 创建 Web Service**
   - 访问 https://render.com
   - 点击 "New +" → "Web Service"
   - 连接 GitHub 仓库：`weikangceng7-ai/TrustWise-Pricing`
   - Root Directory: `python-service`
   - 配置：
     - **Name**: `sulfur-predictor`（或自定义）
     - **Environment**: `Python 3`
     - **Region**: Singapore（或就近区域）
     - **Branch**: `main`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT --timeout 120 --workers 1 app:app`
     - **Plan**: Free（或付费计划，按需选择）

2. **部署完成后获取 URL**
   - Render 会分配一个域名，如：`https://sulfur-predictor.onrender.com`
   - 测试健康检查：`https://sulfur-predictor.onrender.com/health`

3. **在 Vercel 配置环境变量**
   - 访问 Vercel 项目设置 → Environment Variables
   - 添加：
     ```
     PREDICTION_SERVICE_URL=https://sulfur-predictor.onrender.com
     ```
   - 重新部署 Next.js 项目

4. **验证**
   - 访问 `https://sulfur-agent-web.vercel.app/api/prediction/health`
   - 应返回：`{"healthy": true, "message": "预测服务运行正常"}`

---

### 方案 B：本地开发（Claudian 本地运行）

如果 Claudian/Claude Desktop 在本地运行，可以直接调用本地 Python 服务。

**步骤**：

1. **启动 Python 服务**
   ```bash
   cd python-service
   python app.py
   # 或
   python -m flask run --port 5001
   ```

2. **修改 MCP Server 配置**
   
   编辑 `mcp-server/.env`：
   ```env
   API_BASE_URL=http://localhost:3000
   API_KEY=sk_your_api_key
   INDUSTRY_CODE=sulfur
   ```

3. **启动本地 Next.js**
   ```bash
   npm run dev
   ```
   
   `.env.local` 中已有：
   ```env
   PREDICTION_SERVICE_URL=http://localhost:5001
   ```

4. **启动 MCP Server**
   ```bash
   cd mcp-server
   npm run build
   npm run mcp:stdio  # 或 npm run mcp:http
   ```

5. **验证**
   - Claudian 中调用 `predict_prices`
   - 应返回真实预测数据

---

### 方案 C：MCP Server 直接调用 Python（绕过 Vercel）

如果 Python 服务在本地或云端，可以让 MCP Server 直接调用，不经过 Vercel。

**已实现**：MCP Server 已支持 `PREDICTION_SERVICE_URL` 环境变量，配置后预测工具会直接调用 Python 服务。

**配置 `mcp-server/.env`**：

```env
API_BASE_URL=https://sulfur-agent-web.vercel.app
API_KEY=sk_your_api_key
INDUSTRY_CODE=sulfur
PREDICTION_SERVICE_URL=http://localhost:5001  # 本地 Python 服务
# 或
PREDICTION_SERVICE_URL=https://sulfur-predictor.onrender.com  # 云端 Python 服务
```

**重新编译 MCP Server**：

```bash
cd mcp-server
npm run build
```

**验证**：

启动 MCP Server 后，在 Claudian 中调用 `predict_prices`，应直接调用 Python 服务，不经过 Vercel。

---

## 推荐方案

| 场景 | 推荐方案 | 说明 |
|------|----------|------|
| **生产环境** | 方案 A（Render） | 稳定、可扩展、有现成配置 |
| **本地开发/演示** | 方案 B（本地） | 快速验证，无需部署 |
| **Claudian 本地运行** | 方案 C（直接调用） | 减少一跳，性能更好 |

---

## 快速验证清单

部署完成后，按以下顺序验证：

- [ ] Python 服务健康检查：`GET /health` 返回 `{"healthy": true}`
- [ ] Vercel 环境变量已配置：`PREDICTION_SERVICE_URL`
- [ ] Next.js API 路由可访问：`POST /api/prediction/transformer`
- [ ] MCP 工具调用成功：在 Claudian 中调用 `predict_prices`

---

## 常见问题

**Q: Render Free 计划会休眠吗？**  
A: 是的，Free 计划 15 分钟无请求会休眠，首次请求需要 30-60 秒唤醒。建议升级到付费计划（$7/月）或使用方案 B/C。

**Q: 本地 Python 服务启动失败？**  
A: 检查依赖：`pip install -r requirements.txt`。如果 Transformer 模型加载失败，可以注释掉 `app.py` 中的 Transformer 相关代码，只保留 ARIMA+XGBoost。

**Q: Vercel 部署后还是 fetch failed？**  
A: 检查 Vercel 环境变量是否正确配置，重新部署 Next.js 项目。可以在 Vercel 日志中查看 `PREDICTION_SERVICE_URL` 是否生效。
