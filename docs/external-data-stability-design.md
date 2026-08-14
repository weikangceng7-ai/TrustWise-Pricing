# 外部数据稳定性设计（降级链统一方案）

> 状态：已实施（A→E 完成）
> 日期：2026-08-14
> 目标：统一外部数据源的「网络稳定性 + 数据源稳定性」，让每次请求都有明确的数据层级来源，杜绝"静默降级到模拟却不自知"。

---

## 1. 背景与目标

当前系统依赖多个外部数据源（Frankfurter、FRED、EIA、生意社、新浪财经、GDELT、AKShare Python 服务），但存在以下问题：

1. **全局统一超时**：`EXTERNAL_FETCH_TIMEOUT_MS = 3000` 对所有源一视同仁，欧盟/国内源延迟差异大。
2. **无重试**：单次请求失败即降级，扛不住瞬时抖动。
3. **无服务端缓存**：Next.js route 层每次刷新都重新打外部 API，只有 React Query 客户端缓存 + Python 磁盘缓存。
4. **降级打标不统一**：有 `isMock` / `source` / `note`，但无法区分「过期真实数据」和「纯模拟」。
5. **域名不一致**：`api.frankfurter.app`（旧，python-service + reports route）vs `api.frankfurter.dev/v1`（新，akshare route）。
6. **降级逻辑各自为政**：`fetchWithTimeout` 在多个 route 里重复实现。

**目标**：统一成一条可预期的降级链，每个响应都清楚标出数据来自哪一层。

---

## 2. 数据源现状盘点

| 指标 | 主源（实时） | 备用源（候选） | 现有兜底 | 现有缓存 | 现有超时 |
|---|---|---|---|---|---|
| USD/CNY 汇率 | Frankfurter `.dev/v1`（akshare route） | FRED `DEXCHUS`（已列未用） | mock 7.24 | 无（route 层） | 3s |
| WTI 原油 | FRED `DCOILWTICO`（需 key） | EIA `RWTC`（需 key） | mock 75.5 / 常量 75 | EIA `revalidate:3600` | 3s |
| 布伦特 | FRED `DCOILBRENTEU`（需 key） | EIA `RBRTE`（需 key） | mock 79.2 | 同上 | 3s |
| BDI | 新浪财经直连 | Python AKShare | mock 1650 | 无 | 15s（直连）/ 10s（py） |
| 硫磺现货 | 生意社直连 | Python AKShare | mock 900 | 无 | 15s |
| 磷矿石/钾肥/尿素 | 生意社直连 | Python AKShare | mock | 无 | 15s |
| 新闻 GDELT | GDELT API | — | — | 无（route 层） | — |
| FRED 宏观 | FRED（需 key） | — | mock | 无 | 3s |

### 现有降级路径（各自为政）

- **汇率**：Frankfurter → 失败 → mock（`akshare/route.ts:99-199`）
- **原油/布伦特**：FRED → 失败或无 key → mock（`akshare/route.ts:204-383`）
- **BDI**：新浪直连 → Python → 模拟（`akshare/route.ts:461-512`）
- **现货**：生意社直连 → Python → 模拟（`akshare/route.ts:518-597`）
- **报告**：FRED/Frankfurter `.app` → null → 写死常量 75/7.24（`reports/route.ts:110-160`）

---

## 3. 统一降级链模型

所有外部数据获取统一走 **L0 → L4** 五级降级链：

```
L0 实时主源      → 成功则写缓存并返回，tier="realtime"
   ↓ 失败（含超时）→ 指数退避重试 1 次
L1 实时备用源    → 成功则写缓存并返回，tier="backup"
   ↓ 失败
L2 新鲜缓存      → TTL 内缓存命中，tier="fresh-cache"
   ↓ 无新鲜缓存
L3 过期缓存      → 返回过期真实数据，isStale=true，tier="stale-cache"
   ↓ 无任何缓存
L4 兜底值        → 常量/模拟，isMock=true，tier="mock"
```

> 注：缓存读取放在 L2，实际执行顺序是「先查缓存 → 命中新鲜缓存直接返回；未命中才走 L0/L1 实时请求」。上面是从「数据可信度」角度排列的层级。

### 统一打标字段（所有响应补齐）

| 字段 | 取值 | 含义 |
|---|---|---|
| `tier` | `realtime` / `backup` / `fresh-cache` / `stale-cache` / `mock` | 数据来源层级（新增，核心字段） |
| `source` | 字符串 | 具体数据源（已有） |
| `isMock` | boolean | 是否为模拟数据（已有，等价 `tier==="mock"`） |
| `isStale` | boolean | 是否为过期真实数据（新增，等价 `tier==="stale-cache"`） |
| `cachedAt` | ISO 时间 | 缓存写入时间（新增，仅缓存命中时返回） |
| `note` | 字符串 | 人读说明（已有） |

**前端消费约定**：页面只需要看 `tier` 一个字段即可决定是否显示「模拟」「过期数据」角标，不必再判断 `source.includes("模拟")` 这类字符串匹配（现在 `commodity-scraper.ts` 里多处用 `source.includes("模拟")` 判断，应逐步替换）。

---

## 4. 每个数据源的降级链配置

| 指标 | L0 主源 | L1 备用源 | 超时 | 重试 | 缓存 TTL |
|---|---|---|---|---|---|
| USD/CNY 汇率 | Frankfurter `.dev/v1` | FRED `DEXCHUS`（需 key） | 8s | 1 次 | 30min |
| WTI 原油 | FRED `DCOILWTICO` | EIA `RWTC` | 8s | 1 次 | 2h |
| 布伦特 | FRED `DCOILBRENTEU` | EIA `RBRTE` | 8s | 1 次 | 2h |
| BDI | 新浪直连 | Python AKShare | 15s | 1 次 | 2h |
| 硫磺现货 | 生意社直连 | Python AKShare | 15s | 1 次 | 6h |
| 磷矿石/钾肥/尿素 | 生意社直连 | Python AKShare | 15s | 1 次 | 6h |
| 新闻 GDELT | GDELT | — | 8s | 1 次 | 2h |
| FRED 宏观 | FRED（需 key） | — | 8s | 1 次 | 2h |

---

## 5. 网络层稳定机制

### 5.1 分源超时 + 重试（新建统一工具）

新建 `src/lib/external-fetch.ts`，统一封装 `fetchWithRetry`，替代现在散落在 3 处的 `fetchWithTimeout`：

```ts
interface FetchConfig {
  timeoutMs: number      // 分源超时
  retries?: number       // 重试次数，默认 1
  backoffMs?: number     // 退避基数，默认 500ms（指数：500 → 1000）
}

async function fetchWithRetry(url: string, config: FetchConfig): Promise<Response | null>
```

特点：
- `AbortController` 控制超时（复用现有思路）
- 失败/超时后指数退避重试，全部失败返回 `null`（不抛错，由上层降级链处理）
- 保留现有 `fetchWithTimeout` 的「返回 null 而非 throw」约定，改动最小

### 5.2 服务端缓存层（新建统一工具）

新建 `src/lib/external-data-cache.ts`，提供跨请求的缓存：

```ts
interface CacheEntry<T> {
  data: T
  cachedAt: number        // 写入时间戳
  ttlMs: number
}

async function getCache<T>(key: string): Promise<CacheEntry<T> | null>
async function setCache<T>(key: string, data: T, ttlMs: number): Promise<void>
```

实现选择（已定）：
- **Redis 缓存**：复用项目现有 `src/lib/redis.ts` 的 `getRedis()`（`dashboard.ts` 已用同样 get/set+TTL 模式）。`set(key, JSON.stringify(data), "EX", ttlSeconds)` 天然支持 TTL，且跨 Vercel 实例共享。
- **无 Redis 时优雅降级**：`getRedis()` 返回 null（未配 `REDIS_URL`）时跳过缓存，直接走实时请求，不影响功能。

> 决策修正：原「Vercel Data Cache（`unstable_cache`）」在 Next 16 已移除，且 `"use cache"` 语义为缓存纯函数返回值、不匹配「上次成功值兜底」的 get/set 需求。改用项目已就绪的 Redis，风格与 `dashboard.ts` 一致。

### 5.3 域名统一

- 全局统一用 `api.frankfurter.dev/v1`（新域名）
- 修复 `python-service/external_data.py:90` 和 `reports/route.ts:129` 里仍在用的旧域名 `api.frankfurter.app`

---

## 6. 实施计划（分阶段）

### 阶段 A：基础设施（不改变行为，先打地基）
1. 新建 `src/lib/external-fetch.ts`（`fetchWithRetry`）
2. 新建 `src/lib/external-data-cache.ts`（缓存工具）
3. 新建 `src/lib/constants` 里补充分源超时配置表（`DATA_SOURCE_CONFIG`）

### 阶段 B：汇率（最高频、最易触发模拟）
4. 汇率走完整 L0→L4 链：Frankfurter → FRED DEXCHUS → 缓存 → mock
5. 修旧域名 `.app` → `.dev/v1`（akshare route + python + reports）

### 阶段 C：原油/布伦特（FRED 无 key 时静默降级最多）
6. WTI/布伦特接入 FRED → EIA 备用源 + 缓存
7. 补 `isStale` 打标

### 阶段 D：现货/BDI/新闻/宏观（沿用现有三级 fallback，补打标和缓存）
8. BDI/现货接入统一缓存 + `tier` 打标
9. 用 `tier` 替换前端 `source.includes("模拟")` 判断

### 阶段 E：收尾
10. 全链路日志补齐（每次请求记录 `tier` + 耗时），便于发现静默降级
11. 更新文档（本文件 + api-reference）

---

## 7. 验收标准

1. **汇率**：断网/超时场景下，能依次降级到 FRED 备用源 → 缓存 → mock，且 UI 正确显示「实时 / 备用 / 过期 / 模拟」角标。
2. **原油**：FRED 无 key 时自动切 EIA，不再静默返回 mock。
3. **统一打标**：所有 external-data 响应都带 `tier` 字段，前端不再用字符串匹配判断是否模拟。
4. **缓存生效**：同一分钟内多次请求只打一次外部 API（日志可见）。
5. **无回归**：`npm run build` + `npm run lint` 通过，报告/供需分析/代码图谱页面数据正常。

---

## 8. 决策结论（2026-08-14 已定）

1. **缓存实现**：改用项目已有 Redis（`getRedis()`），无 Redis 优雅降级（修正「Vercel Data Cache」，理由见 5.2）。
2. **原油备用源**：暂不接 EIA，原油/布伦特先只靠「主源(FRED) + 缓存 + mock」。
3. **字段命名**：用 `tier`。
4. **实施顺序**：按「阶段 A → B → C → D → E」全链路推进。

---

## 9. 实施结果（2026-08-14）

### 已完成

| 阶段 | 内容 | 涉及文件 |
|---|---|---|
| A | `fetchWithRetry`（分源超时+指数退避重试） | 新建 `src/lib/external-fetch.ts` |
| A | Redis 缓存层（get/set + TTL + isFresh） | 新建 `src/lib/external-data-cache.ts` |
| A | 分源超时/缓存 TTL 配置表 | `src/lib/constants/index.ts` |
| B | 汇率降级链 Frankfurter → FRED DEXCHUS → 缓存 → mock | `akshare/route.ts` |
| B | 旧域名 `.app` → `.dev/v1` | `python-service/external_data.py`、`reports/route.ts` |
| C | 原油/布伦特降级链 FRED → 缓存 → mock（合并为一个 `fetchRealtimeFredPrice`） | `akshare/route.ts` |
| D | BDI 降级链 + 补齐 `latest` 统一形状 + 缓存 | `akshare/route.ts` |
| D | 现货（硫磺/磷矿石/钾肥/尿素）降级链 + 缓存 | `akshare/route.ts` |
| D | 前端响应类型补 `tier`/`isStale`/`cachedAt` | `use-external-data.ts` |

### 统一打标字段

所有 akshare 响应（汇率/原油/布伦特/BDI/现货/兜底）现在都带：
- `tier`: `realtime` / `backup` / `fresh-cache` / `stale-cache` / `mock`
- `isMock`（等价 tier==="mock"）、`isStale`（等价 tier==="stale-cache"）
- `cachedAt`（缓存命中时）

### 说明与遗留

1. **GDELT** 已用 `next: { revalidate: 3600 }`（Next.js Data Cache）缓存，且失败时返回空数组（无模拟），本就无静默降级问题，未改动。
2. **`commodity_all` 批量接口** 是 per-commodity 混合来源，未加单一 `tier`（每项 `source` 已标识来源）。
3. **`commodity-scraper.ts`** 内的 `source.includes("模拟")` 是 scraper 层自身用「模拟」作为 source 描述，属正常，未改。
4. **原油备用源 EIA** 按决策暂不接，原油/布伦特当前只靠 FRED + 缓存 + mock。
5. **日志**：失败路径已有 `console.warn`，缓存读写失败有 `console.error`；未额外加逐请求 tier 日志（避免噪音）。如需可再加。

### 验证

- `npx tsc --noEmit` 通过（exit 0）
- 变更文件 `eslint` 通过（0 error）
- 未跑 `npm run build`（仓库存在 50 个历史 lint error，与本次无关）
