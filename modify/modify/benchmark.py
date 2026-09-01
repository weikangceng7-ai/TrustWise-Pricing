"""
模型对比测试 | Model Benchmark Test
对比原文 Hybrid ARIMA + XGBoost 与新版 Hybrid Residual Ensemble 的预测效果

使用方法:
    python benchmark.py                    # 运行全部测试
    python benchmark.py --quick            # 快速测试（少样本）
    python benchmark.py --commodity sulfur # 测试指定品种
"""

import os
import sys
import argparse
import time
import json
import math
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple

import numpy as np
import pandas as pd

# =============================================================================
# 测试数据生成
# =============================================================================

def generate_test_data(
    commodity_code: str = "sulfur",
    n_days: int = 365,
    seed: int = 42
) -> pd.DataFrame:
    """生成测试用价格数据（与原app.py逻辑一致）"""

    COMMODITY_BASE = {
        "sulfur": {"price": 9000, "volatility": 0.022},
        "urea": {"price": 1810, "volatility": 0.015},
        "phosphate": {"price": 1130, "volatility": 0.013},
        "potash": {"price": 3570, "volatility": 0.012},
    }

    config = COMMODITY_BASE.get(commodity_code, COMMODITY_BASE["sulfur"])
    base_price = config["price"]
    vol = config["volatility"]

    rng = np.random.default_rng(seed)
    dates = pd.date_range(start='2023-01-01', periods=n_days, freq='D')

    # 趋势 + 季节性 + 噪声
    trend = np.linspace(0, base_price * 0.1, n_days)
    seasonal = base_price * 0.03 * np.sin(np.linspace(0, 4 * np.pi, n_days))
    noise = rng.normal(0, base_price * vol, n_days)
    prices = base_price + trend + seasonal + noise

    data = pd.DataFrame({'price': prices}, index=dates)
    data.index.name = 'date'
    return data


# =============================================================================
# 原文模型实现（复制自 app.py）
# =============================================================================

class OriginalSulfurPredictor:
    """
    原文 Hybrid ARIMA + XGBoost 模型
    完全复刻原 app.py 的 SulfurPricePredictor
    """

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

    def load_data(self, data: pd.DataFrame = None) -> pd.DataFrame:
        if data is not None:
            self.price_data = data
            return data
        raise ValueError("Original model requires data to be provided")

    def train(self, data: pd.DataFrame, test_ratio: float = 0.1) -> Dict[str, Any]:
        """训练原文模型"""
        import xgboost as xgb
        from statsmodels.tsa.arima.model import ARIMA
        from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

        price = data['price']
        split_index = int(len(price) * (1 - test_ratio))
        train_price = price[:split_index]
        test_price = price[split_index:]

        # 训练 ARIMA
        self.arima_model = ARIMA(train_price, order=self.arima_order)
        arima_result = self.arima_model.fit()
        resid = arima_result.resid
        self.resid_mean = resid.mean()
        self.resid_std = resid.std()

        # 构建滞后特征
        def build_lag_features(series, lags):
            df = pd.concat([series.shift(i) for i in range(1, lags + 1)], axis=1)
            df.columns = [f'lag_{i}' for i in range(1, lags + 1)]
            features = df.dropna()
            labels = resid[lags:]
            labels = labels.loc[features.index]
            return features, labels

        train_features, train_labels = build_lag_features(resid, self.lags)

        # 训练 XGBoost
        self.xgb_model = xgb.XGBRegressor(
            objective='reg:squarederror',
            n_estimators=100,
            max_depth=3,
            learning_rate=0.1,
            random_state=42
        )
        self.xgb_model.fit(train_features, train_labels)

        # 测试集预测
        arima_pred = arima_result.forecast(steps=len(test_price))
        last_known = resid[-self.lags:].values
        xgb_preds = []

        for _ in range(len(test_price)):
            input_feat = np.array(last_known).reshape(1, -1)
            pred = self.xgb_model.predict(input_feat)[0]
            xgb_preds.append(pred)
            last_known = np.append(last_known[1:], pred)

        final_pred = arima_pred.values + np.array(xgb_preds)

        # 计算指标
        mse = mean_squared_error(test_price, final_pred)
        mae = mean_absolute_error(test_price, final_pred)
        r2 = r2_score(test_price, final_pred)
        mape = np.mean(np.abs((test_price - final_pred) / test_price)) * 100

        return {
            'mse': float(mse),
            'mae': float(mae),
            'r2': float(r2),
            'mape': float(mape),
            'train_size': len(train_price),
            'test_size': len(test_price),
        }

    def predict(self, data: pd.DataFrame, days: int = 7) -> Tuple[np.ndarray, Dict]:
        """预测并返回预测值 + 详细信息"""
        import xgboost as xgb
        from statsmodels.tsa.arima.model import ARIMA

        price = data['price']

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

        final_pred = arima_pred.values + np.array(xgb_preds)

        details = {
            'arima_pred': arima_pred.values,
            'xgb_pred': np.array(xgb_preds),
            'arima_mean': arima_pred.mean(),
            'xgb_mean': np.mean(xgb_preds),
        }

        return final_pred, details


# =============================================================================
# 新版模型调用（直接import）
# =============================================================================

def get_new_model_predictor(commodity_code: str = "sulfur"):
    """获取新版模型"""
    # 添加modify目录到path
    modify_dir = os.path.dirname(os.path.abspath(__file__))
    if modify_dir not in sys.path:
        sys.path.insert(0, modify_dir)

    # 查找新版模型文件（支持多种可能的名字）
    possible_files = ['app1.py', 'app.py', 'advanced_model.py', 'stacking_model.py']
    new_model_class = None
    loaded_file = None

    for filename in possible_files:
        filepath = os.path.join(modify_dir, filename)
        if os.path.exists(filepath):
            try:
                # 动态导入模块
                module_name = filename[:-3]  # 去掉.py后缀
                import importlib
                module = importlib.import_module(module_name)

                # 查找主预测类
                for class_name in ['CommodityPricePredictor', 'AdvancedPredictor', 'StackingPredictor']:
                    if hasattr(module, class_name):
                        new_model_class = getattr(module, class_name)
                        loaded_file = filename
                        break
                if new_model_class:
                    break
            except (ImportError, AttributeError):
                continue

    if new_model_class is None:
        print(f"警告: 找不到新版模型类，尝试了: {possible_files}")
        return None

    print(f"  ✓ 已加载新版模型: {loaded_file} ({new_model_class.__name__})")
    predictor = new_model_class(commodity_code)
    return predictor


# =============================================================================
# 评估指标计算
# =============================================================================

def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """计算完整评估指标"""
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

    mse = mean_squared_error(y_true, y_pred)
    rmse = math.sqrt(mse)
    mae = mean_absolute_error(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)
    mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100

    # Direction accuracy
    if len(y_true) > 1:
        true_direction = np.sign(np.diff(y_true))
        pred_direction = np.sign(np.diff(y_pred))
        direction_accuracy = np.mean(true_direction == pred_direction) * 100
    else:
        direction_accuracy = 0.0

    return {
        'MSE': round(mse, 4),
        'RMSE': round(rmse, 4),
        'MAE': round(mae, 4),
        'R2': round(r2, 6),
        'MAPE(%)': round(mape, 4),
        'Direction Accuracy(%)': round(direction_accuracy, 2),
    }


def calculate_improvement(old: Dict, new: Dict) -> Dict[str, str]:
    """计算改进幅度"""
    improvements = {}
    for key in old:
        if key in new and old[key] != 0:
            # 对于错误类指标，越小越好
            if 'MSE' in key or 'RMSE' in key or 'MAE' in key or 'MAPE' in key:
                change = (old[key] - new[key]) / old[key] * 100
                improvements[key] = f"{change:+.2f}%" if change >= 0 else f"{change:.2f}%"
            elif 'R2' in key:
                change = (new[key] - old[key]) / abs(old[key]) * 100 if old[key] != 0 else 0
                improvements[key] = f"{change:+.2f}%"
            else:
                improvements[key] = "N/A"
    return improvements


# =============================================================================
# 测试用例
# =============================================================================

def run_single_test(
    commodity_code: str,
    n_days: int,
    test_days: int,
    seed: int = 42
) -> Dict[str, Any]:
    """运行单组测试"""

    print(f"\n{'='*60}")
    print(f"品种: {commodity_code} | 训练数据: {n_days}天 | 预测天数: {test_days}")
    print(f"{'='*60}")

    # 生成数据
    data = generate_test_data(commodity_code, n_days, seed)
    split_idx = len(data) - test_days
    train_data = data.iloc[:split_idx]
    test_data = data.iloc[split_idx:]
    actual = test_data['price'].values

    results = {}

    # ---- 原文模型 ----
    print("\n[1/2] 测试原文模型 (Hybrid ARIMA + XGBoost)...")
    start_time = time.time()

    try:
        original = OriginalSulfurPredictor()
        original.load_data(train_data)
        train_metrics = original.train(train_data, test_ratio=test_days/len(data))

        # 预测
        pred_original, details_original = original.predict(train_data, days=test_days)
        train_time = time.time() - start_time

        # 计算测试集指标
        test_metrics = calculate_metrics(actual, pred_original)

        results['original'] = {
            'train_metrics': train_metrics,
            'test_metrics': test_metrics,
            'predictions': pred_original.tolist(),
            'time_seconds': round(train_time, 3),
            'details': details_original,
        }
        print(f"  ✓ 原文模型完成 (耗时 {train_time:.3f}s)")
        print(f"    MAPE: {test_metrics['MAPE(%)']}% | RMSE: {test_metrics['RMSE']}")

    except Exception as e:
        results['original'] = {'error': str(e)}
        print(f"  ✗ 原文模型失败: {e}")

    # ---- 新版模型 ----
    print("\n[2/2] 测试新版模型 (Hybrid Residual Ensemble)...")
    start_time = time.time()

    try:
        new_predictor = get_new_model_predictor(commodity_code)
        if new_predictor is None:
            raise ImportError("无法导入新版模型")

        new_predictor.price_data = train_data.copy()
        train_metrics_new = new_predictor.train(test_ratio=test_days/len(data))

        # 预测
        pred_result = new_predictor.predict(days=test_days)
        # CommodityPricePredictor.predict() 返回字典列表，需提取 predicted_price
        pred_new = np.array([p['predicted_price'] for p in pred_result['predictions']])
        train_time = time.time() - start_time

        # 计算测试集指标
        test_metrics_new = calculate_metrics(actual, pred_new)

        results['new'] = {
            'train_metrics': train_metrics_new,
            'test_metrics': test_metrics_new,
            'predictions': pred_new.tolist(),
            'pred_result': pred_result,
            'time_seconds': round(train_time, 3),
        }
        print(f"  ✓ 新版模型完成 (耗时 {train_time:.3f}s)")
        print(f"    MAPE: {test_metrics_new['MAPE(%)']}% | RMSE: {test_metrics_new['RMSE']}")

        # 计算改进
        if 'original' in results and 'test_metrics' in results['original']:
            improvements = calculate_improvement(
                results['original']['test_metrics'],
                test_metrics_new
            )
            results['improvements'] = improvements
            print(f"\n  📊 改进幅度:")
            for k, v in improvements.items():
                print(f"    {k}: {v}")

    except Exception as e:
        results['new'] = {'error': str(e)}
        print(f"  ✗ 新版模型失败: {e}")
        import traceback
        traceback.print_exc()

    # ---- 预测对比 ----
    print(f"\n  📈 预测对比 (前5天):")
    print(f"  {'日期':<12} {'实际值':<12} {'原文预测':<12} {'新版预测':<12}")
    print(f"  {'-'*48}")
    future_dates = pd.date_range(
        start=train_data.index[-1] + timedelta(days=1),
        periods=min(test_days, 5),
        freq='D'
    )
    for i, date in enumerate(future_dates):
        actual_val = actual[i] if i < len(actual) else 0
        orig_pred = results.get('original', {}).get('predictions', [0]*len(actual))
        new_pred = results.get('new', {}).get('predictions', [0]*len(actual))
        print(f"  {date.strftime('%Y-%m-%d'):<12} {actual_val:<12.2f} "
              f"{orig_pred[i] if i < len(orig_pred) else 0:<12.2f} "
              f"{new_pred[i] if i < len(new_pred) else 0:<12.2f}")

    return results


def run_benchmark(
    commodities: List[str] = None,
    n_days: int = 365,
    test_days: int = 30,
    seeds: List[int] = None,
    output_file: str = None
) -> Dict[str, Any]:
    """
    运行完整基准测试

    Args:
        commodities: 测试品种列表
        n_days: 训练数据天数
        test_days: 预测/测试天数
        seeds: 随机种子列表（多次试验）
        output_file: 结果输出文件
    """

    if commodities is None:
        commodities = ["sulfur", "urea", "phosphate", "potash"]

    if seeds is None:
        seeds = [42, 123, 456]  # 3个不同随机种子

    print("="*70)
    print("  模型对比基准测试 | Model Benchmark")
    print("="*70)
    print(f"  品种: {', '.join(commodities)}")
    print(f"  训练数据: {n_days}天")
    print(f"  测试预测: {test_days}天")
    print(f"  随机种子: {seeds}")
    print("="*70)

    all_results = {
        'config': {
            'commodities': commodities,
            'n_days': n_days,
            'test_days': test_days,
            'seeds': seeds,
            'timestamp': datetime.now().isoformat(),
        },
        'results': {}
    }

    # 汇总表
    summary = []

    for commodity in commodities:
        commodity_results = {'seeds': {}, 'aggregated': {}}

        for seed in seeds:
            key = f"seed_{seed}"
            result = run_single_test(commodity, n_days, test_days, seed)
            commodity_results['seeds'][key] = result

            # 收集汇总数据
            if 'test_metrics' in result.get('original', {}) and 'test_metrics' in result.get('new', {}):
                orig_m = result['original']['test_metrics']
                new_m = result['new']['test_metrics']

                row = {
                    'commodity': commodity,
                    'seed': seed,
                    'orig_MAPE': orig_m['MAPE(%)'],
                    'new_MAPE': new_m['MAPE(%)'],
                    'orig_RMSE': orig_m['RMSE'],
                    'new_RMSE': new_m['RMSE'],
                    'orig_R2': orig_m['R2'],
                    'new_R2': new_m['R2'],
                    'MAPE_improvement': (
                        (orig_m['MAPE(%)'] - new_m['MAPE(%)']) / orig_m['MAPE(%)'] * 100
                        if orig_m['MAPE(%)'] != 0 else 0
                    ),
                }
                summary.append(row)

        all_results['results'][commodity] = commodity_results

    # 打印汇总表
    print("\n" + "="*70)
    print("  汇总结果 | Summary")
    print("="*70)

    summary_df = pd.DataFrame(summary)

    if not summary_df.empty:
        # 按品种分组汇总
        agg_summary = summary_df.groupby('commodity').agg({
            'orig_MAPE': 'mean',
            'new_MAPE': 'mean',
            'orig_RMSE': 'mean',
            'new_RMSE': 'mean',
            'orig_R2': 'mean',
            'new_R2': 'mean',
            'MAPE_improvement': 'mean',
        }).round(4)

        print(f"\n{'品种':<12} {'原文MAPE':<12} {'新版MAPE':<12} {'改进%':<10} {'原文RMSE':<12} {'新版RMSE':<12}")
        print("-"*70)
        for commodity in agg_summary.index:
            row = agg_summary.loc[commodity]
            print(f"{commodity:<12} {row['orig_MAPE']:<12.4f} {row['new_MAPE']:<12.4f} "
                  f"{row['MAPE_improvement']:<10.2f} {row['orig_RMSE']:<12.4f} {row['new_RMSE']:<12.4f}")

        # 总体平均
        print("-"*70)
        avg_row = agg_summary.mean()
        print(f"{'平均':<12} {avg_row['orig_MAPE']:<12.4f} {avg_row['new_MAPE']:<12.4f} "
              f"{avg_row['MAPE_improvement']:<10.2f} {avg_row['orig_RMSE']:<12.4f} {avg_row['new_RMSE']:<12.4f}")

        all_results['summary'] = agg_summary.to_dict()

    # 保存结果
    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_results, f, ensure_ascii=False, indent=2, default=str)
        print(f"\n结果已保存至: {output_file}")

    # 结论
    if not summary_df.empty:
        avg_improvement = summary_df['MAPE_improvement'].mean()
        if avg_improvement > 0:
            print(f"\n✅ 新版模型平均 MAPE 降低 {avg_improvement:.2f}%")
        else:
            print(f"\n⚠️ 新版模型平均 MAPE 增加 {-avg_improvement:.2f}%")

    return all_results


# =============================================================================
# 可视化对比
# =============================================================================

def plot_comparison(results: Dict, output_path: str = None):
    """生成对比图表"""

    try:
        import matplotlib.pyplot as plt
        import matplotlib
        matplotlib.use('Agg')  # 无头模式

        # 提取数据
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle('模型对比 | Model Comparison', fontsize=14, fontweight='bold')

        # 图1: MAPE对比
        ax1 = axes[0, 0]
        commodities = list(results['results'].keys())
        orig_mapes = []
        new_mapes = []

        for c in commodities:
            if 'aggregated' in results['results'][c]:
                agg = results['results'][c]['aggregated']
                orig_mapes.append(agg.get('orig_MAPE', 0))
                new_mapes.append(agg.get('new_MAPE', 0))

        x = np.arange(len(commodities))
        width = 0.35
        ax1.bar(x - width/2, orig_mapes, width, label='Original', color='#e74c3c', alpha=0.8)
        ax1.bar(x + width/2, new_mapes, width, label='New (Hybrid)', color='#27ae60', alpha=0.8)
        ax1.set_ylabel('MAPE (%)')
        ax1.set_title('MAPE 对比 (Lower is Better)')
        ax1.set_xticks(x)
        ax1.set_xticklabels(commodities)
        ax1.legend()
        ax1.grid(axis='y', alpha=0.3)

        # 图2: RMSE对比
        ax2 = axes[0, 1]
        orig_rmse = []
        new_rmse = []
        for c in commodities:
            if 'aggregated' in results['results'][c]:
                agg = results['results'][c]['aggregated']
                orig_rmse.append(agg.get('orig_RMSE', 0))
                new_rmse.append(agg.get('new_RMSE', 0))

        ax2.bar(x - width/2, orig_rmse, width, label='Original', color='#e74c3c', alpha=0.8)
        ax2.bar(x + width/2, new_rmse, width, label='New (Hybrid)', color='#27ae60', alpha=0.8)
        ax2.set_ylabel('RMSE')
        ax2.set_title('RMSE 对比 (Lower is Better)')
        ax2.set_xticks(x)
        ax2.set_xticklabels(commodities)
        ax2.legend()
        ax2.grid(axis='y', alpha=0.3)

        # 图3: 预测曲线示例
        ax3 = axes[1, 0]
        if commodities:
            c = commodities[0]
            seed_key = list(results['results'][c]['seeds'].keys())[0]
            seed_result = results['results'][c]['seeds'][seed_key]

            if 'predictions' in seed_result.get('original', {}):
                orig_preds = seed_result['original']['predictions'][:15]
                new_preds = seed_result['new']['predictions'][:15]

                # 构造实际值参考（使用new模型的actual）
                days = len(orig_preds)
                dates = range(days)

                ax3.plot(dates, orig_preds, 'r-o', label='Original', markersize=4, alpha=0.7)
                ax3.plot(dates, new_preds, 'g-s', label='New (Hybrid)', markersize=4, alpha=0.7)
                ax3.set_xlabel('Days')
                ax3.set_ylabel('Predicted Price')
                ax3.set_title(f'预测曲线对比 ({c})')
                ax3.legend()
                ax3.grid(alpha=0.3)

        # 图4: 改进幅度
        ax4 = axes[1, 1]
        improvements = []
        for c in commodities:
            if 'aggregated' in results['results'][c]:
                imp = results['results'][c]['aggregated'].get('MAPE_improvement', 0)
                improvements.append(imp)

        colors = ['#27ae60' if i > 0 else '#e74c3c' for i in improvements]
        bars = ax4.bar(commodities, improvements, color=colors, alpha=0.8)
        ax4.axhline(y=0, color='black', linestyle='-', linewidth=0.5)
        ax4.set_ylabel('MAPE Improvement (%)')
        ax4.set_title('MAPE 改进幅度 (Positive = Better)')
        ax4.grid(axis='y', alpha=0.3)

        # 添加数值标签
        for bar, imp in zip(bars, improvements):
            height = bar.get_height()
            ax4.annotate(f'{imp:.1f}%',
                        xy=(bar.get_x() + bar.get_width() / 2, height),
                        xytext=(0, 3 if height >= 0 else -15),
                        textcoords="offset points",
                        ha='center', va='bottom' if height >= 0 else 'top',
                        fontsize=9)

        plt.tight_layout()

        if output_path:
            plt.savefig(output_path, dpi=150, bbox_inches='tight')
            print(f"图表已保存至: {output_path}")
        else:
            plt.show()

    except ImportError:
        print("提示: matplotlib未安装，跳过图表生成")
    except Exception as e:
        print(f"图表生成失败: {e}")


# =============================================================================
# 主入口
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description='模型对比基准测试')
    parser.add_argument('--quick', action='store_true', help='快速测试模式（少样本）')
    parser.add_argument('--commodity', type=str, default=None, help='指定测试品种')
    parser.add_argument('--n-days', type=int, default=365, help='训练数据天数')
    parser.add_argument('--test-days', type=int, default=30, help='测试预测天数')
    parser.add_argument('--seeds', type=int, nargs='+', default=[42, 123, 456], help='随机种子列表')
    parser.add_argument('--output', type=str, default='benchmark_results.json', help='结果输出文件')
    parser.add_argument('--plot', type=str, default=None, help='图表输出路径')

    args = parser.parse_args()

    # 参数调整
    commodities = [args.commodity] if args.commodity else ["sulfur", "urea", "phosphate", "potash"]

    if args.quick:
        n_days = 180
        test_days = 14
        seeds = [42]
        print("⚡ 快速测试模式")
    else:
        n_days = args.n_days
        test_days = args.test_days
        seeds = args.seeds

    # 运行测试
    results = run_benchmark(
        commodities=commodities,
        n_days=n_days,
        test_days=test_days,
        seeds=seeds,
        output_file=args.output
    )

    # 生成图表
    if args.plot:
        plot_comparison(results, args.plot)
    elif args.output:
        plot_path = args.output.replace('.json', '_plot.png')
        plot_comparison(results, plot_path)

    return results


if __name__ == '__main__':
    main()
