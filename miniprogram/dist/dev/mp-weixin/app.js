"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
if (!Math) {
  "./pages/index/index.js";
  "./pages/enterprise/list.js";
  "./pages/enterprise/detail.js";
  "./pages/reports/list.js";
  "./pages/chat/index.js";
  "./pages/user/index.js";
}
const _sfc_main = {
  onLaunch: function() {
    console.log("App Launch");
  },
  onShow: function() {
    console.log("App Show");
  },
  onHide: function() {
    console.log("App Hide");
  }
};
const App = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__file", "D:/trustwise/TrustWise-Pricing/miniprogram/src/App.vue"]]);
function createApp() {
  const app = common_vendor.createSSRApp(App);
  const pinia = common_vendor.createPinia();
  app.use(pinia);
  return {
    app,
    pinia
  };
}
createApp().app.mount("#app");
exports.createApp = createApp;
