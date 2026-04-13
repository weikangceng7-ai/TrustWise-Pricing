"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const _sfc_main = {
  __name: "import",
  setup(__props, { expose: __expose }) {
    __expose();
    const form = common_vendor.ref({
      code: "",
      name: "",
      location: "",
      capacity: "",
      transportMode: "",
      currentStock: "",
      maxCapacity: "",
      safetyDays: "",
      avgConsumption: "",
      inventoryStrategy: "moderate",
      portDistance: "",
      supplierCount: "",
      description: ""
    });
    const transportOptions = ["水运", "铁路", "公路"];
    const transportIndex = common_vendor.ref(0);
    const strategyOptions = ["激进型", "稳健型", "保守型"];
    const strategyIndex = common_vendor.ref(1);
    const onTransportChange = (e) => {
      transportIndex.value = e.detail.value;
      form.value.transportMode = ["water", "rail", "road"][e.detail.value];
    };
    const onStrategyChange = (e) => {
      strategyIndex.value = e.detail.value;
      form.value.inventoryStrategy = ["aggressive", "moderate", "conservative"][e.detail.value];
    };
    const resetForm = () => {
      form.value = {
        code: "",
        name: "",
        location: "",
        capacity: "",
        transportMode: "",
        currentStock: "",
        maxCapacity: "",
        safetyDays: "",
        avgConsumption: "",
        inventoryStrategy: "moderate",
        portDistance: "",
        supplierCount: "",
        description: ""
      };
      transportIndex.value = 0;
      strategyIndex.value = 1;
      common_vendor.index.showToast({ title: "已重置", icon: "none" });
    };
    const submitForm = async () => {
      if (!form.value.code || !form.value.name) {
        common_vendor.index.showToast({ title: "请填写必填项", icon: "none" });
        return;
      }
      try {
        const data = {
          code: form.value.code,
          name: form.value.name,
          location: form.value.location || null,
          capacity: form.value.capacity ? Number(form.value.capacity) : null,
          transportMode: form.value.transportMode || null,
          currentStock: form.value.currentStock ? Number(form.value.currentStock) : null,
          maxCapacity: form.value.maxCapacity ? Number(form.value.maxCapacity) : null,
          safetyDays: form.value.safetyDays ? Number(form.value.safetyDays) : null,
          avgConsumption: form.value.avgConsumption ? Number(form.value.avgConsumption) : null,
          inventoryStrategy: form.value.inventoryStrategy,
          portDistance: form.value.portDistance ? Number(form.value.portDistance) : null,
          supplierCount: form.value.supplierCount ? Number(form.value.supplierCount) : null,
          description: form.value.description || null,
          isActive: true
        };
        await utils_api.api.createEnterprise(data);
        common_vendor.index.showToast({ title: "添加成功", icon: "success" });
        setTimeout(() => common_vendor.index.navigateBack(), 1500);
      } catch (e) {
        console.error("添加企业失败:", e);
        common_vendor.index.showToast({ title: "添加失败", icon: "none" });
      }
    };
    const showBatchImport = () => {
      common_vendor.index.showModal({
        title: "批量导入",
        content: "请在网页端使用批量导入功能，支持Excel和JSON格式导入。",
        showCancel: false,
        confirmText: "知道了"
      });
    };
    const goBack = () => common_vendor.index.navigateBack();
    const __returned__ = { form, transportOptions, transportIndex, strategyOptions, strategyIndex, onTransportChange, onStrategyChange, resetForm, submitForm, showBatchImport, goBack, ref: common_vendor.ref, get api() {
      return utils_api.api;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o($setup.goBack),
    b: $setup.form.code,
    c: common_vendor.o(($event) => $setup.form.code = $event.detail.value),
    d: $setup.form.name,
    e: common_vendor.o(($event) => $setup.form.name = $event.detail.value),
    f: $setup.form.location,
    g: common_vendor.o(($event) => $setup.form.location = $event.detail.value),
    h: $setup.form.capacity,
    i: common_vendor.o(($event) => $setup.form.capacity = $event.detail.value),
    j: common_vendor.t($setup.transportOptions[$setup.transportIndex] || "请选择"),
    k: $setup.transportOptions,
    l: common_vendor.o($setup.onTransportChange),
    m: $setup.form.currentStock,
    n: common_vendor.o(($event) => $setup.form.currentStock = $event.detail.value),
    o: $setup.form.maxCapacity,
    p: common_vendor.o(($event) => $setup.form.maxCapacity = $event.detail.value),
    q: $setup.form.safetyDays,
    r: common_vendor.o(($event) => $setup.form.safetyDays = $event.detail.value),
    s: $setup.form.avgConsumption,
    t: common_vendor.o(($event) => $setup.form.avgConsumption = $event.detail.value),
    v: common_vendor.t($setup.strategyOptions[$setup.strategyIndex] || "请选择"),
    w: $setup.strategyOptions,
    x: common_vendor.o($setup.onStrategyChange),
    y: $setup.form.portDistance,
    z: common_vendor.o(($event) => $setup.form.portDistance = $event.detail.value),
    A: $setup.form.supplierCount,
    B: common_vendor.o(($event) => $setup.form.supplierCount = $event.detail.value),
    C: $setup.form.description,
    D: common_vendor.o(($event) => $setup.form.description = $event.detail.value),
    E: common_vendor.o($setup.resetForm),
    F: common_vendor.o($setup.submitForm),
    G: common_vendor.o($setup.showBatchImport)
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-e1de7643"], ["__file", "D:/trustwise/TrustWise-Pricing/miniprogram/src/pages/enterprise/import.vue"]]);
wx.createPage(MiniProgramPage);
