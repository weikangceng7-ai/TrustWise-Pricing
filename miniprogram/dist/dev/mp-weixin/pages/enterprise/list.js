"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const _sfc_main = {
  __name: "list",
  setup(__props, { expose: __expose }) {
    __expose();
    const enterprises = common_vendor.ref([]);
    const loading = common_vendor.ref(false);
    const fetchData = async () => {
      loading.value = true;
      try {
        const res = await utils_api.api.getEnterprises();
        enterprises.value = res.enterprises || [];
      } catch (e) {
        console.error("获取企业列表失败:", e);
        common_vendor.index.showToast({ title: "获取企业列表失败", icon: "none" });
      } finally {
        loading.value = false;
      }
    };
    const goDetail = (code) => {
      common_vendor.index.navigateTo({ url: `/pages/enterprise/detail?code=${code}` });
    };
    const goToImport = () => {
      common_vendor.index.navigateTo({ url: "/pages/enterprise/import" });
    };
    common_vendor.onMounted(() => fetchData());
    common_vendor.onShow(() => fetchData());
    const __returned__ = { enterprises, loading, fetchData, goDetail, goToImport, ref: common_vendor.ref, onMounted: common_vendor.onMounted, get onShow() {
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
    a: common_vendor.o($setup.goToImport),
    b: $setup.enterprises.length
  }, $setup.enterprises.length ? {
    c: common_vendor.f($setup.enterprises, (item, k0, i0) => {
      return {
        a: common_vendor.t(item.name),
        b: common_vendor.t(item.location || item.province || "未设置地区"),
        c: common_vendor.t(item.capacity || "-"),
        d: common_vendor.t(item.currentStock || "-"),
        e: common_vendor.t(item.supplierCount || "-"),
        f: item.id,
        g: common_vendor.o(($event) => $setup.goDetail(item.code), item.id)
      };
    })
  } : !$setup.loading ? {
    e: common_vendor.o($setup.goToImport)
  } : {}, {
    d: !$setup.loading,
    f: $setup.loading
  }, $setup.loading ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-341ea539"], ["__file", "D:/trustwise/TrustWise-Pricing/miniprogram/src/pages/enterprise/list.vue"]]);
wx.createPage(MiniProgramPage);
