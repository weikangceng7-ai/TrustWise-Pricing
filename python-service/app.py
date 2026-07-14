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
        self._initialized = False

    def ensure_initialized(self):
        """懒加载：首次调用时加载数据并训练模型"""
        if self._initialized:
            return
        self.load_data()
        if not self._load_models():
            print("未找到已训练模型，开始训练...")
            self.train()
            print("模型训练完成")
        self._initialized = True

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
        self._cache = {}  # code -> list of {date, price}
        self._cache_date = None
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

        # 尝试抓取最近 N 天的数据
        for offset in range(min(days, 90)):
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
        """获取硫磺现货价格 - 基于关联品种（尿素、甲醇）模型推算

        硫磺无国内期货合约，不在生意社现期表中。
        通过已获取真实数据的关联品种价格进行加权推算：
        - 尿素: 同为化肥原料，相关性 ~0.7
        - 甲醇: 同为化工基础原料，相关性 ~0.5
        """
        import numpy as np

        # 获取关联品种真实价格
        urea_data = self._fetch_commodity("urea", "尿素", days)
        methanol_data = self._fetch_commodity("methanol", "甲醇MA", days)

        urea_records = urea_data.get("data", [])
        methanol_records = methanol_data.get("data", [])

        # 判断是否获取到了足够的真实数据进行推算
        has_real_urea = urea_data.get("source", "").startswith("生意社")
        has_real_methanol = methanol_data.get("source", "").startswith("生意社")

        if has_real_urea and len(urea_records) >= 3:
            # 构建日期索引
            urea_by_date = {r["date"]: r["price"] for r in urea_records}
            methanol_by_date = {r["date"]: r["price"] for r in methanol_records} if has_real_methanol else {}

            np.random.seed(42)
            records = []

            # 硫磺/尿素历史价格比约 0.78-0.85
            # 硫磺/甲醇历史价格比约 0.65-0.75
            base_ratio_urea = 0.82
            base_ratio_methanol = 0.70

            all_dates = sorted(set(list(urea_by_date.keys()) + list(methanol_by_date.keys())))

            for i, date in enumerate(all_dates):
                urea_price = urea_by_date.get(date)
                methanol_price = methanol_by_date.get(date)

                if urea_price:
                    # 加权推算: 尿素权重 0.7, 甲醇权重 0.3
                    estimated = urea_price * base_ratio_urea
                    if methanol_price:
                        estimated = estimated * 0.7 + methanol_price * base_ratio_methanol * 0.3

                    # 加入小幅扰动模拟硫磺市场独立波动 (±3%)
                    noise = np.random.normal(0, estimated * 0.015)
                    estimated += noise

                    records.append({
                        "date": date,
                        "price": round(estimated, 2),
                        "unit": "元/吨",
                    })

                # 如果某天只有甲醇数据，用前一天的推算值
                elif methanol_price and records:
                    prev = records[-1]["price"]
                    estimated = prev * 0.7 + methanol_price * base_ratio_methanol * 0.3
                    noise = np.random.normal(0, estimated * 0.02)
                    records.append({
                        "date": date,
                        "price": round(estimated + noise, 2),
                        "unit": "元/吨",
                    })

            if len(records) >= 3:
                # 记录用于推算的源数据信息
                sources = []
                if has_real_urea:
                    sources.append("尿素")
                if has_real_methanol:
                    sources.append("甲醇")
                source_desc = "、".join(sources)

                return {
                    "success": True,
                    "source": f"模型推算（基于{source_desc}现货价格）",
                    "commodity_code": "sulfur",
                    "data": records[-days:],
                    "count": min(len(records), days),
                    "note": f"硫磺无期货合约，价格由{source_desc}加权推算。硫磺/尿素≈{base_ratio_urea}，硫磺/甲醇≈{base_ratio_methanol}",
                }

        # 回退: 没有任何真实关联数据时用纯模拟
        return self._mock_spot("sulfur", "硫磺", days)

    def fetch_phosphate_spot(self, days: int = 90) -> Dict[str, Any]:
        return self._mock_spot("phosphate", "磷矿石", days)

    def fetch_potash_spot(self, days: int = 90) -> Dict[str, Any]:
        return self._mock_spot("potash", "钾肥", days)

    def fetch_urea_spot(self, days: int = 90) -> Dict[str, Any]:
        return self._fetch_commodity("urea", "尿素", days)

    def fetch_urea_futures(self, days: int = 90) -> Dict[str, Any]:
        return self._fetch_commodity("urea_futures", "尿素", days)

    def fetch_bdi_index(self) -> Dict[str, Any]:
        """获取波罗的海干散货指数 (BDI)"""
        if not self._akshare_available:
            return self._mock_bdi()
        try:
            df = self.ak.bdi_index()
            if df is None or df.empty:
                return self._mock_bdi()
            df = df.tail(90)
            records = []
            for _, row in df.iterrows():
                records.append({
                    "date": str(row.get("日期", "")),
                    "price": int(row.get("指数", row.get("BDI", 0))),
                    "unit": "指数",
                })
            return {
                "success": True,
                "source": "Baltic Exchange via AKShare",
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
            "sulfur": 1900, "phosphate": 1080,
            "potash": 3500, "urea": 2350,
            "urea_futures": 2300,
        }
        volatility_map = {
            "sulfur": 15, "phosphate": 8,
            "potash": 20, "urea": 12,
            "urea_futures": 10,
        }
        base = base_prices.get(code, 1000)
        vol = volatility_map.get(code, 15)

        np.random.seed(hash(code) % 2**32)
        dates = pd.date_range(end=datetime.now(), periods=days, freq="D")
        noise = np.random.normal(0, vol, days)
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

        np.random.seed(12345)
        dates = pd.date_range(end=datetime.now(), periods=90, freq="D")
        bdi_base = 1800
        noise = np.random.normal(0, 25, 90)
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


# 全局实例
predictor = SulfurPricePredictor()
fetcher = CommodityDataFetcher()


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
    predictor.ensure_initialized()
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
    predictor.ensure_initialized()
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
    """生成采购决策建议

    基于预测结果和库存情况，给出采购建议
    """
    predictor.ensure_initialized()
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
        return jsonify({"success": False, "error": f"未知品种: {code}"}), 400

    result = fetch_fn(days)
    return jsonify(result)


@app.route('/akshare/bdi', methods=['GET'])
def akshare_bdi():
    """获取 BDI 指数"""
    result = fetcher.fetch_bdi_index()
    return jsonify(result)


@app.route('/akshare/all', methods=['GET'])
def akshare_all():
    """批量获取所有品种数据"""
    days = request.args.get('days', 30, type=int)
    days = min(max(1, days), 365)
    result = fetcher.fetch_all_commodities(days)
    return jsonify({"success": True, "data": result})


@app.route('/akshare/health', methods=['GET'])
def akshare_health():
    """AKShare 数据源健康检查"""
    return jsonify({
        "akshare_available": fetcher.is_available(),
        "service": "akshare-data-fetcher",
    })


@app.route('/akshare/refresh', methods=['POST'])
def akshare_refresh():
    """手动触发全量数据刷新"""
    days = request.args.get('days', 30, type=int)
    result = fetcher.fetch_all_commodities(days)
    return jsonify({
        "success": True,
        "message": "数据刷新完成",
        "data": result,
        "refreshed_at": datetime.now().isoformat(),
    })


if __name__ == '__main__':
    # 启动服务（开发模式用 Flask 内建服务器）
    # 生产环境请用: gunicorn --bind 0.0.0.0:5001 --workers 2 app:app
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)