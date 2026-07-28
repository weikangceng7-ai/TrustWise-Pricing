"""
硫磺价格预测服务
基于 Hybrid ARIMA + XGBoost 模型
"""

import os
import re
import time
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
import xgboost as xgb
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller
from sklearn.model_selection import TimeSeriesSplit, RandomizedSearchCV
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score, make_scorer
import joblib
from typing import Optional, Dict, Any, List, Tuple
import warnings
warnings.filterwarnings('ignore')

# psycopg2（保留用于后续 port_inventory 数据源，暂不使用）
try:
    import psycopg2  # noqa: F401
    _HAS_PSYCOPG2 = True
except ImportError:
    _HAS_PSYCOPG2 = False

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

# 数据文件路径（new_data.xlsx 在项目根目录的 data/ 下）
DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'new_data.xlsx')
# 旧格式兼容（长江港硫磺现货价）
OLD_DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'price_history.xlsx')
# 品种缓存文件路径（磷酸/钾肥/尿素/BDI）
CACHE_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'commodity_cache.xlsx')
CACHE_MAX_AGE_HOURS = 24  # 缓存有效期


# ===================== 品种数据缓存管理器 =====================

def _load_commodity_cache() -> dict:
    """
    加载品种缓存数据（磷酸/钾肥/尿素/BDI）。
    返回 {'phosphate': Series, 'potash': Series, 'urea': Series, 'bdi': Series}，
    以日期为索引。
    缓存过期或不存在时返回空字典。
    """
    cache = {}
    if not os.path.exists(CACHE_FILE):
        return cache
    try:
        mtime = os.path.getmtime(CACHE_FILE)
        age_hours = (time.time() - mtime) / 3600
        if age_hours > CACHE_MAX_AGE_HOURS:
            return cache  # 缓存过期，返回空
        df = pd.read_excel(CACHE_FILE, index_col=0, parse_dates=True)
        for col in ['phosphate', 'potash', 'urea', 'bdi']:
            if col in df.columns:
                cache[col] = df[col]
        return cache
    except Exception as e:
        print(f"加载品种缓存失败: {e}")
        return cache


def _save_commodity_cache(data: dict):
    """保存品种数据到缓存文件"""
    try:
        df = pd.DataFrame(data)
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        df.to_excel(CACHE_FILE)
        print(f"品种缓存已保存: {CACHE_FILE}")
    except Exception as e:
        print(f"保存品种缓存失败: {e}")


def _fetch_commodity_history(days: int = 881) -> dict:
    """
    抓取所有品种历史数据，返回以日期为索引的 dict。
    失败时返回空 dict（降级策略：各因子填充0）。
    """
    try:
        fetcher_local = CommodityDataFetcher()
        result = fetcher_local.fetch_all_commodities(days=days)
        if not result:
            return {}
        series_dict = {}
        for key, val in result.items():
            records = val.get('data', [])
            if not records:
                continue
            dates = [r['date'] for r in records]
            prices = [r['price'] for r in records]
            series_dict[key] = pd.Series(prices, index=pd.to_datetime(dates), name=key)
        return series_dict
    except Exception as e:
        print(f"抓取品种数据失败: {e}")
        return {}


def _ensure_commodity_cache(days: int = 881) -> dict:
    """
    确保品种缓存有效：优先用缓存，过期则重新抓取。
    返回 {品种名: Series}。
    """
    cache = _load_commodity_cache()
    if cache:
        print(f"品种缓存命中（{len(list(cache.values())[0]) if cache else 0} 条），使用缓存")
        return cache
    print("品种缓存未命中，开始抓取...")
    series_dict = _fetch_commodity_history(days)
    if series_dict:
        _save_commodity_cache(series_dict)
    return series_dict


def _merge_commodity_data(price_data: pd.DataFrame, commodity_series: dict) -> pd.DataFrame:
    """
    将品种数据（磷酸/钾肥/尿素/BDI）对齐到 price_data 的日期索引，
    缺失日期前向填充，获取失败的品种填充0（降级）。
    返回增加了品种列的 price_data 副本。
    """
    result = price_data.copy()
    for name, series in commodity_series.items():
        if series.empty:
            continue
        # 跳过 sulfur（硫磺价格已在 price 列）
        if name == 'sulfur':
            continue
        # 按日期对齐
        aligned = series.reindex(price_data.index, method='ffill')
        aligned = aligned.fillna(0.0)  # 前向填充后仍为NaN的填0
        result[name] = aligned
    return result


class SulfurPricePredictor:
    """硫磺价格预测器 - Hybrid ARIMA + XGBoost"""

    def __init__(self):
        self.arima_model = None
        self.xgb_model = None
        self.price_data = None
        self.last_price = None
        self.resid_mean = 0
        self.resid_std = 1
        self.lags = 5  # 扩展至 5（硫磺价格传导周期）
        self.arima_order = None  # 自动搜索，不再硬编码
        self.arima_d = 0  # 差分阶数，由 stationarity check 决定
        self._initialized = False

        # ARIMA 自动搜索配置（缩小搜索空间防止过拟合）
        self.max_p = 3
        self.max_d = 1
        self.max_q = 3
        self.arima_metric = 'aic'  # 'aic' 或 'bic'

        # XGBoost 超参数空间（用于 GridSearchCV）
        self.xgb_param_grid = {
            'n_estimators': [100, 200, 300],
            'max_depth': [3, 5, 7],
            'learning_rate': [0.01, 0.05, 0.1],
            'min_child_weight': [1, 3, 5],
            'subsample': [0.7, 0.8, 0.9],
            'colsample_bytree': [0.7, 0.8, 0.9],
        }

        # 外部因子配置（6 个：sulfur_spot + Sheet1 的 5 个）
        # phosphate/potash/urea/bdi 已删除（API 和 Excel 均无数据）
        self.external_features: List[str] = [
            'sulfur_spot',  # CommodityDataFetcher API → Sheet2 兜底
            'ccpi', 'exchange_rate', 'dxy', 'wti', 'natural_gas',  # Sheet1 直接读取
            'phosphate', 'potash', 'urea', 'bdi'  # 品种因子（通过缓存加载）
        ]
        self.external_data: Dict[str, pd.Series] = {}  # {因子名: Series}
        # Z-Score 归一化参数 {因子名: {mean, std}}
        self.external_normalization: Dict[str, Dict[str, float]] = {}

    def ensure_initialized(self):
        """懒加载：首次调用时加载数据并训练模型"""
        if self._initialized:
            return
        self.load_data()
        if not self._load_models():
            print("未找到已训练模型，开始训练...")
            self.train()
            print("模型训练完成")
        # 加载外部因子（模型参数已从文件恢复，外部数据需实时拉取）
        self.load_external_features()
        self._initialized = True

    def load_data(self, file_path: str = None) -> pd.DataFrame:
        """加载价格历史数据"""
        if file_path is None:
            file_path = DATA_FILE

        # 优先用 new_data.xlsx，不存在则降级到 price_history.xlsx
        if not os.path.exists(file_path):
            file_path = OLD_DATA_FILE

        if not os.path.exists(file_path):
            # 如果没有数据文件，创建模拟数据
            return self._create_mock_data()

        try:
            data = pd.read_excel(file_path)
            # 尝试新格式列映射（new_data.xlsx 多列格式）
            if data.shape[1] >= 8:
                col_map = {
                    0: 'date', 1: 'price',
                    3: 'ccpi', 4: 'usd_cny', 5: 'dxy',
                    6: 'wti', 7: 'nat_gas', 8: 'brent',
                }
                data = data.iloc[:, list(col_map.keys())]
                data.columns = list(col_map.values())
            elif data.shape[1] >= 2:
                # 取前两列：date, price
                data = data.iloc[:, :2]
                data.columns = ['date', 'price']
            elif '长江港硫磺现货价' in data.columns:
                data.rename(columns={'长江港硫磺现货价': 'price', '日期': 'date'}, inplace=True)
            data['date'] = pd.to_datetime(data['date'])
            data.set_index('date', inplace=True)
            data = data.sort_index()

            # 补充品种数据（磷酸/钾肥/尿素/BDI）
            commodity_series = _ensure_commodity_cache(days=len(data))
            if commodity_series:
                data = _merge_commodity_data(data, commodity_series)
                print(f"品种数据已合并: {list(commodity_series.keys())}")
            else:
                # 降级：品种数据不可用时填充0
                for col in ['phosphate', 'potash', 'urea', 'bdi']:
                    data[col] = 0.0
                print("品种数据不可用，已降级填充0")

            # 统一列名（兼容旧格式）
            if 'nat_gas' not in data.columns and 'natural_gas' in data.columns:
                data.rename(columns={'natural_gas': 'nat_gas'}, inplace=True)

            self.price_data = data
            print(f"✓ 价格数据加载成功: {len(data)} 条，{data.index[0].date()} → {data.index[-1].date()}")
            return data
        except Exception as e:
            print(f"加载数据失败: {e}，使用模拟数据")
            return self._create_mock_data()

    def load_external_features(self, source_file: str = None) -> bool:
        """
        外部因子加载：优先 API 抓取，失败则从 Excel 兜底

        优先级逻辑：
        - sulfur_spot: CommodityDataFetcher API → Sheet2 长江港硫磺历史价格兜底
        - phosphate/potash/urea/bdi: CommodityDataFetcher API → 无 Excel 兜底则跳过
        - ccpi/exchange_rate/dxy/wti/natural_gas: CommodityDataFetcher API → Sheet1 对应列兜底

        Returns:
            bool: 是否成功加载至少一个因子
        """
        if source_file is None:
            source_file = DATA_FILE

        self.external_data.clear()
        self.external_normalization.clear()

        # Excel Sheet1 列索引（col 0=日期）
        sheet1_col_map = {
            'ccpi': 2,
            'exchange_rate': 4,
            'dxy': 5,
            'wti': 6,
            'natural_gas': 7,
        }

        def _zscore_normalize(series: pd.Series, feat_name: str) -> bool:
            """对 series 做 Z-Score 归一化并存入 external_data，返回是否成功"""
            if len(series) < 3 or series.std() == 0:
                return False
            mean_val = float(series.mean())
            std_val = float(series.std())
            self.external_normalization[feat_name] = {'mean': mean_val, 'std': std_val}
            self.external_data[feat_name] = series.sort_index()
            return True

        def _load_from_sheet1(feat_name: str, col_idx: int) -> bool:
            """从 Sheet1 指定列读取因子"""
            try:
                df = pd.read_excel(source_file, sheet_name=0, header=None)
                if col_idx >= df.shape[1]:
                    return False
                col_data = df.iloc[1:, [0, col_idx]]
                col_data.columns = ['date', 'value']
                col_data = col_data.dropna()
                col_data['date'] = pd.to_datetime(col_data['date'], errors='coerce')
                col_data['value'] = pd.to_numeric(col_data['value'], errors='coerce')
                col_data = col_data.dropna()
                if len(col_data) < 3:
                    return False
                series = col_data.set_index('date')['value']
                return _zscore_normalize(series, feat_name)
            except Exception:
                return False

        def _load_from_sheet2(feat_name: str, price_col_idx: int) -> bool:
            """从 Sheet2 读取硫磺历史价格（col 0=日期，col 1=长江港硫磺现货价）"""
            try:
                df = pd.read_excel(source_file, sheet_name=1, header=None)
                if price_col_idx >= df.shape[1]:
                    return False
                col_data = df.iloc[1:, [0, price_col_idx]]
                col_data.columns = ['date', 'value']
                col_data = col_data.dropna()
                col_data['date'] = pd.to_datetime(col_data['date'], errors='coerce')
                col_data['value'] = pd.to_numeric(col_data['value'], errors='coerce')
                col_data = col_data.dropna()
                if len(col_data) < 3:
                    return False
                series = col_data.set_index('date')['value']
                return _zscore_normalize(series, feat_name)
            except Exception:
                return False

        loaded = []

        # ── 第一优先级：CommodityDataFetcher API ──────────────────────────
        # 仅保留有兜底策略的因子；phosphate/potash/urea/bdi API 和 Excel 均无，删掉
        legacy_features = ['sulfur_spot']
        excel_fallback = {
            'sulfur_spot': lambda: _load_from_sheet2('sulfur_spot', 1),  # Sheet2 col 1 = 长江港硫磺现货价
        }

        for feat_name in legacy_features:
            fetch_fn = getattr(fetcher, f'fetch_{feat_name}', None)
            api_ok = False

            if fetch_fn is not None:
                result = fetch_fn(90)
                if result and result.get('count', 0) >= 3:
                    records = result.get('data', [])
                    dates = [r['date'] for r in records]
                    values = [float(r['price']) for r in records]
                    series = pd.Series(values, index=pd.to_datetime(dates), name=feat_name)
                    series = series[~series.index.duplicated(keep='last')].sort_index()

                    # API 数据的时间跨度要求：至少覆盖到 2024 年底（与训练集有重叠）
                    api_min = series.index.min()
                    if api_min.year < 2024:
                        # API 数据足够老，用它
                        if _zscore_normalize(series, feat_name):
                            loaded.append(f"{feat_name}(API,{len(series)}条, 起始{api_min.year})")
                            api_ok = True
                    else:
                        # API 数据太新（只有近期数据），不充分，触发兜底
                        print(f"⚠️ [兜底] {feat_name} API 数据仅覆盖到 {api_min.year}，不足，切换 Excel")

            # API 失败或不充分，执行兜底
            if not api_ok:
                fallback_fn = excel_fallback.get(feat_name)
                if fallback_fn and fallback_fn():
                    loaded.append(f"{feat_name}(Excel兜底,{len(self.external_data[feat_name])}条)")
                # phosphate/potash/urea/bdi 无 Excel 兜底，静默跳过

        # ── 第二优先级：Sheet1 直接读取（ccpi/exchange_rate/dxy/wti/natural_gas）───
        # 这些因子 CommodityDataFetcher 无对应抓取方法，直接从 Sheet1 读
        for feat_name, col_idx in sheet1_col_map.items():
            if feat_name in self.external_data:
                continue  # 已通过 API 加载，跳过
            if _load_from_sheet1(feat_name, col_idx):
                loaded.append(f"{feat_name}(Excel,{len(self.external_data[feat_name])}条)")

        if loaded:
            print(f"✓ 外部因子加载成功: {', '.join(loaded)}")
            return True
        else:
            print(f"🔴 [降级] 所有外部因子加载失败，切换为纯单变量模式")
            return False

    def _build_features(self, resid: pd.Series, wti: pd.Series, gas: pd.Series,
                       data: pd.DataFrame, lags: int = 5) -> Tuple[pd.DataFrame, pd.Series]:
        """
        构建 XGBoost 特征：残差滞后 + 各因子差分滞后 + 季节性特征

        所有因子都用 diff_lag1（当天值 - 前一天值），消除量纲影响，
        让模型学习外生变量的变化趋势而非绝对值。
        获取失败的因子填充0（降级策略）。
        """
        # 残差滞后特征
        df_resid = pd.concat([resid.shift(i) for i in range(1, lags + 1)], axis=1)
        df_resid.columns = [f'resid_lag_{i}' for i in range(1, lags + 1)]

        # WTI 差分特征
        wti_diff = wti.diff(1).fillna(0)
        df_wti = pd.concat([wti_diff.shift(i) for i in range(1, 2)], axis=1)
        df_wti.columns = [f'wti_diff_lag_{i}' for i in range(1, 2)]

        # 天然气差分特征
        gas_diff = gas.diff(1).fillna(0)
        df_gas = pd.concat([gas_diff.shift(i) for i in range(1, 2)], axis=1)
        df_gas.columns = [f'gas_diff_lag_{i}' for i in range(1, 2)]

        # 季度哑变量（Q4 为基准组，被 drop）
        quarter = (data.index.month - 1) // 3 + 1  # 1~4
        q_dummies = pd.get_dummies(pd.Series(quarter, index=data.index, name='quarter'),
                                   prefix='Q', drop_first=True, dtype=float)
        for col in ['Q1', 'Q2', 'Q3']:
            if col not in q_dummies.columns:
                q_dummies[col] = 0.0
        q_dummies = q_dummies[['Q1', 'Q2', 'Q3']]

        # 月份傅里叶项（12个月周期）
        month_arr = data.index.month.values.astype(float)
        df_fourier = pd.DataFrame({
            'month_sin': np.sin(2 * np.pi * month_arr / 12),
            'month_cos': np.cos(2 * np.pi * month_arr / 12)
        }, index=data.index)

        # 品种因子差分特征（磷酸/钾肥/尿素/BDI）
        # 仅在数据有实际波动时才加入（避免全0常量特征干扰模型）
        phosphate = data.get('phosphate')
        potash = data.get('potash')
        urea = data.get('urea')
        bdi = data.get('bdi')
        commodity_dfs = []
        for name, series in [('phosphate', phosphate), ('potash', potash),
                              ('urea', urea), ('bdi', bdi)]:
            if series is not None and not series.dropna().empty:
                diff = series.diff(1).fillna(0)
                # 只加入有实际波动的品种因子（标准差 > 0）
                if diff.std() > 0:
                    df_feat = pd.concat([diff.shift(i) for i in range(1, 2)], axis=1)
                    df_feat.columns = [f'{name}_diff_lag_{i}' for i in range(1, 2)]
                    commodity_dfs.append(df_feat)

        all_dfs = [df_resid, df_wti, df_gas] + commodity_dfs + [q_dummies, df_fourier]

        # 合并所有特征
        df = pd.concat(all_dfs, axis=1)
        features = df.dropna()
        labels = resid[lags:]
        labels = labels.loc[features.index]
        return features, labels

    def _tune_xgboost(self, X: pd.DataFrame, y: pd.Series,
                      n_splits: int = 5) -> xgb.XGBRegressor:
        """
        使用 TimeSeriesSplit + RandomizedSearchCV 调优 XGBoost 超参数

        Args:
            X: 特征矩阵
            y: 目标变量
            n_splits: 时间序列交叉验证折数

        Returns:
            调优后的最佳 XGBoost 模型
        """
        print(f"开始 XGBoost 超参数随机搜索（{n_splits}-折时间序列交叉验证）...")

        param_dist = {
            'n_estimators': [50, 100, 150, 200],
            'max_depth': [3, 5, 7],
            'learning_rate': [0.05, 0.1, 0.15],
            'min_child_weight': [1, 3, 5],
            'subsample': [0.8, 0.9, 1.0],
            'colsample_bytree': [0.8, 0.9, 1.0],
            'gamma': [0, 0.1, 0.2],
            'reg_alpha': [0, 0.01],
            'reg_lambda': [1, 1.5],
        }

        base_model = xgb.XGBRegressor(
            objective='reg:squarederror',
            random_state=42,
            n_jobs=-1
        )

        # 动态裁剪折数，防止 n_splits > 可用样本数
        actual_splits = min(n_splits, max(2, len(X) // 20))
        tscv = TimeSeriesSplit(n_splits=actual_splits)
        print(f"  [DEBUG] 样本数={len(X)}, 实际CV折数={actual_splits}")

        random_search = RandomizedSearchCV(
            estimator=base_model,
            param_distributions=param_dist,
            n_iter=20,
            scoring=make_scorer(mean_squared_error, greater_is_better=False),
            cv=tscv,
            random_state=42,
            verbose=1,
            n_jobs=1,
            error_score='raise'
        )

        random_search.fit(X, y)

        best_params = random_search.best_params_
        best_score = -random_search.best_score_
        print(f"  → XGBoost 最佳参数: {best_params}")
        print(f"  → CV 最佳 MSE: {best_score:.4f}")

        return random_search.best_estimator_

    def _cross_validate(self, data: pd.DataFrame, n_splits: int = 5) -> Dict[str, Any]:
        """
        滚动交叉验证评估模型性能

        Args:
            data: 价格数据
            n_splits: 折数

        Returns:
            交叉验证评估指标
        """
        print(f"开始 {n_splits}-折滚动交叉验证...")

        price = data['price']
        wti = data['wti']
        gas = data['nat_gas']
        phosphate = data.get('phosphate')
        potash = data.get('potash')
        urea = data.get('urea')
        bdi = data.get('bdi')

        tscv = TimeSeriesSplit(n_splits=n_splits)
        fold_results = []

        for fold, (train_idx, test_idx) in enumerate(tscv.split(price)):
            if len(test_idx) < 7:
                continue

            train_price = price.iloc[train_idx]
            test_price = price.iloc[test_idx]

            try:
                # 训练 ARIMA
                arima_order_fold = self._find_best_arima_order(train_price.reset_index(drop=True))
                arima_result = ARIMA(train_price.reset_index(drop=True), order=arima_order_fold).fit()

                resid_raw = arima_result.resid.reset_index(drop=True)
                if isinstance(resid_raw, np.ndarray):
                    resid = pd.Series(resid_raw, index=train_price.index, name='resid')
                else:
                    resid = resid_raw.rename('resid')

                # 构建特征
                train_data = data.iloc[train_idx]
                train_wti = wti.iloc[train_idx]
                train_gas = gas.iloc[train_idx]

                features, labels = self._build_features(
                    resid, train_wti, train_gas, train_data, lags=self.lags
                )

                if len(features) < 20:
                    continue

                # 训练 XGBoost（默认参数，快速验证）
                xgb_model = xgb.XGBRegressor(
                    objective='reg:squarederror',
                    n_estimators=100,
                    max_depth=3,
                    learning_rate=0.1,
                    random_state=42
                )
                xgb_model.fit(features, labels)

                # 预测测试集
                arima_test_pred = arima_result.forecast(steps=len(test_idx))

                # XGBoost 预测残差
                last_known_resid = np.asarray(resid[-self.lags:])
                xgb_preds = []
                for i in range(len(test_idx)):
                    def safe_diff_last(series):
                        if series is None or series.dropna().empty:
                            return 0.0
                        return float(series.diff(1).fillna(0).iloc[-1])

                    factor_diffs = [
                        safe_diff_last(wti.iloc[train_idx]),
                        safe_diff_last(gas.iloc[train_idx]),
                        safe_diff_last(phosphate.iloc[train_idx]) if phosphate is not None else 0,
                        safe_diff_last(potash.iloc[train_idx]) if potash is not None else 0,
                        safe_diff_last(urea.iloc[train_idx]) if urea is not None else 0,
                        safe_diff_last(bdi.iloc[train_idx]) if bdi is not None else 0,
                    ]
                    seasonal_feat = np.zeros(5)  # Q1-Q3 + month_sin + month_cos
                    input_feat = np.array([*last_known_resid, *factor_diffs, *seasonal_feat]).reshape(1, -1)
                    pred = xgb_model.predict(input_feat)[0]
                    xgb_preds.append(pred)
                    last_known_resid = np.append(last_known_resid[1:], pred)

                xgb_preds = np.array(xgb_preds)
                final_pred = arima_test_pred.values + xgb_preds

                # 计算指标
                mse = mean_squared_error(test_price.values, final_pred)
                mae = mean_absolute_error(test_price.values, final_pred)
                mape = np.mean(np.abs((test_price.values - final_pred) / test_price.values)) * 100

                fold_results.append({
                    'fold': fold + 1,
                    'mse': mse,
                    'mae': mae,
                    'mape': mape,
                    'n_test': len(test_idx)
                })
                print(f"  Fold {fold+1}: MAPE={mape:.2f}%, MAE={mae:.2f}")

            except Exception as e:
                print(f"  Fold {fold+1} 失败: {e}")
                continue

        if not fold_results:
            return {'error': 'No valid folds'}

        avg_mape = np.mean([r['mape'] for r in fold_results])
        avg_mae = np.mean([r['mae'] for r in fold_results])
        avg_mse = np.mean([r['mse'] for r in fold_results])

        return {
            'n_folds': len(fold_results),
            'avg_mse': avg_mse,
            'avg_mae': avg_mae,
            'avg_mape': avg_mape,
            'fold_results': fold_results
        }

    def fine_tune(self, learning_rate: float = 0.01, n_estimators: int = 50,
                  min_commodity_rows: int = 30) -> Dict[str, Any]:
        """
        第二阶段：局部微调 XGBoost（在品种因子对齐窗口上）

        思路：
        1. 品种因子（磷酸/钾肥/尿素/BDI）只有最近~90-166天数据可用
        2. 在这些数据上，XGBoost 继续训练以学习品种因子的修正信号
        3. 使用小学习率 + 少轮迭代，避免遗忘预训练阶段学到的残差滞后模式

        Args:
            learning_rate: 微调学习率（默认 0.01，远小于预训练的 0.1）
            n_estimators: 微调迭代轮数（默认 50）
            min_commodity_rows: 有效品种数据行数阈值（少于则跳过）

        Returns:
            微调结果，包含对齐窗口信息和指标
        """
        if self.price_data is None:
            self.load_data()

        phosphate = self.price_data.get('phosphate')
        potash = self.price_data.get('potash')
        urea = self.price_data.get('urea')
        bdi = self.price_data.get('bdi')

        def has_real_value(s: pd.Series) -> pd.Series:
            if s is None or s.dropna().empty:
                return pd.Series(False, index=self.price_data.index)
            return (s > 0) & s.notna()

        real_mask = (has_real_value(phosphate) | has_real_value(potash) |
                     has_real_value(urea) | has_real_value(bdi))

        if not real_mask.any():
            return {
                'success': False,
                'message': '品种因子无有效数据，无法微调',
                'commodity_rows': 0
            }

        aligned_data = self.price_data[real_mask].copy()
        n_commodity = len(aligned_data)

        if n_commodity < min_commodity_rows:
            return {
                'success': False,
                'message': f'品种数据仅 {n_commodity} 行，少于阈值 {min_commodity_rows}，跳过微调',
                'commodity_rows': n_commodity
            }

        print(f"品种因子对齐窗口: {n_commodity} 行 "
              f"({aligned_data.index[0].date()} ~ {aligned_data.index[-1].date()})")

        # 在对齐窗口上重新拟合 ARIMA（获取局部残差）
        price_aligned = aligned_data['price']
        arima_aligned = ARIMA(price_aligned.reset_index(drop=True), order=self.arima_order).fit()
        resid_aligned_raw = arima_aligned.resid.reset_index(drop=True)
        if isinstance(resid_aligned_raw, np.ndarray):
            resid_aligned = pd.Series(resid_aligned_raw, index=price_aligned.index, name='resid')
        else:
            resid_aligned = resid_aligned_raw.rename('resid')

        # 构建特征
        wti_aligned = aligned_data['wti']
        gas_aligned = aligned_data['nat_gas']
        feat_aligned, label_aligned = self._build_features(
            resid_aligned, wti_aligned, gas_aligned, aligned_data, lags=self.lags
        )

        if len(feat_aligned) < 10:
            return {
                'success': False,
                'message': f'微调特征样本仅 {len(feat_aligned)} 个，数据不足',
                'commodity_rows': n_commodity
            }

        print(f"微调特征: {feat_aligned.shape[1]} 维, {len(feat_aligned)} 个样本")

        # 用小学习率 + 少轮迭代继续训练 XGBoost（不重新从头训练）
        self.xgb_model.set_params(n_estimators=n_estimators, learning_rate=learning_rate)
        self.xgb_model.fit(feat_aligned, label_aligned)

        # 计算微调集上的拟合指标
        finetune_pred = self.xgb_model.predict(feat_aligned)
        finetune_mape = np.mean(
            np.abs(label_aligned.values - finetune_pred) / np.abs(label_aligned.values)
        ) * 100
        finetune_mae = np.mean(np.abs(label_aligned.values - finetune_pred))

        self._save_models()

        return {
            'success': True,
            'message': '微调完成',
            'commodity_rows': n_commodity,
            'commodity_window_start': aligned_data.index[0].strftime('%Y-%m-%d'),
            'commodity_window_end': aligned_data.index[-1].strftime('%Y-%m-%d'),
            'finetune_mape': round(float(finetune_mape), 4),
            'finetune_mae': round(float(finetune_mae), 4),
            'learning_rate': learning_rate,
            'n_estimators': n_estimators,
            'features': feat_aligned.columns.tolist()
        }

    def _create_mock_data(self) -> pd.DataFrame:
        """创建模拟数据用于测试"""
        dates = pd.date_range(start='2023-01-01', end=datetime.now(), freq='D')
        rng = np.random.default_rng(42)

        # 模拟价格数据：基础价格 + 趋势 + 季节性 + 随机波动
        n = len(dates)
        trend = np.linspace(800, 1000, n)
        seasonal = 50 * np.sin(np.linspace(0, 4*np.pi, n))
        noise = rng.normal(0, 30, n)
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

    def _find_optimal_d(self, price: pd.Series) -> int:
        """通过 adfuller 检验自动确定差分阶数 d"""
        d = 0
        current_series = price.copy()
        for _ in range(self.max_d + 1):
            if self.check_stationarity(current_series):
                break
            current_series = current_series.diff().dropna()
            d += 1
        return min(d, self.max_d)

    def _find_best_arima_order(self, train_price: pd.Series) -> tuple:
        """网格搜索最优 ARIMA (p, d, q) 参数，以 AIC/BIC 为准则"""
        # 先确定 d
        self.arima_d = self._find_optimal_d(train_price)
        print(f"  → ARIMA 差分阶数 d = {self.arima_d}")

        best_score = float('inf')
        best_order = (1, self.arima_d, 1)
        metric_name = self.arima_metric.upper()

        print(f"  → 开始 ARIMA 参数搜索 (p≤{self.max_p}, d={self.arima_d}, q≤{self.max_q}) ...")

        for p in range(self.max_p + 1):
            for q in range(self.max_q + 1):
                if p == 0 and q == 0:
                    continue
                try:
                    model = ARIMA(train_price, order=(p, self.arima_d, q))
                    result = model.fit()
                    score = result.aic if self.arima_metric == 'aic' else result.bic
                    if score < best_score:
                        best_score = score
                        best_order = (p, self.arima_d, q)
                except Exception:
                    continue

        print(f"  → ARIMA 最优阶数: {best_order} ({metric_name}={best_score:.2f})")
        return best_order

    def train(self, data: pd.DataFrame = None, test_ratio: float = 0.1,
              tune_xgb: bool = True, tune_n_iter: int = 50) -> Dict[str, Any]:
        """
        训练 Hybrid ARIMA + XGBoost 模型（支持自动定阶和参数调优）

        Args:
            data: 价格数据，如果为 None 则使用已加载的数据
            test_ratio: 测试集比例
            tune_xgb: 是否对 XGBoost 进行超参数随机搜索（默认开启）
            tune_n_iter: RandomizedSearchCV 迭代次数

        Returns:
            训练结果，包含评估指标
        """
        if data is None:
            data = self.price_data

        if data is None:
            data = self.load_data()

        price = data['price']
        wti = data['wti']
        gas = data['nat_gas']
        phosphate = data.get('phosphate')
        potash = data.get('potash')
        urea = data.get('urea')
        bdi = data.get('bdi')

        # 划分训练集和测试集
        split_index = int(len(price) * (1 - test_ratio))
        train_price = price[:split_index]
        test_price = price[split_index:]

        # ── ARIMA 自动搜索 ─────────────────────────────────────────────
        print("训练 ARIMA 模型（自动搜索参数）...")
        if self.arima_order is None:
            self.arima_order = self._find_best_arima_order(train_price.reset_index(drop=True))

        arima_result = ARIMA(train_price.reset_index(drop=True), order=self.arima_order).fit()

        resid_raw = arima_result.resid.reset_index(drop=True)
        if isinstance(resid_raw, np.ndarray):
            resid = pd.Series(resid_raw, index=train_price.index, name='resid')
        else:
            resid = resid_raw.rename('resid')
        self.resid_mean = resid.mean()
        self.resid_std = resid.std()

        # ── 构建多因子差分特征 ─────────────────────────────────────────
        print("构建多因子差分特征（WTI + 天然气 + 磷酸 + 钾肥 + 尿素 + BDI）...")
        train_data = data[:split_index]
        train_features, train_labels = self._build_features(
            resid, wti[:split_index], gas[:split_index],
            train_data, lags=self.lags
        )
        print(f"    特征数量: {train_features.shape[1]}, 样本数: {train_features.shape[0]}")

        # ── XGBoost 训练 ──────────────────────────────────────────────
        if tune_xgb:
            print(f"训练 XGBoost 模型（{tune_n_iter}次随机搜索）...")
            self.xgb_model = self._tune_xgboost(train_features, train_labels, n_splits=5)
        else:
            print("训练 XGBoost 模型（默认参数）...")
            self.xgb_model = xgb.XGBRegressor(
                objective='reg:squarederror',
                n_estimators=100,
                max_depth=3,
                learning_rate=0.1,
                random_state=42
            )
            self.xgb_model.fit(train_features, train_labels)

        self.last_price = price.iloc[-1]

        # ── 测试集评估 ────────────────────────────────────────────────
        arima_test_pred = arima_result.forecast(steps=len(test_price))

        last_known_resid = np.asarray(resid[-self.lags:])
        xgb_preds = []
        for i in range(len(test_price)):
            def safe_diff_last(series):
                if series is None or series.dropna().empty:
                    return 0.0
                return float(series.diff(1).fillna(0).iloc[-1])

            factor_diffs = [
                safe_diff_last(wti[:split_index]),
                safe_diff_last(gas[:split_index]),
                safe_diff_last(phosphate) if phosphate is not None else 0,
                safe_diff_last(potash) if potash is not None else 0,
                safe_diff_last(urea) if urea is not None else 0,
                safe_diff_last(bdi) if bdi is not None else 0,
            ]
            seasonal_feat = np.zeros(5)  # Q1-Q3 + month_sin + month_cos
            input_feat = np.array([*last_known_resid, *factor_diffs, *seasonal_feat]).reshape(1, -1)
            pred = self.xgb_model.predict(input_feat)[0]
            xgb_preds.append(pred)
            last_known_resid = np.append(last_known_resid[1:], pred)

        xgb_preds = np.array(xgb_preds)
        final_pred = arima_test_pred.values + xgb_preds

        mse = mean_squared_error(test_price.values, final_pred)
        mae = mean_absolute_error(test_price.values, final_pred)
        r2 = r2_score(test_price.values, final_pred)
        mape = np.mean(np.abs((test_price.values - final_pred) / test_price.values)) * 100

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
            'model_type': 'Hybrid ARIMA + XGBoost (Multi-factor diff)',
            'arima_order': self.arima_order,
            'xgb_lags': self.lags,
            'features': ['resid_lag1-5', 'wti_diff_lag1', 'gas_diff_lag1',
                         'phosphate/potash/urea/bdi_diff_lag1', 'seasonal'],
            'tuned': tune_xgb,
            'xgb_params': self.xgb_model.get_params() if hasattr(self.xgb_model, 'get_params') else None
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
            if not self._load_models():
                self.load_data()
                self.train()

        if self.price_data is None:
            self.load_data()

        price = self.price_data['price']
        wti = self.price_data['wti']
        gas = self.price_data['nat_gas']
        phosphate = self.price_data.get('phosphate')
        potash = self.price_data.get('potash')
        urea = self.price_data.get('urea')
        bdi = self.price_data.get('bdi')
        last_date = price.index[-1]

        # ARIMA 预测
        arima_result = ARIMA(price.reset_index(drop=True), order=self.arima_order).fit()
        arima_pred = arima_result.forecast(steps=days)

        # 生成预测期季节性特征
        future_dates = pd.date_range(
            start=last_date + timedelta(days=1),
            periods=days,
            freq='D'
        )
        future_months = future_dates.month.astype(float)
        future_sin = np.sin(2 * np.pi * future_months / 12)
        future_cos = np.cos(2 * np.pi * future_months / 12)
        future_quarters = ((future_months - 1) / 3).astype(int) + 1  # 1~4
        future_q = pd.get_dummies(pd.Series(future_quarters), prefix='Q', drop_first=True, dtype=float)
        for col in ['Q1', 'Q2', 'Q3']:
            if col not in future_q.columns:
                future_q[col] = 0.0
        future_q = future_q[['Q1', 'Q2', 'Q3']].values
        future_fourier = np.column_stack([future_sin, future_cos])

        # 获取各因子的差分滞后值（用最后一个已知值，预测期间不变）
        def safe_diff_last(series):
            if series is None or series.dropna().empty:
                return 0.0
            return float(series.diff(1).fillna(0).iloc[-1])

        last_wti_diff = safe_diff_last(wti)
        last_gas_diff = safe_diff_last(gas)
        last_phosphate_diff = safe_diff_last(phosphate)
        last_potash_diff = safe_diff_last(potash)
        last_urea_diff = safe_diff_last(urea)
        last_bdi_diff = safe_diff_last(bdi)

        # XGBoost 预测残差
        resid_raw = arima_result.resid.reset_index(drop=True)
        if isinstance(resid_raw, np.ndarray):
            resid = pd.Series(resid_raw, index=range(len(resid_raw)), name='resid')
        else:
            resid = resid_raw.rename('resid')
        last_known_resid = np.asarray(resid[-self.lags:])
        xgb_preds = []

        # 特征顺序必须与训练时一致
        factor_diffs = [last_wti_diff, last_gas_diff,
                        last_phosphate_diff, last_potash_diff,
                        last_urea_diff, last_bdi_diff]

        for i in range(days):
            seasonal_feat = np.concatenate([future_q[i], future_fourier[i]])
            input_feat = np.array([*last_known_resid, *factor_diffs, *seasonal_feat]).reshape(1, -1)
            pred = self.xgb_model.predict(input_feat)[0]
            xgb_preds.append(pred)
            last_known_resid = np.append(last_known_resid[1:], pred)

        # 组合预测
        final_pred = arima_pred.values + np.array(xgb_preds)

        predictions = [
            {
                'date': date.strftime('%Y-%m-%d'),
                'predicted_price': round(float(p), 2),
                'arima_component': round(float(ar), 2),
                'xgb_residual': round(float(r), 2)
            }
            for date, p, ar, r in zip(future_dates, final_pred, arima_pred.values, xgb_preds)
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
            'model_type': 'Hybrid ARIMA + XGBoost (Multi-factor diff)',
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

        # 保存 ARIMA 模型
        if self.arima_model is not None:
            try:
                joblib.dump(self.arima_model, os.path.join(MODEL_DIR, 'arima_model.joblib'))
                print("ARIMA 模型已保存")
            except Exception as e:
                print(f"保存 ARIMA 模型失败: {e}，仅保存参数")

        # 保存模型参数
        params = {
            'arima_order': self.arima_order,
            'arima_d': self.arima_d,
            'lags': self.lags,
            'resid_mean': float(self.resid_mean),
            'resid_std': float(self.resid_std),
            'last_price': float(self.last_price) if self.last_price else None,
            'max_p': self.max_p,
            'max_d': self.max_d,
            'max_q': self.max_q,
            'arima_metric': self.arima_metric,
            'xgb_params': self.xgb_model.get_params() if self.xgb_model else None,
        }
        with open(os.path.join(MODEL_DIR, 'model_params.json'), 'w') as f:
            json.dump(params, f)

    def _load_models(self) -> bool:
        """从文件加载模型"""
        try:
            xgb_path = os.path.join(MODEL_DIR, 'xgb_model.joblib')
            arima_path = os.path.join(MODEL_DIR, 'arima_model.joblib')
            params_path = os.path.join(MODEL_DIR, 'model_params.json')

            if os.path.exists(params_path):
                with open(params_path, 'r') as f:
                    params = json.load(f)

                self.arima_order = tuple(params['arima_order'])
                self.arima_d = params.get('arima_d', 0)
                self.lags = params.get('lags', 5)
                self.resid_mean = params['resid_mean']
                self.resid_std = params['resid_std']
                self.last_price = params.get('last_price')
                self.max_p = params.get('max_p', 5)
                self.max_d = params.get('max_d', 2)
                self.max_q = params.get('max_q', 5)
                self.arima_metric = params.get('arima_metric', 'aic')

                if os.path.exists(xgb_path):
                    self.xgb_model = joblib.load(xgb_path)

                if os.path.exists(arima_path):
                    self.arima_model = joblib.load(arima_path)
                    print(f"ARIMA 模型已加载: {self.arima_order}")

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
            "sulfur": 9000, "phosphate": 1130,
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


# 全局实例
predictor = SulfurPricePredictor()
fetcher = CommodityDataFetcher()


@app.route('/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({'status': 'healthy', 'service': 'sulfur-price-predictor'})


@app.route('/train', methods=['POST'])
def train_model():
    """训练模型（支持自动定阶和参数调优）"""
    try:
        data = request.get_json() or {}
        test_ratio = data.get('test_ratio', 0.1)
        tune_xgb = data.get('tune_xgb', True)
        tune_n_iter = data.get('tune_n_iter', 50)

        predictor.load_data()
        result = predictor.train(
            test_ratio=test_ratio,
            tune_xgb=tune_xgb,
            tune_n_iter=tune_n_iter
        )

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


@app.route('/finetune', methods=['POST'])
def finetune_model():
    """
    两阶段训练：先预训练（全量数据），再微调（品种因子对齐窗口）

    Stage 1 (预训练): train() 用全量数据 + 品种因子=0，
                       XGBoost 学到残差滞后+WTI/Gas季节性
    Stage 2 (微调):   在品种因子可用的窗口上，用小学习率继续训练，
                       注入品种因子信号

    调用顺序：
        POST /train        → 预训练
        POST /finetune    → 微调（在预训练基础上）
    """
    try:
        data = request.get_json() or {}
        learning_rate = data.get('learning_rate', 0.01)
        n_estimators = data.get('n_estimators', 50)
        min_commodity_rows = data.get('min_commodity_rows', 30)

        predictor.load_data()

        # Stage 1: 预训练（如模型不存在）
        if predictor.xgb_model is None:
            print("执行 Stage 1 预训练（全量数据）...")
            predictor.train()

        # Stage 2: 微调（品种因子对齐窗口）
        result = predictor.fine_tune(
            learning_rate=learning_rate,
            n_estimators=n_estimators,
            min_commodity_rows=min_commodity_rows
        )

        return jsonify({
            'success': result.get('success', False),
            'message': result.get('message', '微调失败'),
            'data': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/crossval', methods=['POST'])
def crossval_model():
    """滚动交叉验证评估模型性能"""
    try:
        data = request.get_json() or {}
        n_splits = data.get('n_splits', 5)

        predictor.load_data()

        result = predictor._cross_validate(predictor.price_data, n_splits=n_splits)

        return jsonify({
            'success': True,
            'message': f'{n_splits}-折滚动交叉验证完成',
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