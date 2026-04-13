"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const _sfc_main = {
  __name: "index",
  setup(__props, { expose: __expose }) {
    __expose();
    const user = common_vendor.ref(null);
    const stats = common_vendor.ref({
      reports: 0,
      enterprises: 0,
      predictions: 0
    });
    const settings = common_vendor.ref({
      notification: true,
      darkMode: true,
      language: "简体中文"
    });
    const cacheSize = common_vendor.ref("0KB");
    const lastSync = common_vendor.ref("未同步");
    const apiStatus = common_vendor.ref("已连接");
    const fetchStats = async () => {
      try {
        const [reportsRes, enterprisesRes] = await Promise.all([
          utils_api.api.getReports(),
          utils_api.api.getEnterprises()
        ]);
        if (reportsRes && reportsRes.reports) {
          stats.value.reports = reportsRes.total || reportsRes.reports.length;
        }
        if (enterprisesRes && enterprisesRes.enterprises) {
          stats.value.enterprises = enterprisesRes.total || enterprisesRes.enterprises.length;
        }
        stats.value.predictions = stats.value.enterprises;
      } catch (e) {
        console.error("获取统计数据失败:", e);
      }
    };
    const loadSettings = () => {
      try {
        const saved = common_vendor.index.getStorageSync("user_settings");
        if (saved) {
          settings.value = { ...settings.value, ...JSON.parse(saved) };
        }
        const syncTime = common_vendor.index.getStorageSync("last_sync");
        if (syncTime) {
          lastSync.value = new Date(syncTime).toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" });
        }
      } catch (e) {
        console.error("加载设置失败:", e);
      }
    };
    const saveSettings = () => {
      try {
        common_vendor.index.setStorageSync("user_settings", JSON.stringify(settings.value));
      } catch (e) {
        console.error("保存设置失败:", e);
      }
    };
    const goTo = (url) => {
      common_vendor.index.navigateTo({ url });
    };
    const goLogin = () => {
      common_vendor.index.showToast({ title: "登录功能开发中", icon: "none" });
    };
    const toggleNotification = () => {
      settings.value.notification = !settings.value.notification;
      saveSettings();
      common_vendor.index.showToast({ title: settings.value.notification ? "已开启通知" : "已关闭通知", icon: "none" });
    };
    const toggleDarkMode = () => {
      settings.value.darkMode = !settings.value.darkMode;
      saveSettings();
      common_vendor.index.showToast({ title: "主题设置已保存", icon: "none" });
    };
    const showLanguagePicker = () => {
      common_vendor.index.showActionSheet({
        itemList: ["简体中文", "English"],
        success: (res) => {
          settings.value.language = res.tapIndex === 0 ? "简体中文" : "English";
          saveSettings();
        }
      });
    };
    const clearCache = () => {
      common_vendor.index.showModal({
        title: "确认清除",
        content: "确定要清除所有缓存数据吗？",
        success: (res) => {
          if (res.confirm) {
            try {
              common_vendor.index.clearStorageSync();
              cacheSize.value = "0KB";
              common_vendor.index.showToast({ title: "缓存已清除", icon: "success" });
            } catch (e) {
              common_vendor.index.showToast({ title: "清除失败", icon: "none" });
            }
          }
        }
      });
    };
    const syncData = async () => {
      common_vendor.index.showLoading({ title: "同步中..." });
      try {
        await fetchStats();
        common_vendor.index.setStorageSync("last_sync", Date.now());
        lastSync.value = (/* @__PURE__ */ new Date()).toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" });
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "同步成功", icon: "success" });
      } catch (e) {
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "同步失败", icon: "none" });
      }
    };
    const exportData = () => {
      common_vendor.index.showToast({ title: "导出功能开发中", icon: "none" });
    };
    const showApiConfig = () => {
      common_vendor.index.showModal({
        title: "API配置",
        content: "当前API地址: http://localhost:3000\n状态: " + apiStatus.value,
        showCancel: false
      });
    };
    const showGuide = () => {
      common_vendor.index.showModal({
        title: "使用指南",
        content: "1. 首页查看价格走势和预测\n2. 企业页面管理分析企业\n3. 报告页面查看采购报告\n4. AI助手提供智能咨询",
        showCancel: false
      });
    };
    const showFeedback = () => {
      common_vendor.index.showModal({
        title: "意见反馈",
        content: "如有问题或建议，请联系客服:\nemail@example.com",
        showCancel: false
      });
    };
    const showAbout = () => {
      common_vendor.index.showModal({
        title: "关于我们",
        content: "硫磺价格预测与决策辅助系统\n版本: 1.0.0\n基于知识图谱与AI的智能价格预测平台",
        showCancel: false
      });
    };
    const logout = () => {
      common_vendor.index.showModal({
        title: "确认退出",
        content: "确定要退出登录吗？",
        success: (res) => {
          if (res.confirm) {
            user.value = null;
            common_vendor.index.showToast({ title: "已退出登录", icon: "success" });
          }
        }
      });
    };
    common_vendor.onMounted(() => {
      loadSettings();
      fetchStats();
    });
    common_vendor.onShow(() => {
      fetchStats();
    });
    const __returned__ = { user, stats, settings, cacheSize, lastSync, apiStatus, fetchStats, loadSettings, saveSettings, goTo, goLogin, toggleNotification, toggleDarkMode, showLanguagePicker, clearCache, syncData, exportData, showApiConfig, showGuide, showFeedback, showAbout, logout, ref: common_vendor.ref, onMounted: common_vendor.onMounted, get onShow() {
      return common_vendor.onShow;
    }, get api() {
      return utils_api.api;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a;
  return common_vendor.e({
    a: $setup.user
  }, $setup.user ? {
    b: common_vendor.t(((_a = $setup.user.name) == null ? void 0 : _a.charAt(0)) || "U"),
    c: common_vendor.t($setup.user.name || "未登录"),
    d: common_vendor.t($setup.user.email || "点击登录")
  } : {
    e: common_vendor.o($setup.goLogin)
  }, {
    f: common_vendor.t($setup.stats.reports),
    g: common_vendor.t($setup.stats.enterprises),
    h: common_vendor.t($setup.stats.predictions),
    i: common_vendor.o(($event) => $setup.goTo("/pages/enterprise/import")),
    j: common_vendor.o(($event) => $setup.goTo("/pages/knowledge/index")),
    k: common_vendor.o(($event) => $setup.goTo("/pages/supply-demand/index")),
    l: common_vendor.o(($event) => $setup.goTo("/pages/chat/index")),
    m: $setup.settings.notification,
    n: common_vendor.o($setup.toggleNotification),
    o: common_vendor.o($setup.toggleNotification),
    p: $setup.settings.darkMode,
    q: common_vendor.o($setup.toggleDarkMode),
    r: common_vendor.o($setup.toggleDarkMode),
    s: common_vendor.t($setup.settings.language),
    t: common_vendor.o($setup.showLanguagePicker),
    v: common_vendor.t($setup.cacheSize),
    w: common_vendor.o($setup.clearCache),
    x: common_vendor.t($setup.lastSync),
    y: common_vendor.o($setup.syncData),
    z: common_vendor.o($setup.exportData),
    A: common_vendor.t($setup.apiStatus),
    B: common_vendor.o($setup.showApiConfig),
    C: common_vendor.o($setup.showGuide),
    D: common_vendor.o($setup.showFeedback),
    E: common_vendor.o($setup.showAbout),
    F: $setup.user
  }, $setup.user ? {
    G: common_vendor.o($setup.logout)
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-642c545b"], ["__file", "D:/trustwise/TrustWise-Pricing/miniprogram/src/pages/user/index.vue"]]);
wx.createPage(MiniProgramPage);
