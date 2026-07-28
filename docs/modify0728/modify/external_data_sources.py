"""
外部数据源接入模块 — FRED / Frankfurter / GDELT

数据源          内容                              频率
生意社          硫磺/钾肥/尿素现货基准价          工作日每4h (已有)
新浪财经        波罗的海干散货指数 (BDI)          工作日每4h (已有)
FRED (美联储)   原油、CPI、利率、GDP 等11项宏观指标 每天
Frankfurter     USD/CNY 汇率                      每天
GDELT           全球硫磺/化肥行业新闻舆情          每天

更新日期：2026-07-28
"""

import os
import time
import json
import urllib.parse
import urllib.request
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

# ── 缓存配置 ──────────────────────────────────────────────────────────
CACHE_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
os.makedirs(CACHE_DIR, exist_ok=True)

# 缓存有效期（秒）
FRED_CACHE_HOURS = 24
FRANKFURTER_CACHE_HOURS = 24
GDELT_CACHE_HOURS = 12


# ===================== FRED 美联储经济数据 =====================

FRED_SERIES = {
    # 大宗商品
    'DCOILBRENTEU':   '布伦特原油现货价 (美元/桶)',
    'DCOILWTICO':     'WTI 原油现货价 (美元/桶)',
    'GASMMCOVW':      '汽油价格 (美元/加仑)',
    # 宏观经济
    'CPIAUCSL':       '消费者价格指数 (CPI, 同比)',
    'PCECTPI':        'PCE 物价指数 (同比)',
    'FEDFUNDS':       '联邦基金利率 (%)',
    'TB3MS':          '3个月国债收益率 (%)',
    'TB10YS':         '10年国债收益率 (%)',
    'GDPPOT':         '潜在GDP (十亿美元)',
    'GDP':            '实际GDP (十亿美元)',
    'UNRATE':         '失业率 (%)',
    'PPIACO':         '生产者价格指数 (同比)',
}

FRED_CACHE_FILE = os.path.join(CACHE_DIR, 'fred_cache.json')


def _load_fred_cache() -> dict:
    """加载 FRED 缓存，返回 {series_id: {date: value}}"""
    if not os.path.exists(FRED_CACHE_FILE):
        return {}
    try:
        mtime = os.path.getmtime(FRED_CACHE_FILE)
        age_hours = (time.time() - mtime) / 3600
        if age_hours > FRED_CACHE_HOURS:
            return {}
        with open(FRED_CACHE_FILE, 'r') as f:
            return json.load(f)
    except Exception:
        return {}


def _save_fred_cache(data: dict):
    """保存 FRED 缓存"""
    try:
        with open(FRED_CACHE_FILE, 'w') as f:
            json.dump(data, f, ensure_ascii=False)
    except Exception as e:
        print(f"[FRED] 缓存保存失败: {e}")


def fetch_fred_series(series_id: str, days: int = 365) -> Dict[str, Any]:
    """
    获取单个 FRED 系列数据

    Args:
        series_id: FRED 系列 ID（如 'DCOILWTICO'）
        days: 回溯天数

    Returns:
        {'success': bool, 'series_id': str, 'name': str, 'data': [(date, value), ...]}
    """
    try:
        import fredapi
    except ImportError:
        print("[FRED] fredapi 未安装，请运行: pip install fredapi")
        return {'success': False, 'series_id': series_id, 'error': 'fredapi not installed'}

    try:
        # 从环境变量读取 FRED API Key
        api_key = os.environ.get('FRED_API_KEY', '')
        if not api_key:
            print("[FRED] 未设置 FRED_API_KEY 环境变量，尝试读取本地缓存")
            cache = _load_fred_cache()
            if series_id in cache and cache[series_id]:
                records = [{'date': k, 'value': v} for k, v in sorted(cache[series_id].items())]
                return {
                    'success': True,
                    'series_id': series_id,
                    'name': FRED_SERIES.get(series_id, series_id),
                    'source': 'FRED Cache',
                    'data': records[-days:],
                    'count': len(records[-days:])
                }
            return {'success': False, 'series_id': series_id, 'error': 'No API key and no cache'}

        fred = fredapi.Fred(api_key=api_key)
        # 获取最近 days 天的数据
        data = fred.get_series_latest_start(series_id, limit=days)

        if data is None or data.empty:
            return {'success': False, 'series_id': series_id, 'error': 'No data returned'}

        records = []
        for date, value in data.items():
            if pd.notna(value):
                records.append({
                    'date': pd.Timestamp(date).strftime('%Y-%m-%d'),
                    'value': float(value)
                })

        # 更新缓存
        cache = _load_fred_cache()
        cache[series_id] = {r['date']: r['value'] for r in records}
        _save_fred_cache(cache)

        return {
            'success': True,
            'series_id': series_id,
            'name': FRED_SERIES.get(series_id, series_id),
            'source': 'FRED API',
            'data': records,
            'count': len(records)
        }
    except Exception as e:
        print(f"[FRED] 获取 {series_id} 失败: {e}")
        return {'success': False, 'series_id': series_id, 'error': str(e)}


def fetch_all_fred(days: int = 365) -> Dict[str, Dict[str, Any]]:
    """
    批量获取所有 FRED 系列数据

    Returns:
        {series_id: fetch_fred_series_result, ...}
    """
    results = {}
    for series_id in FRED_SERIES:
        print(f"[FRED] 正在获取 {series_id} ({FRED_SERIES[series_id]})...")
        result = fetch_fred_series(series_id, days=days)
        results[series_id] = result
        if result.get('success'):
            print(f"  → 成功: {result['count']} 条数据")
        else:
            print(f"  → 失败: {result.get('error', 'unknown')}")
        time.sleep(0.3)  # 避免请求过快
    return results


def get_fred_as_dataframe(results: Dict[str, Dict[str, Any]]) -> pd.DataFrame:
    """
    将 fetch_all_fred 结果转换为 DataFrame
    每行一个日期，每列一个 FRED 系列
    """
    all_dates = set()
    for result in results.values():
        if result.get('success'):
            for r in result['data']:
                all_dates.add(r['date'])

    if not all_dates:
        return pd.DataFrame()

    data_dict = {}
    for series_id, result in results.items():
        if result.get('success'):
            series_dict = {r['date']: r['value'] for r in result['data']}
            data_dict[series_id] = [series_dict.get(d, np.nan) for d in sorted(all_dates)]

    df = pd.DataFrame(data_dict, index=sorted(all_dates))
    df.index = pd.to_datetime(df.index)
    df.index.name = 'date'
    return df


# ===================== Frankfurter 汇率数据 =====================

FRANKFURTER_CACHE_FILE = os.path.join(CACHE_DIR, 'frankfurter_cache.json')
FRANKFURTER_API = 'https://api.frankfurter.app'


def _load_frankfurter_cache() -> dict:
    """加载 Frankfurter 缓存"""
    if not os.path.exists(FRANKFURTER_CACHE_FILE):
        return {}
    try:
        mtime = os.path.getmtime(FRANKFURTER_CACHE_FILE)
        age_hours = (time.time() - mtime) / 3600
        if age_hours > FRANKFURTER_CACHE_HOURS:
            return {}
        with open(FRANKFURTER_CACHE_FILE, 'r') as f:
            return json.load(f)
    except Exception:
        return {}


def _save_frankfurter_cache(data: dict):
    """保存 Frankfurter 缓存"""
    try:
        with open(FRANKFURTER_CACHE_FILE, 'w') as f:
            json.dump(data, f, ensure_ascii=False)
    except Exception as e:
        print(f"[Frankfurter] 缓存保存失败: {e}")


def fetch_exchange_rate(base: str = 'USD', target: str = 'CNY',
                        days: int = 365) -> Dict[str, Any]:
    """
    获取汇率数据（Frankfurter API）

    Args:
        base: 基准货币（如 'USD'）
        target: 目标货币（如 'CNY'）
        days: 回溯天数

    Returns:
        {'success': bool, 'base': str, 'target': str, 'data': [(date, rate), ...]}
    """
    cache = _load_frankfurter_cache()
    cache_key = f"{base}_{target}"

    # 检查缓存
    if cache_key in cache:
        cached_data = cache[cache_key]
        last_date = max(cached_data.keys())
        last_ts = pd.Timestamp(last_date)
        if (datetime.now() - last_ts).total_seconds() < FRANKFURTER_CACHE_HOURS * 3600:
            print(f"[Frankfurter] 使用缓存: {base}/{target} ({len(cached_data)} 条)")
            records = [{'date': k, 'rate': v} for k, v in sorted(cached_data.items())]
            return {
                'success': True,
                'base': base,
                'target': target,
                'source': 'Frankfurter Cache',
                'data': records[-days:],
                'count': len(records[-days:])
            }

    try:
        import urllib.request
        import json as json_lib

        end_date = datetime.now().strftime('%Y-%m-%d')
        start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        url = f"{FRANKFURTER_API}/{start_date}..{end_date}?from={base}&to={target}"

        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = json_lib.loads(resp.read().decode())

        rates = raw.get('rates', {})
        records = []
        for date_str, rate in sorted(rates.items()):
            records.append({
                'date': date_str,
                'rate': float(rate)
            })

        if not records:
            return {'success': False, 'base': base, 'target': target, 'error': 'No data'}

        # 更新缓存
        cache[cache_key] = {r['date']: r['rate'] for r in records}
        _save_frankfurter_cache(cache)

        return {
            'success': True,
            'base': base,
            'target': target,
            'source': 'Frankfurter API',
            'data': records,
            'count': len(records)
        }
    except Exception as e:
        print(f"[Frankfurter] 获取 {base}/{target} 失败: {e}")
        # fallback 到缓存
        if cache_key in cache:
            print(f"[Frankfurter] 回退到过期缓存: {base}/{target}")
            records = [{'date': k, 'rate': v} for k, v in sorted(cache[cache_key].items())]
            return {
                'success': True,
                'base': base,
                'target': target,
                'source': 'Frankfurter Cache (expired)',
                'data': records[-days:],
                'count': len(records[-days:])
            }
        return {'success': False, 'base': base, 'target': target, 'error': str(e)}


def get_exchange_rate_as_series(result: Dict[str, Any]) -> pd.Series:
    """将 fetch_exchange_rate 结果转换为 Series"""
    if not result.get('success'):
        return pd.Series(dtype=float)
    series = pd.Series(
        [r['rate'] for r in result['data']],
        index=pd.to_datetime([r['date'] for r in result['data']])
    )
    series.index.name = 'date'
    return series


# ===================== GDELT 新闻舆情数据 =====================

GDELT_CACHE_FILE = os.path.join(CACHE_DIR, 'gdelt_cache.json')
GDELT_API = 'https://api.gdeltproject.org/api/v2/doc/doc'


def _load_gdelt_cache() -> dict:
    """加载 GDELT 缓存"""
    if not os.path.exists(GDELT_CACHE_FILE):
        return {}
    try:
        mtime = os.path.getmtime(GDELT_CACHE_FILE)
        age_hours = (time.time() - mtime) / 3600
        if age_hours > GDELT_CACHE_HOURS:
            return {}
        with open(GDELT_CACHE_FILE, 'r') as f:
            return json.load(f)
    except Exception:
        return {}


def _save_gdelt_cache(data: dict):
    """保存 GDELT 缓存"""
    try:
        with open(GDELT_CACHE_FILE, 'w') as f:
            json.dump(data, f, ensure_ascii=False)
    except Exception as e:
        print(f"[GDELT] 缓存保存失败: {e}")


def fetch_sulfur_news_sentiment(days: int = 7,
                                 lang: str = 'Chinese') -> Dict[str, Any]:
    """
    获取硫磺/化肥行业新闻舆情（GDELT Global Graph API）

    Args:
        days: 回溯天数
        lang: 语言（'Chinese' 或 'English'）

    Returns:
        {
            'success': bool,
            'articles': [{'date', 'title', 'url', 'domain', 'tone'}, ...],
            'avg_tone': float,
            'count': int
        }
    """
    cache = _load_gdelt_cache()
    cache_key = f"sulfur_news_{days}_{lang}"

    # 检查缓存
    if cache_key in cache:
        mtime = cache[cache_key].get('_cached_at', 0)
        if (time.time() - mtime) < GDELT_CACHE_HOURS * 3600:
            print(f"[GDELT] 使用缓存: 硫磺新闻 {days}天 ({lang})")
            cached = cache[cache_key].copy()
            cached.pop('_cached_at', None)
            return cached

    try:
        import urllib.request
        import json as json_lib

        # GDELT Query API v2
        # mode=artlist 返回文章列表，mode=tone 返回情感分析
        end_date = datetime.now().strftime('%Y%m%d')
        start_date = (datetime.now() - timedelta(days=days)).strftime('%Y%m%d')

        # 硫磺/化肥相关关键词
        keywords = 'sulfur OR 硫磺 OR fertilizer OR 化肥 OR potash OR 钾肥 OR phosphate OR 磷肥'

        # 构建查询 URL
        # GDELT Doc API v2: https://api.gdeltproject.org/api/v2/doc/doc?format=json&mode=artlist&sort=DATE&sourcecountry=CN&maxrows=50&enddate=20260728&startdate=20260721&query=sulfur%20OR%20%E7A1%AB%E9%86%87
        params = {
            'format': 'json',
            'mode': 'artlist',
            'sort': 'Date',
            'maxrows': '50',
            'enddate': end_date,
            'startdate': start_date,
            'query': keywords,
        }
        if lang == 'Chinese':
            params['sourcecountry'] = 'CN'

        query_str = '&'.join(f"{k}={urllib.parse.quote(str(v))}" for k, v in params.items())
        url = f"{GDELT_API}?{query_str}"

        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = json_lib.loads(resp.read().decode())

        articles = []
        tones = []
        for item in raw.get('articles', []) or []:
            title = item.get('title', '')
            if not title or title == '[Duplicate Entry]':
                continue
            try:
                tone = float(item.get('tone', 0))
            except (ValueError, TypeError):
                tone = 0.0

            articles.append({
                'date': item.get('seendate', '')[:8],  # YYYYMMDD
                'title': title,
                'url': item.get('url', ''),
                'domain': item.get('domain', ''),
                'tone': tone,
                'language': item.get('language', ''),
            })
            if tone != 0:
                tones.append(tone)

        avg_tone = np.mean(tones) if tones else 0.0

        result = {
            'success': True,
            'source': 'GDELT Global Graph API',
            'query': keywords,
            'days': days,
            'language': lang,
            'articles': articles,
            'avg_tone': round(float(avg_tone), 3),
            'count': len(articles),
        }

        # 写入缓存
        cache[cache_key] = {**result, '_cached_at': time.time()}
        _save_gdelt_cache(cache)

        return result
    except Exception as e:
        print(f"[GDELT] 获取硫磺新闻失败: {e}")
        # fallback 到缓存
        if cache_key in cache:
            cached = cache[cache_key].copy()
            cached.pop('_cached_at', None)
            cached['source'] = 'GDELT Cache (expired)'
            print(f"[GDELT] 回退到过期缓存")
            return cached
        return {'success': False, 'error': str(e)}


def get_sentiment_as_series(news_result: Dict[str, Any]) -> pd.Series:
    """
    将新闻舆情结果转换为每日情感 Series（按日期聚合）
    返回: pd.Series(date_index, tone_values)
    """
    if not news_result.get('success'):
        return pd.Series(dtype=float)

    daily_tones = {}
    for article in news_result.get('articles', []):
        date_str = article.get('date', '')
        if len(date_str) == 8:
            date = pd.Timestamp(date_str, format='%Y%m%d')
            tone = article.get('tone', 0)
            if date not in daily_tones:
                daily_tones[date] = []
            daily_tones[date].append(tone)

    if not daily_tones:
        return pd.Series(dtype=float)

    series = pd.Series(
        [np.mean(tones) for tones in sorted(daily_tones.values())],
        index=pd.to_datetime(sorted(daily_tones.keys()))
    )
    series.index.name = 'date'
    return series


# ===================== 统一入口：批量获取所有外部数据 =====================

def fetch_all_external_data(days: int = 365) -> Dict[str, Any]:
    """
    一次性获取所有外部数据源：
      - FRED 宏观指标
      - Frankfurter 汇率
      - GDELT 新闻舆情

    Returns:
        {
            'fred': {series_id: result, ...},
            'frankfurter': {base_target: result, ...},
            'gdelt': {query: result, ...},
            'timestamp': str
        }
    """
    print("\n" + "=" * 60)
    print("  开始获取外部数据源...")
    print("=" * 60)

    results = {}

    # 1. FRED
    print("\n[1/3] FRED 美联储经济数据...")
    fred_results = fetch_all_fred(days=days)
    results['fred'] = fred_results

    # 2. Frankfurter
    print("\n[2/3] Frankfurter 汇率数据...")
    fx_results = {}
    for pair in [('USD', 'CNY'), ('EUR', 'CNY'), ('USD', 'EUR')]:
        base, target = pair
        print(f"  获取 {base}/{target}...")
        fx_results[f"{base}_{target}"] = fetch_exchange_rate(base, target, days=days)
        time.sleep(0.3)
    results['frankfurter'] = fx_results

    # 3. GDELT
    print("\n[3/3] GDELT 新闻舆情...")
    gdelt_result = fetch_sulfur_news_sentiment(days=7, lang='Chinese')
    results['gdelt'] = {'sulfur_news': gdelt_result}

    results['timestamp'] = datetime.now().isoformat()

    print("\n" + "=" * 60)
    print(f"  外部数据获取完成: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    return results


# ===================== 数据合并到价格 DataFrame =====================

def merge_external_to_price(price_data: pd.DataFrame,
                             external_results: Dict[str, Any]) -> pd.DataFrame:
    """
    将外部数据合并到主价格 DataFrame

    Args:
        price_data: 包含 'date' 索引和 'price' 列的 DataFrame
        external_results: fetch_all_external_data 的返回值

    Returns:
        增加外部数据列的 price_data 副本
    """
    result = price_data.copy()

    # 合并 FRED 数据
    fred_results = external_results.get('fred', {})
    if fred_results:
        fred_df = get_fred_as_dataframe(fred_results)
        if not fred_df.empty:
            aligned = fred_df.reindex(result.index, method='ffill')
            aligned = aligned.fillna(method='ffill')
            for col in aligned.columns:
                if col in FRED_SERIES:
                    result[col] = aligned[col]

    # 合并 Frankfurter 汇率
    fx_results = external_results.get('frankfurter', {})
    if fx_results:
        for key, fx_result in fx_results.items():
            if fx_result.get('success'):
                series = get_exchange_rate_as_series(fx_result)
                col_name = f"fx_{fx_result['base']}_{fx_result['target']}"
                aligned = series.reindex(result.index, method='ffill')
                result[col_name] = aligned.fillna(method='ffill')

    # 合并 GDELT 情感
    gdelt_results = external_results.get('gdelt', {})
    if gdelt_results:
        news_result = gdelt_results.get('sulfur_news', {})
        if news_result.get('success'):
            tone_series = get_sentiment_as_series(news_result)
            aligned = tone_series.reindex(result.index, method='ffill')
            result['news_sentiment'] = aligned.fillna(0.0)

    return result


# ===================== 快速测试 =====================

if __name__ == '__main__':
    print("测试外部数据源接入...\n")

    # 测试 Frankfurter
    print("--- Frankfurter 汇率 ---")
    fx = fetch_exchange_rate('USD', 'CNY', days=30)
    if fx.get('success'):
        print(f"  USD/CNY: {fx['count']} 条数据")
        print(f"  最新: {fx['data'][-1]}")
    else:
        print(f"  失败: {fx.get('error')}")

    # 测试 GDELT
    print("\n--- GDELT 新闻舆情 ---")
    news = fetch_sulfur_news_sentiment(days=7, lang='Chinese')
    if news.get('success'):
        print(f"  硫磺新闻: {news['count']} 篇")
        print(f"  平均情感: {news['avg_tone']}")
        for a in news['articles'][:3]:
            print(f"  - [{a['date']}] {a['title'][:50]}... (tone={a['tone']})")
    else:
        print(f"  失败: {news.get('error')}")

    # 测试 FRED（需要 API Key）
    print("\n--- FRED 数据 ---")
    fred = fetch_fred_series('DCOILWTICO', days=30)
    if fred.get('success'):
        print(f"  WTI 原油: {fred['count']} 条数据")
        print(f"  最新: {fred['data'][-1]}")
    else:
        print(f"  失败: {fred.get('error', '需要 FRED_API_KEY 环境变量')}")

    print("\n测试完成")
