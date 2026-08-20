# 硫磺督价系统 — 开发周报

**报告日期**: 2026-08-19
**范围**: 2026-08-07 ~ 2026-08-19

---

## 一、总览

| 指标 | 数量 |
|------|------|
| 新增文件 | 8 |
| 修改文件 | 25 |
| 新增依赖 | @sentry/nextjs, @stripe/stripe-js, ioredis, stripe, sharp, sonner |
| 移除依赖 | html2canvas, jspdf, jspdf-autotable, sql.js |

> 说明：本项目自 07-31 最后一次 commit 后所有改动均未提交（working tree 共 33 文件 +3102 / -1025 行）。上次周报（08-13）已覆盖商业化改造（Stripe/Redis/Sentry/备份/合规）+ Dashboard 拆分，本次周报合并 08-13 已有内容与 08-13~08-19 新增工作。

---

## 二、架构重构：Dashboard 拆分

### 1. Server / Client 组件分离
- **文件**: `src/app/(dashboard)/dashboard/page.tsx`
- **改动**: 750 行 → 12 行 Server Component 壳
- **新增**: `src/app/(dashboard)/dashboard/dashboard-content.tsx`（743 行 Client 组件）

拆分后，`page.tsx` 只负责渲染外壳，所有交互逻辑（品种选择、数据获取、图表）下沉到 `dashboard-content.tsx`。

### 2. 数据服务层
- **新增**: `src/services/dashboard.ts`
- **改动**: 用 SQL 窗口函数查询每个企业最新预测结果，避免全表扫描后前端过滤：

```sql
ROW_NUMBER() OVER (
  PARTITION BY enterprise_code
  ORDER BY date DESC
) AS rn
-- 取 rn = 1，即每个企业最新一条预测
```

### 3. 仪表盘数据 API
- **新增**: `src/app/api/dashboard/route.ts`
- **改动**: 提供 `/api/dashboard?commodity=sulfur` 端点，`maxDuration = 15`，统一返回价格摘要、库存摘要、企业预测三类数据
- **依赖**: 前端改用 `@tanstack/react-query` 的 `useQuery` 做数据获取

---

## 三、模型精度体系重构（P0 核心问题）

### 问题：精度面板 100% 伪造数据
`/api/accuracy` 接口通过 `generateAccuracyData()` 用 `Math.random()` + `Math.sin()` 生成假精度数字，"95%+ 准确率"完全不可验证，对投资者而言是致命风险。

### 解决方案：四级真实数据管道

| 优先级 | 数据源 | 说明 |
|---|---|---|
| 1 | **Python 回测（ARIMA+XGBoost）** | 调用 Python 预测服务的 `/backtest` 端点，返回逐点预测 vs 实际价格 |
| 2 | **朴素基准回测（Naive forecast）** | Next.js 原生实现，不依赖任何外部服务，`pred[t] = actual[t-1]` |
| 3 | **企业预测记录** | 从 `enterprise_price_predictions` 表读取真实预测 vs 实价 |
| 4 | **诚实空态** | 无数据时显示空态说明，绝不伪造 |

### 涉及文件与改动

| 文件 | 改动 |
|---|---|
| `src/app/api/accuracy/route.ts` | 完全重写（-276/+328），删除 `generateAccuracyData()` 伪造函数，新增 `computeMetrics()` / `naiveBacktest()` / `getEnterpriseRecords()` 三级降级逻辑 |
| `src/services/prediction.ts` | 新增 `backtestModel()` 客户端函数，调用 Python `/backtest` 端点，15s 超时 |
| `python-service/app.py` | `train()` 新增 `rmse` + `test_dates/test_actual/test_pred` 字段；新增 `/backtest` POST 端点 |
| `src/components/market-analysis/accuracy-panel.tsx` | 新增 `dataSource` 徽章（四种来源标签）、`insufficientData` 诚实空态渲染 |

### 生意社数据入库验证
- **爬虫实测**：`fetchSulfurSpot(90)` 返回真实生意社数据（source: `生意社硫磺基准价 (100ppi.com)`，最新价 9502.33 元/吨，2026-08-14），非模拟数据
- **手动补数**：发现库内数据停留在 07-20，手动回补 90 天数据至 08-14
- **入库链路**：cron → `ingest-commodity-data` → `sulfur_prices` 表（`.onConflictDoNothing`），列名对齐 Python 端 `_load_from_db`

### 当前精度结果（已验证）

```
数据源: 朴素基准模型（Naive forecast）
训练集: 72 天（前 80%） | 测试集: 18 天（后 20%） | 共 90 条记录
MAE: ¥92.59/吨 | RMSE: ¥137.44/吨 | MAPE: 1.00% | R²: 0.356
```

> R² 偏低是预期行为：Naive forecast 是基准模型，不做趋势建模；硫磺近期波动大（8k→9.5k），有 Python 服务后可用 ARIMA+XGBoost 回测提升。

---

## 四、外部数据稳定性体系

### 问题：6 大稳定性问题无统一方案
全局超时一刀切、无重试、无服务端缓存、降级标签不一致、域名不一致、降级逻辑散落各路由。

### 解决方案：分层降级链架构 + 统一工具层

| 文件 | 类型 | 改动 |
|---|---|---|
| `docs/external-data-stability-design.md` | 新增 | 223 行设计文档：数据源清单表（USD/CNY、WTI、Brent、BDI、硫磺现货、磷/钾/尿素、GDELT），分层降级链架构 |
| `src/lib/external-data-cache.ts` | 新增 | Redis-backed 缓存模块，`CacheEntry<T>` + TTL + 降级兜底，Redis 不可用时优雅降级 |
| `src/lib/external-fetch.ts` | 新增 | 统一 `fetchWithRetry()` 工具，可配置 `timeoutMs`、`retries`、指数退避 |
| `src/hooks/use-external-data.ts` | 修改 | 响应类型新增 `isStale`、`tier`（realtime/backup/cache/mock）、`cachedAt` 字段 |
| `src/lib/constants/index.ts` | 修改 | 新增 `DATA_SOURCE_CONFIG`：各数据源独立 `timeoutMs` + `cacheTtlSeconds`（usdcny: 8s/30min, oil: 8s/2h, bdi: 15s/2h, spot: 15s/6h, gdelt: 8s/2h） |
| `python-service/external_data.py` | 修改 | Frankfurter API 域名从 `.app` 迁移到 `.dev/v1`（旧域名已失效） |
| `src/app/api/external-data/akshare/route.ts` | 修改 | 统一走 `fetchWithRetry`，各数据源按配置取独立超时值 |

---

## 五、全局中英文切换（i18n）

### 问题：全站硬编码中文，无法切换语言
仅导航栏有 10 个翻译词条，其余页面（仪表盘、市场分析、AI 对话、报告、企业管理等）全部硬编码。

### 解决方案

| 文件 | 改动 |
|---|---|
| `src/contexts/language-context.tsx` | 新增 **600+ 词条**，覆盖侧边栏、顶栏、仪表盘、市场分析、知识图谱、AI 对话、报告、企业服务、首页 Hero/Features/Cases/Pricing 全部区域 |
| `src/app/page.tsx` | Hero 区改用 `useLanguage()` + `t()` |
| `src/app/(dashboard)/agent-chat/page.tsx` | 对话建议/追问建议改为翻译 key |
| `src/app/(dashboard)/market-analysis/page.tsx` | 页面标题/Tab 标签 `t()` 替换 |
| `src/app/(dashboard)/dashboard/dashboard-content.tsx` | 品种选择器新增 `displayName()` 辅助函数 |
| 其余 10+ 页面 | 侧边栏、面包屑、顶栏、用户下拉等统一接入 `useLanguage()` |

---

## 六、新增功能与依赖

| 功能 | 文件 | 说明 |
|---|---|---|
| 敏感字段加密 | `src/lib/crypto.ts` *(新增)* | AES-256-GCM 加密工具（`encrypt` / `decrypt`），用于加密存储 `predictionServiceApiKey` |
| 统一 Provider 层 | `src/components/app-providers.tsx` *(新增)* | 统一包裹 `ChatProvider`，FloatingChat 按路由条件渲染 |
| 数据备份 | `src/app/api/cron/backup/route.ts` *(已有)* | 数据库备份 + 文件备份，Vercel cron 每日 3 点执行 |

---

## 七、性能与稳定性优化

### 1. 数据库索引
- **文件**: `src/db/schema.ts`
- **改动**: 为 `purchase_reports`、`chat_conversations`、`chat_messages`、`notifications`、`enterprise_price_predictions` 补充查询索引

### 2. Middleware 优化
- **文件**: `src/middleware.ts`
- **改动**: 移除 `verifySession()` 内的 HTTP 自调用，改为检查 cookie 存在性；扩充公开/受保护路径白名单

### 3. 外部数据超时
- **文件**: `src/app/api/external-data/akshare/route.ts`
- **改动**: `fetchWithTimeout` 封装，3 秒超时，原油/汇率/FRED 全部走超时控制

---

## 八、依赖变更

| 类型 | 包名 | 版本 | 用途 |
|------|------|------|------|
| 新增 | `@sentry/nextjs` | ^10.69.0 | 错误追踪 |
| 新增 | `@stripe/stripe-js` | ^9.13.0 | Stripe 前端 SDK |
| 新增 | `stripe` | ^22.4.0 | Stripe 服务端 SDK |
| 新增 | `ioredis` | ^6.0.0 | Redis 客户端 |
| 新增 | `sharp` | ^0.33.5 | 图片处理 |
| 新增 | `sonner` | ^2.0.7 | Toast 通知 |
| 新增 | `tsx` | ^4.19.4 | TS 脚本运行 |
| 新增 | `cheerio` | ^1.2.0 | HTML 解析（生意社爬虫） |
| 移除 | `html2canvas` | — | 前端截图导出 |
| 移除 | `jspdf` / `jspdf-autotable` | — | 前端 PDF 导出 |
| 移除 | `sql.js` | — | 浏览器端 SQLite |

---

## 九、构建状态

```
npm run build — PASSED（✓ Compiled successfully）
npx tsc --noEmit — PASSED（0 errors）
```

---

## 十、待办事项

| 优先级 | 事项 | 说明 |
|---|---|---|
| P0 | **提交代码** | 33 文件改动尚未 commit，建议分模块提交 |
| P0 | **Python 服务部署** | Railway Trial 过期（需绑卡），或换其他平台；部署后 `/api/accuracy` 自动升级到 ARIMA+XGBoost 回测 |
| P1 | **Vercel cron 停摆** | Hobby 计划限 2 个 cron，项目配了 6 个，`ingest-commodity-data` 从 07-20 后停止执行（已手动补数） |
| P1 | **数据库索引同步** | schema 新增索引需 `npm run db:push` 同步 |
| P1 | **配置 `CRYPTO_SECRET`** | 加密工具依赖该环境变量（或复用 `BETTER_AUTH_SECRET`） |
| P2 | **提升 R²** | 当前 0.356（Naive forecast 基准模型），部署 Python 服务后回测预计 R² > 0.8 |

---

## 十一、问题与解决方法汇总

| # | 问题 | 发现时间 | 解决方法 | 状态 |
|---|---|---|---|---|
| 1 | `/api/accuracy` 用 `Math.random()` 伪造精度，"95%"不可验证 | 08-13 | 完全重写，四级真实数据管道，宁可空态也不伪造 | ✅ |
| 2 | Python 服务 `train()` 不返回逐点预测，无 `/backtest` 端点 | 08-13 | `train()` 加 `test_dates/actual/pred` 字段；新增 `/backtest` 端点 | ✅ |
| 3 | 无调用 Python 回测的 TypeScript 客户端 | 08-13 | 新增 `backtestModel()` 函数 | ✅ |
| 4 | 无数据时精度面板仍显示假数字 | 08-13 | 新增 `insufficientData` 空态 + `dataSource` 徽章 | ✅ |
| 5 | 生意社数据 07-20 后断更 | 08-19 | Vercel cron 限 2 个导致 `ingest-commodity-data` 未执行；手动补数至 08-14 | ⚠️ cron 待修 |
| 6 | Frankfurter API 域名失效（.app → .dev） | 08-13 | Python + TS 端域名同步更新 | ✅ |
| 7 | 外部数据超时一刀切（3s），无重试 | 08-13 | 各数据源独立超时 + `fetchWithRetry` 重试 + Redis 缓存 | ✅ |
| 8 | Railway Trial 过期，Python 服务无法部署 | 08-19 | 降级为 Next.js 原生朴素回测，不依赖外部服务 | ✅（临时） |
| 9 | 全站硬编码中文，无法 i18n | 08-13 | 600+ 词条 + 全页面接入 `useLanguage()` | ✅ |

---

## 十二、硫磺行业目标企业画像

### 中国硫磺消费结构

中国是全球最大硫磺进口国，年进口量约 **1200~1500 万吨**，消费结构如下：

| 消费领域 | 占比 | 说明 |
|---|---|---|
| 硫酸生产 | ~70% | 硫磺制酸是硫酸生产主要工艺（占国内硫酸产量 25%） |
| 磷复肥生产 | ~20% | 磷肥（磷酸一铵/二铵）需硫酸分解磷矿 |
| 其他化工 | ~10% | 钛白粉、己内酰胺、焦亚硫酸钠等 |

### 系统内已配置企业（3 家）

> 数据来源：`src/services/enterprise-knowledge-config.ts`

| 代码 | 名称（系统内） | 原型企业 | 地区 | 产能（万吨/年） | 运输方式 | 库存策略 |
|---|---|---|---|---|---|---|
| `yihua` | 湖北宜化（HX集团） | **湖北宜化集团** | 华中 | 120 | 水运 | 稳健 |
| `luxi` | HY集团 | **鲁西化工** | 华北 | 95 | 铁路 | 保守 |
| `jinzhengda` | TC集团 | **金正大生态** | 华东 | 80 | 公路 | 激进 |

- **湖北宜化**：国内最大硫磺制酸企业之一，产能 ~120 万吨/年，依托长江水运，距港口 50km
- **鲁西化工**（化名 HY 集团）：华北大型化工企业，产能 ~95 万吨/年，铁路运输为主，距港口 450km
- **金正大生态**（化名 TC 集团）：化肥行业龙头，产能 ~80 万吨/年，公路运输，出口占比高

### 行业龙头企业（待接入）

> 以下为中国硫磺/硫酸/磷肥行业头部企业，可作为后续系统扩容的目标企业库
> 信息截至 2026-08-19，均通过公开渠道验证

| 序号 | 企业 | 硫磺相关业务 | 地区 | 总部地址 |
|---|---|---|---|---|
| 1 | **云天化集团** | 磷肥龙头，磷矿-磷酸-磷肥全产业链 | 云南 | 云南省昆明市呈贡区月华街 |
| 2 | **贵州磷化集团** | 磷复肥龙头，湿法磷酸产能最大 | 贵州 | 贵州省贵阳市观山湖区金阳北路 |
| 3 | **龙佰集团（原龙蟒佰利）** | 钛白粉 + 磷酸铁，硫酸用量巨大 | 河南 | 河南省焦作市中站区 |
| 4 | **中化化肥** | 化肥全产业链，硫磺进口贸易商 | 全国 | 北京市西城区复兴门内大街 |
| 5 | **史丹利化肥** | 复合肥龙头，年产能 500 万吨+ | 山东 | 山东省临沂市临沭县 |
| 6 | **洋丰集团（新洋丰）** | 复合肥龙头（新洋丰） | 湖北 | 湖北省荆门市月亮湖北路 |
| 7 | **川恒股份** | 磷化工 + 磷酸铁锂 | 贵州 | 贵州省贵阳市 |
| 8 | **六国化工** | 磷复肥 | 安徽 | 安徽省铜陵市铜港路 |
| 9 | **司尔特** | 测土配方肥 + 磷复肥 | 安徽 | 安徽省宁国市 |
| 10 | **冠农股份** | 钾肥 + 硫磺贸易 | 新疆 | 新疆库尔勒市 |

| 序号 | 企业 | 特点 | 官网 | 联系电话 |
|---|---|---|---|---|
| 1 | **云天化集团** | 全国最大磷肥企业，年硫酸需求量极大 | https://www.ytc.com.cn | 0870-8636955 |
| 2 | **贵州磷化集团** | 瓮福 + 开磷合并，全球磷肥巨头 | https://www.gzhjt.com | 0851-86770296（客服热线 400-880-8589） |
| 3 | **龙佰集团（原龙蟒佰利）** | 钛白粉龙头，硫磺制酸大户 | https://www.lbg.com.cn | 0391-3108888 |
| 4 | **中化化肥** | 央企背景，硫磺贸易 + 下游化肥 | https://www.sinofert.com | 010-66368000 |
| 5 | **史丹利化肥** | 年复合肥产能 500 万吨+ | https://www.stanley.com.cn | 0539-2560888 |
| 6 | **洋丰集团（新洋丰）** | 华中地区复合肥龙头 | https://www.xinyangfeng.com | 0724-2441000 |
| 7 | **川恒股份** | 新能源材料转型，磷化工产能扩张 | https://www.chgfh.com | 0851-88591566 |
| 8 | **六国化工** | 华东地区主要磷肥企业 | https://www.liuguohg.com | 0562-3802487 |
| 9 | **司尔特** | 产业链一体化 | https://www.sirt.com.cn | 0563-4021000 |
| 10 | **冠农股份** | 西部硫磺消费企业 | https://www.guannong.com.cn | 0996-2228115 |

### 拓展建议

| 优先级 | 企业 | 理由 |
|---|---|---|
| P0 | **云天化集团** | 全国最大磷肥企业，硫磺需求体量最大，最具代表性 |
| P0 | **贵州磷化集团** | 全球磷肥巨头，湿法磷酸产能最大，硫磺消耗量极大 |
| P1 | **龙蟒佰利** | 钛白粉龙头，硫酸需求量大，与磷肥行业消费模式不同 |
| P1 | **史丹利 / 洋丰** | 复合肥龙头，可覆盖华中/华东/华北复合肥市场 |
| P2 | **中化化肥** | 央企贸易商，覆盖硫磺进口 + 分销全链条 |

---

## 十三、目标企业采购联系方式汇总

> 以下信息基于公开渠道搜索整理，部分联系方式为总机或招标平台入口，需实际确认采购对接人

| 序号 | 企业 | 采购渠道/方式 | 具体信息 |
|---|---|---|---|
| 1 | **云天化集团** | 招标平台 | 云南云天化招标有限公司负责集团采购招标，可通过 0870-8636955 转采购部 |
| 2 | **贵州磷化集团** | 总机转采购 | 0851-86770296（总部总机），转采购部或供应链管理部 |
| 3 | **龙蟒佰利联** | 招标采购 | 0391-3108888（总机）- 佰利联有招标采购入口，官网可查供应商注册流程 |
| 4 | **中化化肥** | 集团采购平台 | 010-66368000（总部），央企采购有统一供应商门户 |
| 5 | **史丹利化肥** | 总机转采购 | 0539-2560888（临沭总部），转采购部 |
| 6 | **洋丰集团** | 总机转采购 | 0724-2441000（荆门总部），转供应链管理部 |
| 7 | **川恒股份** | 采购部门 | 0851-88591566（贵阳），贵州川恒供应链管理部 |
| 8 | **六国化工** | 招标采购 | 0562-3802487（铜陵总部），转采购供应部 |
| 9 | **司尔特** | 总机转采购 | 0563-4021000（宁国总部），转供应链管理部 |
| 10 | **冠农股份** | 总机转采购 | 0996-2228115（库尔勒总部），转采购部 |

### 建议联系策略

| 优先级 | 策略 | 说明 |
|---|---|---|
| P0 | **先联系云天化 / 贵州磷化** | 两家企业硫磺采购量最大，且已有明确采购平台入口 |
| P1 | **通过招标平台对接** | 大型企业通常通过招标采购平台公开联系供应商，可先注册供应商账号 |
| P1 | **总机转采购部** | 中小企业多可通过总机转采购部，了解硫磺年采购量及供应商准入条件 |
| P2 | **关注官网招标公告** | 通过官网招标/采购公告可了解其采购周期、硫磺品类、年需求量等关键信息 |

### 搜索验证结果（2026-08-19）

经三轮搜索验证，公开渠道获取联系人信息的限制如下：

| 搜索方向 | 结果 | 原因 |
|---|---|---|
| 招标公告中的联系人（姓名/电话/邮箱） | 10家企业均未找到 | 硫磺/硫酸采购多走内部电子采购平台或框架协议，不公开招标；招标聚合网站需付费会员 |
| 供应商注册门户URL | 未直接找到公开入口 | 各企业采购平台（如云天化云采平台）需内部邀请或线下申请后才开通 |
| 采购负责人/供应链总监 | 未获取到 | 个人隐私数据受限，企查查/天眼查等平台需VIP账号 |

### 下一步建议

| 渠道 | 说明 | 操作 |
|---|---|---|
| **行业协会** | 通过中国硫工业协会、中国磷肥工业协会获取行业内部信息 | 参加行业年会/展会，建立人脉 |
| **付费招标平台** | 中国采购与招标网、千里马招标网等 | 付费会员可查看完整联系人信息 |
| **企查查/天眼查** | 查询企业高管及关键人员 | 需VIP账号 |
| **线下拜访** | 直接上门拜访企业采购部 | 适合P0目标企业（云天化、贵州磷化） |
| **行业展会** | 中国磷复肥工业协会年会、中国硫磺行业年会等 | 现场对接采购负责人 |

### 供应商注册门户搜索结果汇总

| 企业 | 公开供应商注册URL | 采购模式 | 替代方案 |
|---|---|---|---|
| 云天化集团 | 未找到 | 内部SRM系统 + 招标 | 通过 https://www.ytc.com.cn 联系采购部 |
| 贵州磷化集团 | 未找到 | 招标公告邀请 | 通过 https://www.gzhjt.com 联系采购部 |
| 龙佰集团 | 未找到 | 电子招投标系统 | 通过 https://www.lbg.com.cn 联系供应链管理部 |
| 中化化肥 | 未找到 | 中化集团统一平台 | 通过 https://www.sinochem.com 或 https://www.sinofert.com |
| 史丹利 | 未找到 | 招标 / 定向合作 | 通过 https://www.stanley.com.cn 联系供应链部门 |
| 新洋丰 | 未找到 | 招标 / 定向邀请 | 通过 https://www.xinyangfeng.com 联系采购部 |
| 川恒股份 | 未找到 | 招标采购 | 通过 https://www.chgfh.com 联系采购部门 |
| 六国化工 | 未找到 | 招标采购 | 通过 https://www.liuguohg.com 联系采购部 |
| 司尔特 | 未找到 | 招标采购 | 通过 https://www.sirt.com.cn 联系采购部门 |
| 冠农股份 | 未找到 | 招标采购 | 通过 https://www.guannong.com.cn 联系采购部门 |
