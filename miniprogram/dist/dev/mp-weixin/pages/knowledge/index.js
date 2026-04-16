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
    const showAllNodes = common_vendor.ref(false);
    const showAllLinks = common_vendor.ref(false);
    const canvasWidth = common_vendor.ref(350);
    const canvasHeight = common_vendor.ref(300);
    const enterpriseInfo = common_vendor.computed(() => {
      var _a;
      if (!((_a = graphData.value) == null ? void 0 : _a.nodes))
        return null;
      const enterpriseNode = graphData.value.nodes.find((n) => n.type === "Enterprise");
      return (enterpriseNode == null ? void 0 : enterpriseNode.properties) || null;
    });
    const displayNodes = common_vendor.computed(() => {
      var _a;
      if (!((_a = graphData.value) == null ? void 0 : _a.nodes))
        return [];
      return showAllNodes.value ? graphData.value.nodes : graphData.value.nodes.slice(0, 6);
    });
    const displayLinks = common_vendor.computed(() => {
      var _a;
      if (!((_a = graphData.value) == null ? void 0 : _a.links))
        return [];
      return showAllLinks.value ? graphData.value.links : graphData.value.links.slice(0, 8);
    });
    const supplyFactorCount = common_vendor.computed(() => {
      var _a;
      if (!((_a = graphData.value) == null ? void 0 : _a.nodes))
        return 0;
      return graphData.value.nodes.filter((n) => {
        var _a2;
        return ((_a2 = n.properties) == null ? void 0 : _a2.category) === "supply";
      }).length;
    });
    const demandFactorCount = common_vendor.computed(() => {
      var _a;
      if (!((_a = graphData.value) == null ? void 0 : _a.nodes))
        return 0;
      return graphData.value.nodes.filter((n) => {
        var _a2;
        return ((_a2 = n.properties) == null ? void 0 : _a2.category) === "demand";
      }).length;
    });
    const nodeMap = common_vendor.computed(() => {
      var _a;
      const map = /* @__PURE__ */ new Map();
      if ((_a = graphData.value) == null ? void 0 : _a.nodes) {
        graphData.value.nodes.forEach((n) => map.set(n.id, n));
      }
      return map;
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
        await common_vendor.nextTick$1();
        drawGraph();
      } catch (e) {
        console.error("获取知识图谱失败:", e);
        common_vendor.index.showToast({ title: "获取知识图谱失败", icon: "none" });
      } finally {
        loading.value = false;
      }
    };
    const getNodeCategory = (node) => {
      var _a;
      if (node.type === "Enterprise")
        return "enterprise";
      return ((_a = node.properties) == null ? void 0 : _a.category) || "external";
    };
    const getNodeIcon = (node) => {
      var _a;
      if (node.type === "Enterprise")
        return "🏭";
      const category = (_a = node.properties) == null ? void 0 : _a.category;
      const icons = {
        supply: "📦",
        demand: "🏭",
        external: "🌐",
        internal: "⚙️"
      };
      return icons[category] || "🔷";
    };
    const getNodeTypeName = (node) => {
      var _a;
      if (node.type === "Enterprise")
        return "企业";
      const category = (_a = node.properties) == null ? void 0 : _a.category;
      const names = {
        supply: "供给因子",
        demand: "需求因子",
        external: "外部因子",
        internal: "内部因子"
      };
      return names[category] || "因子";
    };
    const getNodeLabel = (id) => {
      const node = nodeMap.value.get(id);
      return (node == null ? void 0 : node.label) || (node == null ? void 0 : node.id) || id;
    };
    const getRelationType = (type) => {
      const types = {
        "HAS_FACTOR": "影响",
        "INFLUENCES": "作用于",
        "SUPPLIES_TO": "供应",
        "DEMANDS_FROM": "需求",
        "CORRELATES_WITH": "关联"
      };
      return types[type] || type;
    };
    const getTransportMode = (mode) => {
      const modes = { water: "水运", rail: "铁路", road: "公路" };
      return modes[mode] || mode;
    };
    const getStrategy = (strategy) => {
      const strategies = { aggressive: "激进型", moderate: "稳健型", conservative: "保守型" };
      return strategies[strategy] || strategy;
    };
    const showNodeDetail = (node) => {
      var _a, _b, _c;
      const info = [];
      info.push(`名称: ${node.label || node.id}`);
      info.push(`类型: ${getNodeTypeName(node)}`);
      if ((_a = node.properties) == null ? void 0 : _a.baseWeight) {
        info.push(`权重: ${(node.properties.baseWeight * 100).toFixed(1)}%`);
      }
      if ((_b = node.properties) == null ? void 0 : _b.trend) {
        info.push(`趋势: ${node.properties.trend === "up" ? "上升" : node.properties.trend === "down" ? "下降" : "稳定"}`);
      }
      if ((_c = node.properties) == null ? void 0 : _c.description) {
        info.push(`描述: ${node.properties.description}`);
      }
      common_vendor.index.showModal({
        title: "节点详情",
        content: info.join("\n"),
        showCancel: false
      });
    };
    const drawGraph = () => {
      var _a;
      if (!((_a = graphData.value) == null ? void 0 : _a.nodes) || !graphData.value.nodes.length)
        return;
      const ctx = common_vendor.index.createCanvasContext("graphCanvas");
      const width = canvasWidth.value;
      const height = canvasHeight.value;
      const centerX = width / 2;
      const centerY = height / 2;
      ctx.setFillStyle("#0f172a");
      ctx.fillRect(0, 0, width, height);
      const nodes = graphData.value.nodes;
      const links = graphData.value.links || [];
      const positions = [];
      const enterpriseNode = nodes.find((n) => n.type === "Enterprise");
      const factorNodes = nodes.filter((n) => n.type !== "Enterprise");
      if (enterpriseNode) {
        positions.push({ id: enterpriseNode.id, x: centerX, y: centerY, r: 25 });
      }
      const angleStep = 2 * Math.PI / Math.max(factorNodes.length, 1);
      const radius = Math.min(width, height) * 0.35;
      factorNodes.forEach((node, i) => {
        const angle = angleStep * i - Math.PI / 2;
        positions.push({
          id: node.id,
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
          r: 15
        });
      });
      const getPos = (id) => positions.find((p) => p.id === id) || { x: 0, y: 0 };
      ctx.setStrokeStyle("rgba(148, 163, 184, 0.3)");
      ctx.setLineWidth(1);
      links.forEach((link) => {
        const source = getPos(link.source);
        const target = getPos(link.target);
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      });
      positions.forEach((pos, i) => {
        const node = nodes.find((n) => n.id === pos.id);
        const category = getNodeCategory(node);
        const colors = {
          enterprise: "#06b6d4",
          supply: "#10b981",
          demand: "#f59e0b",
          external: "#8b5cf6",
          internal: "#ec4899"
        };
        const color = colors[category] || "#64748b";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pos.r, 0, 2 * Math.PI);
        ctx.setFillStyle(color);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pos.r, 0, 2 * Math.PI);
        ctx.setStrokeStyle("rgba(255, 255, 255, 0.3)");
        ctx.setLineWidth(2);
        ctx.stroke();
      });
      ctx.draw();
    };
    const onTouchStart = () => {
    };
    const onTouchMove = () => {
    };
    const onTouchEnd = () => {
    };
    const goBack = () => common_vendor.index.navigateBack();
    common_vendor.onMounted(() => {
      currentEnterprise.value = enterpriseList.value[0];
      fetchGraph();
    });
    const __returned__ = { enterpriseList, currentEnterprise, graphData, loading, showAllNodes, showAllLinks, canvasWidth, canvasHeight, enterpriseInfo, displayNodes, displayLinks, supplyFactorCount, demandFactorCount, nodeMap, onEnterpriseChange, fetchGraph, getNodeCategory, getNodeIcon, getNodeTypeName, getNodeLabel, getRelationType, getTransportMode, getStrategy, showNodeDetail, drawGraph, onTouchStart, onTouchMove, onTouchEnd, goBack, ref: common_vendor.ref, computed: common_vendor.computed, onMounted: common_vendor.onMounted, watch: common_vendor.watch, nextTick: common_vendor.nextTick$1, get api() {
      return utils_api.api;
    } };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a, _b, _c, _d, _e, _f;
  return common_vendor.e({
    a: common_vendor.o($setup.goBack),
    b: common_vendor.t(((_a = $setup.currentEnterprise) == null ? void 0 : _a.name) || "选择企业"),
    c: $setup.enterpriseList,
    d: common_vendor.o($setup.onEnterpriseChange),
    e: $setup.graphData && $setup.graphData.nodes && $setup.graphData.nodes.length
  }, $setup.graphData && $setup.graphData.nodes && $setup.graphData.nodes.length ? {
    f: common_vendor.o($setup.onTouchStart),
    g: common_vendor.o($setup.onTouchMove),
    h: common_vendor.o($setup.onTouchEnd)
  } : {}, {
    i: $setup.graphData && $setup.graphData.nodes && $setup.graphData.nodes.length
  }, $setup.graphData && $setup.graphData.nodes && $setup.graphData.nodes.length ? common_vendor.e({
    j: common_vendor.t($setup.graphData.nodes.length),
    k: common_vendor.f($setup.displayNodes, (node, i, i0) => {
      var _a2, _b2;
      return common_vendor.e({
        a: common_vendor.t($setup.getNodeIcon(node)),
        b: common_vendor.t(node.label || node.id),
        c: common_vendor.t($setup.getNodeTypeName(node)),
        d: (_a2 = node.properties) == null ? void 0 : _a2.baseWeight
      }, ((_b2 = node.properties) == null ? void 0 : _b2.baseWeight) ? {
        e: common_vendor.t((node.properties.baseWeight * 100).toFixed(0))
      } : {}, {
        f: i,
        g: common_vendor.n("type-" + $setup.getNodeCategory(node)),
        h: common_vendor.o(($event) => $setup.showNodeDetail(node), i)
      });
    }),
    l: $setup.graphData.nodes.length > 6
  }, $setup.graphData.nodes.length > 6 ? {
    m: common_vendor.t($setup.showAllNodes ? "收起" : `展开全部 (${$setup.graphData.nodes.length}个)`),
    n: common_vendor.o(($event) => $setup.showAllNodes = !$setup.showAllNodes)
  } : {}, {
    o: common_vendor.t(((_b = $setup.graphData.links) == null ? void 0 : _b.length) || 0),
    p: common_vendor.f($setup.displayLinks, (link, i, i0) => {
      return common_vendor.e({
        a: common_vendor.t($setup.getNodeLabel(link.source)),
        b: common_vendor.t($setup.getRelationType(link.type)),
        c: common_vendor.t($setup.getNodeLabel(link.target)),
        d: link.weight
      }, link.weight ? {
        e: common_vendor.t((link.weight * 100).toFixed(0))
      } : {}, {
        f: i
      });
    }),
    q: (((_c = $setup.graphData.links) == null ? void 0 : _c.length) || 0) > 8
  }, (((_d = $setup.graphData.links) == null ? void 0 : _d.length) || 0) > 8 ? {
    r: common_vendor.t($setup.showAllLinks ? "收起" : `展开全部 (${$setup.graphData.links.length}条)`),
    s: common_vendor.o(($event) => $setup.showAllLinks = !$setup.showAllLinks)
  } : {}, {
    t: common_vendor.t(((_e = $setup.graphData.nodes) == null ? void 0 : _e.length) || 0),
    v: common_vendor.t(((_f = $setup.graphData.links) == null ? void 0 : _f.length) || 0),
    w: common_vendor.t($setup.supplyFactorCount),
    x: common_vendor.t($setup.demandFactorCount),
    y: $setup.enterpriseInfo
  }, $setup.enterpriseInfo ? common_vendor.e({
    z: $setup.enterpriseInfo.location
  }, $setup.enterpriseInfo.location ? {
    A: common_vendor.t($setup.enterpriseInfo.location)
  } : {}, {
    B: $setup.enterpriseInfo.capacity
  }, $setup.enterpriseInfo.capacity ? {
    C: common_vendor.t($setup.enterpriseInfo.capacity)
  } : {}, {
    D: $setup.enterpriseInfo.transportMode
  }, $setup.enterpriseInfo.transportMode ? {
    E: common_vendor.t($setup.getTransportMode($setup.enterpriseInfo.transportMode))
  } : {}, {
    F: $setup.enterpriseInfo.inventoryStrategy
  }, $setup.enterpriseInfo.inventoryStrategy ? {
    G: common_vendor.t($setup.getStrategy($setup.enterpriseInfo.inventoryStrategy))
  } : {}, {
    H: $setup.enterpriseInfo.description
  }, $setup.enterpriseInfo.description ? {
    I: common_vendor.t($setup.enterpriseInfo.description)
  } : {}) : {}) : {}, {
    J: $setup.loading
  }, $setup.loading ? {} : {}, {
    K: !$setup.loading && (!$setup.graphData || !$setup.graphData.nodes || !$setup.graphData.nodes.length)
  }, !$setup.loading && (!$setup.graphData || !$setup.graphData.nodes || !$setup.graphData.nodes.length) ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-30e9e40d"], ["__file", "D:/trustwise/TrustWise-Pricing/miniprogram/src/pages/knowledge/index.vue"]]);
wx.createPage(MiniProgramPage);
