import { runCypher, withTransaction, checkNeo4jConnection } from "@/lib/neo4j"
import type { ManagedTransaction } from "neo4j-driver"

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
 * 批量导入企业知识图谱
 */
export async function seedEnterpriseKnowledgeGraph(): Promise<{
  success: boolean
  stats: {
    enterprises: number
    factors: number
    relations: number
  }
}> {
  const connection = await checkNeo4jConnection()
  if (!connection.connected) {
    return {
      success: false,
      stats: { enterprises: 0, factors: 0, relations: 0 },
    }
  }

  let enterprises = 0
  let factors = 0
  let relations = 0

  // 企业数据
  const enterpriseData: EnterpriseNode[] = [
    { code: "yihua", name: "湖北宜化集团", location: "湖北省宜昌市", capacity: 120, color: "#06b6d4" },
    { code: "luxi", name: "鲁西化工集团", location: "山东省聊城市", capacity: 95, color: "#8b5cf6" },
    { code: "jinzhengda", name: "金正大生态工程", location: "山东省临沂市", capacity: 80, color: "#f59e0b" },
  ]

  // 因子数据
  const factorData: FactorNode[] = [
    { id: "international_price", name: "国际硫磺价格", category: "external", weight: 28, trend: "up" },
    { id: "fertilizer_demand", name: "化肥市场需求", category: "demand", weight: 22, trend: "stable" },
    { id: "transport_cost", name: "运输成本", category: "supply", weight: 18, trend: "up" },
    { id: "environmental_policy", name: "环保政策", category: "external", weight: 15, trend: "down" },
    { id: "exchange_rate", name: "汇率波动", category: "external", weight: 10, trend: "stable" },
    { id: "inventory_level", name: "库存水平", category: "internal", weight: 7, trend: "down" },
  ]

  // 企业特定因子权重
  const enterpriseFactors: Record<string, Array<{ factorId: string; weight: number }>> = {
    yihua: [
      { factorId: "international_price", weight: 28 },
      { factorId: "fertilizer_demand", weight: 22 },
      { factorId: "transport_cost", weight: 18 },
      { factorId: "environmental_policy", weight: 15 },
      { factorId: "exchange_rate", weight: 10 },
      { factorId: "inventory_level", weight: 7 },
    ],
    luxi: [
      { factorId: "international_price", weight: 25 },
      { factorId: "fertilizer_demand", weight: 23 },
      { factorId: "transport_cost", weight: 20 },
      { factorId: "environmental_policy", weight: 12 },
      { factorId: "exchange_rate", weight: 12 },
      { factorId: "inventory_level", weight: 8 },
    ],
    jinzhengda: [
      { factorId: "fertilizer_demand", weight: 30 },
      { factorId: "international_price", weight: 20 },
      { factorId: "transport_cost", weight: 15 },
      { factorId: "environmental_policy", weight: 18 },
      { factorId: "exchange_rate", weight: 10 },
      { factorId: "inventory_level", weight: 7 },
    ],
  }

  // 因子间关系
  const factorRelations = [
    { source: "international_price", target: "transport_cost", weight: 0.7 },
    { source: "exchange_rate", target: "international_price", weight: 0.8 },
    { source: "environmental_policy", target: "fertilizer_demand", weight: 0.5 },
    { source: "inventory_level", target: "fertilizer_demand", weight: 0.6 },
  ]

  await withTransaction(async (tx: ManagedTransaction) => {
    // 创建企业节点
    for (const enterprise of enterpriseData) {
      await tx.run(
        `MERGE (e:Enterprise {code: $code})
         SET e.name = $name, e.location = $location, e.capacity = $capacity, e.color = $color
         RETURN e`,
        enterprise
      )
      enterprises++
    }

    // 创建因子节点
    for (const factor of factorData) {
      await tx.run(
        `MERGE (f:Factor {id: $id})
         SET f.name = $name, f.category = $category, f.weight = $weight, f.trend = $trend
         RETURN f`,
        factor
      )
      factors++
    }

    // 创建企业-因子关系
    for (const [enterpriseCode, factorsList] of Object.entries(enterpriseFactors)) {
      for (const { factorId, weight } of factorsList) {
        await tx.run(
          `MATCH (e:Enterprise {code: $enterpriseCode})
           MATCH (f:Factor {id: $factorId})
           MERGE (e)-[r:HAS_FACTOR]->(f)
           SET r.weight = $weight`,
          { enterpriseCode, factorId, weight }
        )
        relations++
      }
    }

    // 创建因子间关系
    for (const rel of factorRelations) {
      await tx.run(
        `MATCH (s:Factor {id: $source})
         MATCH (t:Factor {id: $target})
         MERGE (s)-[r:INFLUENCES]->(t)
         SET r.weight = $weight`,
        rel
      )
      relations++
    }
  })

  return {
    success: true,
    stats: { enterprises, factors, relations },
  }
}

/**
 * 获取企业知识图谱
 */
export async function getEnterpriseKnowledgeGraph(enterpriseCode: string): Promise<{
  nodes: Array<{ id: string; label: string; type: string; properties: Record<string, unknown> }>
  links: Array<{ source: string; target: string; type: string; weight?: number }>
}> {
  const connection = await checkNeo4jConnection()
  if (!connection.connected) {
    return { nodes: [], links: [] }
  }

  const query = `
    MATCH (e:Enterprise {code: $enterpriseCode})
    OPTIONAL MATCH (e)-[r1:HAS_FACTOR]->(f:Factor)
    OPTIONAL MATCH (f)-[r2:INFLUENCES]->(related:Factor)
    RETURN e, f, r1, related, r2
  `

  const results = await runCypher(query, { enterpriseCode })

  const nodes: Map<string, { id: string; label: string; type: string; properties: Record<string, unknown> }> = new Map()
  const links: Array<{ source: string; target: string; type: string; weight?: number }> = []

  // 企业节点
  nodes.set(enterpriseCode, {
    id: enterpriseCode,
    label: enterpriseCode === "yihua" ? "湖北宜化集团" : enterpriseCode === "luxi" ? "鲁西化工集团" : "金正大生态工程",
    type: "Enterprise",
    properties: {},
  })

  for (const row of results) {
    // 因子节点
    const f = row.f as { id?: string; name?: string; category?: string; weight?: number; trend?: string } | undefined
    const r1 = row.r1 as { weight?: number } | undefined
    const related = row.related as { id?: string; name?: string; category?: string; weight?: number; trend?: string } | undefined
    const r2 = row.r2 as { weight?: number } | undefined

    if (f && f.id && !nodes.has(f.id)) {
      nodes.set(f.id, {
        id: f.id,
        label: f.name || f.id,
        type: "Factor",
        properties: f as Record<string, unknown>,
      })
    }

    // 企业-因子关系
    if (r1 && f && f.id) {
      links.push({
        source: enterpriseCode,
        target: f.id,
        type: "HAS_FACTOR",
        weight: r1.weight,
      })
    }

    // 因子间关系
    if (related && related.id && r2 && f && f.id) {
      if (!nodes.has(related.id)) {
        nodes.set(related.id, {
          id: related.id,
          label: related.name || related.id,
          type: "Factor",
          properties: related as Record<string, unknown>,
        })
      }
      links.push({
        source: f.id,
        target: related.id,
        type: "INFLUENCES",
        weight: r2.weight,
      })
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    links,
  }
}