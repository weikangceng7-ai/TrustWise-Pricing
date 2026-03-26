import { runCypher, withTransaction, checkNeo4jConnection } from "@/lib/neo4j"
import type { ManagedTransaction } from "neo4j-driver"
import {
  ENTERPRISE_CONFIGS,
  FACTOR_DEFINITIONS,
  FACTOR_RELATIONS,
  calculateEnterpriseFactorWeights,
  type EnterpriseFactorWeight,
} from "./enterprise-knowledge-config"

// 企业价格知识图谱服务

export interface EnterpriseNode {
  code: string
  name: string
  location: string
  capacity: number
  color: string
}

export interface FactorNode {
  id: string
  name: string
  category: "supply" | "demand" | "external" | "internal"
  weight: number
  trend: "up" | "down" | "stable"
}

export interface PriceNode {
  date: string
  actualPrice: number
  predictedPrice?: number
  confidence?: number
}

export interface RelationType {
  type: "INFLUENCES" | "SUPPLIES_TO" | "DEMANDS_FROM" | "CORRELATES_WITH" | "PREDICTED_BY"
  weight?: number
}

/**
 * 创建企业节点
 */
export async function createEnterpriseNode(enterprise: EnterpriseNode): Promise<boolean> {
  const query = `
    MERGE (e:Enterprise {code: $code})
    SET e.name = $name,
        e.location = $location,
        e.capacity = $capacity,
        e.color = $color,
        e.updatedAt = datetime()
    RETURN e
  `
  const result = await runCypher(query, enterprise as unknown as Record<string, unknown>)
  return result.length > 0
}

/**
 * 创建影响因子节点
 */
export async function createFactorNode(factor: FactorNode): Promise<boolean> {
  const query = `
    MERGE (f:Factor {id: $id})
    SET f.name = $name,
        f.category = $category,
        f.weight = $weight,
        f.trend = $trend,
        f.updatedAt = datetime()
    RETURN f
  `
  const result = await runCypher(query, factor as unknown as Record<string, unknown>)
  return result.length > 0
}

/**
 * 创建企业-因子关系
 */
export async function createEnterpriseFactorRelation(
  enterpriseCode: string,
  factorId: string,
  weight: number
): Promise<boolean> {
  const query = `
    MATCH (e:Enterprise {code: $enterpriseCode})
    MATCH (f:Factor {id: $factorId})
    MERGE (e)-[r:HAS_FACTOR]->(f)
    SET r.weight = $weight
    RETURN r
  `
  const result = await runCypher(query, { enterpriseCode, factorId, weight })
  return result.length > 0
}

/**
 * 创建因子间关系
 */
export async function createFactorRelation(
  sourceId: string,
  targetId: string,
  relationType: string,
  weight?: number
): Promise<boolean> {
  const query = `
    MATCH (s:Factor {id: $sourceId})
    MATCH (t:Factor {id: $targetId})
    MERGE (s)-[r:INFLUENCES]->(t)
    SET r.type = $relationType
    ${weight !== undefined ? "SET r.weight = $weight" : ""}
    RETURN r
  `
  const result = await runCypher(query, { sourceId, targetId, relationType, weight })
  return result.length > 0
}

/**
 * 批量导入企业知识图谱（差异化权重）
 */
export async function seedEnterpriseKnowledgeGraph(): Promise<{
  success: boolean
  stats: {
    enterprises: number
    factors: number
    relations: number
  }
  details: {
    enterpriseWeights: Record<string, Array<{ factor: string; weight: number; reason: string }>>
  }
}> {
  const connection = await checkNeo4jConnection()
  if (!connection.connected) {
    return {
      success: false,
      stats: { enterprises: 0, factors: 0, relations: 0 },
      details: { enterpriseWeights: {} },
    }
  }

  let enterprises = 0
  let factors = 0
  let relations = 0
  const enterpriseWeightsDetails: Record<string, Array<{ factor: string; weight: number; reason: string }>> = {}

  await withTransaction(async (tx: ManagedTransaction) => {
    // 1. 创建企业节点（带完整属性）
    for (const enterprise of ENTERPRISE_CONFIGS) {
      await tx.run(
        `MERGE (e:Enterprise {code: $code})
         SET e.name = $name,
             e.location = $location,
             e.province = $province,
             e.capacity = $capacity,
             e.transportMode = $transportMode,
             e.mainProducts = $mainProducts,
             e.customerRegions = $customerRegions,
             e.inventoryStrategy = $inventoryStrategy,
             e.description = $description,
             e.color = $color,
             e.updatedAt = datetime()
         RETURN e`,
        {
          code: enterprise.code,
          name: enterprise.name,
          location: enterprise.location,
          province: enterprise.province,
          capacity: enterprise.capacity,
          transportMode: enterprise.transportMode,
          mainProducts: enterprise.mainProducts,
          customerRegions: enterprise.customerRegions,
          inventoryStrategy: enterprise.inventoryStrategy,
          description: enterprise.description,
          color: enterprise.code === "yihua" ? "#06b6d4" : enterprise.code === "luxi" ? "#8b5cf6" : "#f59e0b",
        }
      )
      enterprises++
    }

    // 2. 创建因子节点（带完整属性）
    for (const factor of FACTOR_DEFINITIONS) {
      await tx.run(
        `MERGE (f:Factor {id: $id})
         SET f.name = $name,
             f.category = $category,
             f.subCategory = $subCategory,
             f.description = $description,
             f.baseWeight = $baseWeight,
             f.trend = $trend,
             f.volatility = $volatility,
             f.updatedAt = datetime()
         RETURN f`,
        {
          id: factor.id,
          name: factor.name,
          category: factor.category,
          subCategory: factor.subCategory || null,
          description: factor.description,
          baseWeight: factor.baseWeight,
          trend: factor.trend,
          volatility: factor.volatility,
        }
      )
      factors++
    }

    // 3. 创建企业-因子关系（差异化权重）
    for (const enterprise of ENTERPRISE_CONFIGS) {
      const weights = calculateEnterpriseFactorWeights(enterprise)
      enterpriseWeightsDetails[enterprise.code] = []

      for (const item of weights) {
        await tx.run(
          `MATCH (e:Enterprise {code: $enterpriseCode})
           MATCH (f:Factor {id: $factorId})
           MERGE (e)-[r:HAS_FACTOR]->(f)
           SET r.weight = $weight,
               r.reason = $reason`,
          {
            enterpriseCode: enterprise.code,
            factorId: item.factorId,
            weight: item.weight,
            reason: item.reason,
          }
        )
        relations++

        enterpriseWeightsDetails[enterprise.code].push({
          factor: item.factorName,
          weight: item.weight,
          reason: item.reason,
        })
      }
    }

    // 4. 创建因子间关系
    for (const rel of FACTOR_RELATIONS) {
      await tx.run(
        `MATCH (s:Factor {id: $source})
         MATCH (t:Factor {id: $target})
         MERGE (s)-[r:INFLUENCES]->(t)
         SET r.weight = $weight,
             r.description = $description`,
        {
          source: rel.source,
          target: rel.target,
          weight: rel.weight,
          description: rel.description,
        }
      )
      relations++
    }
  })

  return {
    success: true,
    stats: { enterprises, factors, relations },
    details: { enterpriseWeights: enterpriseWeightsDetails },
  }
}

/**
 * 获取企业知识图谱
 */
export async function getEnterpriseKnowledgeGraph(enterpriseCode: string): Promise<{
  nodes: Array<{ id: string; label: string; type: string; properties: Record<string, unknown> }>
  links: Array<{ source: string; target: string; type: string; weight?: number; reason?: string }>
}> {
  const connection = await checkNeo4jConnection()
  if (!connection.connected) {
    return getDefaultEnterpriseGraph(enterpriseCode)
  }

  // 查询企业和因子数据
  const query = `
    MATCH (e:Enterprise {code: $enterpriseCode})
    OPTIONAL MATCH (e)-[r1:HAS_FACTOR]->(f:Factor)
    OPTIONAL MATCH (f)-[r2:INFLUENCES]->(related:Factor)
    RETURN e.code as eCode, e.name as eName, e.location as eLocation, e.province as eProvince,
           e.capacity as eCapacity, e.transportMode as eTransportMode, e.mainProducts as eMainProducts,
           e.customerRegions as eCustomerRegions, e.inventoryStrategy as eInventoryStrategy,
           e.description as eDescription, e.color as eColor,
           f.id as fId, f.name as fName, f.category as fCategory, f.subCategory as fSubCategory,
           f.trend as fTrend, f.description as fDescription, f.baseWeight as fBaseWeight,
           r1.weight as r1Weight, r1.reason as r1Reason,
           related.id as rId, related.name as rName, related.category as rCategory, related.trend as rTrend,
           r2.weight as r2Weight, r2.description as r2Description
  `

  const results = await runCypher(query, { enterpriseCode })

  const nodes: Map<string, { id: string; label: string; type: string; properties: Record<string, unknown> }> = new Map()
  const links: Array<{ source: string; target: string; type: string; weight?: number; reason?: string }> = []

  // 从第一个结果构建企业节点
  if (results.length > 0) {
    const firstRow = results[0]
    nodes.set(enterpriseCode, {
      id: enterpriseCode,
      label: (firstRow.eName as string) || getEnterpriseName(enterpriseCode),
      type: "Enterprise",
      properties: {
        location: firstRow.eLocation,
        province: firstRow.eProvince,
        capacity: firstRow.eCapacity,
        transportMode: firstRow.eTransportMode,
        mainProducts: firstRow.eMainProducts,
        customerRegions: firstRow.eCustomerRegions,
        inventoryStrategy: firstRow.eInventoryStrategy,
        description: firstRow.eDescription,
      },
    })
  } else {
    // 如果没有结果，创建默认企业节点
    nodes.set(enterpriseCode, {
      id: enterpriseCode,
      label: getEnterpriseName(enterpriseCode),
      type: "Enterprise",
      properties: {},
    })
  }

  for (const row of results) {
    // 因子节点
    const fId = row.fId as string | undefined
    const fName = row.fName as string | undefined
    const fCategory = row.fCategory as string | undefined
    const fTrend = row.fTrend as string | undefined

    if (fId && !nodes.has(fId)) {
      nodes.set(fId, {
        id: fId,
        label: fName || fId,
        type: "Factor",
        properties: {
          category: fCategory,
          subCategory: row.fSubCategory,
          trend: fTrend,
          description: row.fDescription,
          baseWeight: row.fBaseWeight,
        },
      })
    }

    // 企业-因子关系（包含 reason）
    if (row.r1Weight !== null && row.r1Weight !== undefined && fId) {
      links.push({
        source: enterpriseCode,
        target: fId,
        type: "HAS_FACTOR",
        weight: row.r1Weight as number,
        reason: row.r1Reason as string | undefined,
      })
    }

    // 因子间关系
    const rId = row.rId as string | undefined
    if (rId && row.r2Weight !== null && row.r2Weight !== undefined && fId) {
      if (!nodes.has(rId)) {
        nodes.set(rId, {
          id: rId,
          label: (row.rName as string) || rId,
          type: "Factor",
          properties: {
            category: row.rCategory,
            trend: row.rTrend,
          },
        })
      }
      links.push({
        source: fId,
        target: rId,
        type: "INFLUENCES",
        weight: row.r2Weight as number,
      })
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    links,
  }
}

function getEnterpriseName(code: string): string {
  const names: Record<string, string> = {
    yihua: "湖北宜化集团",
    luxi: "鲁西化工集团",
    jinzhengda: "金正大生态工程",
  }
  return names[code] || code
}

function getDefaultEnterpriseGraph(enterpriseCode: string): {
  nodes: Array<{ id: string; label: string; type: string; properties: Record<string, unknown> }>
  links: Array<{ source: string; target: string; type: string; weight?: number; reason?: string }>
} {
  const enterpriseConfig: Record<string, {
    name: string
    location: string
    province: string
    capacity: number
    transportMode: string
    mainProducts: string[]
    customerRegions: string[]
    inventoryStrategy: string
    description: string
  }> = {
    yihua: {
      name: "湖北宜化集团",
      location: "湖北省宜昌市",
      province: "湖北",
      capacity: 120,
      transportMode: "water",
      mainProducts: ["磷酸一铵", "磷酸二铵", "尿素"],
      customerRegions: ["华中", "华南", "西南"],
      inventoryStrategy: "moderate",
      description: "国内最大硫磺制酸企业之一，依托长江水运优势",
    },
    luxi: {
      name: "鲁西化工集团",
      location: "山东省聊城市",
      province: "山东",
      capacity: 95,
      transportMode: "rail",
      mainProducts: ["复合肥", "尿素", "甲醇"],
      customerRegions: ["华北", "东北", "西北"],
      inventoryStrategy: "conservative",
      description: "华北地区主要化肥企业，依赖铁路运输",
    },
    jinzhengda: {
      name: "金正大生态工程",
      location: "山东省临沂市",
      province: "山东",
      capacity: 80,
      transportMode: "road",
      mainProducts: ["复合肥", "缓控释肥", "水溶肥"],
      customerRegions: ["华东", "华南", "出口"],
      inventoryStrategy: "aggressive",
      description: "专注于高端复合肥，出口占比高",
    },
  }

  const factorWeights: Record<string, Array<{ id: string; name: string; category: string; weight: number; trend: string; reason: string }>> = {
    yihua: [
      { id: "international_price", name: "国际硫磺价格", category: "supply", weight: 24, trend: "up", reason: "国际采购为主，对价格敏感" },
      { id: "fertilizer_demand", name: "化肥市场需求", category: "demand", weight: 23, trend: "stable", reason: "产能大，需求波动影响显著" },
      { id: "environmental_policy", name: "环保政策", category: "external", weight: 14, trend: "up", reason: "标准环保要求" },
      { id: "transport_cost", name: "国内运输成本", category: "internal", weight: 6, trend: "up", reason: "依托长江水运，运输成本较低" },
      { id: "exchange_rate", name: "汇率波动", category: "external", weight: 9, trend: "stable", reason: "进口成本受汇率影响" },
      { id: "inventory_level", name: "库存水平", category: "inventory", weight: 8, trend: "down", reason: "库存策略稳健" },
    ],
    luxi: [
      { id: "international_price", name: "国际硫磺价格", category: "supply", weight: 22, trend: "up", reason: "国际采购为主" },
      { id: "fertilizer_demand", name: "化肥市场需求", category: "demand", weight: 21, trend: "stable", reason: "区域需求稳定" },
      { id: "environmental_policy", name: "环保政策", category: "external", weight: 18, trend: "up", reason: "山东省环保要求严格" },
      { id: "transport_cost", name: "国内运输成本", category: "internal", weight: 12, trend: "up", reason: "依赖铁路运输，运输成本中等偏高" },
      { id: "exchange_rate", name: "汇率波动", category: "external", weight: 10, trend: "stable", reason: "进口成本受汇率影响" },
      { id: "inventory_level", name: "库存水平", category: "inventory", weight: 12, trend: "stable", reason: "库存策略保守，需更关注库存变化" },
    ],
    jinzhengda: [
      { id: "international_price", name: "国际硫磺价格", category: "supply", weight: 20, trend: "up", reason: "国际采购为主" },
      { id: "fertilizer_demand", name: "化肥市场需求", category: "demand", weight: 25, trend: "stable", reason: "内销为主" },
      { id: "export_demand", name: "出口需求", category: "demand", weight: 14, trend: "up", reason: "出口业务占比高，出口需求影响大" },
      { id: "environmental_policy", name: "环保政策", category: "external", weight: 18, trend: "up", reason: "山东省环保要求严格" },
      { id: "transport_cost", name: "国内运输成本", category: "internal", weight: 14, trend: "up", reason: "以公路运输为主，运输成本较高" },
      { id: "exchange_rate", name: "汇率波动", category: "external", weight: 11, trend: "stable", reason: "有出口业务，汇率双向影响" },
      { id: "inventory_level", name: "库存水平", category: "inventory", weight: 5, trend: "down", reason: "库存周转快，库存压力相对较小" },
    ],
  }

  const config = enterpriseConfig[enterpriseCode] || enterpriseConfig.yihua
  const weights = factorWeights[enterpriseCode] || factorWeights.yihua

  const nodes: Array<{ id: string; label: string; type: string; properties: Record<string, unknown> }> = [
    {
      id: enterpriseCode,
      label: config.name,
      type: "Enterprise",
      properties: {
        location: config.location,
        province: config.province,
        capacity: config.capacity,
        transportMode: config.transportMode,
        mainProducts: config.mainProducts,
        customerRegions: config.customerRegions,
        inventoryStrategy: config.inventoryStrategy,
        description: config.description,
      },
    },
  ]

  const links: Array<{ source: string; target: string; type: string; weight?: number; reason?: string }> = []

  for (const factor of weights) {
    nodes.push({
      id: factor.id,
      label: factor.name,
      type: "Factor",
      properties: {
        category: factor.category,
        trend: factor.trend,
      },
    })
    links.push({
      source: enterpriseCode,
      target: factor.id,
      type: "HAS_FACTOR",
      weight: factor.weight,
      reason: factor.reason,
    })
  }

  return { nodes, links }
}