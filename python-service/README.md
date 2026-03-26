# 硫磺价格预测服务

基于 Hybrid ARIMA + XGBoost 模型的硫磺价格预测服务。

## 模型架构

### Hybrid ARIMA + XGBoost

1. **ARIMA 模型**：捕捉时间序列的线性趋势和季节性成分
2. **XGBoost 模型**：预测 ARIMA 残差，捕捉非线性模式
3. **组合预测**：最终预测 = ARIMA 预测 + XGBoost 残差预测

### 优势
- 结合统计模型和机器学习的优点
- 能够处理复杂的非线性价格模式
- 提供置信度评估

## 安装

```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

## 启动服务

### Windows
```bash
start.bat
```

### Linux/Mac
```bash
chmod +x start.sh
./start.sh
```

服务将在 `http://localhost:5001` 启动。

## API 端点

### 健康检查
```
GET /health
```

### 训练模型
```
POST /train
Content-Type: application/json

{
  "test_ratio": 0.1
}
```

### 价格预测
```
POST /predict
Content-Type: application/json

{
  "days": 7
}
```

响应示例：
```json
{
  "success": true,
  "data": {
    "predictions": [
      {
        "date": "2024-01-15",
        "predicted_price": 950.25,
        "arima_component": 945.00,
        "xgb_residual": 5.25
      }
    ],
    "current_price": 948.50,
    "prediction_days": 7,
    "trend": "上涨",
    "change_percent": 2.5,
    "model_type": "Hybrid ARIMA + XGBoost",
    "confidence": "高"
  }
}
```

### 趋势分析
```
GET /trend?days=30
```

### 采购决策建议
```
POST /decision
Content-Type: application/json

{
  "days": 7,
  "current_inventory": 1000,
  "daily_consumption": 50,
  "safety_days": 7
}
```

## 与 Next.js 应用集成

预测服务已集成到 Agent 决策助手中：

1. **自动检测**：当用户询问预测相关问题时，自动调用预测服务
2. **上下文注入**：预测结果作为系统提示的一部分发送给 AI
3. **决策支持**：提供采购时机、数量、风险等建议

### 关键词触发

- 预测关键词：`预测`, `未来`, `走势`, `趋势预测`, `价格预测`
- 决策关键词：`采购建议`, `采购决策`, `要不要买`, `买多少`
- 趋势关键词：`趋势分析`, `走势分析`, `行情分析`

## 数据格式

### 价格历史数据

将价格数据放在 `data/price_history.xlsx` 文件中，格式如下：

| 日期 | 长江港硫磺现货价 |
|------|-----------------|
| 2024-01-01 | 950 |
| 2024-01-02 | 955 |
| ... | ... |

如果没有数据文件，服务会自动创建模拟数据用于测试。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 5001 | 服务端口 |
| PREDICTION_SERVICE_URL | http://localhost:5001 | Next.js 应用中的预测服务 URL |

## 技术栈

- **Flask**：Web 服务框架
- **pandas**：数据处理
- **statsmodels**：ARIMA 模型
- **xgboost**：XGBoost 模型
- **scikit-learn**：评估指标