"use strict";
const common_vendor = require("../common/vendor.js");
const BASE_URL = "http://localhost:3000";
const request = (options) => {
  return new Promise((resolve, reject) => {
    common_vendor.index.showLoading({
      title: "加载中...",
      mask: true
    });
    common_vendor.index.request({
      url: BASE_URL + options.url,
      method: options.method || "GET",
      data: options.data || {},
      header: {
        "Content-Type": "application/json",
        ...options.header
      },
      timeout: options.timeout || 3e4,
      success: (res) => {
        var _a;
        common_vendor.index.hideLoading();
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          common_vendor.index.showToast({
            title: ((_a = res.data) == null ? void 0 : _a.error) || "请求失败",
            icon: "none"
          });
          reject(res);
        }
      },
      fail: (err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "网络请求失败",
          icon: "none"
        });
        reject(err);
      }
    });
  });
};
const api = {
  getDashboard: () => request({ url: "/api/public-news" }),
  getEnterprises: () => request({ url: "/api/enterprises/manage" }),
  getEnterprise: (code) => request({ url: `/api/enterprises/manage?code=${code}` }),
  createEnterprise: (data) => request({
    url: "/api/enterprises/manage",
    method: "POST",
    data
  }),
  updateEnterprise: (id, data) => request({
    url: "/api/enterprises/manage",
    method: "PUT",
    data: { id, ...data }
  }),
  deleteEnterprise: (id) => request({
    url: `/api/enterprises/manage?id=${id}`,
    method: "DELETE"
  }),
  importEnterprises: (data) => request({
    url: "/api/enterprises/import",
    method: "POST",
    data
  }),
  getReports: (params = {}) => {
    const query = Object.keys(params).map((k) => `${k}=${params[k]}`).join("&");
    return request({ url: `/api/reports${query ? "?" + query : ""}` });
  },
  getReportDetail: (id) => request({ url: `/api/reports/${id}` }),
  getPredictions: (enterprise, days = 90) => request({
    url: `/api/enterprise-predictions?enterprise=${enterprise}&days=${days}`
  }),
  chat: (messages) => request({
    url: "/api/chat?stream=false",
    method: "POST",
    data: { messages },
    timeout: 6e4
  }),
  getPrices: (params = {}) => {
    const query = Object.keys(params).map((k) => `${k}=${params[k]}`).join("&");
    return request({ url: `/api/prices${query ? "?" + query : ""}` });
  },
  getInventory: (params = {}) => {
    const query = Object.keys(params).map((k) => `${k}=${params[k]}`).join("&");
    return request({ url: `/api/inventory${query ? "?" + query : ""}` });
  },
  getSupplyDemand: () => request({ url: "/api/supply-demand" }),
  getKnowledgeGraph: (enterprise = "yihua") => request({
    url: `/api/neo4j/graph?enterprise=${enterprise}`
  }),
  getPriceSummary: () => request({ url: "/api/prices/summary" }),
  getInventorySummary: () => request({ url: "/api/inventory/summary" }),
  getPredictionSummary: () => request({ url: "/api/enterprise-predictions" }),
  getNotifications: () => request({ url: "/api/notifications" }),
  markNotificationRead: (id) => request({
    url: `/api/notifications/${id}/read`,
    method: "POST"
  }),
  login: (data) => request({
    url: "/api/auth/login",
    method: "POST",
    data
  }),
  register: (data) => request({
    url: "/api/auth/register",
    method: "POST",
    data
  }),
  logout: () => request({
    url: "/api/auth/logout",
    method: "POST"
  }),
  getUserInfo: () => request({ url: "/api/auth/user" })
};
exports.api = api;
