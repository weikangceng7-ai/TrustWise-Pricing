"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const _sfc_main = {
  __name: "index",
  setup(__props, { expose: __expose }) {
    __expose();
    const stats = common_vendor.ref([
      { icon: "📈", value: "-", label: "价格趋势", trend: null, action: null },
      { icon: "📦", value: "-", label: "港口库存", trend: null, action: "/pages/supply-demand/index" },
      { icon: "🏭", value: "-", label: "服务企业", action: "/pages/enterprise/list" },
      { icon: "📊", value: "-", label: "分析报告", action: "/pages/reports/list" }
    ]);
    const actions = common_vendor.ref([
      { icon: "🏢", text: "企业分析", url: "/pages/enterprise/list" },
      { icon: "📋", text: "采购报告", url: "/pages/reports/list" },
      { icon: "🧠", text: "知识图谱", url: "/pages/knowledge/index" },
      { icon: "⚖️", text: "供需分析", url: "/pages/supply-demand/index" },
      { icon: "🤖", text: "AI助手", url: "/pages/chat/index" },
      { icon: "⚙️", text: "设置", url: "/pages/user/index" }
    ]);
    const priceHistory = common_vendor.ref([]);
    const latestPrice = common_vendor.ref(null);
    const timeRange = common_vendor.ref(30);
    const enterprisePredictions = common_vendor.ref([]);
    const supplyDemand = common_vendor.ref(null);
    const reports = common_vendor.ref([]);
    const news = common_vendor.ref([]);
    const priceChange = common_vendor.computed(() => {
      if (priceHistory.value.length < 2)
        return 0;
      const first = priceHistory.value[0].price;
      const last = priceHistory.value[priceHistory.value.length - 1].price;
      return (last - first) / first * 100;
    });
    const fetchData = async () => {
      await Promise.all([
        fetchPrices(),
        fetchInventory(),
        fetchEnterprises(),
        fetchReports(),
        fetchNews(),
        fetchSupplyDemand(),
        fetchPredictions()
      ]);
    };
    const fetchPrices = async () => {
      try {
        const res = await utils_api.api.getPrices({ days: timeRange.value });
        if (res && res.prices) {
          priceHistory.value = res.prices.map((p) => ({
            date: p.date,
            price: parseFloat(p.mainPrice) || 0,
            change: parseFloat(p.changeValue) || 0
          }));
          if (priceHistory.value.length > 0) {
            latestPrice.value = priceHistory.value[priceHistory.value.length - 1];
            const change = priceChange.value;
            stats.value[0].value = `${change >= 0 ? "↑" : "↓"} ${Math.abs(change).toFixed(2)}%`;
            stats.value[0].trend = change;
          }
        }
      } catch (e) {
        console.error("获取价格失败:", e);
      }
    };
    const fetchInventory = async () => {
      try {
        const res = await utils_api.api.getInventorySummary();
        if (res && res.totalInventory) {
          stats.value[1].value = `${(res.totalInventory / 1e4).toFixed(1)}万吨`;
          stats.value[1].trend = res.changePercent || null;
        }
      } catch (e) {
        console.error("获取库存失败:", e);
      }
    };
    const fetchEnterprises = async () => {
      try {
        const res = await utils_api.api.getEnterprises();
        if (res && res.total !== void 0) {
          stats.value[2].value = res.total.toString();
        }
      } catch (e) {
        console.error("获取企业数失败:", e);
      }
    };
    const fetchReports = async () => {
      try {
        const res = await utils_api.api.getReports();
        if (res && res.reports) {
          reports.value = res.reports.slice(0, 3).map((r) => {
            var _a, _b, _c;
            return {
              id: r.id,
              title: r.title,
              date: r.reportDate || ((_a = r.createdAt) == null ? void 0 : _a.split("T")[0]),
              type: r.type || "weekly",
              riskLevel: r.riskLevel,
              trend: ((_b = r.priceTrend) == null ? void 0 : _b.includes("上涨")) ? 1 : ((_c = r.priceTrend) == null ? void 0 : _c.includes("下跌")) ? -1 : 0
            };
          });
          stats.value[3].value = res.total || res.reports.length;
        }
      } catch (e) {
        console.error("获取报告失败:", e);
      }
    };
    const fetchNews = async () => {
      try {
        const res = await utils_api.api.getDashboard();
        if (res && res.news) {
          news.value = res.news.slice(0, 5).map((item) => ({
            title: item.title || item.content,
            time: item.date || item.createdAt
          }));
        }
      } catch (e) {
        console.error("获取新闻失败:", e);
      }
    };
    const fetchSupplyDemand = async () => {
      var _a, _b, _c, _d;
      try {
        const res = await utils_api.api.getSupplyDemand();
        if (res) {
          supplyDemand.value = {
            supplyIndex: res.supplyIndex || ((_a = res.supply) == null ? void 0 : _a.index),
            supplyStatus: res.supplyStatus || ((_b = res.supply) == null ? void 0 : _b.status),
            demandIndex: res.demandIndex || ((_c = res.demand) == null ? void 0 : _c.index),
            demandStatus: res.demandStatus || ((_d = res.demand) == null ? void 0 : _d.status)
          };
        }
      } catch (e) {
        console.error("获取供需数据失败:", e);
      }
    };
    const fetchPredictions = async () => {
      try {
        const res = await utils_api.api.getPredictionSummary();
        if (res && res.summary) {
          enterprisePredictions.value = res.summary.slice(0, 3).map((e) => ({
            code: e.enterpriseCode,
            name: e.enterpriseName,
            location: e.location,
            icon: "🏭",
            predictedPrice: e.predictedPrice || e.latestPrice,
            trend: e.trend || 0,
            confidence: parseFloat(e.confidence) || 85
          }));
        }
      } catch (e) {
        console.error("获取预测数据失败:", e);
      }
    };
    const changeTimeRange = (days) => {
      timeRange.value = days;
      fetchPrices();
    };
    const getBarHeight = (price) => {
      if (!priceHistory.value.length)
        return 50;
      const prices = priceHistory.value.map((p) => p.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      return (price - min) / (max - min || 1) * 80 + 20;
    };
    const formatDate = (dateStr) => {
      if (!dateStr)
        return "";
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    };
    const getTypeText = (type) => {
      const types = { weekly: "周报", monthly: "月报", quarterly: "季报", yearly: "年报", special: "专题" };
      return types[type] || "报告";
    };
    const goTo = (url) => {
      if (url.includes("supply-demand") || url.includes("knowledge")) {
        common_vendor.index.navigateTo({ url });
      } else {
        common_vendor.index.switchTab({ url });
      }
    };
    const goToEnterprise = (code) => {
      common_vendor.index.navigateTo({ url: `/pages/enterprise/detail?code=${code}` });
    };
    const viewReport = (r) => {
      common_vendor.index.navigateTo({ url: `/pages/reports/detail?id=${r.id}` });
    };
    const refreshNews = () => fetchNews();
    common_vendor.onMounted(() => fetchData());
    common_vendor.onShow(() => fetchData());
    const __returned__ = { stats, actions, priceHistory, latestPrice, timeRange, enterprisePredictions, supplyDemand, reports, news, priceChange, fetchData, fetchPrices, fetchInventory, fetchEnterprises, fetchReports, fetchNews, fetchSupplyDemand, fetchPredictions, changeTimeRange, getBarHeight, formatDate, getTypeText, goTo, goToEnterprise, viewReport, refreshNews, ref: common_vendor.ref, computed: common_vendor.computed, onMounted: common_vendor.onMounted, get onShow() {
      return common_vendor.onShow;
    }, get api() {
      return utils_api.api;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.f($setup.stats, (stat, i, i0) => {
      return common_vendor.e({
        a: common_vendor.t(stat.icon),
        b: common_vendor.t(stat.value),
        c: common_vendor.t(stat.label),
        d: stat.trend
      }, stat.trend ? {
        e: common_vendor.t(stat.trend > 0 ? "↑" : "↓"),
        f: common_vendor.t(Math.abs(stat.trend).toFixed(1)),
        g: common_vendor.n(stat.trend > 0 ? "up" : "down")
      } : {}, {
        h: i,
        i: common_vendor.o(($event) => stat.action && $setup.goTo(stat.action), i)
      });
    }),
    b: $setup.timeRange === 7 ? 1 : "",
    c: common_vendor.o(($event) => $setup.changeTimeRange(7)),
    d: $setup.timeRange === 30 ? 1 : "",
    e: common_vendor.o(($event) => $setup.changeTimeRange(30)),
    f: $setup.timeRange === 90 ? 1 : "",
    g: common_vendor.o(($event) => $setup.changeTimeRange(90)),
    h: $setup.priceHistory.length
  }, $setup.priceHistory.length ? {
    i: common_vendor.f($setup.priceHistory, (p, i, i0) => {
      return {
        a: common_vendor.n(p.change > 0 ? "up" : p.change < 0 ? "down" : ""),
        b: i,
        c: $setup.getBarHeight(p.price) + "%"
      };
    }),
    j: common_vendor.f($setup.priceHistory.filter((_, idx) => idx % 5 === 0), (p, i, i0) => {
      return {
        a: common_vendor.t($setup.formatDate(p.date)),
        b: i
      };
    })
  } : {}, {
    k: $setup.latestPrice
  }, $setup.latestPrice ? {
    l: common_vendor.t($setup.latestPrice.price),
    m: common_vendor.t($setup.priceChange >= 0 ? "↑" : "↓"),
    n: common_vendor.t(Math.abs($setup.priceChange).toFixed(2)),
    o: common_vendor.n($setup.priceChange >= 0 ? "up" : "down")
  } : {}, {
    p: common_vendor.o(($event) => $setup.goTo("/pages/enterprise/list")),
    q: common_vendor.f($setup.enterprisePredictions, (e, i, i0) => {
      return {
        a: common_vendor.t(e.icon),
        b: common_vendor.t(e.name),
        c: common_vendor.t(e.location || "未设置地区"),
        d: common_vendor.t(e.predictedPrice),
        e: common_vendor.t(e.trend > 0 ? "↑" : e.trend < 0 ? "↓" : "→"),
        f: common_vendor.t(Math.abs(e.trend || 0).toFixed(2)),
        g: common_vendor.n(e.trend > 0 ? "up" : e.trend < 0 ? "down" : ""),
        h: (e.confidence || 85) + "%",
        i: common_vendor.t(e.confidence || 85),
        j: i,
        k: common_vendor.o(($event) => $setup.goToEnterprise(e.code), i)
      };
    }),
    r: common_vendor.o(($event) => $setup.goTo("/pages/supply-demand/index")),
    s: $setup.supplyDemand
  }, $setup.supplyDemand ? {
    t: common_vendor.t($setup.supplyDemand.supplyIndex || "-"),
    v: common_vendor.t($setup.supplyDemand.supplyStatus === "tight" ? "偏紧" : $setup.supplyDemand.supplyStatus === "loose" ? "宽松" : "平衡"),
    w: common_vendor.n($setup.supplyDemand.supplyStatus),
    x: common_vendor.t($setup.supplyDemand.demandIndex || "-"),
    y: common_vendor.t($setup.supplyDemand.demandStatus === "strong" ? "旺盛" : $setup.supplyDemand.demandStatus === "weak" ? "疲软" : "正常"),
    z: common_vendor.n($setup.supplyDemand.demandStatus)
  } : {}, {
    A: common_vendor.o(($event) => $setup.goTo("/pages/reports/list")),
    B: common_vendor.f($setup.reports, (r, i, i0) => {
      return {
        a: common_vendor.t($setup.getTypeText(r.type)),
        b: common_vendor.n("type-" + r.type),
        c: common_vendor.t(r.date),
        d: common_vendor.t(r.title),
        e: common_vendor.t(r.riskLevel === "high" ? "高风险" : r.riskLevel === "medium" ? "中风险" : "低风险"),
        f: common_vendor.n("risk-" + (r.riskLevel || "low")),
        g: common_vendor.t(r.trend > 0 ? "↑ 上涨" : r.trend < 0 ? "↓ 下跌" : "→ 稳定"),
        h: common_vendor.n(r.trend > 0 ? "up" : r.trend < 0 ? "down" : ""),
        i,
        j: common_vendor.o(($event) => $setup.viewReport(r), i)
      };
    }),
    C: !$setup.reports.length
  }, !$setup.reports.length ? {} : {}, {
    D: common_vendor.o($setup.refreshNews),
    E: common_vendor.f($setup.news, (item, i, i0) => {
      return {
        a: common_vendor.t(item.title),
        b: common_vendor.t(item.time),
        c: i
      };
    }),
    F: !$setup.news.length
  }, !$setup.news.length ? {} : {}, {
    G: common_vendor.f($setup.actions, (action, i, i0) => {
      return {
        a: common_vendor.t(action.icon),
        b: common_vendor.t(action.text),
        c: i,
        d: common_vendor.o(($event) => $setup.goTo(action.url), i)
      };
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-83a5a03c"], ["__file", "D:/trustwise/TrustWise-Pricing/miniprogram/src/pages/index/index.vue"]]);
wx.createPage(MiniProgramPage);
