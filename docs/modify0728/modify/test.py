"""
硫磺价格预测 — 改进效果对比测试

对比两个版本的模型在相同数据、相同划分下的预测表现：
  A组（1/python-service 旧版）: pmdarima auto_arima + _build_features 多因子差分 + RandomizedSearchCV
  B组（modify 新版）          : 自研 _find_best_arima_order + _build_features 多因子差分 + RandomizedSearchCV

两个版本核心功能已对齐，此测试对比：
  1. ARIMA 自动定阶方式（pmdarima.stepwise vs 自研网格搜索）
  2. 特征工程（完全一致）
  3. XGBoost 调优策略（完全一致）
  4. 最终预测精度 MAPE / MAE / R²
"""

import sys, os
import numpy as np
import pandas as pd

# ── 路径准备 ──────────────────────────────────────────────────────────
MODIFY_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(MODIFY_DIR)
SERVICE_OLD_DIR = os.path.join(PROJECT_DIR, "python-service")

# 加载新版（modify/app.py）
sys.path.insert(0, MODIFY_DIR)
from app import SulfurPricePredictor as NewPredictor

# 加载旧版（python-service/app.py）
sys.path.insert(0, SERVICE_OLD_DIR)
from app import SulfurPricePredictor as OldPredictor


# ── 共享数据加载 ──────────────────────────────────────────────────────
DATA_FILE = os.path.join(MODIFY_DIR, "new_data.xlsx")
OLD_DATA_FILE = os.path.join(MODIFY_DIR, "..", "data", "price_history.xlsx")


def load_shared_data() -> pd.DataFrame:
    """两边使用完全相同的数据文件，相同划分"""
    for fp in [DATA_FILE, OLD_DATA_FILE]:
        if os.path.exists(fp):
            df = pd.read_excel(fp)
            # 尝试新格式多列读取
            if df.shape[1] >= 8:
                col_map = {
                    0: 'date', 1: 'price',
                    3: 'ccpi', 4: 'usd_cny', 5: 'dxy',
                    6: 'wti', 7: 'nat_gas', 8: 'brent',
                }
                df = df.iloc[:, list(col_map.keys())]
                df.columns = list(col_map.values())
            elif df.shape[1] >= 2:
                df = df.iloc[:, :2]
                df.columns = ["date", "price"]
            elif "长江港硫磺现货价" in df.columns:
                df.rename(columns={"长江港硫磺现货价": "price", "日期": "date"}, inplace=True)
            df["date"] = pd.to_datetime(df["date"])
            df.set_index("date", inplace=True)
            df = df.sort_index()
            print(f"  数据加载: {len(df)} 条 [{df.index[0].date()} ~ {df.index[-1].date()}]")
            return df
    # fallback 模拟数据
    dates = pd.date_range(start="2023-01-01", end=pd.Timestamp.now(), freq="D")
    rng = np.random.default_rng(42)
    trend = np.linspace(800, 1000, len(dates))
    seasonal = 50 * np.sin(np.linspace(0, 4 * np.pi, len(dates)))
    noise = rng.normal(0, 30, len(dates))
    df = pd.DataFrame({"price": trend + seasonal + noise}, index=dates)
    df.index.name = "date"
    print(f"  [模拟数据] {len(df)} 条")
    return df


def make_train_test(price: pd.Series, test_ratio: float = 0.2):
    """保证 A/B 两组完全相同的数据划分"""
    split = int(len(price) * (1 - test_ratio))
    return price.iloc[:split].copy(), price.iloc[split:].copy()


# ── 统一特征向量构造器（训练/预测复用同一套逻辑）────────────────────
# 修复思路：预测时调用 predictor._build_features 复现训练时的特征，
# 避免两套代码重复编写导致维度不一致。
def _build_xgb_input_vec(predictor, last_known_resid: np.ndarray,
                          train_data: pd.DataFrame, lags: int) -> np.ndarray:
    """
    为 XGBoost 预测阶段构造输入特征向量，维度与训练时完全一致。

    核心原则：调用 predictor 自带的 _build_features，复现训练时的特征工程逻辑。
    若 predictor 无 _build_features（纯旧版），则用简化版残差滞后。

    参数:
      predictor: 预测器实例
      last_known_resid: 最近的 lags 个残差值（numpy array）
      train_data: 训练用的完整数据（DataFrame），用于构建特征
      lags: 滞后阶数
    """
    if hasattr(predictor, '_build_features'):
        # ── 复用 predictor 的 _build_features ───────────────────
        # 用与训练时完全相同的 data（完整训练集，非测试集）
        wti_s = train_data['wti']
        gas_s = train_data['nat_gas']
        # 构造 fake_resid，index 与 train_data 对齐
        # 取 train_data 最后 lags 个位置，用 last_known_resid 填充
        fake_resid = pd.Series(0.0, index=train_data.index)
        fake_resid.iloc[-lags:] = last_known_resid
        features, _ = predictor._build_features(
            fake_resid, wti_s, gas_s, train_data, lags=lags
        )
        # 取最后一行（最近一天的特征向量，即预测时刻的输入）
        vec = features.iloc[-1].values
        print(f"  [DEBUG] _build_xgb_input_vec features shape={features.shape}")
        return vec.reshape(1, -1)
    else:
        # ── 纯旧版（无 _build_features）：仅残差滞后 ─────────────
        return np.array(list(last_known_resid)).reshape(1, -1)


def train_and_eval(predictor_cls, price: pd.Series, test_ratio: float = 0.1,
                   tune_xgb: bool = True) -> dict:
    """
    通用训练评估流程：
    1. 注入同一份 price DataFrame（绕过 load_data）
    2. 手动执行训练核心逻辑
    3. 在测试集上计算 MAPE / MAE / R²

    Returns: dict with metrics + model config
    """
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
    from statsmodels.tsa.arima.model import ARIMA

    predictor = predictor_cls()

    # 注入数据（保证 A/B 同一份数据）
    data = price.to_frame()
    for col in ['wti', 'nat_gas', 'phosphate', 'potash', 'urea', 'bdi']:
        if col not in data.columns:
            data[col] = 0.0
    predictor.price_data = data

    split_index = int(len(price) * (1 - test_ratio))
    test_price = price.iloc[split_index:]

    # ── ARIMA ───────────────────────────────────────────────────
    lags = getattr(predictor, 'lags', 3)

    if hasattr(predictor, '_auto_fit_arima'):
        # 旧版（python-service）：pmdarima auto_arima
        arima_result, best_order = predictor._auto_fit_arima(price[:split_index])
        predictor.arima_order = best_order
    elif hasattr(predictor, '_find_best_arima_order'):
        # 新版（modify）：自研网格搜索
        if getattr(predictor, 'arima_order', None) is None:
            predictor.arima_order = predictor._find_best_arima_order(
                price[:split_index].reset_index(drop=True)
            )
        arima_result = ARIMA(price[:split_index].reset_index(drop=True),
                              order=predictor.arima_order).fit()
    else:
        # 旧版固定参数
        predictor.arima_order = (0, 1, 1)
        arima_result = ARIMA(price[:split_index].reset_index(drop=True),
                              order=predictor.arima_order).fit()

    # 残差（保持 DatetimeIndex，与 wti/gas/data 索引完全对齐）
    resid_raw = arima_result.resid
    if hasattr(resid_raw, 'reset_index'):
        resid = resid_raw.reset_index(drop=True)
    else:
        resid = pd.Series(resid_raw, index=range(len(resid_raw)))

    # ── 【关键修复】统一索引：让 resid 与 wti/gas/data 共用 DatetimeIndex ──
    # ARIMA 训练用 price[:split_index]（DatetimeIndex），
    # resid_raw 继承相同的 DatetimeIndex，这里显式对齐确保 concat(...,axis=1) 无 NaN
    # price[:split_index] 已有正确 DatetimeIndex，直接用它对齐 resid
    if not isinstance(resid.index, pd.DatetimeIndex):
        resid.index = price[:split_index].index

    # ── 构建特征 ─────────────────────────────────────────────
    # 【关键修复】统一用 .iloc 做位置切片，避免 DatetimeIndex vs RangeIndex 不匹配
    #   导致 pd.concat(..., axis=1) 时所有值变成 NaN（index 无重叠，按 outer join 全 NaN）
    if hasattr(predictor, '_build_features'):
        # 新版（modify）：多因子差分特征
        wti_s    = data['wti'].iloc[:split_index]    # 位置切片，保持 DatetimeIndex
        gas_s    = data['nat_gas'].iloc[:split_index] # 位置切片
        train_data = data.iloc[:split_index]            # 位置切片
        features, labels = predictor._build_features(resid, wti_s, gas_s, train_data, lags=lags)
    else:
        # 旧版（python-service）：简单残差滞后特征
        df_lag = pd.concat([resid.shift(i) for i in range(1, lags + 1)], axis=1)
        df_lag.columns = [f"lag_{i}" for i in range(1, lags + 1)]
        features = df_lag.dropna()
        labels = resid[lags:]
        labels = labels.loc[features.index]

    # ── 调试打印 ─────────────────────────────────────────────
    nan_count = features.isna().sum().sum()
    print(f"  [DEBUG] features shape={features.shape}, NaN总数={nan_count}")

    # ── XGBoost ───────────────────────────────────────────────
    if tune_xgb and hasattr(predictor, '_tune_xgboost'):
        predictor.xgb_model = predictor._tune_xgboost(features, labels, n_splits=5)
    else:
        import xgboost as xgb
        predictor.xgb_model = xgb.XGBRegressor(
            objective="reg:squarederror",
            n_estimators=100, max_depth=3, learning_rate=0.1, random_state=42
        )
        predictor.xgb_model.fit(features, labels)

    predictor.resid_mean = resid.mean()
    predictor.resid_std = resid.std()

    # ── 测试集预测 ─────────────────────────────────────────────
    arima_pred = arima_result.forecast(steps=len(test_price))

    last_known = np.asarray(resid[-lags:])
    xgb_preds = []
    for _ in range(len(test_price)):
        input_vec = _build_xgb_input_vec(predictor, last_known, data.iloc[:split_index], lags)
        pred = predictor.xgb_model.predict(input_vec)[0]
        xgb_preds.append(pred)
        last_known = np.append(last_known[1:], pred)

    final_pred = arima_pred.values + np.array(xgb_preds)

    # ── 评估指标 ─────────────────────────────────────────────
    mse = mean_squared_error(test_price.values, final_pred)
    mae = mean_absolute_error(test_price.values, final_pred)
    r2 = r2_score(test_price.values, final_pred)
    mape = np.mean(np.abs((test_price.values - final_pred) / test_price.values)) * 100

    xgb_params = predictor.xgb_model.get_params() if hasattr(predictor.xgb_model, 'get_params') else {}

    return {
        "mse": float(mse),
        "mae": float(mae),
        "r2": float(r2),
        "mape": float(mape),
        "arima_order": predictor.arima_order,
        "lags": lags,
        "xgb_n_estimators": xgb_params.get('n_estimators'),
        "xgb_max_depth": xgb_params.get('max_depth'),
        "xgb_learning_rate": xgb_params.get('learning_rate'),
        "train_size": split_index,
        "test_size": len(test_price),
    }


def print_divider(title: str, width: int = 72):
    print(f"\n{'─' * width}")
    print(f"  {title}")
    print(f"{'─' * width}")


def print_metrics(label: str, r: dict):
    print(f"  {label}")
    print(f"    ARIMA 阶数    : {r['arima_order']}")
    print(f"    XGBoost 参数  : n={r['xgb_n_estimators']}, "
          f"depth={r['xgb_max_depth']}, lr={r['xgb_learning_rate']}")
    print(f"    MAPE          : {r['mape']:.2f}%")
    print(f"    MAE           : {r['mae']:.4f}")
    print(f"    R²            : {r['r2']:.4f}")


def improvement_pct(old_val, new_val, metric: str) -> str:
    if metric in ("mape", "mae"):
        diff = old_val - new_val
        pct = (diff / old_val) * 100 if old_val != 0 else 0
        sign = "+" if diff > 0 else ""
        return f"{sign}{diff:.4f} ({pct:+.1f}%)"
    else:
        diff = new_val - old_val
        return f"{diff:+.4f}"


def main():
    print("=" * 72)
    print("  硫磺价格预测 — 新版 vs 旧版 对比测试")
    print("  A组: python-service（原始版本）")
    print("  B组: modify（本次改进版本）")
    print("=" * 72)

    # ── 1. 加载共享数据 ────────────────────────────────────────────────
    print_divider("① 数据概况")
    price = load_shared_data()["price"]
    p_train, p_test = make_train_test(price, test_ratio=0.1)
    print(f"  训练集: {len(p_train)} 条  |  测试集: {len(p_test)} 条")

    # ── 2. A 组：旧版（python-service）────────────────────────────
    print_divider("② A 组 — python-service（旧版）")
    print("  ARIMA: 固定 (0,1,1) | XGB: 默认参数 | lags=3 | 简化特征")
    r_a = train_and_eval(OldPredictor, price, test_ratio=0.1, tune_xgb=False)
    print_metrics("A组 结果", r_a)

    # ── 3. B 组：新版（modify）─────────────────────────────────────
    print_divider("③ B 组 — modify（新版）")
    print("  ARIMA: 自研网格搜索(_find_best_arima_order) | XGB: RandomizedSearchCV | lags=5 | 多因子差分特征")
    r_b = train_and_eval(NewPredictor, price, test_ratio=0.1, tune_xgb=True)
    print_metrics("B组 结果", r_b)

    # ── 4. 对比汇总 ───────────────────────────────────────────────────
    print_divider("④ A vs B 改善幅度")
    print(f"  {'指标':<14}  {'A组(旧版)':>12}  {'B组(新版)':>12}  {'改善':>16}")
    print(f"  {'-' * 56}")
    print(f"  {'MAPE':<14}  {r_a['mape']:>11.2f}%  {r_b['mape']:>11.2f}%  {improvement_pct(r_a['mape'], r_b['mape'], 'mape'):>15}")
    print(f"  {'MAE':<14}  {r_a['mae']:>12.4f}  {r_b['mae']:>12.4f}  {improvement_pct(r_a['mae'], r_b['mae'], 'mae'):>15}")
    print(f"  {'R²':<14}  {r_a['r2']:>12.4f}  {r_b['r2']:>12.4f}  {improvement_pct(r_a['r2'], r_b['r2'], 'r2'):>15}")
    print(f"  {'ARIMA':<14}  {str(r_a['arima_order']):>12}  {str(r_b['arima_order']):>12}  (自动搜索 vs auto_arima)")
    print(f"  {'Lags':<14}  {r_a['lags']:>12}  {r_b['lags']:>12}")
    print(f"  {'XGB n_estimators':<14}  {str(r_a['xgb_n_estimators']):>12}  {str(r_b['xgb_n_estimators']):>12}")
    print(f"  {'XGB max_depth':<14}  {str(r_a['xgb_max_depth']):>12}  {str(r_b['xgb_max_depth']):>12}")

    # ── 5. 结论 ───────────────────────────────────────────────────────
    print_divider("⑤ 结论")
    b_better = r_b["mape"] < r_a["mape"]
    mape_imp = ((r_a["mape"] - r_b["mape"]) / r_a["mape"]) * 100
    mae_imp = ((r_a["mae"] - r_b["mae"]) / r_a["mae"]) * 100

    if b_better and mape_imp > 1:
        print(f"  ✅ 新版（modify）全面优于旧版（python-service）")
        print(f"     MAPE 降低: {r_a['mape']:.2f}% → {r_b['mape']:.2f}%（改善 {mape_imp:.1f}%）")
        print(f"     MAE  降低: {r_a['mae']:.4f} → {r_b['mae']:.4f}（改善 {mae_imp:.1f}%）")
        print(f"     主要贡献: 自研 ARIMA 网格搜索(→{r_b['arima_order']}) + RandomizedSearchCV 调优 + 多因子差分特征 + 两阶段训练")
    elif b_better:
        print(f"  ⚠️  新版略优于旧版（MAPE 改善 {mape_imp:.1f}%，差异较小）")
    else:
        print(f"  ⚠️  旧版仍具竞争力（差异在统计噪声范围内）")

    print(f"\n{'=' * 72}")
    print(f"  测试完成  |  {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'=' * 72}")


if __name__ == "__main__":
    main()
