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
    const loading = common_vendor.ref(false);
    const enterpriseCode = common_vendor.ref("");
    const trend = common_vendor.computed(() => {
      if (predictions.value.length < 2)
        return 0;
      const first = predictions.value[0].predictedPrice;
      const last = predictions.value[predictions.value.length - 1].predictedPrice;
      return (last - first) / first * 100;
    });
    const transportModeText = common_vendor.computed(() => {
      var _a;
      const modes = {
        water: "水运",
        rail: "铁路",
        road: "公路"
      };
      return modes[(_a = enterprise.value) == null ? void 0 : _a.transportMode] || "未设置";
    });
    const inventoryStrategyText = common_vendor.computed(() => {
      var _a;
      const strategies = {
        aggressive: "激进型",
        moderate: "稳健型",
        conservative: "保守型"
      };
      return strategies[(_a = enterprise.value) == null ? void 0 : _a.inventoryStrategy] || "稳健型";
    });
    const fetchEnterprise = async () => {
      if (!enterpriseCode.value)
        return;
      loading.value = true;
      try {
        const res = await utils_api.api.getEnterprise(enterpriseCode.value);
        enterprise.value = res.enterprise;
      } catch (e) {
        console.error("获取企业详情失败:", e);
        common_vendor.index.showToast({
          title: "获取企业详情失败",
          icon: "none"
        });
      } finally {
        loading.value = false;
      }
    };
    const fetchPredictions = async () => {
      if (!enterpriseCode.value)
        return;
      try {
        const res = await utils_api.api.getPredictions(enterpriseCode.value, period.value);
        predictions.value = res.predictions || [];
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
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const range = max - min || 1;
      return (price - min) / range * 80 + 20;
    };
    const formatPrice = (price) => {
      if (!price)
        return "-";
      return (price / 100).toFixed(0);
    };
    const formatDate = (dateStr) => {
      if (!dateStr)
        return "";
      const date = new Date(dateStr);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    };
    const openChat = () => {
      common_vendor.index.switchTab({
        url: "/pages/chat/index"
      });
    };
    common_vendor.onLoad((options) => {
      enterpriseCode.value = options.code;
      fetchEnterprise();
      fetchPredictions();
    });
    const __returned__ = { enterprise, predictions, period, loading, enterpriseCode, trend, transportModeText, inventoryStrategyText, fetchEnterprise, fetchPredictions, changePeriod, getBarHeight, formatPrice, formatDate, openChat, ref: common_vendor.ref, computed: common_vendor.computed, onMounted: common_vendor.onMounted, get onLoad() {
      return common_vendor.onLoad;
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
    b: common_vendor.n("bg-" + $setup.enterprise.tailwindColor),
    c: common_vendor.t($setup.enterprise.name),
    d: common_vendor.t($setup.enterprise.location || $setup.enterprise.province || "未设置地区"),
    e: common_vendor.t($setup.enterprise.capacity || "-"),
    f: common_vendor.n("bg-" + $setup.enterprise.tailwindColor),
    g: common_vendor.t($setup.enterprise.currentStock || "-"),
    h: common_vendor.n("bg-" + $setup.enterprise.tailwindColor)
  } : {}, {
    i: $setup.predictions.length > 0
  }, $setup.predictions.length > 0 ? common_vendor.e({
    j: $setup.period === 30 ? 1 : "",
    k: common_vendor.o(($event) => $setup.changePeriod(30)),
    l: $setup.period === 60 ? 1 : "",
    m: common_vendor.o(($event) => $setup.changePeriod(60)),
    n: $setup.period === 90 ? 1 : "",
    o: common_vendor.o(($event) => $setup.changePeriod(90)),
    p: common_vendor.f($setup.predictions.slice(0, 10), (pred, index, i0) => {
      return {
        a: common_vendor.t($setup.formatPrice(pred.predictedPrice)),
        b: index,
        c: $setup.getBarHeight(pred.predictedPrice) + "%"
      };
    }),
    q: common_vendor.f($setup.predictions.slice(0, 10), (pred, index, i0) => {
      return {
        a: common_vendor.t($setup.formatDate(pred.date)),
        b: index
      };
    }),
    r: $setup.trend > 0
  }, $setup.trend > 0 ? {} : $setup.trend < 0 ? {} : {}, {
    s: $setup.trend < 0,
    t: common_vendor.t(Math.abs($setup.trend).toFixed(2)),
    v: common_vendor.t(((_a = $setup.enterprise) == null ? void 0 : _a.modelAccuracy) || 85)
  }) : {}, {
    w: common_vendor.t($setup.transportModeText),
    x: common_vendor.t($setup.inventoryStrategyText),
    y: common_vendor.t(((_b = $setup.enterprise) == null ? void 0 : _b.maxCapacity) || "-"),
    z: common_vendor.t(((_c = $setup.enterprise) == null ? void 0 : _c.safetyDays) || "-"),
    A: common_vendor.t(((_d = $setup.enterprise) == null ? void 0 : _d.avgConsumption) || "-"),
    B: common_vendor.t(((_e = $setup.enterprise) == null ? void 0 : _e.portDistance) || "-"),
    C: (_f = $setup.enterprise) == null ? void 0 : _f.description
  }, ((_g = $setup.enterprise) == null ? void 0 : _g.description) ? {
    D: common_vendor.t($setup.enterprise.description)
  } : {}, {
    E: common_vendor.o($setup.openChat)
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-ad07d255"], ["__file", "D:/trustwise/TrustWise-Pricing/miniprogram/src/pages/enterprise/detail.vue"]]);
wx.createPage(MiniProgramPage);
