"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_api = require("../../utils/api.js");
const _sfc_main = {
  __name: "index",
  setup(__props, { expose: __expose }) {
    __expose();
    const enterpriseList = common_vendor.ref([
      { code: "yihua", name: "宜化集团" },
      { code: "luxi", name: "鲁西化工" },
      { code: "jinzhengda", name: "金正大" }
    ]);
    const currentEnterprise = common_vendor.ref(null);
    const graphData = common_vendor.ref(null);
    const loading = common_vendor.ref(false);
    const coreNodes = common_vendor.computed(() => {
      var _a;
      if (!((_a = graphData.value) == null ? void 0 : _a.nodes))
        return [];
      return graphData.value.nodes.slice(0, 6).map((n) => ({
        name: n.name || n.label || n.id,
        type: n.type || n.category || "entity"
      }));
    });
    const relations = common_vendor.computed(() => {
      var _a;
      if (!((_a = graphData.value) == null ? void 0 : _a.edges))
        return [];
      return graphData.value.edges.slice(0, 8).map((e) => {
        var _a2, _b;
        return {
          source: ((_a2 = e.source) == null ? void 0 : _a2.name) || e.from || e.source,
          type: e.type || e.relation || "→",
          target: ((_b = e.target) == null ? void 0 : _b.name) || e.to || e.target
        };
      });
    });
    const metrics = common_vendor.computed(() => {
      var _a, _b;
      if (!graphData.value)
        return [];
      return [
        { label: "节点数量", value: ((_a = graphData.value.nodes) == null ? void 0 : _a.length) || 0 },
        { label: "关系数量", value: ((_b = graphData.value.edges) == null ? void 0 : _b.length) || 0 },
        { label: "核心实体", value: graphData.value.coreEntities || "-" },
        { label: "关联企业", value: graphData.value.relatedCompanies || "-" }
      ];
    });
    const onEnterpriseChange = async (e) => {
      const index = e.detail.value;
      currentEnterprise.value = enterpriseList.value[index];
      await fetchGraph();
    };
    const fetchGraph = async () => {
      if (!currentEnterprise.value)
        return;
      loading.value = true;
      try {
        const res = await utils_api.api.getKnowledgeGraph(currentEnterprise.value.code);
        graphData.value = res;
      } catch (e) {
        console.error("获取知识图谱失败:", e);
        common_vendor.index.showToast({ title: "获取知识图谱失败", icon: "none" });
      } finally {
        loading.value = false;
      }
    };
    const getNodeIcon = (type) => {
      const icons = {
        enterprise: "🏭",
        supplier: "📦",
        product: "🛢️",
        location: "📍",
        material: "⚗️",
        market: "📊",
        entity: "🔷"
      };
      return icons[type] || "🔷";
    };
    const getNodeTypeName = (type) => {
      const names = {
        enterprise: "企业",
        supplier: "供应商",
        product: "产品",
        location: "地点",
        material: "原料",
        market: "市场",
        entity: "实体"
      };
      return names[type] || type;
    };
    const goBack = () => common_vendor.index.navigateBack();
    common_vendor.onMounted(() => {
      currentEnterprise.value = enterpriseList.value[0];
      fetchGraph();
    });
    const __returned__ = { enterpriseList, currentEnterprise, graphData, loading, coreNodes, relations, metrics, onEnterpriseChange, fetchGraph, getNodeIcon, getNodeTypeName, goBack, ref: common_vendor.ref, computed: common_vendor.computed, onMounted: common_vendor.onMounted, get api() {
      return utils_api.api;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a;
  return common_vendor.e({
    a: common_vendor.o($setup.goBack),
    b: common_vendor.t(((_a = $setup.currentEnterprise) == null ? void 0 : _a.name) || "选择企业"),
    c: $setup.enterpriseList,
    d: common_vendor.o($setup.onEnterpriseChange),
    e: $setup.graphData
  }, $setup.graphData ? {
    f: common_vendor.f($setup.coreNodes, (node, i, i0) => {
      return {
        a: common_vendor.t($setup.getNodeIcon(node.type)),
        b: common_vendor.t(node.name),
        c: common_vendor.t($setup.getNodeTypeName(node.type)),
        d: i,
        e: common_vendor.n("type-" + node.type)
      };
    }),
    g: common_vendor.f($setup.relations, (rel, i, i0) => {
      return {
        a: common_vendor.t(rel.source),
        b: common_vendor.t(rel.type),
        c: common_vendor.t(rel.target),
        d: i
      };
    }),
    h: common_vendor.f($setup.metrics, (m, i, i0) => {
      return {
        a: common_vendor.t(m.value),
        b: common_vendor.t(m.label),
        c: i
      };
    })
  } : {}, {
    i: $setup.loading
  }, $setup.loading ? {} : {}, {
    j: !$setup.loading && !$setup.graphData
  }, !$setup.loading && !$setup.graphData ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-30e9e40d"], ["__file", "D:/trustwise/TrustWise-Pricing/miniprogram/src/pages/knowledge/index.vue"]]);
wx.createPage(MiniProgramPage);
