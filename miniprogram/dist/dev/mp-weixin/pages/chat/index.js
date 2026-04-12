"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const _sfc_main = {
  __name: "index",
  setup(__props, { expose: __expose }) {
    __expose();
    const messages = common_vendor.ref([
      {
        role: "assistant",
        content: "您好！我是硫磺采购智能助手，可以为您提供价格预测、市场分析、采购建议等服务。请问有什么可以帮您的？",
        timestamp: Date.now()
      }
    ]);
    const inputText = common_vendor.ref("");
    const isTyping = common_vendor.ref(false);
    const scrollTop = common_vendor.ref(0);
    const quickActions = [
      "最新价格走势",
      "库存分析",
      "采购建议",
      "市场预测",
      "供应商分析"
    ];
    const sendMessage = async () => {
      const text = inputText.value.trim();
      if (!text || isTyping.value)
        return;
      messages.value.push({
        role: "user",
        content: text,
        timestamp: Date.now()
      });
      inputText.value = "";
      scrollToBottom();
      isTyping.value = true;
      try {
        const chatMessages = messages.value.map((m) => ({
          role: m.role,
          content: m.content
        }));
        const res = await utils_api.api.chat(chatMessages);
        messages.value.push({
          role: "assistant",
          content: res.message || res.content || "抱歉，我暂时无法回答这个问题。",
          timestamp: Date.now()
        });
      } catch (e) {
        console.error("发送消息失败:", e);
        messages.value.push({
          role: "assistant",
          content: "网络连接失败，请稍后重试。",
          timestamp: Date.now()
        });
      } finally {
        isTyping.value = false;
        scrollToBottom();
      }
    };
    const sendQuickMessage = (text) => {
      inputText.value = text;
      sendMessage();
    };
    const scrollToBottom = () => {
      common_vendor.nextTick$1(() => {
        scrollTop.value = 99999;
      });
    };
    const formatTime = (timestamp) => {
      if (!timestamp)
        return "";
      const date = new Date(timestamp);
      return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    };
    const loadMoreMessages = () => {
      console.log("加载更多消息");
    };
    const __returned__ = { messages, inputText, isTyping, scrollTop, quickActions, sendMessage, sendQuickMessage, scrollToBottom, formatTime, loadMoreMessages, ref: common_vendor.ref, nextTick: common_vendor.nextTick$1, get api() {
      return utils_api.api;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.f($setup.messages, (msg, index, i0) => {
      return common_vendor.e({
        a: msg.role === "assistant"
      }, msg.role === "assistant" ? {} : {}, {
        b: common_vendor.t(msg.content),
        c: common_vendor.t($setup.formatTime(msg.timestamp)),
        d: msg.role === "user"
      }, msg.role === "user" ? {} : {}, {
        e: index,
        f: common_vendor.n(msg.role)
      });
    }),
    b: $setup.isTyping
  }, $setup.isTyping ? {} : {}, {
    c: $setup.scrollTop,
    d: common_vendor.o($setup.loadMoreMessages),
    e: common_vendor.f($setup.quickActions, (action, index, i0) => {
      return {
        a: common_vendor.t(action),
        b: index,
        c: common_vendor.o(($event) => $setup.sendQuickMessage(action), index)
      };
    }),
    f: common_vendor.o($setup.sendMessage),
    g: $setup.inputText,
    h: common_vendor.o(($event) => $setup.inputText = $event.detail.value),
    i: $setup.inputText.trim() ? 1 : "",
    j: common_vendor.o($setup.sendMessage)
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-da04a0a0"], ["__file", "D:/trustwise/TrustWise-Pricing/miniprogram/src/pages/chat/index.vue"]]);
wx.createPage(MiniProgramPage);
