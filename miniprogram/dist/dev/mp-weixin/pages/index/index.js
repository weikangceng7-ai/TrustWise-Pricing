"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const _sfc_main = {
  __name: "index",
  setup(__props, { expose: __expose }) {
    __expose();
    const stats = common_vendor.ref({
      priceTrend: "↑ 2.3%",
      inventory: "125万吨",
      enterprises: "3",
      reports: "28"
    });
    const news = common_vendor.ref([]);
    const goTo = (url) => {
      common_vendor.index.switchTab({ url });
    };
    const refreshNews = async () => {
      try {
        const res = await utils_api.api.getDashboard();
        if (res.news) {
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
      refreshNews();
    });
    const __returned__ = { stats, news, goTo, refreshNews, ref: common_vendor.ref, onMounted: common_vendor.onMounted, get api() {
      return utils_api.api;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($setup.stats.priceTrend),
    b: common_vendor.t($setup.stats.inventory),
    c: common_vendor.t($setup.stats.enterprises),
    d: common_vendor.t($setup.stats.reports),
    e: common_vendor.o(($event) => $setup.goTo("/pages/enterprise/list")),
    f: common_vendor.o(($event) => $setup.goTo("/pages/reports/list")),
    g: common_vendor.o(($event) => $setup.goTo("/pages/chat/index")),
    h: common_vendor.o(($event) => $setup.goTo("/pages/user/index")),
    i: common_vendor.o($setup.refreshNews),
    j: common_vendor.f($setup.news, (item, index, i0) => {
      return {
        a: common_vendor.t(item.title),
        b: common_vendor.t(item.time),
        c: index
      };
    }),
    k: $setup.news.length === 0
  }, $setup.news.length === 0 ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-83a5a03c"], ["__file", "D:/trustwise/TrustWise-Pricing/miniprogram/src/pages/index/index.vue"]]);
wx.createPage(MiniProgramPage);
