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
  updateEnterprise: (code, data) => request({
    url: "/api/enterprises/manage",
    method: "PUT",
    data: { code, ...data }
  }),
  deleteEnterprise: (code) => request({
    url: `/api/enterprises/manage?code=${code}`,
    method: "DELETE"
  }),
  importEnterprises: (data) => request({
    url: "/api/enterprises/import",
    method: "POST",
    data
  }),
  getReports: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request({ url: `/api/reports${query ? "?" + query : ""}` });
  },
  getPredictions: (enterprise, days = 90) => request({
    url: `/api/enterprise-predictions?enterprise=${enterprise}&days=${days}`
  }),
  chat: (messages) => request({
    url: "/api/chat",
    method: "POST",
    data: { messages }
  }),
  getPrices: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request({ url: `/api/prices${query ? "?" + query : ""}` });
  },
  getInventory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request({ url: `/api/inventory${query ? "?" + query : ""}` });
  },
  getSupplyDemand: () => request({ url: "/api/supply-demand" })
};
exports.api = api;
