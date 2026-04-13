"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const _sfc_main = {
  __name: "index",
  setup(__props, { expose: __expose }) {
    __expose();
    const supplyData = common_vendor.ref({
      index: 0,
      status: "balanced",
      factors: []
    });
    const demandData = common_vendor.ref({
      index: 0,
      status: "normal",
      factors: []
    });
    const inventoryData = common_vendor.ref([]);
    const predictions = common_vendor.ref([]);
    const supplyPercent = common_vendor.computed(() => {
      const total = (supplyData.value.index || 50) + (demandData.value.index || 50);
      return total > 0 ? supplyData.value.index / total * 100 : 50;
    });
    const demandPercent = common_vendor.computed(() => {
      const total = (supplyData.value.index || 50) + (demandData.value.index || 50);
      return total > 0 ? demandData.value.index / total * 100 : 50;
    });
    const balanceStatus = common_vendor.computed(() => {
      const diff = supplyPercent.value - demandPercent.value;
      if (diff > 10)
        return "surplus";
      if (diff < -10)
        return "shortage";
      return "balanced";
    });
    const balanceDescription = common_vendor.computed(() => {
      if (balanceStatus.value === "surplus")
        return "市场供给充足，价格可能承压下行";
      if (balanceStatus.value === "shortage")
        return "市场供给紧张，价格可能上涨";
      return "供需基本平衡，价格预期稳定";
    });
    const trendLines = common_vendor.ref([
      { label: "供给", type: "supply", values: [], max: 100 },
      { label: "需求", type: "demand", values: [], max: 100 }
    ]);
    const getStatusText = (type, status) => {
      if (type === "supply") {
        if (status === "tight")
          return "偏紧";
        if (status === "loose")
          return "宽松";
        return "平衡";
      }
      if (status === "strong")
        return "旺盛";
      if (status === "weak")
        return "疲软";
      return "正常";
    };
    const getBarHeight = (value, max) => {
      return Math.max(20, value / (max || 100) * 120);
    };
    const fetchData = async () => {
      var _a, _b, _c, _d;
      try {
        const res = await utils_api.api.getSupplyDemand();
        if (res) {
          supplyData.value = {
            index: res.supplyIndex || ((_a = res.supply) == null ? void 0 : _a.index) || 50,
            status: res.supplyStatus || ((_b = res.supply) == null ? void 0 : _b.status) || "balanced",
            factors: res.supplyFactors || [
              { name: "国内开工率", value: "78%", trend: 1 },
              { name: "进口到港量", value: "45万吨", trend: -1 },
              { name: "港口库存", value: "120万吨", trend: 0 }
            ]
          };
          demandData.value = {
            index: res.demandIndex || ((_c = res.demand) == null ? void 0 : _c.index) || 50,
            status: res.demandStatus || ((_d = res.demand) == null ? void 0 : _d.status) || "normal",
            factors: res.demandFactors || [
              { name: "磷肥开工率", value: "65%", trend: 1 },
              { name: "工业需求", value: "稳定", trend: 0 },
              { name: "农业需求", value: "旺季", trend: 1 }
            ]
          };
          if (res.trend) {
            trendLines.value = [
              { label: "供给", type: "supply", values: res.trend.supply || [60, 65, 70, 68, 72, 75, 78], max: 100 },
              { label: "需求", type: "demand", values: res.trend.demand || [55, 58, 62, 65, 68, 70, 72], max: 100 }
            ];
          }
        }
      } catch (e) {
        console.error("获取供需数据失败:", e);
        supplyData.value = {
          index: 65,
          status: "balanced",
          factors: [
            { name: "国内开工率", value: "78%", trend: 1 },
            { name: "进口到港量", value: "45万吨", trend: -1 },
            { name: "港口库存", value: "120万吨", trend: 0 }
          ]
        };
        demandData.value = {
          index: 58,
          status: "normal",
          factors: [
            { name: "磷肥开工率", value: "65%", trend: 1 },
            { name: "工业需求", value: "稳定", trend: 0 },
            { name: "农业需求", value: "旺季", trend: 1 }
          ]
        };
      }
      try {
        const invRes = await utils_api.api.getInventory();
        if (invRes && invRes.inventory) {
          inventoryData.value = invRes.inventory.slice(0, 5).map((inv) => ({
            name: inv.location || inv.name,
            current: (inv.currentStock / 1e4).toFixed(1),
            max: (inv.maxCapacity / 1e4).toFixed(1),
            safety: (inv.safetyStock / 1e4).toFixed(1),
            percent: inv.currentStock / inv.maxCapacity * 100,
            status: inv.currentStock < inv.safetyStock ? "warning" : inv.currentStock > inv.maxCapacity * 0.8 ? "high" : "normal",
            statusText: inv.currentStock < inv.safetyStock ? "偏低" : inv.currentStock > inv.maxCapacity * 0.8 ? "充足" : "正常"
          }));
        }
      } catch (e) {
        console.error("获取库存数据失败:", e);
        inventoryData.value = [
          { name: "华东港口", current: "45.2", max: "60", safety: "20", percent: 75, status: "normal", statusText: "正常" },
          { name: "华南港口", current: "32.8", max: "50", safety: "15", percent: 66, status: "normal", statusText: "正常" },
          { name: "华北港口", current: "18.5", max: "40", safety: "12", percent: 46, status: "normal", statusText: "正常" }
        ];
      }
      predictions.value = [
        { period: "短期(1-2周)", trend: balanceStatus.value === "shortage" ? 2.5 : balanceStatus.value === "surplus" ? -1.5 : 0.5, reason: balanceDescription.value, confidence: 75 },
        { period: "中期(1-3月)", trend: balanceStatus.value === "shortage" ? 5 : balanceStatus.value === "surplus" ? -3 : 1, reason: "季节性需求变化与供应调整", confidence: 65 },
        { period: "长期(3-6月)", trend: balanceStatus.value === "shortage" ? 3 : balanceStatus.value === "surplus" ? -2 : 0, reason: "产能扩张与市场平衡", confidence: 55 }
      ];
    };
    const goBack = () => common_vendor.index.navigateBack();
    common_vendor.onMounted(() => fetchData());
    const __returned__ = { supplyData, demandData, inventoryData, predictions, supplyPercent, demandPercent, balanceStatus, balanceDescription, trendLines, getStatusText, getBarHeight, fetchData, goBack, ref: common_vendor.ref, computed: common_vendor.computed, onMounted: common_vendor.onMounted, get api() {
      return utils_api.api;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o($setup.goBack),
    b: common_vendor.t($setup.supplyData.index || "-"),
    c: common_vendor.t($setup.getStatusText("supply", $setup.supplyData.status)),
    d: common_vendor.n($setup.supplyData.status),
    e: common_vendor.f($setup.supplyData.factors, (item, i, i0) => {
      return {
        a: common_vendor.t(item.name),
        b: common_vendor.t(item.value),
        c: common_vendor.t(item.trend ? item.trend > 0 ? " ↑" : " ↓" : ""),
        d: common_vendor.n(item.trend > 0 ? "up" : item.trend < 0 ? "down" : ""),
        e: i
      };
    }),
    f: common_vendor.t($setup.demandData.index || "-"),
    g: common_vendor.t($setup.getStatusText("demand", $setup.demandData.status)),
    h: common_vendor.n($setup.demandData.status),
    i: common_vendor.f($setup.demandData.factors, (item, i, i0) => {
      return {
        a: common_vendor.t(item.name),
        b: common_vendor.t(item.value),
        c: common_vendor.t(item.trend ? item.trend > 0 ? " ↑" : " ↓" : ""),
        d: common_vendor.n(item.trend > 0 ? "up" : item.trend < 0 ? "down" : ""),
        e: i
      };
    }),
    j: $setup.supplyPercent + "%",
    k: $setup.demandPercent + "%",
    l: common_vendor.t($setup.supplyPercent.toFixed(0)),
    m: common_vendor.t($setup.demandPercent.toFixed(0)),
    n: common_vendor.t($setup.balanceStatus === "surplus" ? "📉" : $setup.balanceStatus === "shortage" ? "📈" : "⚖️"),
    o: common_vendor.t($setup.balanceStatus === "surplus" ? "供给过剩" : $setup.balanceStatus === "shortage" ? "供给紧张" : "供需平衡"),
    p: common_vendor.t($setup.balanceDescription),
    q: common_vendor.n($setup.balanceStatus),
    r: common_vendor.f($setup.trendLines, (line, i, i0) => {
      return {
        a: common_vendor.t(line.label),
        b: common_vendor.f(line.values, (v, j, i1) => {
          return {
            a: j,
            b: $setup.getBarHeight(v, line.max) + "rpx"
          };
        }),
        c: common_vendor.n(line.type),
        d: i
      };
    }),
    s: common_vendor.f($setup.trendLines, (line, i, i0) => {
      return {
        a: common_vendor.n(line.type),
        b: common_vendor.t(line.label),
        c: i
      };
    }),
    t: common_vendor.f($setup.inventoryData, (inv, i, i0) => {
      return {
        a: common_vendor.t(inv.name),
        b: common_vendor.t(inv.statusText),
        c: common_vendor.n(inv.status),
        d: inv.percent + "%",
        e: common_vendor.n(inv.status),
        f: common_vendor.t(inv.current),
        g: common_vendor.t(inv.max),
        h: common_vendor.t(inv.safety),
        i
      };
    }),
    v: common_vendor.f($setup.predictions, (pred, i, i0) => {
      return {
        a: common_vendor.t(pred.period),
        b: common_vendor.t(pred.trend > 0 ? "↑" : pred.trend < 0 ? "↓" : "→"),
        c: common_vendor.t(Math.abs(pred.trend).toFixed(1)),
        d: common_vendor.n(pred.trend > 0 ? "up" : pred.trend < 0 ? "down" : ""),
        e: common_vendor.t(pred.reason),
        f: pred.confidence + "%",
        g: common_vendor.t(pred.confidence),
        h: i
      };
    })
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-80d08c3d"], ["__file", "D:/trustwise/TrustWise-Pricing/miniprogram/src/pages/supply-demand/index.vue"]]);
wx.createPage(MiniProgramPage);
