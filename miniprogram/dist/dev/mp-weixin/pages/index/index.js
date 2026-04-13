"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const _sfc_main = {
  __name: "index",
  setup(__props, { expose: __expose }) {
    __expose();
    const stats = common_vendor.ref([
      { icon: "📈", value: "↑ 2.3%", label: "价格趋势" },
      { icon: "📦", value: "125万吨", label: "港口库存" },
      { icon: "🏭", value: "3", label: "服务企业" },
      { icon: "📊", value: "28", label: "分析报告" }
    ]);
    const actions = [
      { icon: "🏢", text: "企业分析", url: "/pages/enterprise/list" },
      { icon: "📋", text: "采购报告", url: "/pages/reports/list" },
      { icon: "🤖", text: "AI助手", url: "/pages/chat/index" },
      { icon: "⚙️", text: "系统设置", url: "/pages/user/index" }
    ];
    const news = common_vendor.ref([]);
    const goTo = (url) => common_vendor.index.switchTab({ url });
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
    common_vendor.onMounted(() => refreshNews());
    const __returned__ = { stats, actions, news, goTo, refreshNews, ref: common_vendor.ref, onMounted: common_vendor.onMounted, get api() {
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
    c: common_vendor.o($setup.refreshNews),
    d: common_vendor.f($setup.news, (item, i, i0) => {
      return {
        a: common_vendor.t(item.title),
        b: common_vendor.t(item.time),
        c: i
      };
    }),
    e: !$setup.news.length
  }, !$setup.news.length ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-83a5a03c"], ["__file", "D:/trustwise/TrustWise-Pricing/miniprogram/src/pages/index/index.vue"]]);
wx.createPage(MiniProgramPage);
