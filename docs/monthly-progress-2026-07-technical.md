# SulfurAI 月度更新总结（2026.06.25 — 07.25）

> 34 commits · 145 文件 · +14,233 / -3,394 行

---

## 总体

本月围绕 **"数据真实化、模型增强、系统开放化"** 三条主线推进，完成五大模块升级：

| 模块 | 成果 |
|------|------|
| 数据源 | 接入生意社等 6 个外部源，真实行情替代模拟数据 |
| 预测模型 | ARIMA+XGBoost 数据源切换真实行情；Transformer 客户端就绪、推理端点待实现 |
| 多品种 | 从硫磺单品种扩展至硫磺/磷矿/钾肥/尿素 4 品种 |
| MCP 服务 | v0.3 发布，工具从 11 增至 18，覆盖多品种分析、深度学习预测、精度评估 |
| 部署 | Docker 容器化，支持 Vercel + Railway + 国内自建服务器三平台 |

---

## 一、数据来源

### 接入的外部数据源

| 数据源 | 内容 | 频率 |
|--------|------|------|
| 生意社 (100ppi.com) | 硫磺/钾肥/尿素现货基准价 | 工作日每 4h |
| 新浪财经 | 波罗的海干散货指数 (BDI) | 工作日每 4h |
| FRED (美联储) | 原油、CPI、利率、GDP 等 11 项宏观指标 | 每天 |
| Frankfurter (欧央行) | USD/CNY 汇率 | 每天 |
| GDELT | 全球硫磺/化肥行业新闻舆情 | 每天 |

### 采集架构

三级降级保障：TypeScript 直抓 → Python AKShare 备选 → 模拟兜底，任一级失败自动切换，确保数据不断线。

### 各品种数据获取方式

- **硫磺**：解析生意社基准价新闻标题（正则匹配价格），替代此前完全模拟的数据
- **钾肥**：同硫磺，解析生意社基准价新闻
- **尿素**：抓取生意社每日现货报价表
- **磷矿**：无直接报价源，通过尿素现货价 + 磷酸基准价加权估算
- **BDI**：抓取新浪财经实时指数

---

## 二、数据可靠性

### 采集保障
- 三级降级 + 15 秒超时 + 浏览器指纹伪装（绕过反爬）
- 增量采集 + 数据库去重插入，避免冗余
- 所有响应标注 `source` 字段，区分"真实数据"与"模拟数据"

### 异常检测
- 日涨跌幅超 3% 自动触发价格异动告警
- Vercel Cron 带密钥鉴权，防止未授权调用

### 模拟数据质量（降级兜底时）
- 确定性种子随机数 + 跳过周末 + 季节性正弦波调制 + 区域价差 + 规格溢价
- 确保降级数据仍具备合理参考价值

### 准确率评估
四维指标体系：MAPE / MAE / RMSE / R²，可视化看板已上线。

> 备注：当前准确率数值为模拟生成。真实计算框架已就绪，待积累足够的预测-实际比对数据后切换。

---

## 三、预测模型变更

### 已完成

**ARIMA + XGBoost**
- 核心参数未变：ARIMA(0,1,1) / XGBoost 100 树 / 深度 3 / 学习率 0.1 / lag=3
- 唯一改动：`np.random.seed()` → `np.random.default_rng(42)`（线程安全提升）
- 数据从模拟切换为生意社真实现货价格

**硫磺价格估算模型**（三次迭代）
```
纯模拟 → 尿素+甲醇加权推算 → 生意社基准价新闻直抓（当前方案）
```

### 进行中：Transformer 深度学习通道

**已完成（TypeScript 侧）**：
- 4 模型配置：PatchTST（默认）/ TimesFM-1.0 / Lag-Llama / Granite-Timeseries
- 预测客户端 `src/services/transformer-prediction.ts`：
  - `predictWithTransformer()`：调 `POST /transformer-predict`，60s 超时
  - `getCombinedPrediction()`：并行调 ARIMA + Transformer，60/40 加权融合
  - 融合逻辑：`combined = arima × 0.6 + transformer × 0.4`，置信区间取二者更宽范围
  - `getTransformerHealth()`：健康检查，含模型加载状态 + GPU 可用性
- MCP 工具 `predict_with_transformer` / `get_combined_prediction`：返回预测表 + 精度指标 + 趋势判断

**待完成（Python 侧）**：
- `python-service/app.py` 中 **未实现** `/transformer-predict` 和 `/transformer-health` 端点
- 需引入依赖（估算：`torch` + `transformers` 或 `gluonts` / `pytorch-forecasting`），加载 PatchTST 模型并推理
- 当前调用这两个接口会直接失败

---

## 四、MCP 服务 v0.3 升级

工具 11 → 18，新增 7 个：

| 新增工具 | 分类 |
|---------|------|
| `list_commodities` / `get_commodity_analysis` / `cross_commodity_analysis` | 多品种行情与分析 |
| `predict_with_transformer` / `get_combined_prediction` | Transformer 预测 |
| `get_accuracy_metrics` | 模型精度评估 |
| `get_success_cases` | 客户成功案例检索 |

配套：`.env` 自动加载、`DEMO_MODE` 免 Key 体验、`stdio`/`http` 双传输模式。

---

## 五、部署与前端

- **三平台部署**：Vercel (前端+5个Cron) + Railway (Python预测服务) + Docker Compose (国内自建)
- **国内适配**：清华镜像源、固定端口、双 Worker
- **前端**：新增市场分析页（含准确率/多品种/Tracker 三个面板），重构仪表盘支持多品种

---

## 待推进

1. **Transformer Python 推理端点** — 客户端/MCP 已就绪，需在 `app.py` 实现 `/transformer-predict` + `/transformer-health`，引入 torch + PatchTST 模型
2. **准确率切换真实计算** — 框架已就绪，待积累数据
3. **磷矿独立数据源** — 当前为估算，需接入直接报价
4. **各品种独立模型训练** — 当前共用同一套 ARIMA+XGBoost 参数
