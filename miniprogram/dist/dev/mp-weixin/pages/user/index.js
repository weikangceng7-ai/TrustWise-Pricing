"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props, { expose: __expose }) {
    __expose();
    const user = common_vendor.ref({ name: "", role: "" });
    const menuItems = [
      { icon: "🏢", text: "企业管理", type: "enterprise" },
      { icon: "🔗", text: "API 配置", type: "api" },
      { icon: "🔔", text: "消息通知", type: "notification" },
      { icon: "📊", text: "数据管理", type: "data" }
    ];
    const handleMenu = (type) => common_vendor.index.showToast({ title: `${type} 设置开发中`, icon: "none" });
    const showAbout = () => {
      common_vendor.index.showModal({
        title: "关于系统",
        content: "硫磺价格预测与决策辅助系统\n\n基于知识图谱与AI的智能价格预测平台，为企业提供定制化的价格分析、采购建议和决策支持服务。",
        showCancel: false,
        confirmText: "知道了"
      });
    };
    const clearCache = () => {
      common_vendor.index.showModal({
        title: "清除缓存",
        content: "确定要清除所有缓存数据吗？",
        success: (res) => {
          if (res.confirm) {
            common_vendor.index.showLoading({ title: "清除中..." });
            setTimeout(() => {
              common_vendor.index.hideLoading();
              common_vendor.index.showToast({ title: "缓存已清除", icon: "success" });
            }, 1e3);
          }
        }
      });
    };
    const __returned__ = { user, menuItems, handleMenu, showAbout, clearCache, ref: common_vendor.ref };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.t($setup.user.name || "未登录"),
    b: common_vendor.t($setup.user.role || "请登录以获取更多功能"),
    c: common_vendor.f($setup.menuItems, (item, i, i0) => {
      return {
        a: common_vendor.t(item.icon),
        b: common_vendor.t(item.text),
        c: i,
        d: common_vendor.o(($event) => $setup.handleMenu(item.type), i)
      };
    }),
    d: common_vendor.o($setup.showAbout),
    e: common_vendor.o($setup.clearCache)
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-642c545b"], ["__file", "D:/trustwise/TrustWise-Pricing/miniprogram/src/pages/user/index.vue"]]);
wx.createPage(MiniProgramPage);
