"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Package,
  Factory,
  Truck,
  Globe,
  DollarSign,
  BarChart3,
  Activity,
  Warehouse,
  Users,
  Target,
  Brain,
  Ship,
  Train,
  Truck as TruckIcon,
  Leaf,
  AlertCircle,
  Info
} from "lucide-react"
import { EnterprisePredictionChart } from "./enterprise-prediction-chart"
import { Neo4jKnowledgeGraph } from "./neo4j-knowledge-graph"

// 类型定义
interface FactorWeight {
  factorId: string
  factorName: string
  category: string
  weight: number
  trend: string
  reason: string
}

interface EnterpriseData {
  code: string
  name: string
  location: string
  province: string
  capacity: number
  transportMode: "water" | "rail" | "road"
  mainProducts: string[]
  customerRegions: string[]
  inventoryStrategy: "aggressive" | "moderate" | "conservative"
  description: string
  color: string
  factorWeights: FactorWeight[]
}

interface EnterpriseDetailProps {
  enterpriseCode: "yihua" | "luxi" | "jinzhengda"
}

// 运输方式图标映射
const TransportIcon = ({ mode }: { mode: "water" | "rail" | "road" }) => {
  switch (mode) {
    case "water":
      return <Ship className="h-4 w-4" />
    case "rail":
      return <Train className="h-4 w-4" />
    case "road":
      return <TruckIcon className="h-4 w-4" />
  }
}

// 运输方式名称映射
const TransportLabel = ({ mode }: { mode: "water" | "rail" | "road" }) => {
  switch (mode) {
    case "water":
      return "水运"
    case "rail":
      return "铁路"
    case "road":
      return "公路"
  }
}

// 库存策略标签
const InventoryStrategyBadge = ({ strategy }: { strategy: "aggressive" | "moderate" | "conservative" }) => {
  const config = {
    aggressive: { label: "激进型", color: "text-rose-500 border-rose-500", desc: "低库存高周转" },
    moderate: { label: "稳健型", color: "text-amber-500 border-amber-500", desc: "平衡库存周转" },
    conservative: { label: "保守型", color: "text-emerald-500 border-emerald-500", desc: "高库存保供应" },
  }
  const c = config[strategy]
  return (
    <Badge variant="outline" className={`text-xs ${c.color}`}>
      {c.label}
    </Badge>
  )
}

// 因子类别图标和颜色
const CategoryConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  supply: { icon: <Truck className="h-3.5 w-3.5" />, color: "text-blue-500", label: "供应端" },
  demand: { icon: <Users className="h-3.5 w-3.5" />, color: "text-violet-500", label: "需求端" },
  inventory: { icon: <Warehouse className="h-3.5 w-3.5" />, color: "text-amber-500", label: "库存" },
  external: { icon: <Globe className="h-3.5 w-3.5" />, color: "text-cyan-500", label: "外部" },
  internal: { icon: <Factory className="h-3.5 w-3.5" />, color: "text-emerald-500", label: "内部" },
}

export function EnterpriseDetail({ enterpriseCode }: EnterpriseDetailProps) {
  const [enterprise, setEnterprise] = useState<EnterpriseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 企业颜色
  const enterpriseColors: Record<string, string> = {
    yihua: "#06b6d4",
    luxi: "#8b5cf6",
    jinzhengda: "#f59e0b",
  }

  useEffect(() => {
    async function fetchEnterpriseData() {
      setLoading(true)
      setError(null)
      try {
        // 从 Neo4j 图谱 API 获取企业数据
        const response = await fetch(`/api/neo4j/graph?enterprise=${enterpriseCode}`)
        if (!response.ok) {
          throw new Error("获取企业数据失败")
        }
        const data = await response.json()

        // 解析图谱数据
        const enterpriseNode = data.nodes.find((n: { type: string }) => n.type === "Enterprise")
        const factorNodes = data.nodes.filter((n: { type: string }) => n.type === "Factor")

        // 获取企业-因子关系的权重
        const enterpriseLinks = data.links.filter((l: { source: string; type: string }) =>
          l.source === enterpriseCode && l.type === "HAS_FACTOR"
        )

        // 构建因子权重数据
        const factorWeights: FactorWeight[] = factorNodes.map((node: { id: string; label: string; properties: { category?: string; trend?: string } }) => {
          const link = enterpriseLinks.find((l: { target: string }) => l.target === node.id)
          return {
            factorId: node.id,
            factorName: node.label,
            category: node.properties?.category || "external",
            weight: link?.weight || 0,
            trend: node.properties?.trend || "stable",
            reason: link?.reason || "",
          }
        })

        // 按权重排序
        factorWeights.sort((a: FactorWeight, b: FactorWeight) => b.weight - a.weight)

        // 构建企业数据
        const enterpriseData: EnterpriseData = {
          code: enterpriseCode,
          name: enterpriseNode?.label || getEnterpriseName(enterpriseCode),
          location: enterpriseNode?.properties?.location || "",
          province: enterpriseNode?.properties?.province || "",
          capacity: enterpriseNode?.properties?.capacity || 0,
          transportMode: enterpriseNode?.properties?.transportMode || "water",
          mainProducts: enterpriseNode?.properties?.mainProducts || [],
          customerRegions: enterpriseNode?.properties?.customerRegions || [],
          inventoryStrategy: enterpriseNode?.properties?.inventoryStrategy || "moderate",
          description: enterpriseNode?.properties?.description || "",
          color: enterpriseColors[enterpriseCode],
          factorWeights,
        }

        setEnterprise(enterpriseData)
      } catch (err) {
        console.error("Failed to fetch enterprise data:", err)
        setError("无法加载企业数据，使用默认数据")
        // 使用默认数据
        setEnterprise(getDefaultEnterpriseData(enterpriseCode))
      } finally {
        setLoading(false)
      }
    }

    fetchEnterpriseData()
  }, [enterpriseCode])

  // 默认企业数据（后备）
  function getDefaultEnterpriseData(code: string): EnterpriseData {
    const defaults: Record<string, EnterpriseData> = {
      yihua: {
        code: "yihua",
        name: "湖北宜化集团",
        location: "湖北省宜昌市",
        province: "湖北",
        capacity: 120,
        transportMode: "water",
        mainProducts: ["磷酸一铵", "磷酸二铵", "尿素"],
        customerRegions: ["华中", "华南", "西南"],
        inventoryStrategy: "moderate",
        description: "国内最大硫磺制酸企业之一，依托长江水运优势",
        color: "#06b6d4",
        factorWeights: [
          { factorId: "international_price", factorName: "国际硫磺价格", category: "supply", weight: 24, trend: "up", reason: "国际采购为主，对价格敏感" },
          { factorId: "fertilizer_demand", factorName: "化肥市场需求", category: "demand", weight: 23, trend: "stable", reason: "产能大，需求波动影响显著" },
          { factorId: "environmental_policy", factorName: "环保政策", category: "external", weight: 14, trend: "up", reason: "标准环保要求" },
          { factorId: "transport_cost", factorName: "国内运输成本", category: "internal", weight: 6, trend: "up", reason: "依托长江水运，运输成本较低" },
          { factorId: "exchange_rate", factorName: "汇率波动", category: "external", weight: 9, trend: "stable", reason: "进口成本受汇率影响" },
          { factorId: "inventory_level", factorName: "库存水平", category: "inventory", weight: 8, trend: "down", reason: "库存策略稳健" },
        ],
      },
      luxi: {
        code: "luxi",
        name: "鲁西化工集团",
        location: "山东省聊城市",
        province: "山东",
        capacity: 95,
        transportMode: "rail",
        mainProducts: ["复合肥", "尿素", "甲醇"],
        customerRegions: ["华北", "东北", "西北"],
        inventoryStrategy: "conservative",
        description: "华北地区主要化肥企业，依赖铁路运输",
        color: "#8b5cf6",
        factorWeights: [
          { factorId: "international_price", factorName: "国际硫磺价格", category: "supply", weight: 22, trend: "up", reason: "国际采购为主" },
          { factorId: "fertilizer_demand", factorName: "化肥市场需求", category: "demand", weight: 21, trend: "stable", reason: "区域需求稳定" },
          { factorId: "environmental_policy", factorName: "环保政策", category: "external", weight: 18, trend: "up", reason: "山东省环保要求严格" },
          { factorId: "transport_cost", factorName: "国内运输成本", category: "internal", weight: 12, trend: "up", reason: "依赖铁路运输，运输成本中等偏高" },
          { factorId: "exchange_rate", factorName: "汇率波动", category: "external", weight: 10, trend: "stable", reason: "进口成本受汇率影响" },
          { factorId: "inventory_level", factorName: "库存水平", category: "inventory", weight: 12, trend: "stable", reason: "库存策略保守，需更关注库存变化" },
        ],
      },
      jinzhengda: {
        code: "jinzhengda",
        name: "金正大生态工程",
        location: "山东省临沂市",
        province: "山东",
        capacity: 80,
        transportMode: "road",
        mainProducts: ["复合肥", "缓控释肥", "水溶肥"],
        customerRegions: ["华东", "华南", "出口"],
        inventoryStrategy: "aggressive",
        description: "专注于高端复合肥，出口占比高",
        color: "#f59e0b",
        factorWeights: [
          { factorId: "international_price", factorName: "国际硫磺价格", category: "supply", weight: 20, trend: "up", reason: "国际采购为主" },
          { factorId: "fertilizer_demand", factorName: "化肥市场需求", category: "demand", weight: 25, trend: "stable", reason: "内销为主" },
          { factorId: "export_demand", factorName: "出口需求", category: "demand", weight: 14, trend: "up", reason: "出口业务占比高，出口需求影响大" },
          { factorId: "environmental_policy", factorName: "环保政策", category: "external", weight: 18, trend: "up", reason: "山东省环保要求严格" },
          { factorId: "transport_cost", factorName: "国内运输成本", category: "internal", weight: 14, trend: "up", reason: "以公路运输为主，运输成本较高" },
          { factorId: "exchange_rate", factorName: "汇率波动", category: "external", weight: 11, trend: "stable", reason: "有出口业务，汇率双向影响" },
          { factorId: "inventory_level", factorName: "库存水平", category: "inventory", weight: 5, trend: "down", reason: "库存周转快，库存压力相对较小" },
        ],
      },
    }
    return defaults[code] || defaults.yihua
  }

  function getEnterpriseName(code: string): string {
    const names: Record<string, string> = {
      yihua: "湖北宜化集团",
      luxi: "鲁西化工集团",
      jinzhengda: "金正大生态工程",
    }
    return names[code] || code
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  if (!enterprise) {
    return <div className="text-center py-8 text-slate-500">企业信息不存在</div>
  }

  // 按类别分组因子
  const factorsByCategory = enterprise.factorWeights.reduce((acc, factor) => {
    const cat = factor.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(factor)
    return acc
  }, {} as Record<string, FactorWeight[]>)

  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {error && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-amber-700 dark:text-amber-300">{error}</span>
        </div>
      )}

      {/* 企业概览卡片 */}
      <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${enterprise.color}, ${enterprise.color}60)` }} />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${enterprise.color}20` }}
              >
                <Building2 className="h-6 w-6" style={{ color: enterprise.color }} />
              </div>
              <div>
                <CardTitle className="text-xl text-slate-900 dark:text-white">
                  {enterprise.name}
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  {enterprise.description}
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-sm px-3 py-1"
              style={{ borderColor: enterprise.color, color: enterprise.color }}
            >
              <Factory className="h-3.5 w-3.5 mr-1" />
              产能 {enterprise.capacity} 万吨/年
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">{enterprise.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <TransportIcon mode={enterprise.transportMode} />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                主要运输：<TransportLabel mode={enterprise.transportMode} />
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                主营：{enterprise.mainProducts.slice(0, 2).join("、")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">库存策略：</span>
              <InventoryStrategyBadge strategy={enterprise.inventoryStrategy} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-500">销售区域：</span>
              {enterprise.customerRegions.map((region, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {region}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 影响因子权重 - 差异化展示 */}
      <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" style={{ color: enterprise.color }} />
              <CardTitle className="text-lg text-slate-900 dark:text-white">价格影响因子权重</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs text-slate-500">
              <Info className="h-3 w-3 mr-1" />
              基于企业特征差异化计算
            </Badge>
          </div>
          <CardDescription>
            根据{enterprise.name}的运输方式、库存策略、客户结构等特征，动态计算各因子权重
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 因子类别图例 */}
          <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
            {Object.entries(CategoryConfig).map(([key, config]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={config.color}>{config.icon}</span>
                <span className="text-xs text-slate-500">{config.label}</span>
              </div>
            ))}
          </div>

          {/* 因子列表 - 带原因说明 */}
          <div className="space-y-4">
            {enterprise.factorWeights.slice(0, 8).map((factor, index) => {
              const catConfig = CategoryConfig[factor.category] || CategoryConfig.external
              return (
                <div key={index} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={catConfig.color}>{catConfig.icon}</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {factor.factorName}
                      </span>
                      <Badge variant="outline" className="text-xs text-slate-400 border-slate-200">
                        {catConfig.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {factor.trend === "up" && <TrendingUp className="h-4 w-4 text-rose-500" />}
                      {factor.trend === "down" && <TrendingDown className="h-4 w-4 text-emerald-500" />}
                      {factor.trend === "stable" && <Activity className="h-4 w-4 text-slate-400" />}
                      <span className="text-sm font-semibold" style={{ color: enterprise.color }}>
                        {factor.weight}%
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={factor.weight}
                    className="h-2"
                    style={{
                      background: `linear-gradient(90deg, ${enterprise.color}40, transparent)`,
                    }}
                  />
                  {factor.reason && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 pl-6">
                      💡 {factor.reason}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 按类别分组的因子分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 供应端因素 */}
        <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base text-slate-900 dark:text-white">供应端因素</CardTitle>
            </div>
            <CardDescription className="text-xs">
              企业间差异较小，国际采购为主
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {factorsByCategory.supply?.slice(0, 4).map((factor, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
                  <span className="text-sm text-slate-600 dark:text-slate-300">{factor.factorName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{factor.weight}%</span>
                    {factor.trend === "up" && <TrendingUp className="h-3 w-3 text-rose-500" />}
                    {factor.trend === "down" && <TrendingDown className="h-3 w-3 text-emerald-500" />}
                  </div>
                </div>
              ))}
              {(!factorsByCategory.supply || factorsByCategory.supply.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-2">暂无供应端因素数据</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 需求端因素 */}
        <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-violet-500" />
              <CardTitle className="text-base text-slate-900 dark:text-white">需求端因素</CardTitle>
            </div>
            <CardDescription className="text-xs">
              企业差异大，取决于产能和客户结构
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {factorsByCategory.demand?.slice(0, 4).map((factor, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-violet-50/50 dark:bg-violet-900/10">
                  <span className="text-sm text-slate-600 dark:text-slate-300">{factor.factorName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-violet-600 dark:text-violet-400">{factor.weight}%</span>
                    {factor.trend === "up" && <TrendingUp className="h-3 w-3 text-rose-500" />}
                    {factor.trend === "down" && <TrendingDown className="h-3 w-3 text-emerald-500" />}
                  </div>
                </div>
              ))}
              {(!factorsByCategory.demand || factorsByCategory.demand.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-2">暂无需求端因素数据</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 库存因素 */}
        <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base text-slate-900 dark:text-white">库存因素</CardTitle>
            </div>
            <CardDescription className="text-xs">
              取决于企业库存策略：{enterprise.inventoryStrategy === "aggressive" ? "激进" : enterprise.inventoryStrategy === "conservative" ? "保守" : "稳健"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {factorsByCategory.inventory?.slice(0, 4).map((factor, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 dark:bg-amber-900/10">
                  <span className="text-sm text-slate-600 dark:text-slate-300">{factor.factorName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{factor.weight}%</span>
                    {factor.trend === "up" && <TrendingUp className="h-3 w-3 text-rose-500" />}
                    {factor.trend === "down" && <TrendingDown className="h-3 w-3 text-emerald-500" />}
                  </div>
                </div>
              ))}
              {(!factorsByCategory.inventory || factorsByCategory.inventory.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-2">暂无库存因素数据</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 价格预测图表 */}
      <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" style={{ color: enterprise.color }} />
            <CardTitle className="text-lg text-slate-900 dark:text-white">价格预测趋势</CardTitle>
          </div>
          <CardDescription>EEMD-LSTM 模型预测结果</CardDescription>
        </CardHeader>
        <CardContent>
          <EnterprisePredictionChart enterpriseCode={enterpriseCode} days={90} />
        </CardContent>
      </Card>

      {/* 知识图谱 */}
      <Neo4jKnowledgeGraph enterpriseCode={enterpriseCode} />
    </div>
  )
}