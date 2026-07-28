# 硫磺采购价格预测系统改进方案

## Context

用户希望改进当前的价格预测系统，发现以下核心问题：

| 问题 | 严重程度 |
|------|---------|
| Transformer 端点缺失 | ⚠️ P0 |
| 企业预测用 Mock 数据 | ⚠️ P0 |
| ARIMA 参数固定 `(0,1,1)` | P1 |
| XGBoost 超参数固定 | P1 |

**用户选择了全部四项改进**：
1. 快速修复 Transformer 端点
2. 企业预测真实化
3. ARIMA 参数自适应化
4. XGBoost 超参数调优

---

## 实施计划

### Step 1: 修复 Transformer 端点缺失（P0）

**目标**：消除前端调用错误，添加优雅降级

**修改文件**：`src/services/transformer-prediction.ts`

**实现内容**：
1. `predictWithTransformer()` - 添加 try-catch，当 `/transformer-predict` 失败时返回 fallback
2. `getTransformerHealth()` - 返回 unhealthy 状态而非抛错
3. `getCombinedPrediction()` - 当 Transformer 不可用时，降级到纯 ARIMA+XGBoost

**验证**：调用 `getTransformerHealth()` 确认返回 unhealthy 但无异常

---

### Step 2: 企业预测真实化（P0）

**目标**：让企业预测调用真实模型

**修改文件**：
- `python-service/app.py` - 新增 `/predict-enterprise` 端点
- `src/app/api/enterprise-predictions/route.ts` - 调用真实服务

**实现内容**：

1. **Python 服务新增端点**：
```python
@app.route('/predict-enterprise', methods=['POST'])
def predict_enterprise():
    # 基于 enterprise_code 应用差异化调整
    # yihua: +0, luxi: -13, jinzhengda: -27
```

2. **Next.js 客户端修改**：
```typescript
// src/app/api/enterprise-predictions/route.ts
// 调用真实服务，失败时 fallback 到 mock
```

**企业差异化配置**：

| 企业 | 代码 | 基准价格调整 | 波动率因子 |
|------|------|-------------|-----------|
| HX集团 | yihua | +0 | 1.0 |
| HY集团 | luxi | -13 | 0.93 |
| TC集团 | jinzhengda | -27 | 1.07 |

**验证**：调用 `/api/enterprise-predictions?enterprise=yihua` 返回真实数据

---

### Step 3: ARIMA 参数自适应化（P1）

**目标**：用 AIC/BIC 自动选择最优 ARIMA (p,d,q) 参数

**修改文件**：`python-service/app.py`

**实现内容**：
1. 在 `SulfurPricePredictor` 类中添加 `_select_arima_order()` 方法
2. 参数搜索空间：`p: 0-3, d: 0-1, q: 0-3`
3. 修改 `train()` 方法，训练前调用参数选择

**预期效果**：MAPE 从 ~5% 降至 ~3-4%

**验证**：对比固定参数 vs 自适应参数的预测误差

---

### Step 4: XGBoost 超参数调优（P1）

**目标**：用 GridSearchCV 优化超参数

**修改文件**：`python-service/app.py`

**实现内容**：
1. 在 `SulfurPricePredictor` 类中添加 `_tune_xgboost()` 方法
2. 搜索参数：`n_estimators, max_depth, learning_rate, min_child_weight, subsample, colsample_bytree`
3. 使用 3 折交叉验证

**注意**：添加 `use_tuning` 配置项（默认关闭）避免每次训练耗时过长

**验证**：对比默认参数 vs 调优后参数的 MAPE

---

## 关键文件清单

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `python-service/app.py` | 修改 | ARIMA 自适应 + XGBoost 调优 + 新增端点 |
| `src/services/transformer-prediction.ts` | 修改 | Transformer 降级逻辑 |
| `src/app/api/enterprise-predictions/route.ts` | 修改 | 调用真实预测服务 |

---

## 执行顺序

```
1. transformer-prediction.ts (降级修复)
       ↓
2. python-service/app.py (ARIMA 自适应)
       ↓
3. python-service/app.py (XGBoost 调优)
       ↓
4. python-service/app.py (新增 /predict-enterprise)
       ↓
5. enterprise-predictions/route.ts (调用真实服务)
```

---

## 验证方法

| 步骤 | 验证方式 |
|------|---------|
| 1 | `getTransformerHealth()` 返回 unhealthy 但无异常 |
| 2 | `/api/enterprise-predictions?enterprise=yihua` 返回格式正确 |
| 3 | 训练日志显示 "自适应选择 ARIMA 阶数: (p,d,q)" |
| 4 | 训练日志显示 "最优参数: {...}" |
| 5 | 企业预测数据与全局预测数据有差异化调整 |
