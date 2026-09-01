"""
外部经济因子数据获取模块

数据来源:
  - FRED (Federal Reserve Economic Data): WTI原油、美元指数、天然气
  - Frankfurter: USD/CNY 汇率 (免费, 无需 API Key)
  - Yahoo Finance: 大宗商品价格 (免费, 无需 API Key)
  - 中国人民银行: 人民币汇率中间价 (免费)

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
    'oil': '原油价格',
    'gold': '黄金价格',
    'usd_cny': 'USD/CNY汇率',
    'cpi': 'CPI指数',
    'lpr': 'LPR利率',
}


def _yahoo_fetch(symbol: str, days: int = 365) -> pd.Series:
    """从 Yahoo Finance 获取数据（免费，无需 API Key）

    支持的 symbol:
    - CL=F: WTI 原油期货
    - BZ=F: 布伦特原油期货
    - NG=F: 天然气期货
    - GC=F: 黄金期货
    - SI=F: 白银期货
    """
    import urllib.request
    import urllib.error

    # Yahoo Finance API (v8)
    period1 = int((datetime.now() - timedelta(days=days)).timestamp())
    period2 = int(datetime.now().timestamp())

    url = (
        f'https://query1.finance.yahoo.com/v8/finance/chart/{symbol}'
        f'?period1={period1}&period2={period2}&interval=1d'
    )

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
    except Exception as e:
        print(f'  Yahoo Finance {symbol} 请求失败: {e}')
        return pd.Series(dtype=float)

    try:
        result = data['chart']['result'][0]
        timestamps = result['timestamp']
        closes = result['indicators']['quote'][0]['close']

        records = []
        for ts, close in zip(timestamps, closes):
            if close is not None:
                records.append({
                    'date': pd.Timestamp(ts, unit='s'),
                    'value': float(close),
                })

        if not records:
            return pd.Series(dtype=float)

        df = pd.DataFrame(records).drop_duplicates('date').sort_values('date')
        return pd.Series(df['value'].values, index=df['date'], name=symbol)
    except Exception as e:
        print(f'  Yahoo Finance {symbol} 解析失败: {e}')
        return pd.Series(dtype=float)


def _akshare_fetch(symbol: str, days: int = 365) -> pd.Series:
    """使用 akshare 获取大宗商品和汇率数据（免费，国内可用）

    支持的 symbol:
    - energy_oil: 原油历史价格
    - futures_gold: 黄金期货
    - currency_usd_cny: 美元/人民币汇率
    - macro_cpi: 中国CPI
    - macro_lpr: 贷款市场报价利率
    """
    try:
        import akshare as ak
    except ImportError:
        print(f'  akshare 未安装，跳过 {symbol}')
        return pd.Series(dtype=float)

    try:
        if symbol == 'energy_oil':
            # 原油历史价格
            df = ak.energy_oil_hist()
            # 列名: 日期, 汽油价格, 柴油价格, 涨跌(汽), 涨跌(柴)
            cols = df.columns.tolist()
            date_col = cols[0]  # 第一列是日期
            price_col = cols[1]  # 第二列是汽油价格
            df = df.rename(columns={date_col: 'date', price_col: 'value'})
            df['date'] = pd.to_datetime(df['date'])
            df = df.set_index('date')[['value']].sort_index()
            df = df[df.index >= (datetime.now() - timedelta(days=days))]
            return pd.Series(df['value'].values, index=df.index, name='Oil')

        elif symbol == 'futures_gold':
            # 黄金期货
            df = ak.futures_main_sina(symbol='AU0')
            df = df.rename(columns={'日期': 'date', '收盘价': 'value'})
            df['date'] = pd.to_datetime(df['date'])
            df = df.set_index('date')[['value']].sort_index()
            df = df[df.index >= (datetime.now() - timedelta(days=days))]
            return pd.Series(df['value'].values, index=df.index, name='Gold')

        elif symbol == 'currency_usd_cny':
            # 美元/人民币汇率
            df = ak.currency_boc_safe()
            df = df.rename(columns={'日期': 'date', '美元': 'value'})
            df['date'] = pd.to_datetime(df['date'])
            df = df.set_index('date')[['value']].sort_index()
            df = df[df.index >= (datetime.now() - timedelta(days=days))]
            df['value'] = df['value'] / 100  # 转换为正常汇率格式
            return pd.Series(df['value'].values, index=df.index, name='USD_CNY')

        elif symbol == 'macro_cpi':
            # 中国CPI（月度数据）
            df = ak.macro_china_cpi()
            df = df.rename(columns={'月份': 'date', '全国-当月': 'value'})
            # 转换日期格式：2008年03月份 -> 2008-03-01
            df['date'] = df['date'].str.replace('年', '-').str.replace('月份', '-01')
            df['date'] = pd.to_datetime(df['date'])
            df = df.set_index('date')[['value']].sort_index()
            df = df[df.index >= (datetime.now() - timedelta(days=days))]
            return pd.Series(df['value'].values, index=df.index, name='CPI')

        elif symbol == 'macro_lpr':
            # 贷款市场报价利率（月度数据）
            df = ak.macro_china_lpr()
            df = df.rename(columns={'TRADE_DATE': 'date', 'LPR1Y': 'value'})
            df['date'] = pd.to_datetime(df['date'])
            df = df.set_index('date')[['value']].sort_index()
            df = df[df.index >= (datetime.now() - timedelta(days=days))]
            return pd.Series(df['value'].values, index=df.index, name='LPR')

        else:
            print(f'  未知的 akshare symbol: {symbol}')
            return pd.Series(dtype=float)

    except Exception as e:
        print(f'  akshare {symbol} 获取失败: {e}')
        return pd.Series(dtype=float)


def _pbc_fetch(days: int = 365) -> pd.Series:
    """从中国人民银行获取人民币汇率中间价（免费）"""
    import urllib.request
    import urllib.error

    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')

    # 中国人民银行公开数据 API
    url = (
        f'http://www.pbc.gov.cn/fzhgzj/129547/129721/index.html'
    )

    # 备用：使用 exchangerate-api.com (免费，有限额)
    url = f'https://api.exchangerate-api.com/v4/latest/USD'

    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())

        if 'rates' in data and 'CNY' in data['rates']:
            rate = float(data['rates']['CNY'])
            # 只返回当前汇率（历史数据需要其他 API）
            return pd.Series([rate], index=[pd.Timestamp.now()], name='USD_CNY')
    except Exception as e:
        print(f'  汇率 API 请求失败: {e}')

    return pd.Series(dtype=float)


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
        f'https://api.frankfurter.dev/v1/{start_date}..{end_date}'
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

    数据源优先级: akshare（国内可用）> FRED（需 API Key）

    Args:
        days: 回溯天数
        force_refresh: 强制刷新（忽略缓存）

    Returns:
        {'oil': Series, 'gold': Series, 'usd_cny': Series, 'cpi': Series, 'lpr': Series}
    """
    result = {}

    # akshare 数据源（国内可用，免费）
    akshare_sources = {
        'oil': 'energy_oil',          # 原油价格
        'gold': 'futures_gold',       # 黄金期货
        'usd_cny': 'currency_usd_cny', # 美元/人民币汇率
        'cpi': 'macro_cpi',           # 中国CPI
        'lpr': 'macro_lpr',           # 贷款市场报价利率
    }

    for name, symbol in akshare_sources.items():
        if not force_refresh:
            cached = _load_cache(name)
            if cached is not None:
                print(f'  {name}: 从缓存加载 ({len(cached)} 条)')
                result[name] = cached
                continue

        print(f'  {name}: 从 akshare 获取 ({symbol})...')
        series = _akshare_fetch(symbol, days)
        if not series.empty:
            _save_cache(name, series)
            result[name] = series
            print(f'    OK: {len(series)} 条')
        else:
            cached = _load_cache(name)
            if cached is not None:
                print(f'  {name}: akshare 失败，使用过期缓存')
                result[name] = cached

    # FRED 数据作为补充（如果有 API Key 且 akshare 未获取到）
    if FRED_API_KEY:
        for name, series_id in FRED_SERIES.items():
            if name in result and not result[name].empty:
                continue
            if not force_refresh:
                cached = _load_cache(name)
                if cached is not None:
                    result[name] = cached
                    continue
            series = _fred_fetch(series_id, days)
            if not series.empty:
                _save_cache(name, series)
                result[name] = series

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
