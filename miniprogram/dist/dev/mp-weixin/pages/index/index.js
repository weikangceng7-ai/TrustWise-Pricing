"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const _sfc_main = {
  __name: "index",
  setup(__props, { expose: __expose }) {
    __expose();
    const stats = common_vendor.ref([
      { icon: "📈", value: "-", label: "价格趋势" },
      { icon: "📦", value: "-", label: "港口库存" },
      { icon: "🏭", value: "-", label: "服务企业" },
      { icon: "📊", value: "-", label: "分析报告" }
    ]);
    const actions = common_vendor.ref([
      { icon: "🏢", text: "企业分析", url: "/pages/enterprise/list" },
      { icon: "📋", text: "采购报告", url: "/pages/reports/list" },
      { icon: "🧠", text: "知识图谱", url: "/pages/knowledge/index" },
      { icon: "🤖", text: "AI助手", url: "/pages/chat/index" }
    ]);
    const news = common_vendor.ref([]);
    const priceData = common_vendor.ref(null);
    const goTo = (url) => {
      if (url.includes("knowledge")) {
        common_vendor.index.navigateTo({ url });
      } else {
        common_vendor.index.switchTab({ url });
      }
    };
    const refreshPrice = async () => {
      try {
        const res = await utils_api.api.getPriceSummary();
        if (res) {
          priceData.value = {
            currentPrice: res.currentPrice || res.avgPrice || "-",
            trend: res.trend || res.changePercent || 0
          };
          stats.value[0].value = `${res.trend > 0 ? "↑" : res.trend < 0 ? "↓" : "→"} ${Math.abs(res.trend || 0).toFixed(2)}%`;
        }
      } catch (e) {
        console.error("获取价格失败:", e);
      }
    };
    const refreshInventory = async () => {
      try {
        const res = await utils_api.api.getInventorySummary();
        if (res && res.totalInventory) {
          stats.value[1].value = `${(res.totalInventory / 1e4).toFixed(0)}万吨`;
        }
      } catch (e) {
        console.error("获取库存失败:", e);
      }
    };
    const refreshEnterprises = async () => {
      try {
        const res = await utils_api.api.getEnterprises();
        if (res && res.total !== void 0) {
          stats.value[2].value = res.total.toString();
        }
      } catch (e) {
        console.error("获取企业数失败:", e);
      }
    };
    const refreshNews = async () => {
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
    common_vendor.onMounted(() => {
      refreshPrice();
      refreshInventory();
      refreshEnterprises();
      refreshNews();
    });
    const __returned__ = { stats, actions, news, priceData, goTo, refreshPrice, refreshInventory, refreshEnterprises, refreshNews, ref: common_vendor.ref, onMounted: common_vendor.onMounted, get api() {
      return utils_api.api;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.f($setup.stats, (stat, i, i0) => {
      return {
        a: common_vendor.t(stat.icon),
        b: common_vendor.t(stat.value),
        c: common_vendor.t(stat.label),
        d: i
      };
    }),
    b: common_vendor.f($setup.actions, (action, i, i0) => {
      return {
        a: common_vendor.t(action.icon),
        b: common_vendor.t(action.text),
        c: i,
        d: common_vendor.o(($event) => $setup.goTo(action.url), i)
      };
    }),
    c: common_vendor.o($setup.refreshPrice),
    d: $setup.priceData
  }, $setup.priceData ? {
    e: common_vendor.t($setup.priceData.currentPrice || "-"),
    f: common_vendor.t($setup.priceData.trend > 0 ? "↑" : $setup.priceData.trend < 0 ? "↓" : "→"),
    g: common_vendor.t(Math.abs($setup.priceData.trend || 0).toFixed(2)),
    h: common_vendor.n($setup.priceData.trend > 0 ? "up" : $setup.priceData.trend < 0 ? "down" : "")
  } : {}, {
    i: common_vendor.o($setup.refreshNews),
    j: common_vendor.f($setup.news, (item, i, i0) => {
      return {
        a: common_vendor.t(item.title),
        b: common_vendor.t(item.time),
        c: i
      };
    }),
    k: !$setup.news.length
  }, !$setup.news.length ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-83a5a03c"], ["__file", "D:/trustwise/TrustWise-Pricing/miniprogram/src/pages/index/index.vue"]]);
wx.createPage(MiniProgramPage);
