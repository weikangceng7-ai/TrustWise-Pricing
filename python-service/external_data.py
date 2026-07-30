"""
外部经济因子数据获取模块

数据来源:
  - FRED (Federal Reserve Economic Data): WTI原油、美元指数、天然气
  - Frankfurter: USD/CNY 汇率 (免费, 无需 API Key)

所有数据带本地磁盘缓存 (24h TTL)，避免频繁 API 调用。
"""

import os
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path

# 缓存目录
CACHE_DIR = Path(os.path.dirname(__file__)) / 'data'
CACHE_DIR.mkdir(exist_ok=True)

# FRED API Key
FRED_API_KEY = os.environ.get('FRED_API_KEY', '')

# FRED 数据系列定义
FRED_SERIES = {
    'wti': 'DCOILWTICO',       # WTI 原油现货价 (美元/桶)
    'dxy': 'DTWEXBGS',         # 贸易加权美元指数
    'natural_gas': 'DHHNGSP',  # Henry Hub 天然气现货价 (美元/百万BTU)
}

# 因子 key → DataFrame 列名映射（供 merge_factors_to_price 和 app.py 共用）
FACTOR_COLUMNS = {
    'wti': 'WTI原油(美元/桶)',
    'dxy': '美元指数',
    'natural_gas': '天然气(美元/百万BTU)',
    'usd_cny': 'USD/CNY汇率',
}


def _fred_fetch(series_id: str, days: int = 365) -> pd.Series:
    """从 FRED API 获取单个经济指标"""
    import urllib.request
    import urllib.error

    url = (
        f'https://api.stlouisfed.org/fred/series/observations'
        f'?series_id={series_id}'
        f'&api_key={FRED_API_KEY}'
        f'&file_type=json'
        f'&sort_order=desc'
        f'&limit={days + 10}'
    )

    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
    except Exception as e:
        print(f'  FRED {series_id} 请求失败: {e}')
        return pd.Series(dtype=float)

    records = []
    for obs in data.get('observations', []):
        if obs['value'] != '.':
            try:
                records.append({
                    'date': pd.Timestamp(obs['date']),
                    'value': float(obs['value']),
                })
            except ValueError:
                continue

    if not records:
        return pd.Series(dtype=float)

    df = pd.DataFrame(records).drop_duplicates('date').sort_values('date')
    return pd.Series(df['value'].values, index=df['date'], name=series_id)


def _frankfurter_fetch(base: str = 'USD', target: str = 'CNY', days: int = 365) -> pd.Series:
    """从 Frankfurter API 获取汇率历史"""
    import urllib.request
    import urllib.error

    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=days + 10)).strftime('%Y-%m-%d')

    url = (
        f'https://api.frankfurter.app/{start_date}..{end_date}'
        f'?from={base}&to={target}'
    )

    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
    except Exception as e:
        print(f'  Frankfurter {base}/{target} 请求失败: {e}')
        return pd.Series(dtype=float)

    records = []
    for date_str, rates in sorted(data.get('rates', {}).items()):
        if target in rates:
            records.append({
                'date': pd.Timestamp(date_str),
                'value': float(rates[target]),
            })

    if not records:
        return pd.Series(dtype=float)

    df = pd.DataFrame(records).sort_values('date')
    return pd.Series(df['value'].values, index=df['date'], name=f'{base}_{target}')


def _load_cache(name: str) -> pd.Series | None:
    """加载本地缓存"""
    cache_file = CACHE_DIR / f'{name}_cache.json'
    if not cache_file.exists():
        return None

    try:
        with open(cache_file, 'r') as f:
            data = json.load(f)

        cached_at = datetime.fromisoformat(data['cached_at'])
        if (datetime.now() - cached_at).total_seconds() > 86400:  # 24h TTL
            return None

        records = data['records']
        if not records:
            return None

        return pd.Series(
            [r['value'] for r in records],
            index=pd.DatetimeIndex([r['date'] for r in records]),
        )
    except Exception as e:
        print(f'  缓存加载失败 {name}: {e}')
        return None


def _save_cache(name: str, series: pd.Series):
    """保存到本地缓存"""
    if series is None or series.empty:
        return
    cache_file = CACHE_DIR / f'{name}_cache.json'
    records = [
        {'date': idx.strftime('%Y-%m-%d'), 'value': float(v)}
        for idx, v in series.dropna().items()
    ]
    with open(cache_file, 'w') as f:
        json.dump({
            'cached_at': datetime.now().isoformat(),
            'records': records,
        }, f)


def fetch_external_factors(days: int = 365, force_refresh: bool = False) -> dict:
    """获取所有外部经济因子

    Args:
        days: 回溯天数
        force_refresh: 强制刷新（忽略缓存）

    Returns:
        {'wti': Series, 'dxy': Series, 'natural_gas': Series, 'usd_cny': Series}
    """
    result = {}

    # 1. FRED 数据 (WTI, DXY, 天然气)
    for name, series_id in FRED_SERIES.items():
        if not force_refresh:
            cached = _load_cache(name)
            if cached is not None:
                print(f'  {name}: 从缓存加载 ({len(cached)} 条)')
                result[name] = cached
                continue

        if FRED_API_KEY:
            print(f'  {name}: 从 FRED 获取 ({series_id})...')
            series = _fred_fetch(series_id, days)
            if not series.empty:
                _save_cache(name, series)
                result[name] = series
            else:
                # 回退到缓存（即使过期）
                cached = _load_cache(name)
                if cached is not None:
                    print(f'  {name}: FRED 失败，使用过期缓存')
                    result[name] = cached
        else:
            print(f'  {name}: FRED_API_KEY 未配置，使用缓存')
            cached = _load_cache(name)
            if cached is not None:
                result[name] = cached

    # 2. Frankfurter 汇率 (USD/CNY)
    name = 'usd_cny'
    if not force_refresh:
        cached = _load_cache(name)
        if cached is not None:
            print(f'  {name}: 从缓存加载 ({len(cached)} 条)')
            result[name] = cached

    if name not in result:
        print(f'  {name}: 从 Frankfurter 获取...')
        series = _frankfurter_fetch('USD', 'CNY', days)
        if not series.empty:
            _save_cache(name, series)
            result[name] = series
        else:
            cached = _load_cache(name)
            if cached is not None:
                print(f'  {name}: API 失败，使用过期缓存')
                result[name] = cached

    return result


def merge_factors_to_price(
    price_data: pd.DataFrame,
    factors: dict,
) -> pd.DataFrame:
    """将外部因子合并到价格 DataFrame 中

    Args:
        price_data: 价格 DataFrame (index=date, columns: price)
        factors: fetch_external_factors() 返回的因子字典

    Returns:
        合并后的 DataFrame (新增因子列: wti, dxy, natural_gas, usd_cny)
    """
    df = price_data.copy()
    date_index = pd.DatetimeIndex(df.index)

    for key, col_name in FACTOR_COLUMNS.items():
        if key not in factors or factors[key] is None or factors[key].empty:
            continue

        series = factors[key]
        series.index = pd.DatetimeIndex(series.index)

        # 对齐到价格数据的日期：取最接近的前一日值 (forward fill)
        aligned = series.reindex(date_index, method='ffill')
        df[col_name] = aligned.values

        non_null = aligned.notna().sum()
        print(f'  {col_name}: {non_null}/{len(df)} 天有数据')

    return df


def print_factor_summary(factors: dict):
    """打印因子数据摘要"""
    names = {
        'wti': 'WTI原油', 'dxy': '美元指数',
        'natural_gas': '天然气', 'usd_cny': 'USD/CNY',
    }
    for key, series in factors.items():
        if series is not None and not series.empty:
            name = names.get(key, key)
            print(f'  {name}: {len(series)} 条 '
                  f'({series.index[0].strftime("%Y-%m-%d")} ~ {series.index[-1].strftime("%Y-%m-%d")}), '
                  f'范围 [{series.min():.2f}, {series.max():.2f}]')
