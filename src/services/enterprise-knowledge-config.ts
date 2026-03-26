/**
 * 企业知识图谱差异化配置
 *
 * 核心逻辑：
 * 1. 供应端因素：三家差异不大（国际采购为主）
 * 2. 需求因素：各企业有显著差异（产能、客户结构、产品定位）
 * 3. 库存信息：各企业库存策略不同
 *
 * 基于以上三点，生成差异化的影响因子权重
 */

// ==================== 企业常量与类型 ====================

/** 企业代码常量 - 单一数据源 */
export const ENTERPRISE_CODES = ["yihua", "luxi", "jinzhengda"] as const

/** 企业代码类型 */
export type EnterpriseCode = typeof ENTERPRISE_CODES[number]

/** 企业颜色配置 */
export const ENTERPRISE_COLORS: Record<EnterpriseCode, string> = {
  yihua: "#06b6d4",    // cyan
  luxi: "#8b5cf6",     // violet
  jinzhengda: "#f59e0b", // amber
}

/** 根据企业代码获取企业名称 */
export function getEnterpriseNameByCode(code: string): string {
  const config = ENTERPRISE_CONFIGS.find(e => e.code === code)
  return config?.name || code
}

/** 根据企业代码获取企业颜色 */
export function getEnterpriseColorByCode(code: string): string {
  return ENTERPRISE_COLORS[code as EnterpriseCode] || "#06b6d4"
}

// ==================== 企业基础信息 ====================

export interface EnterpriseConfig {
  code: string
  name: string
  location: string
  province: string
  capacity: number // 万吨/年
  transportMode: "water" | "rail" | "road" // 主要运输方式
  mainProducts: string[]
  customerRegions: string[]
  inventoryStrategy: "aggressive" | "moderate" | "conservative"
  description: string
  // UI 显示配置
  tailwindColor: string // Tailwind 颜色名 (cyan, violet, amber)
  shortDescription: string // 简短描述用于侧边栏
  // 价格预测配置
  priceConfig: {
    basePrice: number // 基准价格
    volatility: number // 波动幅度
    trend: number // 趋势
    modelAccuracy: number // 模型准确率
  }
  // 库存详细信息
  inventory: {
    currentStock: number // 当前库存（吨）
    maxCapacity: number // 最大仓储能力（吨）
    safetyDays: number // 安全库存天数
    avgConsumption: number // 日均消耗量（吨/天）
    turnoverRate: number // 年周转次数
    lastPurchaseDate: string // 上次采购日期
    nextPurchaseDate: string // 预计下次采购日期
    supplierCount: number // 供应商数量
    portDistance: number // 距离最近港口距离（公里）
  }
}

export const ENTERPRISE_CONFIGS: EnterpriseConfig[] = [
  {
    code: "yihua",
    name: "HX集团",
    location: "华中地区",
    province: "华中",
    capacity: 120,
    transportMode: "water",
    mainProducts: ["磷酸一铵", "磷酸二铵", "尿素"],
    customerRegions: ["华中", "华南", "西南"],
    inventoryStrategy: "moderate",
    description: "国内最大硫磺制酸企业之一，依托水运优势，运输成本较低",
    tailwindColor: "cyan",
    shortDescription: "硫磺产能约120万吨/年",
    priceConfig: { basePrice: 985, volatility: 35, trend: 0.3, modelAccuracy: 94.2 },
    inventory: {
      currentStock: 8500,
      maxCapacity: 15000,
      safetyDays: 25,
      avgConsumption: 320,
      turnoverRate: 8,
      lastPurchaseDate: "2026-03-15",
      nextPurchaseDate: "2026-04-10",
      supplierCount: 5,
      portDistance: 50, // 华中港口
    },
  },
  {
    code: "luxi",
    name: "HY集团",
    location: "华北地区",
    province: "华北",
    capacity: 95,
    transportMode: "rail",
    mainProducts: ["复合肥", "尿素", "甲醇"],
    customerRegions: ["华北", "东北", "西北"],
    inventoryStrategy: "conservative",
    description: "华北地区主要化肥企业，依赖铁路运输，库存策略偏保守",
    tailwindColor: "violet",
    shortDescription: "华北地区大型化工企业",
    priceConfig: { basePrice: 972, volatility: 28, trend: 0.15, modelAccuracy: 92.8 },
    inventory: {
      currentStock: 7800,
      maxCapacity: 12000,
      safetyDays: 35, // 保守策略，安全库存天数高
      avgConsumption: 260,
      turnoverRate: 6,
      lastPurchaseDate: "2026-03-10",
      nextPurchaseDate: "2026-04-05",
      supplierCount: 4,
      portDistance: 450, // 华北港口
    },
  },
  {
    code: "jinzhengda",
    name: "TC集团",
    location: "华东地区",
    province: "华东",
    capacity: 80,
    transportMode: "road",
    mainProducts: ["复合肥", "缓控释肥", "水溶肥"],
    customerRegions: ["华东", "华南", "出口"],
    inventoryStrategy: "aggressive",
    description: "专注于高端复合肥，出口占比高，库存周转快",
    tailwindColor: "amber",
    shortDescription: "化肥行业龙头",
    priceConfig: { basePrice: 958, volatility: 32, trend: 0.25, modelAccuracy: 93.5 },
    inventory: {
      currentStock: 4200,
      maxCapacity: 8000,
      safetyDays: 15, // 激进策略，安全库存天数低
      avgConsumption: 280,
      turnoverRate: 12, // 高周转
      lastPurchaseDate: "2026-03-20",
      nextPurchaseDate: "2026-04-01",
      supplierCount: 6,
      portDistance: 200, // 日照港
    },
  },
]

// ==================== 影响因子定义 ====================

export interface FactorDefinition {
  id: string
  name: string
  category: "supply" | "demand" | "inventory" | "external" | "internal"
  subCategory?: string
  description: string
  baseWeight: number
  trend: "up" | "down" | "stable"
  volatility: "high" | "medium" | "low"
}

export const FACTOR_DEFINITIONS: FactorDefinition[] = [
  // 供应端因素（企业间差异小）
  {
    id: "international_price",
    name: "国际硫磺价格",
    category: "supply",
    subCategory: "raw_material",
    description: "中东、俄罗斯等主要硫磺出口地的离岸价格",
    baseWeight: 25,
    trend: "up",
    volatility: "high",
  },
  {
    id: "shipping_freight",
    name: "海运运费",
    category: "supply",
    subCategory: "logistics",
    description: "中东至中国航线的海运费用",
    baseWeight: 8,
    trend: "up",
    volatility: "high",
  },
  {
    id: "port_congestion",
    name: "港口拥堵",
    category: "supply",
    subCategory: "logistics",
    description: "主要卸货港口的拥堵状况",
    baseWeight: 5,
    trend: "stable",
    volatility: "medium",
  },
  {
    id: "supplier_reliability",
    name: "供应商可靠性",
    category: "supply",
    subCategory: "procurement",
    description: "主要供应商的履约能力和稳定性",
    baseWeight: 4,
    trend: "stable",
    volatility: "low",
  },

  // 需求端因素（企业间差异大）
  {
    id: "fertilizer_demand",
    name: "化肥市场需求",
    category: "demand",
    subCategory: "downstream",
    description: "下游化肥行业的整体需求状况",
    baseWeight: 20,
    trend: "stable",
    volatility: "medium",
  },
  {
    id: "crop_planting_area",
    name: "农作物种植面积",
    category: "demand",
    subCategory: "agriculture",
    description: "主要销区的农作物种植规模",
    baseWeight: 8,
    trend: "down",
    volatility: "low",
  },
  {
    id: "fertilizer_price",
    name: "化肥价格",
    category: "demand",
    subCategory: "downstream",
    description: "磷酸一铵、二铵等化肥产品的市场价格",
    baseWeight: 10,
    trend: "up",
    volatility: "high",
  },
  {
    id: "export_demand",
    name: "出口需求",
    category: "demand",
    subCategory: "international",
    description: "海外市场对中国化肥的需求",
    baseWeight: 6,
    trend: "up",
    volatility: "high",
  },
  {
    id: "seasonal_factor",
    name: "季节性因素",
    category: "demand",
    subCategory: "timing",
    description: "春耕、秋收等农时季节对需求的影响",
    baseWeight: 5,
    trend: "stable",
    volatility: "medium",
  },

  // 库存因素（企业差异大）
  {
    id: "inventory_level",
    name: "库存水平",
    category: "inventory",
    subCategory: "stock",
    description: "企业当前硫磺库存量",
    baseWeight: 8,
    trend: "down",
    volatility: "medium",
  },
  {
    id: "safety_stock_ratio",
    name: "安全库存比例",
    category: "inventory",
    subCategory: "strategy",
    description: "企业设定的安全库存天数",
    baseWeight: 5,
    trend: "stable",
    volatility: "low",
  },
  {
    id: "storage_cost",
    name: "仓储成本",
    category: "inventory",
    subCategory: "cost",
    description: "硫磺储存的场地、管理费用",
    baseWeight: 3,
    trend: "up",
    volatility: "low",
  },

  // 外部因素
  {
    id: "environmental_policy",
    name: "环保政策",
    category: "external",
    subCategory: "regulation",
    description: "环保法规对生产的影响",
    baseWeight: 12,
    trend: "up",
    volatility: "low",
  },
  {
    id: "exchange_rate",
    name: "汇率波动",
    category: "external",
    subCategory: "financial",
    description: "人民币兑美元汇率变化",
    baseWeight: 8,
    trend: "stable",
    volatility: "high",
  },
  {
    id: "trade_policy",
    name: "贸易政策",
    category: "external",
    subCategory: "regulation",
    description: "进出口关税、配额等贸易政策",
    baseWeight: 5,
    trend: "stable",
    volatility: "medium",
  },

  // 内部因素
  {
    id: "production_capacity",
    name: "产能利用率",
    category: "internal",
    subCategory: "operation",
    description: "企业生产装置的开工率",
    baseWeight: 6,
    trend: "stable",
    volatility: "medium",
  },
  {
    id: "transport_cost",
    name: "国内运输成本",
    category: "internal",
    subCategory: "logistics",
    description: "从港口到工厂的运输费用",
    baseWeight: 10,
    trend: "up",
    volatility: "medium",
  },
  {
    id: "production_efficiency",
    name: "生产效率",
    category: "internal",
    subCategory: "operation",
    description: "硫磺制酸的转化效率",
    baseWeight: 4,
    trend: "stable",
    volatility: "low",
  },
]

// ==================== 差异化权重计算 ====================

export interface EnterpriseFactorWeight {
  factorId: string
  factorName: string
  category: string
  weight: number
  trend: string
  reason: string // 权重差异的原因说明
}

/**
 * 根据企业特征计算差异化的影响因子权重
 */
export function calculateEnterpriseFactorWeights(
  enterprise: EnterpriseConfig
): EnterpriseFactorWeight[] {
  const weights: EnterpriseFactorWeight[] = []

  for (const factor of FACTOR_DEFINITIONS) {
    let adjustedWeight = factor.baseWeight
    let reason = ""

    // 根据企业特征调整权重

    // 1. 运输方式对运输成本的影响
    if (factor.id === "transport_cost") {
      if (enterprise.transportMode === "water") {
        adjustedWeight = factor.baseWeight - 4 // 水运成本最低
        reason = `${enterprise.name}依托水运优势，国内运输成本较低`
      } else if (enterprise.transportMode === "rail") {
        adjustedWeight = factor.baseWeight + 2 // 铁路运输中等
        reason = `${enterprise.name}依赖铁路运输，运输成本中等偏高`
      } else {
        adjustedWeight = factor.baseWeight + 4 // 公路运输最高
        reason = `${enterprise.name}以公路运输为主，运输成本较高`
      }
    }

    // 2. 产能对库存策略的影响
    if (factor.id === "inventory_level") {
      if (enterprise.inventoryStrategy === "aggressive") {
        adjustedWeight = factor.baseWeight - 3 // 库存周转快，压力小
        reason = `${enterprise.name}库存周转快，库存压力相对较小`
      } else if (enterprise.inventoryStrategy === "conservative") {
        adjustedWeight = factor.baseWeight + 4 // 库存保守，更关注
        reason = `${enterprise.name}库存策略保守，需更关注库存变化`
      } else {
        reason = `${enterprise.name}库存策略稳健`
      }
    }

    // 3. 安全库存比例
    if (factor.id === "safety_stock_ratio") {
      if (enterprise.inventoryStrategy === "conservative") {
        adjustedWeight = factor.baseWeight + 3
        reason = `${enterprise.name}对安全库存要求更高`
      } else if (enterprise.inventoryStrategy === "aggressive") {
        adjustedWeight = factor.baseWeight - 2
        reason = `${enterprise.name}安全库存要求较低`
      } else {
        reason = "标准安全库存管理"
      }
    }

    // 4. 出口需求对有出口业务的企业更重要
    if (factor.id === "export_demand") {
      if (enterprise.customerRegions.includes("出口")) {
        adjustedWeight = factor.baseWeight + 6
        reason = `${enterprise.name}出口业务占比高，出口需求影响大`
      } else {
        adjustedWeight = factor.baseWeight - 4
        reason = `${enterprise.name}以内销为主，出口需求影响较小`
      }
    }

    // 5. 海运运费对水运企业更敏感
    if (factor.id === "shipping_freight") {
      if (enterprise.transportMode === "water") {
        adjustedWeight = factor.baseWeight + 4
        reason = `${enterprise.name}主要依靠水运，对海运价格更敏感`
      } else {
        adjustedWeight = factor.baseWeight - 2
        reason = "陆运为主，海运价格影响较小"
      }
    }

    // 6. 化肥需求根据客户区域调整
    if (factor.id === "fertilizer_demand") {
      if (enterprise.capacity >= 100) {
        adjustedWeight = factor.baseWeight + 5 // 产能大的企业对需求更敏感
        reason = `产能大，市场需求变化对${enterprise.name}影响更显著`
      }
    }

    // 7. 汇率对进口比例高的企业影响更大
    if (factor.id === "exchange_rate") {
      if (enterprise.customerRegions.includes("出口")) {
        adjustedWeight = factor.baseWeight + 3
        reason = `${enterprise.name}有出口业务，汇率双向影响`
      } else {
        reason = "进口成本受汇率影响"
      }
    }

    // 8. 环保政策对不同地区企业影响不同
    if (factor.id === "environmental_policy") {
      if (enterprise.province === "华北" || enterprise.province === "华东") {
        adjustedWeight = factor.baseWeight + 4
        reason = "华北、华东地区环保要求严格，政策影响较大"
      } else {
        reason = "标准环保要求"
      }
    }

    // 9. 产能利用率
    if (factor.id === "production_capacity") {
      if (enterprise.capacity >= 100) {
        adjustedWeight = factor.baseWeight + 2
        reason = "产能大，开工率波动影响更大"
      }
    }

    // 10. 季节性因素
    if (factor.id === "seasonal_factor") {
      const hasSouthRegion = enterprise.customerRegions.some(r =>
        ["华南", "西南", "华中"].includes(r)
      )
      if (hasSouthRegion) {
        adjustedWeight = factor.baseWeight + 2
        reason = "南方销区季节性需求明显"
      }
    }

    // 如果没有特殊调整，使用基础原因
    if (!reason) {
      reason = `${factor.name}对采购决策的${factor.volatility === "high" ? "高" : factor.volatility === "medium" ? "中等" : "稳定"}影响`
    }

    weights.push({
      factorId: factor.id,
      factorName: factor.name,
      category: factor.category,
      weight: Math.max(1, Math.round(adjustedWeight)), // 确保权重为正整数
      trend: factor.trend,
      reason,
    })
  }

  // 归一化权重，使其总和为100
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0)
  weights.forEach(w => {
    w.weight = Math.round((w.weight / totalWeight) * 100)
  })

  // 按权重降序排列
  weights.sort((a, b) => b.weight - a.weight)

  return weights
}

// ==================== 因子间关系定义 ====================

export interface FactorRelation {
  source: string
  target: string
  relationType: "INFLUENCES" | "CORRELATES_WITH"
  weight: number
  description: string
}

export const FACTOR_RELATIONS: FactorRelation[] = [
  // 国际价格传导链
  {
    source: "international_price",
    target: "transport_cost",
    relationType: "INFLUENCES",
    weight: 0.7,
    description: "国际价格上涨时，企业可能选择更经济的运输方式",
  },
  {
    source: "exchange_rate",
    target: "international_price",
    relationType: "INFLUENCES",
    weight: 0.8,
    description: "人民币贬值会增加进口成本",
  },
  {
    source: "shipping_freight",
    target: "transport_cost",
    relationType: "INFLUENCES",
    weight: 0.6,
    description: "海运费用上涨会推高总运输成本",
  },

  // 需求传导链
  {
    source: "fertilizer_demand",
    target: "fertilizer_price",
    relationType: "INFLUENCES",
    weight: 0.9,
    description: "化肥需求增加会推高化肥价格",
  },
  {
    source: "crop_planting_area",
    target: "fertilizer_demand",
    relationType: "INFLUENCES",
    weight: 0.7,
    description: "种植面积扩大增加化肥需求",
  },
  {
    source: "export_demand",
    target: "fertilizer_demand",
    relationType: "INFLUENCES",
    weight: 0.6,
    description: "出口需求是化肥需求的重要组成部分",
  },
  {
    source: "seasonal_factor",
    target: "fertilizer_demand",
    relationType: "INFLUENCES",
    weight: 0.8,
    description: "春耕季节化肥需求显著增加",
  },

  // 库存传导链
  {
    source: "inventory_level",
    target: "international_price",
    relationType: "INFLUENCES",
    weight: 0.5,
    description: "库存低时更急于采购，可能接受更高价格",
  },
  {
    source: "safety_stock_ratio",
    target: "inventory_level",
    relationType: "INFLUENCES",
    weight: 0.7,
    description: "安全库存要求高会提高库存水平",
  },

  // 政策传导链
  {
    source: "environmental_policy",
    target: "production_capacity",
    relationType: "INFLUENCES",
    weight: 0.6,
    description: "环保限产会影响开工率",
  },
  {
    source: "trade_policy",
    target: "export_demand",
    relationType: "INFLUENCES",
    weight: 0.7,
    description: "出口关税政策影响出口竞争力",
  },

  // 相关性关系
  {
    source: "fertilizer_price",
    target: "international_price",
    relationType: "CORRELATES_WITH",
    weight: 0.85,
    description: "化肥价格与硫磺价格高度相关",
  },
  {
    source: "production_efficiency",
    target: "production_capacity",
    relationType: "CORRELATES_WITH",
    weight: 0.6,
    description: "效率提升可以提高有效产能",
  },
]

// ==================== 生成完整的知识图谱配置 ====================

export function generateEnterpriseKnowledgeGraphConfig() {
  const allEnterpriseWeights: Record<string, EnterpriseFactorWeight[]> = {}

  for (const enterprise of ENTERPRISE_CONFIGS) {
    allEnterpriseWeights[enterprise.code] = calculateEnterpriseFactorWeights(enterprise)
  }

  return {
    enterprises: ENTERPRISE_CONFIGS,
    factors: FACTOR_DEFINITIONS,
    enterpriseWeights: allEnterpriseWeights,
    relations: FACTOR_RELATIONS,
  }
}