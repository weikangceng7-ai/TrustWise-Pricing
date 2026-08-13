// 硫磺督价与采购智能决策知识图谱数据 - 第一阶段：市场资讯库、企业经验库、制度规则库
export const KNOWLEDGE_DATA = {
  // 核心实体：硫磺价格
  core: [
    { id: "sulfur-price", name: "硫磺价格", description: "核心预测目标，受供需、成本、政策等多因素影响" },
  ],

  // 数据源（隐藏）
  dataSources: [],

  // 市场资讯库
  marketNews: [
    { id: "supply-factor", name: "供应端因素", category: "supply", description: "国内产量、进口量、港口库存" },
    { id: "demand-factor", name: "需求端因素", category: "demand", description: "磷肥需求、硫酸需求、化工需求" },
    { id: "cost-factor", name: "成本因素", category: "cost", description: "原油价格、天然气价格、运输成本" },
    { id: "macro-factor", name: "宏观因素", category: "macro", description: "汇率波动、经济周期、贸易政策" },
    { id: "international", name: "国际市场", category: "international", description: "中东硫磺价格、国际运费、海外需求" },
    { id: "inventory", name: "港口库存", category: "inventory", description: "主要港口硫磺库存水平" },
    { id: "seasonal", name: "季节性规律", category: "seasonal", description: "春耕备肥、淡旺季交替" },
    { id: "news-event", name: "市场资讯", category: "news", description: "行业新闻、政策公告、突发事件" },
    // 新增价格预测相关因素
    { id: "crude-oil", name: "原油价格", category: "upstream", description: "WTI、布伦特原油期货价格，硫磺生产成本基准" },
    { id: "natural-gas", name: "天然气价格", category: "upstream", description: "天然气是硫磺主要来源，影响供应成本" },
    { id: "usd-cny", name: "美元汇率", category: "macro", description: "人民币汇率影响进口成本" },
    { id: "freight", name: "海运运费", category: "logistics", description: "BDI指数、航线运费影响到岸价格" },
    { id: "fertilizer", name: "磷肥市场", category: "downstream", description: "磷酸一铵、二铵价格反映下游需求" },
    { id: "sulfuric-acid", name: "硫酸市场", category: "downstream", description: "硫酸价格影响硫磺需求" },
  ],

  // 企业经验库
  enterpriseExp: [
    { id: "purchase-record", name: "采购历史", description: "历史采购时机、价格、数量记录" },
    { id: "price-judgment", name: "价格研判经验", description: "专家经验、趋势判断、拐点识别" },
    { id: "inventory-strategy", name: "库存策略", description: "安全库存、备货周期、库存预警" },
    { id: "supplier-relation", name: "供应商关系", description: "供应商资质、合作历史、信用评估" },
    { id: "risk-case", name: "风险案例", description: "历史价格波动案例、应对措施" },
  ],

  // 制度规则库
  rules: [
    { id: "procurement-rule", name: "采购制度", description: "采购流程、审批权限、供应商管理" },
    { id: "quality-standard", name: "质量标准", description: "硫磺品质要求、检验标准" },
    { id: "contract-rule", name: "合同规则", description: "定价机制、结算方式、违约条款" },
    { id: "risk-policy", name: "风控政策", description: "价格预警阈值、应对预案" },
    { id: "storage-rule", name: "仓储规范", description: "存储条件、安全要求、损耗标准" },
  ],

  // 预测应用
  applications: [
    { id: "short-forecast", name: "短期预测", description: "1-4周价格趋势预测" },
    { id: "medium-forecast", name: "中期预测", description: "1-3个月价格走势研判" },
    { id: "decision-support", name: "采购决策", description: "采购时机、批量建议" },
    { id: "risk-warning", name: "风险预警", description: "价格异常波动预警" },
  ],

  // 关系定义
  relations: [
    // 核心关系：各因素影响硫磺价格
    { source: "supply-factor", target: "sulfur-price", type: "影响", weight: 0.9 },
    { source: "demand-factor", target: "sulfur-price", type: "影响", weight: 0.85 },
    { source: "cost-factor", target: "sulfur-price", type: "影响", weight: 0.8 },
    { source: "macro-factor", target: "sulfur-price", type: "影响", weight: 0.6 },
    { source: "international", target: "sulfur-price", type: "影响", weight: 0.75 },
    { source: "inventory", target: "sulfur-price", type: "影响", weight: 0.7 },
    { source: "seasonal", target: "sulfur-price", type: "影响", weight: 0.5 },
    { source: "news-event", target: "sulfur-price", type: "影响", weight: 0.4 },

    // 新增因素影响硫磺价格
    { source: "crude-oil", target: "cost-factor", type: "影响", weight: 0.9 },
    { source: "natural-gas", target: "supply-factor", type: "影响", weight: 0.85 },
    { source: "usd-cny", target: "international", type: "影响", weight: 0.8 },
    { source: "freight", target: "international", type: "影响", weight: 0.75 },
    { source: "fertilizer", target: "demand-factor", type: "影响", weight: 0.85 },
    { source: "sulfuric-acid", target: "demand-factor", type: "影响", weight: 0.7 },

    // 因素间的关联
    { source: "international", target: "supply-factor", type: "关联", weight: 0.6 },
    { source: "cost-factor", target: "international", type: "关联", weight: 0.5 },
    { source: "inventory", target: "supply-factor", type: "关联", weight: 0.6 },
    { source: "seasonal", target: "demand-factor", type: "关联", weight: 0.7 },
    { source: "macro-factor", target: "cost-factor", type: "关联", weight: 0.5 },
    { source: "news-event", target: "macro-factor", type: "关联", weight: 0.4 },

    // 企业经验支撑价格研判
    { source: "purchase-record", target: "sulfur-price", type: "参考", weight: 0.5 },
    { source: "price-judgment", target: "sulfur-price", type: "研判", weight: 0.6 },
    { source: "inventory-strategy", target: "decision-support", type: "支撑", weight: 0.7 },
    { source: "risk-case", target: "risk-warning", type: "参考", weight: 0.6 },
    { source: "supplier-relation", target: "decision-support", type: "支撑", weight: 0.5 },

    // 制度规则约束
    { source: "procurement-rule", target: "decision-support", type: "约束", weight: 0.8 },
    { source: "risk-policy", target: "risk-warning", type: "约束", weight: 0.9 },
    { source: "quality-standard", target: "purchase-record", type: "规范", weight: 0.6 },
    { source: "contract-rule", target: "supplier-relation", type: "规范", weight: 0.5 },
    { source: "storage-rule", target: "inventory-strategy", type: "规范", weight: 0.5 },

    // 预测应用输出
    { source: "sulfur-price", target: "short-forecast", type: "预测", weight: 1.0 },
    { source: "sulfur-price", target: "medium-forecast", type: "预测", weight: 1.0 },
    { source: "short-forecast", target: "decision-support", type: "支撑", weight: 0.8 },
    { source: "medium-forecast", target: "decision-support", type: "支撑", weight: 0.7 },
    { source: "sulfur-price", target: "risk-warning", type: "监测", weight: 0.9 },
  ],

  // 价格影响权重 (总和100%)
  factorWeights: [
    { factor: "供应端因素", weight: 0.15, trend: "up" },
    { factor: "需求端因素", weight: 0.14, trend: "stable" },
    { factor: "原油价格", weight: 0.12, trend: "up" },
    { factor: "成本因素", weight: 0.11, trend: "up" },
    { factor: "磷肥市场", weight: 0.10, trend: "stable" },
    { factor: "国际市场", weight: 0.09, trend: "down" },
    { factor: "港口库存", weight: 0.08, trend: "stable" },
    { factor: "天然气价格", weight: 0.06, trend: "up" },
    { factor: "美元汇率", weight: 0.05, trend: "down" },
    { factor: "海运运费", weight: 0.04, trend: "stable" },
    { factor: "宏观因素", weight: 0.03, trend: "up" },
    { factor: "季节性规律", weight: 0.02, trend: "stable" },
    { factor: "市场资讯", weight: 0.01, trend: "down" },
  ],

  // 数据源说明 - 与 API route 保持同步
  dataSourceInfo: [
    {
      name: "AkShare",
      url: "https://akshare.akfamily.xyz/",
      description: "开源财经数据接口库",
      apiKey: "无需API密钥，直接调用",
      dataTypes: ["WTI原油期货", "布伦特原油期货", "美元人民币汇率", "波罗的海干散货指数"],
      endpoints: ["/api/external-data/akshare?type=oil|brent|usdcny|bdi"],
      status: "模拟数据，实际部署需配置Python环境"
    },
    {
      name: "FRED",
      url: "https://fred.stlouisfed.org/docs/api/fred/",
      description: "美联储经济数据 (Federal Reserve Economic Data)",
      apiKey: "需要申请API Key (FRED_API_KEY环境变量)",
      dataTypes: [
        "WTI原油价格 (DCOILWTICO)",
        "天然气价格 (DHHNGSP)",
        "联邦基金利率 (FEDFUNDS)",
        "失业率 (UNRATE)",
        "CPI (CPIAUCSL)",
        "人民币汇率 (DEXCHUS)",
        "欧元汇率 (DEXUSEU)",
        "GDP"
      ],
      endpoints: ["/api/external-data/fred?series_id=DCOILWTICO"],
      status: "未配置API Key时使用模拟数据"
    },
    {
      name: "GDELT",
      url: "https://www.gdeltproject.org/",
      description: "全球事件、情感和位置数据库",
      apiKey: "无需API密钥",
      dataTypes: [
        "硫磺新闻 (sulfur/sulphur)",
        "磷肥资讯 (fertilizer/phosphate)",
        "化工新闻",
        "事件时间线",
        "情感分析"
      ],
      endpoints: [
        "/api/external-data/gdelt?q=sulfur&mode=timeline",
        "/api/external-data/gdelt?q=sulfur&mode=search",
        "/api/external-data/gdelt?q=sulfur&mode=summary"
      ],
      status: "实时监测全球新闻事件"
    },
    {
      name: "隆众资讯",
      url: "https://www.oilchem.net/",
      description: "硫磺行业专业数据源",
      apiKey: "需要企业账号",
      dataTypes: ["硫磺价格", "港口库存", "供需数据", "行业报告"],
      endpoints: ["待接入"],
      status: "需要企业授权"
    }
  ]
}

export type NodeType = "core" | "dataSource" | "market" | "enterprise" | "rule" | "application"
export type RelationType = "影响" | "关联" | "参考" | "研判" | "支撑" | "约束" | "规范" | "预测" | "监测" | "提供"

// 节点实时数据映射配置 - 包含所有节点类型
export const NODE_REALTIME_DATA_CONFIG: Record<string, {
  dataType: 'price' | 'news' | 'weight' | 'source' | 'static'
  marketKey?: 'oil' | 'brent' | 'usdcny' | 'bdi' | 'news'
  title: string
}> = {
  // 上游原料
  'crude-oil': { dataType: 'price', marketKey: 'oil', title: 'WTI原油' },
  'natural-gas': { dataType: 'price', marketKey: 'brent', title: '布伦特原油(参考)' },
  'cost-factor': { dataType: 'price', marketKey: 'oil', title: '原油价格(成本基准)' },

  // 宏观因素
  'usd-cny': { dataType: 'price', marketKey: 'usdcny', title: '美元/人民币' },
  'macro-factor': { dataType: 'price', marketKey: 'usdcny', title: '汇率参考' },

  // 物流
  'freight': { dataType: 'price', marketKey: 'bdi', title: 'BDI指数' },
  'international': { dataType: 'price', marketKey: 'bdi', title: '海运运费参考' },

  // 新闻
  'news-event': { dataType: 'news', marketKey: 'news', title: '行业新闻' },

  // 数据源
  'akshare': { dataType: 'source', title: 'AkShare' },
  'fred': { dataType: 'source', title: 'FRED' },
  'gdelt': { dataType: 'source', title: 'GDELT' },
  'longzhong': { dataType: 'source', title: '隆众资讯' },

  // 核心节点
  'sulfur-price': { dataType: 'weight', title: '价格影响因子' },

  // 市场因素 - 显示静态信息
  'supply-factor': { dataType: 'static', title: '供应端分析' },
  'demand-factor': { dataType: 'static', title: '需求端分析' },
  'inventory': { dataType: 'static', title: '库存分析' },
  'seasonal': { dataType: 'static', title: '季节性规律' },
  'fertilizer': { dataType: 'static', title: '磷肥市场' },
  'sulfuric-acid': { dataType: 'static', title: '硫酸市场' },

  // 企业经验 - 显示静态信息
  'purchase-record': { dataType: 'static', title: '采购历史记录' },
  'price-judgment': { dataType: 'static', title: '价格研判经验' },
  'inventory-strategy': { dataType: 'static', title: '库存策略' },
  'supplier-relation': { dataType: 'static', title: '供应商关系' },
  'risk-case': { dataType: 'static', title: '风险案例' },

  // 制度规则 - 显示静态信息
  'procurement-rule': { dataType: 'static', title: '采购制度' },
  'quality-standard': { dataType: 'static', title: '质量标准' },
  'contract-rule': { dataType: 'static', title: '合同规则' },
  'risk-policy': { dataType: 'static', title: '风控政策' },
  'storage-rule': { dataType: 'static', title: '仓储规范' },

  // 预测应用 - 显示静态信息
  'short-forecast': { dataType: 'static', title: '短期预测' },
  'medium-forecast': { dataType: 'static', title: '中期预测' },
  'decision-support': { dataType: 'static', title: '采购决策' },
  'risk-warning': { dataType: 'static', title: '风险预警' },
}

export interface GraphNode {
  id: string
  name: string
  type: NodeType
  description: string
  category?: string
}

export interface GraphLink {
  source: string
  target: string
  type: RelationType
  weight: number
}
