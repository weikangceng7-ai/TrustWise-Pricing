"use strict";
const common_vendor = require("../../common/vendor.js");
const BASE_URL = "http://localhost:3000";
const _sfc_main = {
  __name: "index",
  setup(__props, { expose: __expose }) {
    __expose();
    const messages = common_vendor.ref([{
      role: "assistant",
      content: "您好！我是硫磺采购智能助手，可以为您提供价格预测、市场分析、采购建议等服务。请问有什么可以帮您的？",
      timestamp: Date.now()
    }]);
    const inputText = common_vendor.ref("");
    const isTyping = common_vendor.ref(false);
    const scrollTop = common_vendor.ref(0);
    const scrollIntoView = common_vendor.ref("");
    const quickActions = ["最新价格走势", "库存分析", "采购建议", "市场预测", "供应商分析"];
    const send = async () => {
      var _a, _b;
      const text = inputText.value.trim();
      if (!text || isTyping.value)
        return;
      messages.value.push({ role: "user", content: text, timestamp: Date.now() });
      inputText.value = "";
      scrollToBottom();
      isTyping.value = true;
      try {
        const response = await new Promise((resolve, reject) => {
          common_vendor.index.request({
            url: BASE_URL + "/api/chat?stream=false",
            method: "POST",
            data: {
              messages: messages.value.map((m) => ({ role: m.role, content: m.content }))
            },
            header: {
              "Content-Type": "application/json"
            },
            timeout: 6e4,
            success: (res) => {
              var _a2;
              if (res.statusCode === 200) {
                resolve(res.data);
              } else {
                reject(new Error(((_a2 = res.data) == null ? void 0 : _a2.error) || "请求失败"));
              }
            },
            fail: (err) => {
              reject(new Error(err.errMsg || "网络请求失败"));
            }
          });
        });
        let replyContent = "";
        if (typeof response === "string") {
          replyContent = response;
        } else if (response.message) {
          replyContent = response.message;
        } else if (response.content) {
          replyContent = response.content;
        } else if (response.choices && ((_b = (_a = response.choices[0]) == null ? void 0 : _a.message) == null ? void 0 : _b.content)) {
          replyContent = response.choices[0].message.content;
        } else if (response.error) {
          replyContent = `抱歉，服务暂时不可用：${response.error}`;
        } else {
          replyContent = JSON.stringify(response);
        }
        messages.value.push({
          role: "assistant",
          content: replyContent,
          timestamp: Date.now()
        });
      } catch (e) {
        console.error("Chat error:", e);
        messages.value.push({
          role: "assistant",
          content: `网络连接失败，请检查网络或稍后重试。错误：${e.message || "未知错误"}`,
          timestamp: Date.now()
        });
      } finally {
        isTyping.value = false;
        scrollToBottom();
      }
    };
    const sendQuick = (text) => {
      inputText.value = text;
      send();
    };
    const scrollToBottom = () => {
      common_vendor.nextTick$1(() => {
        scrollIntoView.value = "";
        setTimeout(() => {
          scrollIntoView.value = "msg-" + (messages.value.length - 1);
        }, 50);
      });
    };
    const formatTime = (ts) => {
      if (!ts)
        return "";
      const d = new Date(ts);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    const __returned__ = { BASE_URL, messages, inputText, isTyping, scrollTop, scrollIntoView, quickActions, send, sendQuick, scrollToBottom, formatTime, ref: common_vendor.ref, nextTick: common_vendor.nextTick$1 };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.f($setup.messages, (msg, i, i0) => {
      return common_vendor.e({
        a: msg.role === "assistant"
      }, msg.role === "assistant" ? {} : {}, {
        b: common_vendor.t(msg.content),
        c: common_vendor.t($setup.formatTime(msg.timestamp)),
        d: msg.role === "user"
      }, msg.role === "user" ? {} : {}, {
        e: i,
        f: "msg-" + i,
        g: common_vendor.n(msg.role)
      });
    }),
    b: $setup.isTyping
  }, $setup.isTyping ? {} : {}, {
    c: $setup.scrollTop,
    d: $setup.scrollIntoView,
    e: common_vendor.f($setup.quickActions, (a, i, i0) => {
      return {
        a: common_vendor.t(a),
        b: i,
        c: common_vendor.o(($event) => $setup.sendQuick(a), i)
      };
    }),
    f: common_vendor.o($setup.send),
    g: $setup.isTyping,
    h: $setup.inputText,
    i: common_vendor.o(($event) => $setup.inputText = $event.detail.value),
    j: common_vendor.t($setup.isTyping ? "发送中" : "发送"),
    k: $setup.inputText.trim() && !$setup.isTyping ? 1 : "",
    l: common_vendor.o($setup.send)
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-da04a0a0"], ["__file", "D:/trustwise/TrustWise-Pricing/miniprogram/src/pages/chat/index.vue"]]);
wx.createPage(MiniProgramPage);
