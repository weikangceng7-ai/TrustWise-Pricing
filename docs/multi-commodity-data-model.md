# SulfurAI 多品种数据模型文档

> 文档目的：展示 SulfurAI 平台从硫磺扩展到多品类大宗原料的数据架构支撑能力

---

## 1. 现有架构已支持多品种

### 1.1 核心价格表架构

`src/db/schema.ts` 中的 `sulfur_prices` 表实际上已经支持多品种数据存储：

```sql
-- 关键字段
market       VARCHAR   -- 市场/品种（当前用于 sp/slu/gsl/gnl 等硫磺细分市场）
specification VARCHAR  -- 规格描述
unit         VARCHAR   -- 单位（默认"元/吨"）
source       VARCHAR   -- 数据来源
```

**扩展方式**: 将 `market` 字段的取值从硫磺子市场扩展到其他品种：
- `sulfur` (硫磺) → 已有数据
- `phosphate` (磷矿)
- `potash` (钾肥)
- `urea` (尿素)

### 1.2 多维价格表

`multi_dimensional_prices` 表已支持多维度市场数据分类：
- `supply` (供给)
- `middle_east_cob` (中东COB)
- `domestic` (国内报价)
- `market_news` (市场消息)

每个维度的 Schema 完全通用，可按品种扩展。

### 1.3 企业预测表

`enterprise_price_predictions` 表已包含：
- `enterprise_id` — 企业关联
- `prediction_date` — 预测日期
- `predicted_price` — 预测价格
- `confidence_lower` / `confidence_upper` — 置信区间
- `model_type` — 模型类型（EEMD-LSTM / LSTM / ARIMA-LSTM）

**扩展方式**: 添加 `commodity_code` 字段即可按品种区分预测数据。

---

## 2. 预测引擎的通用性

### 2.1 ARIMA + XGBoost 混合模型

ARIMA（自回归积分滑动平均模型）和 XGBoost（梯度提升决策树）都是**时间序列通用模型**，不依赖硫磺特定特征。模型只需：
- 历史价格时间序列
- 相关影响因子（原油价格、运费、汇率等）

任何大宗商品（磷矿、钾肥、尿素）都可通过提供历史数据来训练同架构模型。

### 2.2 知识图谱推理

Neo4j 知识图谱的节点类型（Price、Supply、Demand、Factor、Enterprise）是通用的抽象概念，无需修改图结构即可添加新品种：
```
(Commodity {type: "phosphorus"}) -[:INFLUENCES]-> (Price)
(Commodity {type: "potash"}) -[:INFLUENCES]-> (Price)
(Commodity {type: "urea"}) -[:INFLUENCES]-> (Price)
```

### 2.3 Agent 决策框架

Agent 系统提示词 (`src/lib/system-prompt.ts`) 中的表格分析模式是品类无关的：
- "宏观市场分析面板"
- "企业决策面板"
修改提示词中的 `品种名称` 即可适用于任何品类。

---

## 3. 数据库迁移计划

### Phase 1: 添加品类字段 (1-2天)

```sql
-- 1. prices 表添加 commodity_code
ALTER TABLE sulfur_prices ADD COLUMN commodity_code VARCHAR(20) DEFAULT 'sulfur';

-- 2. enterprise_predictions 表添加 commodity_code  
ALTER TABLE enterprise_price_predictions ADD COLUMN commodity_code VARCHAR(20) DEFAULT 'sulfur';

-- 3. multi_dimensional_prices 表添加 commodity_code
ALTER TABLE multi_dimensional_prices ADD COLUMN commodity_code VARCHAR(20) DEFAULT 'sulfur';

-- 4. 创建品类元数据表
CREATE TABLE commodities (
  code VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  unit VARCHAR(20) DEFAULT '元/吨',
  category VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. 插入初始品类
INSERT INTO commodities (code, name, category) VALUES
  ('sulfur', '硫磺', '化工原料'),
  ('phosphate', '磷矿', '矿产原料'),
  ('potash', '钾肥', '化肥原料'),
  ('urea', '尿素', '化肥产品');
```

### Phase 2: 数据采集扩展 (1周)

- 磷矿: 接入国内磷矿报价数据源
- 钾肥: 接入国际钾肥价格指数
- 尿素: 接入国内尿素出厂价数据源

### Phase 3: 模型训练 (2周)

- 为每个品种训练独立 ARIMA + XGBoost 模型
- 品种间相关性分析（如硫磺-磷肥价格联动）

### Phase 4: UI 更新 (1周)

- Dashboard 品种切换器
- 多品种对比分析页面
- 品种间相关性可视化

---

## 4. 技术验证结论

| 能力 | 硫磺 | 磷矿 | 钾肥 | 尿素 |
|------|------|------|------|------|
| 数据模型 | 已支持 | 仅需加字段 | 仅需加字段 | 仅需加字段 |
| 预测模型 | 已训练 | 需重新训练 | 需重新训练 | 需重新训练 |
| 知识图谱 | 已支持 | 仅需加节点 | 仅需加节点 | 仅需加节点 |
| Agent 对话 | 已支持 | 仅需改提示词 | 仅需改提示词 | 仅需改提示词 |
| 报告生成 | 已支持 | 已支持 | 已支持 | 已支持 |
| 追踪预警 | 已支持 | 已支持 | 已支持 | 已支持 |

**核心基础设施**（API 层、Agent 框架、知识图谱引擎、报告系统、追踪系统）**100% 可复用**，新增一个品种的主要工作在于数据采集和模型训练。
