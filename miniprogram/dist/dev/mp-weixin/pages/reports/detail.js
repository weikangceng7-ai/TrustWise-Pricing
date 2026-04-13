"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const _sfc_main = {
  __name: "detail",
  setup(__props, { expose: __expose }) {
    __expose();
    const reportId = common_vendor.ref("");
    const report = common_vendor.ref({
      id: "",
      title: "",
      type: "weekly",
      date: "",
      summary: "",
      priceTrend: "稳定",
      trend: 0,
      riskLevel: "low",
      confidence: 85,
      priceAnalysis: null,
      marketAnalysis: [],
      supplyDemand: null,
      risks: [],
      recommendations: [],
      dataPoints: []
    });
    const priceChangeClass = common_vendor.computed(() => {
      if (!report.value.priceAnalysis)
        return "";
      const change = report.value.priceAnalysis.changePercent || 0;
      return change > 0 ? "up" : change < 0 ? "down" : "";
    });
    const priceChangeText = common_vendor.computed(() => {
      if (!report.value.priceAnalysis)
        return "";
      const change = report.value.priceAnalysis.changePercent || 0;
      return `${change > 0 ? "↑" : change < 0 ? "↓" : "→"} ${Math.abs(change).toFixed(2)}%`;
    });
    const getTypeText = (type) => {
      const types = { weekly: "周报", monthly: "月报", quarterly: "季报", yearly: "年报", special: "专题" };
      return types[type] || "报告";
    };
    const getBarHeight = (price) => {
      var _a;
      if (!((_a = report.value.priceAnalysis) == null ? void 0 : _a.history))
        return 50;
      const prices = report.value.priceAnalysis.history;
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      return (price - min) / (max - min || 1) * 80 + 20;
    };
    const fetchReport = async () => {
      var _a, _b, _c;
      try {
        const res = await utils_api.api.getReports({ id: reportId.value });
        if (res && res.reports && res.reports[0]) {
          const r = res.reports[0];
          report.value = {
            id: r.id,
            title: r.title,
            type: r.type || "weekly",
            date: r.reportDate || ((_a = r.createdAt) == null ? void 0 : _a.split("T")[0]),
            summary: r.summary || r.content,
            priceTrend: r.priceTrend || "稳定",
            trend: ((_b = r.priceTrend) == null ? void 0 : _b.includes("上涨")) ? 1 : ((_c = r.priceTrend) == null ? void 0 : _c.includes("下跌")) ? -1 : 0,
            riskLevel: r.riskLevel || "low",
            confidence: r.confidence || 85,
            priceAnalysis: r.priceAnalysis || {
              current: 1850,
              predicted: 1920,
              changePercent: 3.8,
              history: [1780, 1800, 1820, 1810, 1830, 1840, 1850]
            },
            marketAnalysis: r.marketAnalysis || [
              { icon: "🌏", title: "国际市场", content: "中东地区硫磺供应稳定，国际价格维持高位运行。" },
              { icon: "🚢", title: "进口动态", content: "本月进口量环比增加5%，港口到货量充足。" },
              { icon: "🏭", title: "下游需求", content: "磷肥企业开工率提升，工业需求保持稳定。" }
            ],
            supplyDemand: r.supplyDemand || {
              supply: [
                { label: "国内开工率", value: "78%" },
                { label: "进口量", value: "45万吨" },
                { label: "港口库存", value: "120万吨" }
              ],
              demand: [
                { label: "磷肥开工率", value: "65%" },
                { label: "工业需求", value: "稳定" },
                { label: "农业需求", value: "旺季" }
              ]
            },
            risks: r.risks || [
              { level: "medium", title: "国际油价波动", description: "原油价格波动可能影响硫磺生产成本" },
              { level: "low", title: "汇率风险", description: "人民币汇率波动影响进口成本" }
            ],
            recommendations: r.recommendations || [
              { title: "适度增加库存", description: "建议在价格回调时适度增加库存，应对后期需求增长" },
              { title: "关注进口动态", description: "密切关注国际市场动态，把握采购时机" },
              { title: "优化采购节奏", description: "建议分批采购，降低价格波动风险" }
            ],
            dataPoints: r.dataPoints || [
              { label: "港口库存", value: "120万吨", change: 2.5 },
              { label: "进口均价", value: "$185/吨", change: -1.2 },
              { label: "国内产量", value: "85万吨", change: 3.1 },
              { label: "下游开工率", value: "72%", change: 1.5 }
            ]
          };
        }
      } catch (e) {
        console.error("获取报告详情失败:", e);
        report.value = {
          id: reportId.value,
          title: "硫磺市场周度分析报告",
          type: "weekly",
          date: "2026-04-13",
          summary: "本周硫磺市场整体呈现稳中偏强态势。国际市场供应稳定，国内需求逐步回暖，港口库存处于合理区间。预计短期内价格将维持震荡上行趋势。",
          priceTrend: "震荡上行",
          trend: 1,
          riskLevel: "medium",
          confidence: 85,
          priceAnalysis: {
            current: 1850,
            predicted: 1920,
            changePercent: 3.8,
            history: [1780, 1800, 1820, 1810, 1830, 1840, 1850]
          },
          marketAnalysis: [
            { icon: "🌏", title: "国际市场", content: "中东地区硫磺供应稳定，国际价格维持高位运行。" },
            { icon: "🚢", title: "进口动态", content: "本月进口量环比增加5%，港口到货量充足。" },
            { icon: "🏭", title: "下游需求", content: "磷肥企业开工率提升，工业需求保持稳定。" }
          ],
          supplyDemand: {
            supply: [
              { label: "国内开工率", value: "78%" },
              { label: "进口量", value: "45万吨" },
              { label: "港口库存", value: "120万吨" }
            ],
            demand: [
              { label: "磷肥开工率", value: "65%" },
              { label: "工业需求", value: "稳定" },
              { label: "农业需求", value: "旺季" }
            ]
          },
          risks: [
            { level: "medium", title: "国际油价波动", description: "原油价格波动可能影响硫磺生产成本" },
            { level: "low", title: "汇率风险", description: "人民币汇率波动影响进口成本" }
          ],
          recommendations: [
            { title: "适度增加库存", description: "建议在价格回调时适度增加库存，应对后期需求增长" },
            { title: "关注进口动态", description: "密切关注国际市场动态，把握采购时机" },
            { title: "优化采购节奏", description: "建议分批采购，降低价格波动风险" }
          ],
          dataPoints: [
            { label: "港口库存", value: "120万吨", change: 2.5 },
            { label: "进口均价", value: "$185/吨", change: -1.2 },
            { label: "国内产量", value: "85万吨", change: 3.1 },
            { label: "下游开工率", value: "72%", change: 1.5 }
          ]
        };
      }
    };
    const goBack = () => common_vendor.index.navigateBack();
    const shareReport = () => {
      common_vendor.index.showToast({ title: "分享功能开发中", icon: "none" });
    };
    const askAI = () => {
      common_vendor.index.navigateTo({ url: `/pages/chat/index?context=report_${reportId.value}` });
    };
    common_vendor.onMounted(() => {
      var _a;
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      reportId.value = ((_a = currentPage.options) == null ? void 0 : _a.id) || "";
      if (reportId.value) {
        fetchReport();
      }
    });
    const __returned__ = { reportId, report, priceChangeClass, priceChangeText, getTypeText, getBarHeight, fetchReport, goBack, shareReport, askAI, ref: common_vendor.ref, computed: common_vendor.computed, onMounted: common_vendor.onMounted, get api() {
      return utils_api.api;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o($setup.goBack),
    b: common_vendor.t($setup.getTypeText($setup.report.type)),
    c: common_vendor.n("type-" + $setup.report.type),
    d: common_vendor.t($setup.report.date),
    e: common_vendor.t($setup.report.title),
    f: $setup.report.summary
  }, $setup.report.summary ? {
    g: common_vendor.t($setup.report.summary)
  } : {}, {
    h: common_vendor.t($setup.report.priceTrend || "稳定"),
    i: common_vendor.n($setup.report.trend > 0 ? "up" : $setup.report.trend < 0 ? "down" : ""),
    j: common_vendor.t($setup.report.riskLevel === "high" ? "高风险" : $setup.report.riskLevel === "medium" ? "中风险" : "低风险"),
    k: common_vendor.n("risk-" + ($setup.report.riskLevel || "low")),
    l: common_vendor.t($setup.report.confidence || 85),
    m: $setup.report.priceAnalysis
  }, $setup.report.priceAnalysis ? common_vendor.e({
    n: common_vendor.t($setup.report.priceAnalysis.current || "-"),
    o: common_vendor.t($setup.report.priceAnalysis.predicted || "-"),
    p: common_vendor.t($setup.priceChangeText),
    q: common_vendor.n($setup.priceChangeClass),
    r: $setup.report.priceAnalysis.history
  }, $setup.report.priceAnalysis.history ? {
    s: common_vendor.f($setup.report.priceAnalysis.history, (p, i, i0) => {
      return {
        a: i,
        b: $setup.getBarHeight(p) + "%"
      };
    })
  } : {}) : {}, {
    t: $setup.report.marketAnalysis
  }, $setup.report.marketAnalysis ? {
    v: common_vendor.f($setup.report.marketAnalysis, (item, i, i0) => {
      return {
        a: common_vendor.t(item.icon || "📌"),
        b: common_vendor.t(item.title),
        c: common_vendor.t(item.content),
        d: i
      };
    })
  } : {}, {
    w: $setup.report.supplyDemand
  }, $setup.report.supplyDemand ? {
    x: common_vendor.f($setup.report.supplyDemand.supply, (item, i, i0) => {
      return {
        a: common_vendor.t(item.label),
        b: common_vendor.t(item.value),
        c: "s" + i
      };
    }),
    y: common_vendor.f($setup.report.supplyDemand.demand, (item, i, i0) => {
      return {
        a: common_vendor.t(item.label),
        b: common_vendor.t(item.value),
        c: "d" + i
      };
    })
  } : {}, {
    z: $setup.report.risks && $setup.report.risks.length
  }, $setup.report.risks && $setup.report.risks.length ? {
    A: common_vendor.f($setup.report.risks, (risk, i, i0) => {
      return {
        a: common_vendor.t(risk.title),
        b: common_vendor.t(risk.description),
        c: i,
        d: common_vendor.n("risk-" + risk.level)
      };
    })
  } : {}, {
    B: $setup.report.recommendations
  }, $setup.report.recommendations ? {
    C: common_vendor.f($setup.report.recommendations, (rec, i, i0) => {
      return {
        a: common_vendor.t(i + 1),
        b: common_vendor.t(rec.title),
        c: common_vendor.t(rec.description),
        d: i
      };
    })
  } : {}, {
    D: $setup.report.dataPoints
  }, $setup.report.dataPoints ? {
    E: common_vendor.f($setup.report.dataPoints, (dp, i, i0) => {
      return common_vendor.e({
        a: common_vendor.t(dp.label),
        b: common_vendor.t(dp.value),
        c: dp.change
      }, dp.change ? {
        d: common_vendor.t(dp.change > 0 ? "↑" : "↓"),
        e: common_vendor.t(Math.abs(dp.change)),
        f: common_vendor.n(dp.change > 0 ? "up" : "down")
      } : {}, {
        g: i
      });
    })
  } : {}, {
    F: common_vendor.o($setup.shareReport),
    G: common_vendor.o($setup.askAI)
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-5fb202ee"], ["__file", "D:/trustwise/TrustWise-Pricing/miniprogram/src/pages/reports/detail.vue"]]);
wx.createPage(MiniProgramPage);
