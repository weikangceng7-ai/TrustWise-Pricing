"""
硫磺价格预测服务
基于 Hybrid ARIMA + XGBoost 模型
"""

import os
import re
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from flask import Flask, request, Response
from flask_cors import CORS
import json
import xgboost as xgb
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller
import joblib
from typing import Optional, Dict, Any, List, Tuple

# 外部经济因子数据（FRED + Frankfurter）
from external_data import fetch_external_factors, merge_factors_to_price, print_factor_summary, FACTOR_COLUMNS

# LightGBM 双模型残差学习（可选，缺失时仅用 XGBoost）
try:
    import lightgbm as lgb
    _HAS_LGB = True
except ImportError:
    _HAS_LGB = False

# Transformer 深度学习依赖（可选）
try:
    import torch
    _HAS_TORCH = True
except ImportError:
    _HAS_TORCH = False

try:
    from transformers import PatchTSTConfig, PatchTSTForPrediction
    _HAS_TRANSFORMERS = True
except ImportError:
    _HAS_TRANSFORMERS = False

# PostgreSQL 数据源（可选，优先于本地 Excel）
try:
    import psycopg2
    import psycopg2.extras
    _HAS_PSYCOPG2 = True
except ImportError as e:
    _HAS_PSYCOPG2 = False
    print(f'[WARN] psycopg2 未安装，PostgreSQL 不可用: {e}')

app = Flask(__name__)
CORS(app)


def json_response(data, status=200):
    """返回 JSON 响应，确保中文正确显示（UTF-8 原文而非 \\u 转义）"""
    body = json.dumps(data, ensure_ascii=False, default=str)
    return Response(body, status=status, mimetype='application/json; charset=utf-8')


# 生意社现货价格直连（不使用 AKShare spot_price，新版已移除）
try:
    from curl_cffi import requests as curl_requests
    from bs4 import BeautifulSoup
    _HAS_CURL_CFFI = True
except ImportError:
    _HAS_CURL_CFFI = False

# 模型存储路径
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

# 数据文件路径
DATA_FILE = os.path.join(os.path.dirname(__file__), 'data', 'price_history.xlsx')

# PostgreSQL 数据源（优先级高于本地 Excel）
DATABASE_URL = os.environ.get('DATABASE_URL', '')
_USE_DB = bool(DATABASE_URL) and _HAS_PSYCOPG2

print(f'[INFO] PostgreSQL 连接: {"可用" if _USE_DB else "不可用"} '
      f'(psycopg2={"已安装" if _HAS_PSYCOPG2 else "未安装"}, '
      f'DATABASE_URL={"已设置" if DATABASE_URL else "未设置"})')


# ============================================================================
# Feature Engineering - 增强特征工程
# ============================================================================

class FeatureEngineer:
    """特征工程管道 - 为残差学习构建增强特征"""

    @staticmethod
    def create_lag_features(data: pd.Series, lags: List[int]) -> pd.DataFrame:
        """创建滞后特征"""
        df = pd.DataFrame(index=data.index)
        for lag in lags:
            df[f'lag_{lag}'] = data.shift(lag)
        return df

    @staticmethod
    def create_rolling_features(data: pd.Series) -> pd.DataFrame:
        """创建滚动窗口特征"""
        df = pd.DataFrame(index=data.index)
        df['ma_7'] = data.rolling(window=7).mean()
        df['ma_14'] = data.rolling(window=14).mean()
        df['volatility_7'] = data.rolling(window=7).std()
        df['volatility_14'] = data.rolling(window=14).std()
        return df

    @staticmethod
    def create_momentum_features(data: pd.Series) -> pd.DataFrame:
        """创建动量指标"""
        df = pd.DataFrame(index=data.index)
        df['momentum_7'] = data - data.shift(7)
        df['momentum_14'] = data - data.shift(14)
        df['roc_7'] = (data - data.shift(7)) / data.shift(7) * 100
        df['roc_14'] = (data - data.shift(14)) / data.shift(14) * 100
        return df

    @staticmethod
    def create_rsi(data: pd.Series, period: int = 14) -> pd.Series:
        """计算相对强弱指数 (RSI)"""
        delta = data.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi

    @staticmethod
    def create_calendar_features(dates: pd.DatetimeIndex) -> pd.DataFrame:
        """创建日历特征（周期性编码）"""
        df = pd.DataFrame(index=dates)
        df['month'] = dates.month
        df['day_of_week'] = dates.dayofweek
        # 正弦/余弦周期编码
        df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
        df['day_of_week_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['day_of_week_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
        return df

    @classmethod
    def build_residual_features(cls, resid: pd.Series) -> pd.DataFrame:
        """构建残差特征（增强版，相对于原文的简单滞后）

        特征维度从 3 扩展到 10+，覆盖趋势、动量、波动率
        """
        features = pd.DataFrame(index=resid.index)

        # 滞后特征（与原文相同）
        for lag in [1, 2, 3]:
            features[f'resid_lag_{lag}'] = resid.shift(lag)

        # 移动平均特征（新增）
        features['resid_ma_3'] = resid.rolling(window=3).mean()
        features['resid_ma_7'] = resid.rolling(window=7).mean()

        # 动量特征（新增）
        features['resid_momentum_3'] = resid - resid.shift(3)
        features['resid_momentum_7'] = resid - resid.shift(7)

        # 波动率特征（新增）
        features['resid_vol_3'] = resid.rolling(window=3).std()
        features['resid_vol_7'] = resid.rolling(window=7).std()

        return features.dropna()


# ============================================================================
# Volatility Regime Detector - 波动率状态检测器
# ============================================================================

class VolatilityRegimeDetector:
    """检测市场波动率状态: low/normal/high

    用于采购决策调整：
    - 低波动: 可适当增加库存
    - 正常: 按计划采购
    - 高波动: 建议观望，降低风险敞口
    """

    def __init__(self, low_threshold: float = 0.5, high_threshold: float = 1.5):
        self.low_threshold = low_threshold
        self.high_threshold = high_threshold
        self.historical_vol: Optional[float] = None

    def fit(self, returns: pd.Series) -> 'VolatilityRegimeDetector':
        """拟合历史波动率"""
        self.historical_vol = float(returns.std())
        return self

    def detect(self, recent_returns: pd.Series) -> str:
        """检测当前波动率状态"""
        if self.historical_vol is None or self.historical_vol == 0:
            return "normal"

        current_vol = float(recent_returns.tail(20).std())
        vol_ratio = current_vol / self.historical_vol

        if vol_ratio < self.low_threshold:
            return "low"
        elif vol_ratio > self.high_threshold:
            return "high"
        else:
            return "normal"

    def get_risk_adjustment(self, regime: str) -> float:
        """获取风险调整系数"""
        adjustments = {
            "low": 0.95,    # 低风险，可多采购
            "normal": 1.0,
            "high": 1.15,   # 高风险，谨慎操作
        }
        return adjustments.get(regime, 1.0)


class SulfurPricePredictor:
    """硫磺价格预测器 - Hybrid Residual Ensemble (ARIMA + XGBoost/LightGBM)

    改进点（相对于原文 ARIMA + XGBoost）:
    - XGBoost + LightGBM 双模型残差学习
    - 增强残差特征: MA、动量、波动率等 10 维（原文仅 3 阶滞后）
    - 96% 置信区间量化不确定性
    - 波动率 regime 检测整合采购决策
    """

    def __init__(self):
        self.arima_model = None
        self.xgb_model = None
        self.lgb_model = None  # LightGBM 双模型（可选）
        self.price_data = None
        self.last_price = None
        self.resid_mean = 0
        self.resid_std = 1
        self.lags = 3
        self.arima_order = (0, 1, 1)
        self._initialized = False
        self._commodity_code: str = ''  # 当前加载的品种
        self.factor_cols: List[str] = []
        self.last_factors: Dict[str, float] = {}
        self.residual_features: List[str] = []  # 增强残差特征列名
        self.regime_detector = VolatilityRegimeDetector()  # 波动率状态检测器

    def ensure_initialized(self, commodity_code: str = 'sulfur'):
        """懒加载：首次调用时加载数据并训练模型"""
        if self._initialized and self._commodity_code == commodity_code:
            return
        self._commodity_code = commodity_code
        self.load_data(commodity_code)
        if not self._load_models(commodity_code):
            print(f"未找到 {commodity_code} 已训练模型，开始训练...")
            self.train()
            print(f"{commodity_code} 模型训练完成")
        self._initialized = True

    def load_data(self, commodity_code: str = 'sulfur') -> pd.DataFrame:
        """加载价格历史数据

        优先级: PostgreSQL > 本地 Excel > 模拟数据
        """
        # 优先尝试 PostgreSQL
        if _USE_DB:
            data = self._load_from_db(commodity_code)
            if data is not None:
                return data
            print('PostgreSQL 数据不可用，回退到本地文件')

        if not os.path.exists(DATA_FILE):
            return self._create_mock_data()

        try:
            data = pd.read_excel(DATA_FILE)
            if '长江港硫磺现货价' in data.columns:
                data.rename(columns={'长江港硫磺现货价': 'price', '日期': 'date'}, inplace=True)
            data['date'] = pd.to_datetime(data['date'])
            data.set_index('date', inplace=True)
            data = data.sort_index()
            self.price_data = data
            return data
        except Exception as e:
            print(f'加载 Excel 数据失败: {e}')
            return self._create_mock_data()

    def _load_from_db(self, commodity_code: str = 'sulfur') -> Optional[pd.DataFrame]:
        """从 PostgreSQL 加载价格历史数据"""
        if not _USE_DB:
            return None

        try:
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()
            cur.execute(
                'SELECT date, main_price FROM sulfur_prices '
                'WHERE commodity_code = %s AND main_price IS NOT NULL '
                'ORDER BY date',
                (commodity_code,)
            )
            rows = cur.fetchall()
            cur.close()
            conn.close()

            if not rows:
                print(f'PostgreSQL 中无 {commodity_code} 数据')
                return None

            data = pd.DataFrame(rows, columns=['date', 'price'])
            data['price'] = data['price'].astype(float)
            data['date'] = pd.to_datetime(data['date'])
            data.set_index('date', inplace=True)
            data = data.sort_index()
            # 去重（同一天取最新价格）
            data = data[~data.index.duplicated(keep='last')]

            self.price_data = data
            print(f'从 PostgreSQL 加载 {len(data)} 条 {commodity_code} 价格数据 '
                  f'({data.index[0].strftime("%Y-%m-%d")} ~ {data.index[-1].strftime("%Y-%m-%d")})')
            return data
        except Exception as e:
            print(f'PostgreSQL 加载失败: {e}')
            return None

    def _create_mock_data(self) -> pd.DataFrame:
        """创建模拟数据用于测试（按品种生成不同价格区间）"""
        code = self._commodity_code or 'sulfur'
        profiles = {
            'sulfur':    (900, 60, 20),     # 硫磺: 900 基准, ±60 波动
            'phosphate': (1130, 50, 15),    # 磷矿石: 1130 基准, ±50 波动
            'potash':    (3570, 120, 25),    # 钾肥: 3570 基准, ±120 波动
            'urea':      (1810, 80, 22),     # 尿素: 1810 基准, ±80 波动
        }
        base, amplitude, noise_std = profiles.get(code, (1000, 60, 20))

        dates = pd.date_range(start='2023-01-01', end=datetime.now(), freq='D')
        rng = np.random.default_rng(42)

        n = len(dates)
        trend = np.linspace(base * 0.85, base * 1.05, n)
        seasonal = amplitude * np.sin(np.linspace(0, 4*np.pi, n))
        noise = rng.normal(0, noise_std, n)
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
        训练 Hybrid Residual Ensemble 模型

        改进点:
        - 增强残差特征: 10 维 (MA、动量、波动率) vs 原文 3 阶滞后
        - XGBoost + LightGBM 双模型残差学习
        - 波动率 regime 检测

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

        # 构建增强残差特征（改进点：10 维 vs 原文 3 阶滞后）
        resid_features = FeatureEngineer.build_residual_features(resid)
        self.residual_features = resid_features.columns.tolist()

        # 对齐数据
        aligned_resid = resid.loc[resid_features.index]
        train_features = resid_features.copy()
        train_labels = aligned_resid

        # 尝试加入外部经济因子（FRED + 汇率）
        self.factor_cols = []
        self.last_factors = {}
        try:
            factors = fetch_external_factors(days=len(price) + 30, force_refresh=False)
            if factors:
                merged = merge_factors_to_price(data, factors)
                for col in FACTOR_COLUMNS.values():
                    if col in merged.columns:
                        aligned = merged[col].reindex(train_features.index, method='ffill')
                        if aligned.notna().sum() > len(aligned) * 0.3:
                            train_features[col] = aligned.fillna(method='ffill').fillna(0)
                            self.factor_cols.append(col)
                            last_vals = merged[col].dropna()
                            self.last_factors[col] = float(last_vals.iloc[-1]) if len(last_vals) > 0 else 0.0
                if self.factor_cols:
                    print(f'外部因子已加入特征 ({len(self.factor_cols)} 个): {self.factor_cols}')
        except Exception as e:
            print(f'外部因子加载失败，仅使用残差特征: {e}')

        X_train = train_features.values
        y_train = train_labels.values

        # 训练 XGBoost 模型预测残差
        print("训练 XGBoost 模型...")
        self.xgb_model = xgb.XGBRegressor(
            objective='reg:squarederror',
            n_estimators=100,
            max_depth=3,
            learning_rate=0.1,
            random_state=42
        )
        self.xgb_model.fit(X_train, y_train)

        # 训练 LightGBM 模型预测残差（双模型增强）
        self.lgb_model = None
        if _HAS_LGB:
            print("训练 LightGBM 模型...")
            try:
                self.lgb_model = lgb.LGBMRegressor(
                    objective='regression',
                    n_estimators=100,
                    max_depth=3,
                    learning_rate=0.1,
                    random_state=42,
                    verbose=-1
                )
                self.lgb_model.fit(X_train, y_train)
                print("LightGBM 训练成功")
            except Exception as e:
                print(f"LightGBM 训练失败: {e}")
                self.lgb_model = None

        # 在测试集上评估
        arima_pred = arima_result.forecast(steps=len(test_price))

        # 使用双模型平均预测残差
        last_known_features = resid_features.iloc[-1:].values[0]
        resid_preds = []

        for _ in range(len(test_price)):
            feat = last_known_features.reshape(1, -1)
            # 添加外部因子
            for col in self.factor_cols:
                feat = np.append(feat, self.last_factors.get(col, 0))

            # XGBoost 预测
            xgb_pred = self.xgb_model.predict(feat)[0]

            # LightGBM 预测（如果有）
            if self.lgb_model is not None:
                lgb_pred = self.lgb_model.predict(feat)[0]
                pred_resid = (xgb_pred + lgb_pred) / 2  # 双模型平均
            else:
                pred_resid = xgb_pred

            resid_preds.append(pred_resid)

            # 更新特征窗口（滚动更新）
            new_features = np.roll(last_known_features, -1)
            new_features[-1] = pred_resid
            last_known_features = new_features

        resid_pred = np.array(resid_preds)

        # 组合预测结果
        final_pred = arima_pred.values + resid_pred

        # 计算评估指标
        from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

        mse = mean_squared_error(test_price, final_pred)
        mae = mean_absolute_error(test_price, final_pred)
        r2 = r2_score(test_price, final_pred)
        mape = np.mean(np.abs((test_price - final_pred) / test_price)) * 100

        self.last_price = price.iloc[-1]

        # 拟合波动率状态检测器
        returns = price.pct_change().dropna()
        self.regime_detector.fit(returns)

        # 保存模型
        self._save_models()

        return {
            'mse': float(mse),
            'rmse': float(np.sqrt(mse)),
            'mae': float(mae),
            'r2': float(r2),
            'mape': float(mape),
            'train_size': len(train_price),
            'test_size': len(test_price),
            'last_price': float(self.last_price),
            'model_type': 'Hybrid Residual Ensemble (ARIMA + XGBoost/LightGBM)',
            'arima_order': self.arima_order,
            'residual_features': self.residual_features,
            'feature_dim': len(self.residual_features) + len(self.factor_cols),
            'has_lightgbm': self.lgb_model is not None,
            'external_factors': self.factor_cols,
            'test_dates': [d.strftime('%Y-%m-%d') for d in test_price.index],
            'test_actual': [float(v) for v in test_price.values],
            'test_pred': [float(v) for v in final_pred],
        }

    def predict(self, days: int = 7) -> Dict[str, Any]:
        """
        预测未来价格（含置信区间）

        改进点:
        - 增强残差特征 + 双模型平均
        - 96% 置信区间量化不确定性
        - 波动率 regime 检测

        Args:
            days: 预测天数

        Returns:
            预测结果（含 lower_bound, upper_bound, regime）
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

        # 获取残差用于特征构建
        resid = arima_result.resid

        # 构建增强残差特征
        resid_features = FeatureEngineer.build_residual_features(resid)

        if len(resid_features) == 0:
            # 如果特征不够，用均值预测
            resid_pred = np.full(days, resid.mean())
            arima_component = arima_pred.values
            xgb_residual = resid_pred
        else:
            # 递归预测残差
            last_known = resid_features.iloc[-1:].values[0]
            resid_preds = []
            arima_components = []
            xgb_residuals = []

            for i in range(days):
                feat = last_known.reshape(1, -1)
                # 添加外部因子
                for col in self.factor_cols:
                    feat = np.append(feat, self.last_factors.get(col, 0))

                # XGBoost 预测
                xgb_pred = self.xgb_model.predict(feat)[0]

                # LightGBM 预测（如果有）
                if self.lgb_model is not None:
                    lgb_pred = self.lgb_model.predict(feat)[0]
                    pred_resid = (xgb_pred + lgb_pred) / 2  # 双模型平均
                else:
                    pred_resid = xgb_pred

                resid_preds.append(pred_resid)
                arima_components.append(arima_pred.values[i])
                xgb_residuals.append(pred_resid)

                # 更新特征窗口（滚动更新）
                new_features = np.roll(last_known, -1)
                new_features[-1] = pred_resid
                last_known = new_features

            resid_pred = np.array(resid_preds)
            arima_component = np.array(arima_components)
            xgb_residual = np.array(xgb_residuals)

        # 组合预测
        final_pred = arima_pred.values + resid_pred

        # 不确定性量化（基于残差波动率）
        hist_vol = resid.std()
        uncertainty = hist_vol * np.ones(days)

        # 生成预测日期
        future_dates = pd.date_range(
            start=last_date + timedelta(days=1),
            periods=days,
            freq='D'
        )

        # 构建预测结果（保持 API 兼容性）
        predictions = [
            {
                'date': date.strftime('%Y-%m-%d'),
                'predicted_price': round(float(price), 2),
                'arima_component': round(float(arima), 2),
                'xgb_residual': round(float(resid), 2),
                # 新增字段：置信区间
                'lower_bound': round(float(price - 1.96 * unc), 2),
                'upper_bound': round(float(price + 1.96 * unc), 2),
            }
            for date, price, arima, resid, unc in zip(
                future_dates, final_pred, arima_component, xgb_residual, uncertainty
            )
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

        # 波动率 regime 检测
        returns = price.pct_change().dropna()
        regime = self.regime_detector.detect(returns)
        risk_adjustment = self.regime_detector.get_risk_adjustment(regime)

        return {
            'predictions': predictions,
            'current_price': round(float(price.iloc[-1]), 2),
            'prediction_days': days,
            'trend': trend,
            'change_percent': change_pct,
            'model_type': 'Hybrid Residual Ensemble (ARIMA + XGBoost/LightGBM)',
            'confidence': self._calculate_confidence(predictions),
            'regime': regime,
            'risk_adjustment': round(risk_adjustment, 2),
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
        分析价格趋势（整合波动率 regime 检测）

        Args:
            days: 分析天数

        Returns:
            趋势分析结果（含 regime 和 risk_adjustment）
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

        # 波动率 regime 检测
        regime = self.regime_detector.detect(returns)
        risk_adjustment = self.regime_detector.get_risk_adjustment(regime)

        return {
            'current_price': round(float(current_price), 2),
            'ma_7': round(float(ma_7), 2),
            'ma_30': round(float(ma_30), 2),
            'volatility': round(float(volatility), 2),
            'trend_7d': trend_7d,
            'trend_30d': trend_30d,
            'change_7d_percent': change_7d,
            'change_30d_percent': change_30d,
            'regime': regime,
            'risk_adjustment': round(risk_adjustment, 2),
            'analysis': self._generate_trend_analysis(trend_7d, trend_30d, change_7d, volatility, regime)
        }

    def _generate_trend_analysis(self, trend_7d: str, trend_30d: str,
                                  change_7d: float, volatility: float, regime: str = "normal") -> str:
        """生成趋势分析文本（整合 regime 信息）"""
        direction = '上涨' if change_7d >= 0 else '下跌'
        analysis = f"近期价格呈现{trend_7d}趋势，"

        if abs(change_7d) > 5:
            analysis += f"{direction}幅度较大({abs(change_7d)}%)，"
        elif abs(change_7d) > 2:
            analysis += f"{direction}幅度适中({abs(change_7d)}%)，"
        else:
            analysis += "价格相对稳定，"

        if trend_7d == trend_30d:
            analysis += f"短期与中期趋势一致（均{trend_7d}），"
        else:
            analysis += f"短期{trend_7d}但中期{trend_30d}，"

        # 整合 regime 信息
        if regime == 'high':
            analysis += "市场波动性较高，建议谨慎操作，降低风险敞口。"
        elif regime == 'low':
            analysis += "市场波动性较低，适合稳定采购，可适当增加库存。"
        elif volatility > 20:
            analysis += "市场波动较大，建议谨慎采购。"
        elif volatility > 10:
            analysis += "市场存在一定波动，可适当观望。"
        else:
            analysis += "市场相对平稳，可按需采购。"

        return analysis

    def _save_models(self):
        """保存模型到文件（按品种隔离）"""
        code = self._commodity_code or 'sulfur'
        xgb_file = os.path.join(MODEL_DIR, f'xgb_{code}.joblib')
        lgb_file = os.path.join(MODEL_DIR, f'lgb_{code}.joblib')
        params_file = os.path.join(MODEL_DIR, f'params_{code}.json')

        # 保存 XGBoost
        if self.xgb_model is not None:
            joblib.dump(self.xgb_model, xgb_file)

        # 保存 LightGBM（如果有）
        if self.lgb_model is not None:
            joblib.dump(self.lgb_model, lgb_file)

        # 保存参数
        params = {
            'arima_order': self.arima_order,
            'lags': self.lags,
            'resid_mean': float(self.resid_mean),
            'resid_std': float(self.resid_std),
            'last_price': float(self.last_price) if self.last_price else None,
            'factor_cols': self.factor_cols,
            'last_factors': self.last_factors,
            'residual_features': self.residual_features,  # 增强特征列名
            'has_lightgbm': self.lgb_model is not None,
            'regime_detector': {
                'historical_vol': self.regime_detector.historical_vol,
            } if self.regime_detector.historical_vol else None,
        }
        with open(params_file, 'w') as f:
            json.dump(params, f)

    def _load_models(self, commodity_code: str = 'sulfur') -> bool:
        """从文件加载模型（按品种隔离）

        支持新旧两种模型格式：
        - 新格式：residual_features (10维增强特征) + factor_cols
        - 旧格式：lags (3) + factor_cols
        如果格式不匹配，自动触发重训练
        """
        try:
            xgb_file = os.path.join(MODEL_DIR, f'xgb_{commodity_code}.joblib')
            lgb_file = os.path.join(MODEL_DIR, f'lgb_{commodity_code}.joblib')
            params_file = os.path.join(MODEL_DIR, f'params_{commodity_code}.json')

            if os.path.exists(xgb_file) and os.path.exists(params_file):
                self.xgb_model = joblib.load(xgb_file)

                with open(params_file, 'r') as f:
                    params = json.load(f)

                self.arima_order = tuple(params['arima_order'])
                self.lags = params['lags']
                self.resid_mean = params['resid_mean']
                self.resid_std = params['resid_std']
                self.last_price = params.get('last_price')
                self.factor_cols = params.get('factor_cols', [])
                self.last_factors = params.get('last_factors', {})
                self.residual_features = params.get('residual_features', [])

                # 加载 LightGBM（如果有）
                self.lgb_model = None
                if params.get('has_lightgbm') and _HAS_LGB and os.path.exists(lgb_file):
                    try:
                        self.lgb_model = joblib.load(lgb_file)
                    except Exception as e:
                        print(f'LightGBM 加载失败: {e}')

                # 加载 regime detector
                regime_data = params.get('regime_detector')
                if regime_data and regime_data.get('historical_vol'):
                    self.regime_detector.historical_vol = regime_data['historical_vol']

                # 校验特征数一致性：XGBoost 期望特征数 = len(residual_features) + len(factor_cols)
                # 兼容旧模型：如果 residual_features 为空，则用 lags
                if self.residual_features:
                    expected_feats = len(self.residual_features) + len(self.factor_cols)
                else:
                    expected_feats = self.lags + len(self.factor_cols)

                actual_feats = self.xgb_model.n_features_in_
                if expected_feats != actual_feats:
                    print(f'模型特征数不匹配: 期望 {expected_feats} '
                          f'(residual_features={len(self.residual_features)} + factors={len(self.factor_cols)}), '
                          f'模型实际 {actual_feats}，将重新训练')
                    self.xgb_model = None
                    self.lgb_model = None
                    return False

                return True
        except Exception as e:
            print(f"加载模型失败: {e}")

        return False


class CommodityDataFetcher:
    """大宗商品数据抓取器 - 直连生意社 (100ppi.com)"""

    # 生意社品种名 → 内部 code
    COMMODITY_MAP = {
        "尿素": "urea",
        "甲醇MA": "methanol",
        "纯碱": "soda_ash",
        "PTA": "pta",
        "聚乙烯": "pe",
        "聚氯乙烯": "pvc",
        "热轧卷板": "hot_rolled",
        "螺纹钢": "rebar",
        "铜": "copper",
        "铝": "aluminum",
        "锌": "zinc",
        "镍": "nickel",
        "天然橡胶": "rubber",
        "玻璃": "glass",
        "棉花": "cotton",
        "白糖": "sugar",
        "棕榈油": "palm_oil",
        "豆粕": "soybean_meal",
        "豆油": "soybean_oil",
    }

    def __init__(self):
        self._cache = {}  # {date_str: {商品名: 价格}}
        self._akshare_available = False
        try:
            import akshare as ak
            self.ak = ak
            self._akshare_available = True
            print("AKShare 已加载（用于 BDI 等）")
        except ImportError:
            print("AKShare 未安装，BDI 使用模拟数据")

    def is_available(self) -> bool:
        return True  # curl_cffi 模式总是可用，fallback 到 mock

    def _fetch_100ppi_basis_table(self, target_date=None):
        """从生意社获取当日现货价格表（现期表）
        数据来源: https://www.100ppi.com/sf/day-YYYY-MM-DD.html
        返回 {商品名: 现货价格} 字典，失败返回 None
        """
        if not _HAS_CURL_CFFI:
            return None

        if target_date is None:
            target_date = datetime.now()
        date_str = target_date.strftime("%Y-%m-%d")
        url = f"https://www.100ppi.com/sf/day-{date_str}.html"

        try:
            r = curl_requests.get(url, impersonate="chrome120", timeout=15)
            if r.status_code != 200:
                return None
            soup = BeautifulSoup(r.text, "html.parser")

            # 找到最大的数据表
            tables = soup.find_all("table")
            data_table = None
            for t in tables:
                rows = t.find_all("tr")
                if len(rows) > 50:
                    data_table = t
                    break
            if not data_table:
                return None

            result = {}
            rows = data_table.find_all("tr")
            exchange = None
            for row in rows:
                cells = row.find_all("td")
                if len(cells) == 1:
                    # 交易所分隔行
                    exchange = cells[0].get_text(strip=True)
                    continue
                if len(cells) < 7:
                    continue
                name = cells[0].get_text(strip=True)
                spot = cells[1].get_text(strip=True)
                if not name or name in ["商品", "上海期货交易所", "郑州商品交易所",
                                          "大连商品交易所", "广州期货交易所"]:
                    continue
                try:
                    result[name] = float(spot.replace(",", ""))
                except (ValueError, AttributeError):
                    continue
            return result
        except Exception as e:
            print(f"获取 100ppi 数据失败: {e}")
            return None

    def _fetch_historical_from_100ppi(self, code: str, name: str, days: int):
        """从生意社获取历史现货价格
        通过抓取多天的现期表来积累历史数据
        """
        records = []
        today = datetime.now()

        # 尝试抓取最近的数据，直到获得足够记录（最多回溯90天）
        for offset in range(90):
            d = today - timedelta(days=offset)
            if d.weekday() >= 5:  # 跳过周末
                continue

            cache_key = d.strftime("%Y-%m-%d")
            if cache_key in self._cache:
                prices = self._cache[cache_key]
            else:
                prices = self._fetch_100ppi_basis_table(d)
                if prices:
                    self._cache[cache_key] = prices

            if prices and name in prices:
                records.append({
                    "date": cache_key,
                    "price": prices[name],
                    "unit": "元/吨",
                })

            if len(records) >= days:
                break

        return records

    def _fetch_100ppi_benchmark_news(self, product_id: int, name: str, days: int):
        """从生意社新闻列表页抓取基准价历史数据

        数据来源: https://chem.100ppi.com/news/list--{product_id}-{page}.html
        从标题 "X月X日生意社{name}基准价为XXXX.XX元/吨" 中提取日期和价格
        """
        if not _HAS_CURL_CFFI:
            return []

        records = []
        seen_dates = set()
        current_year = datetime.now().year
        current_month = datetime.now().month

        # 预编译正则，支持名称后缀如 "氯化钾(进口)" 或 "磷酸(湿法)"
        pattern = re.compile(
            rf"(\d{{1,2}})月(\d{{1,2}})日生意社{re.escape(name)}.*?基准价为([\d,]+\.?\d*)元/吨"
        )

        for page in range(1, 20):
            url = f"https://chem.100ppi.com/news/list--{product_id}-{page}.html"
            try:
                r = curl_requests.get(url, impersonate="chrome120", timeout=15)
                if r.status_code != 200:
                    break
                soup = BeautifulSoup(r.text, "html.parser")
                links = soup.find_all("a")
                page_has_data = False

                for a in links:
                    text = a.get_text(strip=True)
                    match = pattern.search(text)
                    if match:
                        page_has_data = True
                        month, day, price_str = match.groups()
                        month_i, day_i = int(month), int(day)
                        year = current_year if month_i <= current_month else current_year - 1
                        date_str = f"{year}-{month_i:02d}-{day_i:02d}"
                        if date_str not in seen_dates:
                            seen_dates.add(date_str)
                            records.append({
                                "date": date_str,
                                "price": float(price_str.replace(",", "")),
                                "unit": "元/吨",
                            })

                if not page_has_data:
                    break

                if len(records) >= days:
                    break
            except Exception as e:
                print(f"抓取生意社{name}基准价第{page}页失败: {e}")
                break

        return records

    def _fetch_commodity(self, code: str, name: str, days: int) -> Dict[str, Any]:
        """通用品种数据获取"""
        records = self._fetch_historical_from_100ppi(code, name, days)

        if records and len(records) >= 3:
            records.sort(key=lambda x: x["date"])
            return {
                "success": True,
                "source": "生意社 (100ppi.com)",
                "commodity_code": code,
                "data": records,
                "count": len(records),
            }

        # 回退到模拟数据
        return self._mock_spot(code, name, days)

    def fetch_sulfur_spot(self, days: int = 90) -> Dict[str, Any]:
        """获取硫磺现货价格 - 生意社基准价

        直接从生意社新闻页抓取每日硫磺基准价，不再使用模型推算。
        数据来源: https://chem.100ppi.com/news/list--404-{page}.html
        """
        records = self._fetch_100ppi_benchmark_news(404, "硫磺", days)

        if records and len(records) >= 3:
            records.sort(key=lambda x: x["date"])
            return {
                "success": True,
                "source": "生意社硫磺基准价 (100ppi.com)",
                "commodity_code": "sulfur",
                "data": records[-days:],
                "count": min(len(records), days),
            }

        return self._mock_spot("sulfur", "硫磺", days)

    def fetch_phosphate_spot(self, days: int = 90) -> Dict[str, Any]:
        """获取磷矿石价格 - 基于尿素模型推算

        磷矿石30%品位真实价格约970-1030元/吨。
        磷矿石/尿素历史价格比约0.40-0.45，用尿素现货价格加权推算。
        同时参考磷酸基准价(生意社ID 558)作为辅助校准。
        """
        import numpy as np

        urea_data = self._fetch_commodity("urea", "尿素", days)
        urea_records = urea_data.get("data", [])
        has_real_urea = urea_data.get("source", "").startswith("生意社")

        # 尝试获取磷酸基准价作为辅助校准
        pa_records = self._fetch_100ppi_benchmark_news(558, "磷酸", days)

        if has_real_urea and len(urea_records) >= 3:
            urea_by_date = {r["date"]: r["price"] for r in urea_records}
            pa_by_date = {r["date"]: r["price"] for r in pa_records} if pa_records else {}

            rng = np.random.default_rng(99)
            records = []

            all_dates = sorted(set(list(urea_by_date.keys()) + list(pa_by_date.keys())))

            for date in all_dates:
                urea_price = urea_by_date.get(date)
                pa_price = pa_by_date.get(date)

                if urea_price:
                    # 磷矿石/尿素 ≈ 0.56（当前市场比值，尿素~1775，磷矿石30%~1000）
                    estimated = urea_price * 0.56
                    # 磷酸基准价辅助校准: 磷酸/磷矿石 ≈ 9.0
                    if pa_price:
                        pa_estimated = pa_price / 9.0
                        estimated = estimated * 0.4 + pa_estimated * 0.6

                    noise = rng.normal(0, estimated * 0.015)
                    records.append({
                        "date": date,
                        "price": round(estimated + noise, 2),
                        "unit": "元/吨",
                    })
                elif pa_price and records:
                    prev = records[-1]["price"]
                    pa_estimated = pa_price / 9.0
                    estimated = prev * 0.5 + pa_estimated * 0.5
                    records.append({
                        "date": date,
                        "price": round(estimated, 2),
                        "unit": "元/吨",
                    })

            if len(records) >= 3:
                source_parts = ["尿素现货价格"]
                if pa_records:
                    source_parts.append("磷酸基准价")
                source_desc = "、".join(source_parts)

                return {
                    "success": True,
                    "source": f"模型推算（基于{source_desc}）",
                    "commodity_code": "phosphate",
                    "data": records[-days:],
                    "count": min(len(records), days),
                }

        return self._mock_spot("phosphate", "磷矿石", days)

    def fetch_potash_spot(self, days: int = 90) -> Dict[str, Any]:
        """获取钾肥(氯化钾)现货价格 - 生意社基准价

        直接从生意社新闻页抓取每日氯化钾(进口)基准价。
        数据来源: https://chem.100ppi.com/news/list--927-{page}.html
        """
        records = self._fetch_100ppi_benchmark_news(927, "氯化钾", days)

        if records and len(records) >= 3:
            records.sort(key=lambda x: x["date"])
            return {
                "success": True,
                "source": "生意社氯化钾基准价 (100ppi.com)",
                "commodity_code": "potash",
                "data": records[-days:],
                "count": min(len(records), days),
            }

        return self._mock_spot("potash", "钾肥", days)

    def fetch_urea_spot(self, days: int = 90) -> Dict[str, Any]:
        return self._fetch_commodity("urea", "尿素", days)

    def fetch_urea_futures(self, days: int = 90) -> Dict[str, Any]:
        return self._fetch_commodity("urea_futures", "尿素", days)

    def fetch_bdi_index(self) -> Dict[str, Any]:
        """获取波罗的海干散货指数 (BDI) - 新浪财经"""
        if not self._akshare_available:
            return self._mock_bdi()
        try:
            df = self.ak.spot_goods(symbol="波罗的海干散货指数")
            if df is None or df.empty:
                return self._mock_bdi()
            df = df.tail(90)
            records = []
            for _, row in df.iterrows():
                records.append({
                    "date": str(row.get("日期", "")),
                    "price": int(row.get("指数", 0)),
                    "unit": "指数",
                })
            return {
                "success": True,
                "source": "新浪财经 (Baltic Exchange)",
                "commodity_code": "bdi",
                "data": records,
                "count": len(records),
            }
        except Exception as e:
            print(f"获取BDI指数失败: {e}")
            return self._mock_bdi()

    def fetch_all_commodities(self, days: int = 30) -> Dict[str, Any]:
        """批量获取所有品种数据"""
        results = {}
        results["sulfur"] = self.fetch_sulfur_spot(days)
        results["phosphate"] = self.fetch_phosphate_spot(days)
        results["potash"] = self.fetch_potash_spot(days)
        results["urea"] = self.fetch_urea_spot(days)
        results["bdi"] = self.fetch_bdi_index()
        return results

    def _mock_spot(self, code: str, name: str, days: int) -> Dict[str, Any]:
        """生成模拟现货数据"""
        import numpy as np

        base_prices = {
            "sulfur": 900, "phosphate": 1130,
            "potash": 3570, "urea": 1810,
            "urea_futures": 1800,
        }
        volatility_map = {
            "sulfur": 200, "phosphate": 15,
            "potash": 10, "urea": 12,
            "urea_futures": 10,
        }
        base = base_prices.get(code, 1000)
        vol = volatility_map.get(code, 15)

        rng = np.random.default_rng(abs(hash(code)) % (2**31))
        dates = pd.date_range(end=datetime.now(), periods=days, freq="D")
        noise = rng.normal(0, vol, days)
        prices = base + np.cumsum(noise)

        records = []
        for d, p in zip(dates, prices):
            records.append({
                "date": d.strftime("%Y-%m-%d"),
                "price": round(float(p), 2),
                "unit": "元/吨",
            })

        return {
            "success": True,
            "source": f"模拟数据（{name}生意社无期货合约）",
            "commodity_code": code,
            "data": records,
            "count": len(records),
            "note": f"{name}无活跃期货合约，生意社现期表不含此品种",
        }

    def _mock_bdi(self) -> Dict[str, Any]:
        """生成模拟 BDI 数据"""
        import numpy as np

        rng = np.random.default_rng(12345)
        dates = pd.date_range(end=datetime.now(), periods=90, freq="D")
        bdi_base = 1800
        noise = rng.normal(0, 25, 90)
        bdi_values = bdi_base + np.cumsum(noise)
        bdi_values = np.clip(bdi_values, 500, 5000)

        records = []
        for d, v in zip(dates, bdi_values):
            records.append({
                "date": d.strftime("%Y-%m-%d"),
                "price": int(v),
                "unit": "指数",
            })

        return {
            "success": True,
            "source": "模拟数据（AKShare BDI 不可用）",
            "commodity_code": "bdi",
            "data": records,
            "count": len(records),
            "note": "BDI 数据源不可用，使用模拟数据",
        }


class PatchTSTPredictor:
    """PatchTST 时间序列预测器 - 基于 HuggingFace Transformers"""

    MODEL_NAME = 'patchtst'
    DEFAULT_CONTEXT = 96
    DEFAULT_PRED_LEN = 90

    def __init__(self):
        self.model = None
        self.device = None
        self.context_length = self.DEFAULT_CONTEXT
        self.prediction_length = self.DEFAULT_PRED_LEN
        self.scaler = None
        self._ready = False
        self._last_train_metrics = {}
        self._resid_std = None
        self._price_series = None

    @property
    def gpu_available(self) -> bool:
        return self.device is not None and self.device.type == 'cuda'

    def _detect_device(self):
        if self.device is not None:
            return self.device
        if _HAS_TORCH:
            if torch.cuda.is_available():
                self.device = torch.device('cuda')
            elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                self.device = torch.device('mps')
            else:
                self.device = torch.device('cpu')
        print(f'PatchTST 使用设备: {self.device}')
        return self.device

    @staticmethod
    def _build_windows(series: np.ndarray, context_len: int, pred_len: int):
        total = context_len + pred_len
        windows = np.lib.stride_tricks.sliding_window_view(series, total)
        X = windows[:, :context_len].astype(np.float32)
        y = windows[:, context_len:].astype(np.float32)
        return X, y

    def ensure_initialized(self, price_series: pd.Series = None):
        """加载已有模型或训练新模型（与 SulfurPricePredictor 一致的懒加载协议）"""
        if self._ready:
            if price_series is not None:
                self._price_series = price_series
            return
        if price_series is not None:
            self._price_series = price_series
        if not self._load_model():
            if self._price_series is None:
                raise RuntimeError('无可用价格数据，无法训练 Transformer 模型')
            print('首次使用 Transformer，自动训练模型...')
            self.train(self._price_series)

    def train(self, price_series: pd.Series, ctx_length: int = None, pred_length: int = None) -> Dict[str, Any]:
        from sklearn.preprocessing import StandardScaler
        from sklearn.metrics import mean_absolute_error, mean_squared_error

        self._price_series = price_series
        self._detect_device()

        ctx_length = ctx_length or self.DEFAULT_CONTEXT
        self.context_length = min(ctx_length, len(price_series) // 3)

        # 动态调整 prediction_length，确保有足够数据构建窗口
        if pred_length is not None:
            self.prediction_length = pred_length
        else:
            max_pred = len(price_series) - self.context_length - 10
            self.prediction_length = min(self.DEFAULT_PRED_LEN, max(7, max_pred // 2))

        self.scaler = StandardScaler()
        values = price_series.values.reshape(-1, 1).astype(np.float32)
        scaled = self.scaler.fit_transform(values).flatten()

        X, y = self._build_windows(scaled, self.context_length, self.prediction_length)

        if len(X) < 5:
            self.context_length = max(7, len(scaled) // 6)
            X, y = self._build_windows(scaled, self.context_length, self.prediction_length)

        # 留出 20% 验证集，避免残差估计过拟合
        n_val = max(1, int(len(X) * 0.2))
        X_train, y_train = X[:-n_val], y[:-n_val]
        X_val, y_val = X[-n_val:], y[-n_val:]

        print(f'PatchTST 训练数据: {len(X_train)} 窗口, 验证: {len(X_val)} 窗口, '
              f'context={self.context_length}, pred={self.prediction_length}')

        config = PatchTSTConfig(
            context_length=self.context_length,
            prediction_length=self.prediction_length,
            num_input_channels=1,
            patch_length=min(8, self.context_length // 4),
            stride=min(4, self.context_length // 8),
            d_model=64,
            num_attention_heads=4,
            num_hidden_layers=3,
            ffn_dim=256,
            dropout=0.1,
            activation_function='gelu',
            do_mask_input=False,
        )

        self.model = PatchTSTForPrediction(config)
        self.model.to(self.device)

        X_train_t = torch.tensor(X_train, dtype=torch.float32).unsqueeze(-1).to(self.device)
        y_train_t = torch.tensor(y_train, dtype=torch.float32).to(self.device)

        optimizer = torch.optim.Adam(self.model.parameters(), lr=1e-3)
        criterion = torch.nn.MSELoss()
        batch_size = min(16, len(X_train))
        n_epochs = 20

        self.model.train()
        for epoch in range(n_epochs):
            perm = torch.randperm(len(X_train))
            epoch_loss = 0.0
            for i in range(0, len(X_train), batch_size):
                idx = perm[i:i + batch_size]
                batch_X = X_train_t[idx]
                batch_y = y_train_t[idx]

                optimizer.zero_grad()
                outputs = self.model(past_values=batch_X)
                pred_out = outputs.prediction_outputs.squeeze(-1) if outputs.prediction_outputs.dim() == 3 else outputs.prediction_outputs
                loss = criterion(pred_out, batch_y)
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item()

            if (epoch + 1) % 5 == 0:
                avg_loss = epoch_loss / max(1, len(X_train) // batch_size)
                print(f'  PatchTST Epoch {epoch + 1}/{n_epochs}, Loss: {avg_loss:.6f}')

        # 在验证集上计算残差（无偏估计）
        self.model.eval()
        X_val_t = torch.tensor(X_val, dtype=torch.float32).unsqueeze(-1).to(self.device)
        with torch.no_grad():
            outputs = self.model(past_values=X_val_t)
            val_pred_out = outputs.prediction_outputs
            val_preds = val_pred_out.squeeze(-1).cpu().numpy() if val_pred_out.dim() == 3 else val_pred_out.cpu().numpy()

        residuals = y_val - val_preds
        self._resid_std = float(np.std(residuals))

        mape = float(np.mean(np.abs(residuals / (np.abs(y_val) + 1e-8))) * 100)
        mae = float(mean_absolute_error(y_val, val_preds))
        rmse = float(np.sqrt(mean_squared_error(y_val, val_preds)))

        self._last_train_metrics = {'mape': round(mape, 2), 'mae': round(mae, 2), 'rmse': round(rmse, 2)}
        self._ready = True

        self._save_model()
        print(f'PatchTST 训练完成: MAPE={mape:.2f}%, MAE={mae:.2f}, RMSE={rmse:.2f}')

        return self._last_train_metrics

    def predict(self, days: int = 7) -> Dict[str, Any]:
        if not self._ready:
            raise RuntimeError('模型未训练，请先调用 train()')
        if self._price_series is None:
            raise RuntimeError('未设置价格数据')

        self.model.eval()

        recent = self._price_series.values[-self.context_length:].astype(np.float32)
        recent_scaled = self.scaler.transform(recent.reshape(-1, 1)).flatten()

        input_tensor = torch.tensor(recent_scaled, dtype=torch.float32) \
            .unsqueeze(0).unsqueeze(-1).to(self.device)

        with torch.no_grad():
            outputs = self.model(past_values=input_tensor)
            pred_scaled = outputs.prediction_outputs[0].cpu().numpy()

        pred_values = self.scaler.inverse_transform(pred_scaled.reshape(-1, 1)).flatten()
        days = min(days, len(pred_values))
        pred_values = pred_values[:days]

        scale = self.scaler.scale_[0] if hasattr(self.scaler, 'scale_') else 1.0
        sigma = max(self._resid_std * scale if self._resid_std else np.std(pred_values) * 0.3,
                     abs(float(pred_values[0])) * 0.01)

        future_dates = pd.date_range(
            start=self._price_series.index[-1] + pd.Timedelta(days=1),
            periods=days,
            freq='D',
        )

        predictions = []
        for d, price in zip(future_dates, pred_values):
            ci = 1.96 * sigma
            conf = max(0.6, min(1.0, 1.0 - (sigma / (abs(float(price)) + 1e-8))))
            predictions.append({
                'date': d.strftime('%Y-%m-%d'),
                'predicted_price': round(float(price), 2),
                'lower_bound': round(float(price) - ci, 2),
                'upper_bound': round(float(price) + ci, 2),
                'confidence': round(float(conf), 4),
            })

        return {
            'total_days': days,
            'predictions': predictions,
            'metrics': self._last_train_metrics,
        }

    def health(self) -> Dict[str, Any]:
        if not _HAS_TORCH or not _HAS_TRANSFORMERS:
            return {
                'success': True,
                'status': 'unhealthy',
                'model_loaded': None,
                'model_ready': False,
                'gpu_available': False,
                'error': '依赖未安装 (torch, transformers)',
            }
        return {
            'success': True,
            'status': 'healthy' if self._ready else 'unhealthy',
            'model_loaded': self.MODEL_NAME if self._ready else None,
            'model_ready': self._ready,
            'gpu_available': self.gpu_available,
        }

    def _save_model(self):
        model_path = os.path.join(MODEL_DIR, 'patchtst_model')
        os.makedirs(model_path, exist_ok=True)
        if self.model is not None:
            self.model.save_pretrained(model_path)
        if self.scaler is not None:
            joblib.dump(self.scaler, os.path.join(model_path, 'scaler.joblib'))
        metadata = {
            'context_length': self.context_length,
            'prediction_length': self.prediction_length,
            'resid_std': self._resid_std,
            'metrics': self._last_train_metrics,
        }
        with open(os.path.join(model_path, 'metadata.json'), 'w') as f:
            json.dump(metadata, f)

    def _load_model(self) -> bool:
        if not _HAS_TORCH or not _HAS_TRANSFORMERS:
            return False

        model_path = os.path.join(MODEL_DIR, 'patchtst_model')
        try:
            self._detect_device()
            self.model = PatchTSTForPrediction.from_pretrained(model_path)
            self.model.to(self.device)
            self.scaler = joblib.load(os.path.join(model_path, 'scaler.joblib'))

            with open(os.path.join(model_path, 'metadata.json'), 'r') as f:
                meta = json.load(f)
            self.context_length = meta['context_length']
            self.prediction_length = meta['prediction_length']
            self._resid_std = meta.get('resid_std')
            self._last_train_metrics = meta.get('metrics', {})
            self._ready = True
            print(f'PatchTST 模型已加载 (context={self.context_length}, device={self.device})')
            return True
        except Exception as e:
            print(f'加载 PatchTST 模型失败: {e}')
            return False


# 全局实例
predictor = SulfurPricePredictor()
fetcher = CommodityDataFetcher()
transformer = PatchTSTPredictor()


@app.route('/health', methods=['GET'])
def health_check():
    """健康检查"""
    data_source = 'postgresql' if _USE_DB else 'excel' if os.path.exists(DATA_FILE) else 'mock'
    return json_response({
        'status': 'healthy',
        'service': 'sulfur-price-predictor',
        'data_source': data_source,
        'db_available': _USE_DB,
        'price_count': len(predictor.price_data) if predictor.price_data is not None else 0,
        'external_factors': len(predictor.factor_cols),
        'factor_cols': predictor.factor_cols,
    })


@app.route('/train', methods=['POST'])
def train_model():
    """训练模型"""
    try:
        data = request.get_json() or {}
        test_ratio = data.get('test_ratio', 0.1)
        commodity_code = data.get('commodity_code', 'sulfur')

        # 加载数据并训练
        predictor._commodity_code = commodity_code
        predictor.load_data(commodity_code)
        result = predictor.train(test_ratio=test_ratio)

        data_source = 'postgresql' if _USE_DB else 'excel' if os.path.exists(DATA_FILE) else 'mock'
        return json_response({
            'success': True,
            'message': '模型训练完成',
            'data_source': data_source,
            'price_count': len(predictor.price_data) if predictor.price_data is not None else 0,
            'metrics': result,
        })
    except Exception as e:
        return json_response({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/backtest', methods=['POST'])
def backtest():
    """回测模型：在真实历史价格上划分训练/测试集，返回逐点预测 vs 实际与精度指标"""
    try:
        data = request.get_json() or {}
        test_ratio = data.get('test_ratio', 0.1)
        commodity_code = data.get('commodity_code', 'sulfur')

        predictor._commodity_code = commodity_code
        predictor.load_data(commodity_code)
        result = predictor.train(test_ratio=test_ratio)

        data_source = 'postgresql' if _USE_DB else 'excel' if os.path.exists(DATA_FILE) else 'mock'
        predictions = [
            {
                'date': d,
                'actual': round(float(a), 2),
                'predicted': round(float(p), 2),
            }
            for d, a, p in zip(
                result.get('test_dates', []),
                result.get('test_actual', []),
                result.get('test_pred', []),
            )
        ]

        return json_response({
            'success': True,
            'data_source': data_source,
            'price_count': len(predictor.price_data) if predictor.price_data is not None else 0,
            'metrics': {
                'mae': result.get('mae'),
                'rmse': result.get('rmse'),
                'mape': result.get('mape'),
                'r2': result.get('r2'),
                'train_size': result.get('train_size'),
                'test_size': result.get('test_size'),
                'model_type': result.get('model_type'),
            },
            'predictions': predictions,
        })
    except Exception as e:
        return json_response({'success': False, 'error': str(e)}), 500


@app.route('/predict', methods=['POST'])
def predict():
    """预测价格"""
    try:
        data = request.get_json() or {}
        days = data.get('days', 7)
        commodity_code = data.get('commodity_code', 'sulfur')

        # 限制预测天数
        days = min(max(1, days), 90)

        predictor.ensure_initialized(commodity_code)
        result = predictor.predict(days=days)

        return json_response({
            'success': True,
            'data': result
        })
    except Exception as e:
        return json_response({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/trend', methods=['GET'])
def analyze_trend():
    """分析趋势"""
    try:
        days = request.args.get('days', 30, type=int)
        commodity_code = request.args.get('commodity_code', 'sulfur')
        predictor.ensure_initialized(commodity_code)
        result = predictor.analyze_trend(days=days)

        return json_response({
            'success': True,
            'data': result
        })
    except Exception as e:
        return json_response({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/decision', methods=['POST'])
def purchase_decision():
    """生成采购决策建议

    基于预测结果和库存情况，给出采购建议
    """
    try:
        data = request.get_json() or {}
        days = data.get('days', 7)
        commodity_code = data.get('commodity_code', 'sulfur')
        predictor.ensure_initialized(commodity_code)
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

        return json_response({
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
        return json_response({
            'success': False,
            'error': str(e)
        }), 500


# ---- AKShare 数据接口 ----

@app.route('/akshare/commodity', methods=['GET'])
def akshare_commodity():
    """获取指定品种的现货价格"""
    code = request.args.get('code', 'sulfur')
    days = request.args.get('days', 90, type=int)
    days = min(max(1, days), 365)

    code_map = {
        'sulfur': fetcher.fetch_sulfur_spot,
        'phosphate': fetcher.fetch_phosphate_spot,
        'potash': fetcher.fetch_potash_spot,
        'urea': fetcher.fetch_urea_spot,
        'urea_futures': fetcher.fetch_urea_futures,
    }

    fetch_fn = code_map.get(code)
    if fetch_fn is None:
        return json_response({"success": False, "error": f"未知品种: {code}"}), 400

    result = fetch_fn(days)
    return json_response(result)


@app.route('/akshare/bdi', methods=['GET'])
def akshare_bdi():
    """获取 BDI 指数"""
    result = fetcher.fetch_bdi_index()
    return json_response(result)


@app.route('/akshare/all', methods=['GET'])
def akshare_all():
    """批量获取所有品种数据"""
    days = request.args.get('days', 30, type=int)
    days = min(max(1, days), 365)
    result = fetcher.fetch_all_commodities(days)
    return json_response({"success": True, "data": result})


@app.route('/akshare/health', methods=['GET'])
def akshare_health():
    """AKShare 数据源健康检查"""
    return json_response({
        "akshare_available": fetcher.is_available(),
        "service": "akshare-data-fetcher",
    })


@app.route('/akshare/refresh', methods=['POST'])
def akshare_refresh():
    """手动触发全量数据刷新"""
    days = request.args.get('days', 30, type=int)
    result = fetcher.fetch_all_commodities(days)
    return json_response({
        "success": True,
        "message": "数据刷新完成",
        "data": result,
        "refreshed_at": datetime.now().isoformat(),
    })


# ---- Transformer 预测端点 ----

@app.route('/transformer-predict', methods=['POST'])
def transformer_predict():
    try:
        data = request.get_json() or {}
        days = min(max(1, data.get('days', 7)), 90)

        predictor.ensure_initialized()
        transformer.ensure_initialized(
            predictor.price_data['price'] if predictor.price_data is not None else None
        )

        result = transformer.predict(days=days)
        return json_response({
            'success': True,
            'model': transformer.MODEL_NAME,
            **result,
        })
    except Exception as e:
        print(f'Transformer 预测失败: {e}')
        import traceback
        traceback.print_exc()
        return json_response({'success': False, 'error': str(e)}), 500


@app.route('/transformer-health', methods=['GET'])
def transformer_health():
    return json_response(transformer.health())


# ---- 融合预测端点 ----

# 全局存储模型精度指标（用于动态权重计算）
_model_metrics = {
    'arima': {'mape': 10.0, 'last_update': None},  # 默认 MAPE 10%
    'transformer': {'mape': 10.0, 'last_update': None}
}


def _update_model_metrics():
    """更新模型精度指标（基于最近回测）"""
    try:
        # ARIMA+XGB 回测
        if predictor.price_data is not None and len(predictor.price_data) > 50:
            result = predictor.train(test_ratio=0.1)
            _model_metrics['arima']['mape'] = result.get('mape', 10.0)
            _model_metrics['arima']['last_update'] = datetime.now().isoformat()

        # PatchTST 回测（使用验证集指标）
        if transformer._ready and transformer._last_train_metrics:
            # 从缩放后的指标估算原始尺度 MAPE
            if transformer.scaler is not None:
                scale_factor = transformer.scaler.scale_[0]
                mae_scaled = transformer._last_train_metrics.get('mae', 0.3)
                mae_original = mae_scaled * scale_factor
                avg_price = transformer._price_series.mean() if transformer._price_series is not None else 900
                mape_estimated = (mae_original / avg_price) * 100
                _model_metrics['transformer']['mape'] = mape_estimated
                _model_metrics['transformer']['last_update'] = datetime.now().isoformat()
    except Exception as e:
        print(f'[WARN] 更新模型精度指标失败: {e}')


def _calculate_dynamic_weights():
    """基于精度指标计算动态权重（MAPE 越低权重越高）"""
    mape_arima = _model_metrics['arima']['mape']
    mape_transformer = _model_metrics['transformer']['mape']

    # 防止除零
    mape_arima = max(mape_arima, 0.1)
    mape_transformer = max(mape_transformer, 0.1)

    # 计算权重（精度倒数归一化）
    inv_arima = 1.0 / mape_arima
    inv_transformer = 1.0 / mape_transformer
    total = inv_arima + inv_transformer

    w_arima = inv_arima / total
    w_transformer = inv_transformer / total

    return w_arima, w_transformer


@app.route('/combined-predict', methods=['POST'])
def combined_predict():
    """融合预测：ARIMA+XGB 与 PatchTST 动态加权融合"""
    try:
        data = request.get_json() or {}
        days = min(max(1, data.get('days', 7)), 90)
        commodity_code = data.get('commodity_code', 'sulfur')
        force_retrain = data.get('force_retrain', False)

        # 初始化 ARIMA+XGB
        predictor.ensure_initialized(commodity_code)

        # 初始化 PatchTST
        if predictor.price_data is not None:
            price_series = predictor.price_data['price']
            if force_retrain or not transformer._ready:
                transformer.train(price_series, ctx_length=48, pred_length=days)
            else:
                transformer.ensure_initialized(price_series)

        # 更新精度指标并计算动态权重
        _update_model_metrics()
        w_arima, w_transformer = _calculate_dynamic_weights()

        # 分别预测
        arima_result = predictor.predict(days=days)
        tf_result = transformer.predict(days=days)

        arima_preds = arima_result['predictions']
        tf_preds = tf_result['predictions']

        # 融合预测
        fused_predictions = []
        for a, t in zip(arima_preds, tf_preds):
            fused_price = w_arima * a['predicted_price'] + w_transformer * t['predicted_price']
            # 融合置信区间（取加权平均）
            lower = w_arima * a['lower_bound'] + w_transformer * t['lower_bound']
            upper = w_arima * a['upper_bound'] + w_transformer * t['upper_bound']
            # 融合置信度
            conf_a = a.get('confidence', 0.5)
            conf_t = t.get('confidence', 0.5)
            fused_conf = w_arima * conf_a + w_transformer * conf_t

            fused_predictions.append({
                'date': a['date'],
                'predicted_price': round(fused_price, 2),
                'lower_bound': round(lower, 2),
                'upper_bound': round(upper, 2),
                'confidence': round(fused_conf, 4),
                'arima_component': round(a['predicted_price'], 2),
                'transformer_component': round(t['predicted_price'], 2),
            })

        # 计算融合后的趋势和风险
        current_price = arima_result.get('current_price', 0)
        if fused_predictions and current_price > 0:
            future_price = fused_predictions[-1]['predicted_price']
            change_pct = ((future_price - current_price) / current_price) * 100
            trend = '上涨' if change_pct > 1 else ('下跌' if change_pct < -1 else '震荡')
        else:
            change_pct = 0
            trend = '未知'

        return json_response({
            'success': True,
            'data': {
                'commodity_code': commodity_code,
                'current_price': current_price,
                'trend': trend,
                'change_percent': round(change_pct, 2),
                'regime': arima_result.get('regime', 'normal'),
                'risk_adjustment': arima_result.get('risk_adjustment', 1.0),
                'predictions': fused_predictions,
                'weights': {
                    'arima_xgb': round(w_arima, 4),
                    'transformer': round(w_transformer, 4),
                },
                'model_metrics': {
                    'arima_mape': round(_model_metrics['arima']['mape'], 2),
                    'transformer_mape': round(_model_metrics['transformer']['mape'], 2),
                },
                'prediction_days': len(fused_predictions),
                'generated_at': datetime.now().isoformat(),
            }
        })
    except Exception as e:
        print(f'[ERROR] 融合预测失败: {e}')
        import traceback
        traceback.print_exc()
        return json_response({'success': False, 'error': str(e)}), 500


# ---- 外部经济因子端点 ----

@app.route('/external-data', methods=['GET'])
def external_data():
    """获取外部经济因子（FRED + Frankfurter）"""
    force = request.args.get('force_refresh', 'false').lower() == 'true'
    days = request.args.get('days', 365, type=int)
    days = min(max(1, days), 730)

    factors = fetch_external_factors(days=days, force_refresh=force)
    print_factor_summary(factors)

    result = {}
    for key, series in factors.items():
        if series is not None and not series.empty:
            result[key] = {
                'name': FACTOR_COLUMNS.get(key, key),
                'count': len(series),
                'start': series.index[0].strftime('%Y-%m-%d'),
                'end': series.index[-1].strftime('%Y-%m-%d'),
                'latest': round(float(series.iloc[-1]), 4),
                'min': round(float(series.min()), 4),
                'max': round(float(series.max()), 4),
            }

    return json_response({
        'success': True,
        'source': 'FRED + Frankfurter',
        'factors': result,
        'refreshed_at': datetime.now().isoformat(),
    })


if __name__ == '__main__':
    # 启动服务（开发模式用 Flask 内建服务器）
    # 生产环境请用: gunicorn --bind 0.0.0.0:5001 --workers 2 app:app
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)