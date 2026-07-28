# 本周开发进度总结（2026-07-20 ~ 2026-07-25）

1. 新增 `src/lib/commodity-scraper.ts`，用 cheerio 直连生意社/新浪财经爬取硫磺、钾肥、尿素、磷矿石、BDI 五类大宗商品现货价格，替代对 Python 外部服务的强依赖。
2. 更新定时入库路由和 AKShare API 接口，统一改为优先 TypeScript 直连、Python 服务降级补充的策略。
3. 代码已通过 Vercel 手动部署验证，cron 入库和新架构运行正常。
