import { runCypher, checkNeo4jConnection } from "@/lib/neo4j"
import { ENTERPRISE_CONFIGS } from "./enterprise-knowledge-config"

/**
 * 知识图谱推理服务
 * 用于从自然语言问题中提取供应链逻辑，辅助采购决策
 */

export interface GraphContext {
  enterprises: EnterpriseInfo[]
  factors: FactorInfo[]
  supplyChains: SupplyChainPath[]
  insights: string[]
  recommendations: string[]
}

export interface EnterpriseInfo {
  code: string
  name: string
  location: string
  capacity: number
  relatedFactors: Array<{
    id?: string
    name?: string
    weight?: number
    trend?: string
    category?: string
  }>
}

export interface FactorInfo {
  id: string
  name: string
  category: string
  weight: number
  trend: string
  influences: Array<{
    targetId?: string
    targetName?: string
    weight?: number
  }>
  influencedBy: Array<{
    sourceId?: string
    sourceName?: string
    weight?: number
  }>
}

export interface SupplyChainPath {
  path: string[]
  description: string
  totalWeight: number
  trend: string
}

// 关键词映射 - 将自然语言映射到图谱实体
const KEYWORD_MAPPING: Record<string, string[]> = {
  price: ["international_price", "价格", "硫磺价格"],
  demand: ["fertilizer_demand", "需求", "化肥需求", "磷肥"],
  transport: ["transport_cost", "运输", "物流", "运费"],
  policy: ["environmental_policy", "政策", "环保", "法规"],
  exchange: ["exchange_rate", "汇率", "人民币", "美元"],
  inventory: ["inventory_level", "库存", "备货"],
  // 企业关键词从配置动态生成
  ...Object.fromEntries(ENTERPRISE_CONFIGS.map(e => [e.code, [e.code, e.name.replace(/集团|科技/g, "")]])),
}

/**
 * 从用户问题中提取关键词
 */
export function extractKeywords(question: string): string[] {
  const lowerQuestion = question.toLowerCase()
  const keywords: string[] = []

  for (const [key, patterns] of Object.entries(KEYWORD_MAPPING)) {
    for (const pattern of patterns) {
      if (lowerQuestion.includes(pattern.toLowerCase())) {
        keywords.push(key)
        break
      }
    }
  }

  return [...new Set(keywords)]
}

/**
 * 获取所有企业信息
 */
export async function getAllEnterprises(): Promise<EnterpriseInfo[]> {
  const connection = await checkNeo4jConnection()
  if (!connection.connected) return []

  const query = `
    MATCH (e:Enterprise)
    OPTIONAL MATCH (e)-[r:HAS_FACTOR]->(f:Factor)
    RETURN e.code as code, e.name as name, e.location as location, e.capacity as capacity,
           collect({
             id: f.id,
             name: f.name,
             weight: r.weight,
             trend: f.trend,
             category: f.category
           }) as factors
  `

  const results = await runCypher(query, {})

  return results.map((row) => ({
    code: row.code as string,
    name: row.name as string,
    location: row.location as string,
    capacity: row.capacity as number,
    relatedFactors: (row.factors as Array<{ id?: string; name?: string; weight?: number; trend?: string; category?: string }>).filter(f => f.id),
  }))
}

/**
 * 获取因子及其关系
 */
export async function getFactorWithRelations(factorId: string): Promise<FactorInfo | null> {
  const connection = await checkNeo4jConnection()
  if (!connection.connected) return null

  const query = `
    MATCH (f:Factor {id: $factorId})
    OPTIONAL MATCH (f)-[r1:INFLUENCES]->(target:Factor)
    OPTIONAL MATCH (source:Factor)-[r2:INFLUENCES]->(f)
    RETURN f.id as id, f.name as name, f.category as category, f.weight as weight, f.trend as trend,
           collect(DISTINCT {targetId: target.id, targetName: target.name, weight: r1.weight}) as influences,
           collect(DISTINCT {sourceId: source.id, sourceName: source.name, weight: r2.weight}) as influencedBy
  `

  const results = await runCypher(query, { factorId })
  if (results.length === 0) return null

  const row = results[0]
  return {
    id: row.id as string,
    name: row.name as string,
    category: row.category as string,
    weight: row.weight as number,
    trend: row.trend as string,
    influences: (row.influences as Array<{ targetId?: string; targetName?: string; weight?: number }>).filter(i => i.targetId) as Array<{ targetId?: string; targetName?: string; weight?: number }>,
    influencedBy: (row.influencedBy as Array<{ sourceId?: string; sourceName?: string; weight?: number }>).filter(i => i.sourceId) as Array<{ sourceId?: string; sourceName?: string; weight?: number }>,
  }
}

/**
 * 获取供应链路径 - 从企业出发的影响链
 */
export async function getSupplyChainPaths(enterpriseCode: string, depth: number = 2): Promise<SupplyChainPath[]> {
  const connection = await checkNeo4jConnection()
  if (!connection.connected) return []

  const query = `
    MATCH path = (e:Enterprise {code: $enterpriseCode})-[:HAS_FACTOR]->(f1:Factor)
    OPTIONAL MATCH (f1)-[:INFLUENCES]->(f2:Factor)
    RETURN e.name as enterprise, f1.id as factor1Id, f1.name as factor1Name, f1.weight as factor1Weight, f1.trend as factor1Trend,
           f2.id as factor2Id, f2.name as factor2Name
  `

  const results = await runCypher(query, { enterpriseCode })
  const paths: SupplyChainPath[] = []

  for (const row of results) {
    const factor1Id = row.factor1Id as string
    const factor1Name = row.factor1Name as string
    const factor1Weight = row.factor1Weight as number
    const factor1Trend = row.factor1Trend as string
    const factor2Id = row.factor2Id as string
    const factor2Name = row.factor2Name as string

    if (factor2Id) {
      paths.push({
        path: [row.enterprise as string, factor1Name, factor2Name],
        description: `${row.enterprise} 受 ${factor1Name} 影响(权重${factor1Weight}%)，而 ${factor1Name} 会影响 ${factor2Name}`,
        totalWeight: factor1Weight,
        trend: factor1Trend,
      })
    } else {
      paths.push({
        path: [row.enterprise as string, factor1Name],
        description: `${row.enterprise} 受 ${factor1Name} 直接影响，权重 ${factor1Weight}%`,
        totalWeight: factor1Weight,
        trend: factor1Trend,
      })
    }
  }

  return paths
}

/**
 * 根据用户问题生成知识图谱上下文
 */
export async function generateKnowledgeGraphContext(question: string): Promise<GraphContext> {
  const connection = await checkNeo4jConnection()

  const context: GraphContext = {
    enterprises: [],
    factors: [],
    supplyChains: [],
    insights: [],
    recommendations: [],
  }

  if (!connection.connected) {
    context.insights.push("知识图谱未连接，无法提供深度分析")
    return context
  }

  // 提取关键词
  const keywords = extractKeywords(question)

  // 获取所有企业信息
  const enterprises = await getAllEnterprises()
  context.enterprises = enterprises

  // 获取相关因子
  const factorIds = new Set<string>()
  for (const keyword of keywords) {
    if (["price", "demand", "transport", "policy", "exchange", "inventory"].includes(keyword)) {
      const mapping: Record<string, string> = {
        price: "international_price",
        demand: "fertilizer_demand",
        transport: "transport_cost",
        policy: "environmental_policy",
        exchange: "exchange_rate",
        inventory: "inventory_level",
      }
      factorIds.add(mapping[keyword])
    }
  }

  // 并行获取相关因子
  const factorPromises = Array.from(factorIds).map(factorId => getFactorWithRelations(factorId))
  const factorResults = await Promise.all(factorPromises)
  context.factors.push(...factorResults.filter(Boolean) as FactorInfo[])

  // 获取供应链路径
  const enterpriseKeywords = keywords.filter(k => ["yihua", "luxi", "jinzhengda"].includes(k))
  const enterpriseMapping: Record<string, string> = {
    yihua: "yihua",
    luxi: "luxi",
    jinzhengda: "jinzhengda",
  }

  if (enterpriseKeywords.length > 0) {
    // 并行获取所有企业的供应链路径
    const pathPromises = enterpriseKeywords.map(key => getSupplyChainPaths(enterpriseMapping[key]))
    const pathResults = await Promise.all(pathPromises)
    context.supplyChains.push(...pathResults.flat())
  } else {
    // 默认返回前两家企业的路径
    const pathPromises = enterprises.slice(0, 2).map(e => getSupplyChainPaths(e.code))
    const pathResults = await Promise.all(pathPromises)
    context.supplyChains.push(...pathResults.flat())
  }

  // 生成洞察
  context.insights = generateInsights(context)

  // 生成建议
  context.recommendations = generateRecommendations(context, question)

  return context
}

/**
 * 根据图谱数据生成洞察
 */
function generateInsights(context: GraphContext): string[] {
  const insights: string[] = []

  // 分析因子趋势
  const upTrendFactors = context.factors.filter(f => f.trend === "up")
  const downTrendFactors = context.factors.filter(f => f.trend === "down")

  if (upTrendFactors.length > 0) {
    const names = upTrendFactors.map(f => f.name).join("、")
    insights.push(`上升趋势因子：${names}，可能推高采购成本`)
  }

  if (downTrendFactors.length > 0) {
    const names = downTrendFactors.map(f => f.name).join("、")
    insights.push(`下降趋势因子：${names}，可能带来成本优化机会`)
  }

  // 分析供应链影响链
  const highWeightPaths = context.supplyChains.filter(p => p.totalWeight >= 20)
  if (highWeightPaths.length > 0) {
    insights.push(`高权重影响链：发现 ${highWeightPaths.length} 条关键供应链路径，需重点关注`)
  }

  // 分析因子间关系
  for (const factor of context.factors) {
    if (factor.influences.length > 0) {
      const targets = factor.influences.map(i => i.targetName).filter(Boolean).join("、")
      if (targets) {
        insights.push(`${factor.name} 会影响 ${targets}，形成连锁效应`)
      }
    }
  }

  return insights
}

/**
 * 根据图谱数据生成采购建议
 */
function generateRecommendations(context: GraphContext, question: string): string[] {
  const recommendations: string[] = []

  // 检查价格相关因素
  const priceFactor = context.factors.find(f => f.id === "international_price")
  if (priceFactor) {
    if (priceFactor.trend === "up") {
      recommendations.push("国际硫磺价格呈上升趋势，建议考虑提前备货锁定成本")
    } else if (priceFactor.trend === "down") {
      recommendations.push("国际硫磺价格呈下降趋势，可适度观望等待更优采购时机")
    }
  }

  // 检查运输成本
  const transportFactor = context.factors.find(f => f.id === "transport_cost")
  if (transportFactor?.trend === "up") {
    recommendations.push("运输成本上升，建议关注现货市场或考虑就近采购")
  }

  // 检查库存水平
  const inventoryFactor = context.factors.find(f => f.id === "inventory_level")
  if (inventoryFactor) {
    if (inventoryFactor.trend === "down") {
      recommendations.push("库存水平下降，需评估安全库存并考虑补货")
    }
  }

  // 检查汇率
  const exchangeFactor = context.factors.find(f => f.id === "exchange_rate")
  if (exchangeFactor && question.includes("进口")) {
    recommendations.push("关注汇率波动对进口成本的影响，必要时考虑汇率对冲")
  }

  // 综合建议
  if (recommendations.length === 0) {
    recommendations.push("建议持续监控市场动态，结合实时数据做出采购决策")
  }

  return recommendations
}

/**
 * 格式化知识图谱上下文为文本
 */
export function formatGraphContextAsText(context: GraphContext): string {
  let text = "## 知识图谱分析\n\n"

  // 企业信息
  if (context.enterprises.length > 0) {
    text += "### 相关企业\n"
    for (const enterprise of context.enterprises) {
      text += `- **${enterprise.name}** (${enterprise.location})，产能 ${enterprise.capacity} 万吨/年\n`
    }
    text += "\n"
  }

  // 关键因子
  if (context.factors.length > 0) {
    text += "### 关键影响因子\n"
    for (const factor of context.factors) {
      const trendIcon = factor.trend === "up" ? "📈" : factor.trend === "down" ? "📉" : "➡️"
      text += `- ${trendIcon} **${factor.name}** (权重: ${factor.weight}%, 类别: ${factor.category})\n`
    }
    text += "\n"
  }

  // 供应链路径
  if (context.supplyChains.length > 0) {
    text += "### 供应链影响链\n"
    for (const path of context.supplyChains.slice(0, 5)) {
      text += `- ${path.description}\n`
    }
    text += "\n"
  }

  // 洞察
  if (context.insights.length > 0) {
    text += "### 图谱洞察\n"
    for (const insight of context.insights) {
      text += `- 💡 ${insight}\n`
    }
    text += "\n"
  }

  // 建议
  if (context.recommendations.length > 0) {
    text += "### 图谱建议\n"
    for (const rec of context.recommendations) {
      text += `- 🎯 ${rec}\n`
    }
  }

  return text
}

/**
 * 根据用户问题执行 Cypher 查询并返回结果
 */
export async function queryKnowledgeGraph(question: string): Promise<string> {
  const context = await generateKnowledgeGraphContext(question)
  return formatGraphContextAsText(context)
}