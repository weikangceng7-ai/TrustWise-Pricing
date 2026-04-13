"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const _sfc_main = {
  __name: "detail",
  setup(__props, { expose: __expose }) {
    __expose();
    const enterprise = common_vendor.ref(null);
    const predictions = common_vendor.ref([]);
    const period = common_vendor.ref(90);
    const code = common_vendor.ref("");
    const trend = common_vendor.computed(() => {
      if (predictions.value.length < 2)
        return 0;
      const first = predictions.value[0].predictedPrice;
      const last = predictions.value[predictions.value.length - 1].predictedPrice;
      return (last - first) / first * 100;
    });
    const transportModeText = common_vendor.computed(() => {
      var _a;
      return { water: "水运", rail: "铁路", road: "公路" }[(_a = enterprise.value) == null ? void 0 : _a.transportMode] || "未设置";
    });
    const inventoryStrategyText = common_vendor.computed(() => {
      var _a;
      return { aggressive: "激进型", moderate: "稳健型", conservative: "保守型" }[(_a = enterprise.value) == null ? void 0 : _a.inventoryStrategy] || "稳健型";
    });
    const fetchData = async () => {
      if (!code.value)
        return;
      try {
        const res = await utils_api.api.getEnterprise(code.value);
        enterprise.value = res.enterprise;
      } catch (e) {
        console.error("获取企业详情失败:", e);
        common_vendor.index.showToast({ title: "获取企业详情失败", icon: "none" });
      }
    };
    const fetchPredictions = async () => {
      if (!code.value)
        return;
      try {
        const res = await utils_api.api.getPredictions(code.value, period.value);
        predictions.value = res.data || res.predictions || [];
      } catch (e) {
        console.error("获取预测数据失败:", e);
      }
    };
    const changePeriod = (days) => {
      period.value = days;
      fetchPredictions();
    };
    const getBarHeight = (price) => {
      if (!predictions.value.length)
        return 50;
      const prices = predictions.value.map((p) => p.predictedPrice);
      const min = Math.min(...prices), max = Math.max(...prices);
      return (price - min) / (max - min || 1) * 80 + 20;
    };
    const formatPrice = (price) => price ? (price / 100).toFixed(0) : "-";
    const formatDate = (dateStr) => {
      if (!dateStr)
        return "";
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    };
    const openChat = () => common_vendor.index.switchTab({ url: "/pages/chat/index" });
    const openKnowledge = () => common_vendor.index.navigateTo({ url: `/pages/knowledge/index?code=${code.value}` });
    common_vendor.onLoad((options) => {
      code.value = options.code;
      fetchData();
      fetchPredictions();
    });
    common_vendor.onShow(() => {
      if (code.value) {
        fetchData();
        fetchPredictions();
      }
    });
    const __returned__ = { enterprise, predictions, period, code, trend, transportModeText, inventoryStrategyText, fetchData, fetchPredictions, changePeriod, getBarHeight, formatPrice, formatDate, openChat, openKnowledge, ref: common_vendor.ref, computed: common_vendor.computed, onMounted: common_vendor.onMounted, get onLoad() {
      return common_vendor.onLoad;
    }, get onShow() {
      return common_vendor.onShow;
    }, get api() {
      return utils_api.api;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a, _b, _c, _d, _e, _f, _g;
  return common_vendor.e({
    a: $setup.enterprise
  }, $setup.enterprise ? {
    b: common_vendor.t($setup.enterprise.name),
    c: common_vendor.t($setup.enterprise.location || $setup.enterprise.province || "未设置地区"),
    d: common_vendor.t($setup.enterprise.capacity || "-"),
    e: common_vendor.t($setup.enterprise.currentStock || "-")
  } : {}, {
    f: $setup.predictions.length
  }, $setup.predictions.length ? {
    g: $setup.period === 30 ? 1 : "",
    h: common_vendor.o(($event) => $setup.changePeriod(30)),
    i: $setup.period === 60 ? 1 : "",
    j: common_vendor.o(($event) => $setup.changePeriod(60)),
    k: $setup.period === 90 ? 1 : "",
    l: common_vendor.o(($event) => $setup.changePeriod(90)),
    m: common_vendor.f($setup.predictions.slice(0, 10), (p, i, i0) => {
      return {
        a: common_vendor.t($setup.formatPrice(p.predictedPrice)),
        b: i,
        c: $setup.getBarHeight(p.predictedPrice) + "%"
      };
    }),
    n: common_vendor.f($setup.predictions.slice(0, 10), (p, i, i0) => {
      return {
        a: common_vendor.t($setup.formatDate(p.date)),
        b: i
      };
    }),
    o: common_vendor.t($setup.trend > 0 ? "↑ 上涨" : $setup.trend < 0 ? "↓ 下跌" : "→ 持平"),
    p: common_vendor.n($setup.trend > 0 ? "up" : $setup.trend < 0 ? "down" : ""),
    q: common_vendor.t(Math.abs($setup.trend).toFixed(2)),
    r: common_vendor.t(((_a = $setup.enterprise) == null ? void 0 : _a.modelAccuracy) || 85)
  } : {}, {
    s: common_vendor.t($setup.transportModeText),
    t: common_vendor.t($setup.inventoryStrategyText),
    v: common_vendor.t(((_b = $setup.enterprise) == null ? void 0 : _b.maxCapacity) || "-"),
    w: common_vendor.t(((_c = $setup.enterprise) == null ? void 0 : _c.safetyDays) || "-"),
    x: common_vendor.t(((_d = $setup.enterprise) == null ? void 0 : _d.avgConsumption) || "-"),
    y: common_vendor.t(((_e = $setup.enterprise) == null ? void 0 : _e.portDistance) || "-"),
    z: (_f = $setup.enterprise) == null ? void 0 : _f.description
  }, ((_g = $setup.enterprise) == null ? void 0 : _g.description) ? {
    A: common_vendor.t($setup.enterprise.description)
  } : {}, {
    B: common_vendor.o($setup.openKnowledge),
    C: common_vendor.o($setup.openChat)
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-ad07d255"], ["__file", "D:/trustwise/TrustWise-Pricing/miniprogram/src/pages/enterprise/detail.vue"]]);
wx.createPage(MiniProgramPage);
