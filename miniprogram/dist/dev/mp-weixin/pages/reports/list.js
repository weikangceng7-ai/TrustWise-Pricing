"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const _sfc_main = {
  __name: "list",
  setup(__props, { expose: __expose }) {
    __expose();
    const reports = common_vendor.ref([]);
    const loading = common_vendor.ref(false);
    const typeIndex = common_vendor.ref(0);
    const selectedDate = common_vendor.ref("");
    const typeOptions = ["全部类型", "周报", "月报", "季报", "年报", "专题报告"];
    const onTypeChange = (e) => {
      typeIndex.value = e.detail.value;
      fetchData();
    };
    const onDateChange = (e) => {
      selectedDate.value = e.detail.value;
      fetchData();
    };
    const fetchData = async () => {
      loading.value = true;
      try {
        const params = {};
        if (typeIndex.value > 0)
          params.type = typeOptions[typeIndex.value];
        if (selectedDate.value)
          params.date = selectedDate.value;
        const res = await utils_api.api.getReports(params);
        reports.value = res.reports || [];
      } catch (e) {
        console.error("获取报告列表失败:", e);
      } finally {
        loading.value = false;
      }
    };
    const getTypeText = (type) => ({ weekly: "周报", monthly: "月报", quarterly: "季报", yearly: "年报", special: "专题" })[type] || type || "报告";
    const getStatusText = (status) => ({ draft: "草稿", pending: "待审核", published: "已发布", archived: "已归档" })[status] || status || "未知";
    const formatDate = (dateStr) => {
      if (!dateStr)
        return "";
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const viewReport = (item) => common_vendor.index.navigateTo({ url: `/pages/reports/detail?id=${item.id}` });
    common_vendor.onMounted(() => fetchData());
    const __returned__ = { reports, loading, typeIndex, selectedDate, typeOptions, onTypeChange, onDateChange, fetchData, getTypeText, getStatusText, formatDate, viewReport, ref: common_vendor.ref, onMounted: common_vendor.onMounted, get api() {
      return utils_api.api;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($setup.typeOptions[$setup.typeIndex]),
    b: $setup.typeOptions,
    c: common_vendor.o($setup.onTypeChange),
    d: common_vendor.t($setup.selectedDate || "选择日期"),
    e: common_vendor.o($setup.onDateChange),
    f: $setup.reports.length
  }, $setup.reports.length ? {
    g: common_vendor.f($setup.reports, (item, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t($setup.getTypeText(item.type)),
        b: common_vendor.n("type-" + item.type),
        c: common_vendor.t($setup.formatDate(item.createdAt)),
        d: common_vendor.t(item.title),
        e: common_vendor.t(item.enterprise || "全部"),
        f: common_vendor.t($setup.getStatusText(item.status)),
        g: common_vendor.n("status-" + item.status),
        h: item.summary
      }, item.summary ? {
        i: common_vendor.t(item.summary)
      } : {}, {
        j: item.id,
        k: common_vendor.o(($event) => $setup.viewReport(item), item.id)
      });
    })
  } : !$setup.loading ? {} : {}, {
    h: !$setup.loading,
    i: $setup.loading
  }, $setup.loading ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-f7dc0d86"], ["__file", "D:/trustwise/TrustWise-Pricing/miniprogram/src/pages/reports/list.vue"]]);
wx.createPage(MiniProgramPage);
