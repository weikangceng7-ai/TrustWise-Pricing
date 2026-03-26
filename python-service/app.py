"""
硫磺价格预测服务
基于 Hybrid ARIMA + XGBoost 模型
"""

import os
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
import xgboost as xgb
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller
import joblib
from typing import Optional, Dict, Any, List, Tuple

app = Flask(__name__)
CORS(app)

# 模型存储路径
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

# 数据文件路径
DATA_FILE = os.path.join(os.path.dirname(__file__), 'data', 'price_history.xlsx')


class SulfurPricePredictor:
    """硫磺价格预测器 - Hybrid ARIMA + XGBoost"""

    def __init__(self):
        self.arima_model = None
        self.xgb_model = None
        self.price_data = None
        self.last_price = None
        self.resid_mean = 0
        self.resid_std = 1
        self.lags = 3
        self.arima_order = (0, 1, 1)

    def load_data(self, file_path: str = None) -> pd.DataFrame:
        """加载价格历史数据"""
        if file_path is None:
            file_path = DATA_FILE

        if not os.path.exists(file_path):
            # 如果没有数据文件，创建模拟数据
            return self._create_mock_data()

        try:
            data = pd.read_excel(file_path)
            if '长江港硫磺现货价' in data.columns:
                data.rename(columns={'长江港硫磺现货价': 'price', '日期': 'date'}, inplace=True)
            data['date'] = pd.to_datetime(data['date'])
            data.set_index('date', inplace=True)
            data = data.sort_index()
            self.price_data = data
            return data
        except Exception as e:
            print(f"加载数据失败: {e}")
            return self._create_mock_data()

    def _create_mock_data(self) -> pd.DataFrame:
        """创建模拟数据用于测试"""
        dates = pd.date_range(start='2023-01-01', end=datetime.now(), freq='D')
        np.random.seed(42)

        # 模拟价格数据：基础价格 + 趋势 + 季节性 + 随机波动
        n = len(dates)
        trend = np.linspace(800, 1000, n)
        seasonal = 50 * np.sin(np.linspace(0, 4*np.pi, n))
        noise = np.random.normal(0, 30, n)
        prices = trend + seasonal + noise

        data = pd.DataFrame({
            'price': prices
        }, index=dates)
        data.index.name = 'date'

        self.price_data = data
        return data

    def check_stationarity(self, timeseries: pd.Series) -> bool:
        """检查时间序列平稳性"""
        try:
            result = adfuller(timeseries.dropna(), autolag='AIC')
            return result[1] < 0.05  # p-value < 0.05 表示平稳
        except:
            return False

    def train(self, data: pd.DataFrame = None, test_ratio: float = 0.1) -> Dict[str, Any]:
        """
        训练 Hybrid ARIMA + XGBoost 模型

        Args:
            data: 价格数据，如果为 None 则使用已加载的数据
            test_ratio: 测试集比例

        Returns:
            训练结果，包含评估指标
        """
        if data is None:
            data = self.price_data

        if data is None:
            data = self.load_data()

        price = data['price']

        # 划分训练集和测试集
        split_index = int(len(price) * (1 - test_ratio))
        train_price = price[:split_index]
        test_price = price[split_index:]

        # 训练 ARIMA 模型
        print("训练 ARIMA 模型...")
        self.arima_model = ARIMA(train_price, order=self.arima_order)
        arima_result = self.arima_model.fit()

        # 获取训练集残差
        resid = arima_result.resid
        self.resid_mean = resid.mean()
        self.resid_std = resid.std()

        # 构建滞后特征用于 XGBoost
        def build_lag_features(series: pd.Series, lags: int) -> Tuple[pd.DataFrame, pd.Series]:
            df = pd.concat([series.shift(i) for i in range(1, lags + 1)], axis=1)
            df.columns = [f'lag_{i}' for i in range(1, lags + 1)]
            features = df.dropna()
            labels = resid[lags:]
            labels = labels.loc[features.index]
            return features, labels

        train_features, train_labels = build_lag_features(resid, self.lags)

        # 训练 XGBoost 模型
        print("训练 XGBoost 模型...")
        self.xgb_model = xgb.XGBRegressor(
            objective='reg:squarederror',
            n_estimators=100,
            max_depth=3,
            learning_rate=0.1,
            random_state=42
        )
        self.xgb_model.fit(train_features, train_labels)

        # 在测试集上评估
        arima_pred = arima_result.forecast(steps=len(test_price))

        # 使用 XGBoost 预测残差
        last_known = resid[-self.lags:].values
        xgb_preds = []

        for _ in range(len(test_price)):
            input_feat = np.array(last_known).reshape(1, -1)
            pred = self.xgb_model.predict(input_feat)[0]
            xgb_preds.append(pred)
            last_known = np.append(last_known[1:], pred)

        xgb_pred = pd.Series(xgb_preds, index=test_price.index)

        # 组合预测结果
        final_pred = arima_pred + xgb_pred

        # 计算评估指标
        from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

        mse = mean_squared_error(test_price, final_pred)
        mae = mean_absolute_error(test_price, final_pred)
        r2 = r2_score(test_price, final_pred)
        mape = np.mean(np.abs((test_price - final_pred) / test_price)) * 100

        self.last_price = price.iloc[-1]

        # 保存模型
        self._save_models()

        return {
            'mse': float(mse),
            'mae': float(mae),
            'r2': float(r2),
            'mape': float(mape),
            'train_size': len(train_price),
            'test_size': len(test_price),
            'last_price': float(self.last_price),
            'model_type': 'Hybrid ARIMA + XGBoost',
            'arima_order': self.arima_order,
            'xgb_lags': self.lags
        }

    def predict(self, days: int = 7) -> Dict[str, Any]:
        """
        预测未来价格

        Args:
            days: 预测天数

        Returns:
            预测结果
        """
        if self.arima_model is None or self.xgb_model is None:
            # 尝试加载已保存的模型
            if not self._load_models():
                # 如果没有模型，先训练
                self.load_data()
                self.train()

        if self.price_data is None:
            self.load_data()

        price = self.price_data['price']
        last_date = price.index[-1]

        # ARIMA 预测
        arima_result = ARIMA(price, order=self.arima_order).fit()
        arima_pred = arima_result.forecast(steps=days)

        # XGBoost 预测残差
        resid = arima_result.resid
        last_known = resid[-self.lags:].values
        xgb_preds = []

        for _ in range(days):
            input_feat = np.array(last_known).reshape(1, -1)
            pred = self.xgb_model.predict(input_feat)[0]
            xgb_preds.append(pred)
            last_known = np.append(last_known[1:], pred)

        # 组合预测
        final_pred = arima_pred.values + np.array(xgb_preds)

        # 生成预测日期
        future_dates = pd.date_range(
            start=last_date + timedelta(days=1),
            periods=days,
            freq='D'
        )

        predictions = [
            {
                'date': date.strftime('%Y-%m-%d'),
                'predicted_price': round(float(price), 2),
                'arima_component': round(float(arima), 2),
                'xgb_residual': round(float(resid), 2)
            }
            for date, price, arima, resid in zip(future_dates, final_pred, arima_pred.values, xgb_preds)
        ]

        # 计算趋势
        if len(predictions) >= 2:
            first_price = predictions[0]['predicted_price']
            last_price = predictions[-1]['predicted_price']
            trend = '上涨' if last_price > first_price else '下跌' if last_price < first_price else '平稳'
            change_pct = round((last_price - first_price) / first_price * 100, 2) if first_price != 0 else 0
        else:
            trend = '未知'
            change_pct = 0

        return {
            'predictions': predictions,
            'current_price': round(float(price.iloc[-1]), 2),
            'prediction_days': days,
            'trend': trend,
            'change_percent': change_pct,
            'model_type': 'Hybrid ARIMA + XGBoost',
            'confidence': self._calculate_confidence(predictions),
            'generated_at': datetime.now().isoformat()
        }

    def _calculate_confidence(self, predictions: List[Dict]) -> str:
        """计算预测置信度"""
        if not predictions:
            return '低'

        prices = [p['predicted_price'] for p in predictions]
        volatility = np.std(prices) / np.mean(prices) if np.mean(prices) != 0 else 0

        if volatility < 0.02:
            return '高'
        elif volatility < 0.05:
            return '中'
        else:
            return '低'

    def analyze_trend(self, days: int = 30) -> Dict[str, Any]:
        """
        分析价格趋势

        Args:
            days: 分析天数

        Returns:
            趋势分析结果
        """
        if self.price_data is None:
            self.load_data()

        price = self.price_data['price']

        # 计算移动平均
        ma_7 = price.rolling(window=7).mean().iloc[-1]
        ma_30 = price.rolling(window=30).mean().iloc[-1] if len(price) >= 30 else price.mean()

        # 计算波动率
        returns = price.pct_change().dropna()
        volatility = returns.std() * np.sqrt(252) * 100  # 年化波动率

        # 趋势判断
        current_price = price.iloc[-1]
        price_7d_ago = price.iloc[-7] if len(price) >= 7 else price.iloc[0]
        price_30d_ago = price.iloc[-30] if len(price) >= 30 else price.iloc[0]

        trend_7d = '上涨' if current_price > price_7d_ago else '下跌'
        trend_30d = '上涨' if current_price > price_30d_ago else '下跌'

        change_7d = round((current_price - price_7d_ago) / price_7d_ago * 100, 2)
        change_30d = round((current_price - price_30d_ago) / price_30d_ago * 100, 2)

        return {
            'current_price': round(float(current_price), 2),
            'ma_7': round(float(ma_7), 2),
            'ma_30': round(float(ma_30), 2),
            'volatility': round(float(volatility), 2),
            'trend_7d': trend_7d,
            'trend_30d': trend_30d,
            'change_7d_percent': change_7d,
            'change_30d_percent': change_30d,
            'analysis': self._generate_trend_analysis(trend_7d, trend_30d, change_7d, volatility)
        }

    def _generate_trend_analysis(self, trend_7d: str, trend_30d: str,
                                  change_7d: float, volatility: float) -> str:
        """生成趋势分析文本"""
        analysis = f"近期价格呈现{trend_7d}趋势，"

        if abs(change_7d) > 5:
            analysis += f"涨幅较大({change_7d}%)，"
        elif abs(change_7d) > 2:
            analysis += f"涨幅适中({change_7d}%)，"
        else:
            analysis += "价格相对稳定，"

        if volatility > 20:
            analysis += "市场波动较大，建议谨慎采购。"
        elif volatility > 10:
            analysis += "市场存在一定波动，可适当观望。"
        else:
            analysis += "市场相对平稳，可按需采购。"

        return analysis

    def _save_models(self):
        """保存模型到文件"""
        if self.xgb_model is not None:
            joblib.dump(self.xgb_model, os.path.join(MODEL_DIR, 'xgb_model.joblib'))

        # 保存模型参数
        params = {
            'arima_order': self.arima_order,
            'lags': self.lags,
            'resid_mean': float(self.resid_mean),
            'resid_std': float(self.resid_std),
            'last_price': float(self.last_price) if self.last_price else None
        }
        with open(os.path.join(MODEL_DIR, 'model_params.json'), 'w') as f:
            json.dump(params, f)

    def _load_models(self) -> bool:
        """从文件加载模型"""
        try:
            xgb_path = os.path.join(MODEL_DIR, 'xgb_model.joblib')
            params_path = os.path.join(MODEL_DIR, 'model_params.json')

            if os.path.exists(xgb_path) and os.path.exists(params_path):
                self.xgb_model = joblib.load(xgb_path)

                with open(params_path, 'r') as f:
                    params = json.load(f)

                self.arima_order = tuple(params['arima_order'])
                self.lags = params['lags']
                self.resid_mean = params['resid_mean']
                self.resid_std = params['resid_std']
                self.last_price = params.get('last_price')

                return True
        except Exception as e:
            print(f"加载模型失败: {e}")

        return False


# 全局预测器实例
predictor = SulfurPricePredictor()


@app.route('/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({'status': 'healthy', 'service': 'sulfur-price-predictor'})


@app.route('/train', methods=['POST'])
def train_model():
    """训练模型"""
    try:
        data = request.get_json() or {}
        test_ratio = data.get('test_ratio', 0.1)

        # 加载数据并训练
        predictor.load_data()
        result = predictor.train(test_ratio=test_ratio)

        return jsonify({
            'success': True,
            'message': '模型训练完成',
            'metrics': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/predict', methods=['POST'])
def predict():
    """预测价格"""
    try:
        data = request.get_json() or {}
        days = data.get('days', 7)

        # 限制预测天数
        days = min(max(1, days), 90)

        result = predictor.predict(days=days)

        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/trend', methods=['GET'])
def analyze_trend():
    """分析趋势"""
    try:
        days = request.args.get('days', 30, type=int)
        result = predictor.analyze_trend(days=days)

        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/decision', methods=['POST'])
def purchase_decision():
    """
    生成采购决策建议

    基于预测结果和库存情况，给出采购建议
    """
    try:
        data = request.get_json() or {}
        days = data.get('days', 7)
        current_inventory = data.get('current_inventory')  # 当前库存量
        daily_consumption = data.get('daily_consumption', 100)  # 日消耗量
        safety_days = data.get('safety_days', 7)  # 安全库存天数

        # 获取预测结果
        prediction = predictor.predict(days=days)
        trend = predictor.analyze_trend()

        # 计算库存情况
        inventory_analysis = {}
        if current_inventory is not None:
            inventory_days = current_inventory / daily_consumption if daily_consumption > 0 else 0
            inventory_analysis = {
                'current_inventory': current_inventory,
                'daily_consumption': daily_consumption,
                'inventory_days': round(inventory_days, 1),
                'safety_inventory': daily_consumption * safety_days,
                'status': '充足' if inventory_days > safety_days * 1.5 else '正常' if inventory_days > safety_days else '不足'
            }

        # 生成采购建议
        predictions = prediction['predictions']
        avg_price = np.mean([p['predicted_price'] for p in predictions])
        min_price = min(predictions, key=lambda x: x['predicted_price'])
        max_price = max(predictions, key=lambda x: x['predicted_price'])

        # 决策逻辑
        if prediction['trend'] == '下跌' and trend['volatility'] < 15:
            suggestion = '建议观望，价格呈下跌趋势，可等待更低价格采购'
            urgency = '低'
        elif prediction['trend'] == '上涨' or inventory_analysis.get('status') == '不足':
            suggestion = '建议尽快采购，价格上涨趋势明显'
            urgency = '高'
        else:
            suggestion = '建议按需采购，价格相对稳定'
            urgency = '中'

        # 计算建议采购量
        if current_inventory is not None and inventory_days < safety_days * 1.5:
            suggested_quantity = (safety_days * 1.5 - inventory_days) * daily_consumption
        else:
            suggested_quantity = daily_consumption * 7  # 一周用量

        return jsonify({
            'success': True,
            'data': {
                'prediction': prediction,
                'trend_analysis': trend,
                'inventory_analysis': inventory_analysis,
                'decision': {
                    'suggestion': suggestion,
                    'urgency': urgency,
                    'suggested_quantity': round(suggested_quantity, 0),
                    'best_purchase_date': min_price['date'],
                    'expected_best_price': min_price['predicted_price'],
                    'avg_predicted_price': round(avg_price, 2),
                    'price_range': {
                        'min': min_price['predicted_price'],
                        'max': max_price['predicted_price']
                    }
                }
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    # 初始化数据
    predictor.load_data()

    # 尝试加载已有模型，否则训练新模型
    if not predictor._load_models():
        print("未找到已训练模型，开始训练...")
        predictor.train()
        print("模型训练完成")

    # 启动服务
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)