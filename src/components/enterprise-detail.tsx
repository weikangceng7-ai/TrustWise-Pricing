"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Factory,
  Truck,
  Globe,
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
import { ENTERPRISE_CONFIGS, getEnterpriseNameByCode, calculateEnterpriseFactorWeights } from "@/services/enterprise-knowledge-config"
import {
  getEnterpriseByCode,
  convertStorageToConfig,
  getEnterpriseColor,
  isStaticEnterprise,
} from "@/services/enterprise-storage"
import { InventoryVisualization } from "./inventory-visualization"
import { InventoryHealthDashboard } from "./inventory-health-dashboard"
import { useLanguage } from "@/contexts/language-context"

// 类型定义
interface FactorWeight {
  factorId: string
  factorName: string
  category: string
  weight: number
  trend: string
  reason: string
}

interface InventoryInfo {
  currentStock: number
  maxCapacity: number
  safetyDays: number
  avgConsumption: number
  turnoverRate: number
  lastPurchaseDate: string
  nextPurchaseDate: string
  supplierCount: number
  portDistance: number
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
  inventory?: InventoryInfo
}

interface EnterpriseDetailProps {
  enterpriseCode: string  // 改为接受任意字符串
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
const TransportLabel = ({ mode, t }: { mode: "water" | "rail" | "road"; t: (key: string) => string }) => {
  switch (mode) {
    case "water":
      return t("enterpriseDetail.transport.water")
    case "rail":
      return t("enterpriseDetail.transport.rail")
    case "road":
      return t("enterpriseDetail.transport.road")
  }
}

// 库存策略标签
const InventoryStrategyBadge = ({ strategy, t }: { strategy: "aggressive" | "moderate" | "conservative"; t: (key: string) => string }) => {
  const config = {
    aggressive: { label: t("enterpriseDetail.strategy.aggressive"), color: "text-rose-500 border-rose-500", desc: t("enterpriseDetail.strategy.aggressiveDesc") },
    moderate: { label: t("enterpriseDetail.strategy.moderate"), color: "text-amber-500 border-amber-500", desc: t("enterpriseDetail.strategy.moderateDesc") },
    conservative: { label: t("enterpriseDetail.strategy.conservative"), color: "text-emerald-500 border-emerald-500", desc: t("enterpriseDetail.strategy.conservativeDesc") },
  }
  const c = config[strategy]
  return (
    <Badge variant="outline" className={`text-xs ${c.color}`}>
      {c.label}
    </Badge>
  )
}

// 因子类别图标和颜色
const CategoryConfig = (t: (key: string) => string): Record<string, { icon: React.ReactNode; color: string; label: string }> => ({
  supply: { icon: <Truck className="h-3.5 w-3.5" />, color: "text-blue-500", label: t("enterpriseDetail.category.supply") },
  demand: { icon: <Users className="h-3.5 w-3.5" />, color: "text-violet-500", label: t("enterpriseDetail.category.demand") },
  inventory: { icon: <Warehouse className="h-3.5 w-3.5" />, color: "text-amber-500", label: t("enterpriseDetail.category.inventory") },
  external: { icon: <Globe className="h-3.5 w-3.5" />, color: "text-cyan-500", label: t("enterpriseDetail.category.external") },
  internal: { icon: <Factory className="h-3.5 w-3.5" />, color: "text-emerald-500", label: t("enterpriseDetail.category.internal") },
})

// 企业颜色（静态）
const STATIC_ENTERPRISE_COLORS: Record<string, string> = {
  yihua: "#06b6d4",
  luxi: "#8b5cf6",
  jinzhengda: "#f59e0b",
}

// 默认企业数据（后备）- 支持静态和动态企业
function getDefaultEnterpriseData(code: string): EnterpriseData | null {
  // 1. 先查静态配置
  const staticConfig = ENTERPRISE_CONFIGS.find(e => e.code === code)
  if (staticConfig) {
    const factorWeights = calculateEnterpriseFactorWeights(staticConfig)
    return {
      code: staticConfig.code,
      name: staticConfig.name,
      location: staticConfig.location,
      province: staticConfig.province,
      capacity: staticConfig.capacity,
      transportMode: staticConfig.transportMode,
      mainProducts: staticConfig.mainProducts,
      customerRegions: staticConfig.customerRegions,
      inventoryStrategy: staticConfig.inventoryStrategy,
      description: staticConfig.description,
      color: STATIC_ENTERPRISE_COLORS[code] || "#06b6d4",
      factorWeights,
      inventory: staticConfig.inventory,
    }
  }

  // 2. 再查动态企业（localStorage）
  const storedEnterprise = getEnterpriseByCode(code)
  if (storedEnterprise) {
    const config = convertStorageToConfig(storedEnterprise)
    const factorWeights = calculateEnterpriseFactorWeights(config)
    return {
      code: storedEnterprise.code,
      name: storedEnterprise.name,
      location: storedEnterprise.location || '',
      province: storedEnterprise.province || '',
      capacity: storedEnterprise.capacity || 80,
      transportMode: storedEnterprise.transportMode || 'water',
      mainProducts: storedEnterprise.mainProducts || [],
      customerRegions: storedEnterprise.customerRegions || [],
      inventoryStrategy: storedEnterprise.inventoryStrategy || 'moderate',
      description: storedEnterprise.description || '',
      color: getEnterpriseColor(code),
      factorWeights,
      inventory: {
        currentStock: storedEnterprise.currentStock || 5000,
        maxCapacity: storedEnterprise.maxCapacity || 10000,
        safetyDays: storedEnterprise.safetyDays || 20,
        avgConsumption: storedEnterprise.avgConsumption || 200,
        turnoverRate: storedEnterprise.turnoverRate || 8,
        lastPurchaseDate: storedEnterprise.lastPurchaseDate || new Date().toISOString().split('T')[0],
        nextPurchaseDate: storedEnterprise.nextPurchaseDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        supplierCount: storedEnterprise.supplierCount || 4,
        portDistance: storedEnterprise.portDistance || 100,
      },
    }
  }

  // 3. 企业不存在
  return null
}

export function EnterpriseDetail({ enterpriseCode }: EnterpriseDetailProps) {
  const [enterprise, setEnterprise] = useState<EnterpriseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { t } = useLanguage()

  useEffect(() => {
    async function fetchEnterpriseData() {
      setLoading(true)
      setError(null)
      try {
        const [neo4jRes] = await Promise.all([
          fetch(`/api/neo4j/graph?enterprise=${enterpriseCode}`),
        ])

        if (!neo4jRes.ok) {
          throw new Error("Failed to fetch enterprise data")
        }
        const data = await neo4jRes.json()

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
          color: getEnterpriseColor(enterpriseCode),
          factorWeights,
        }

        setEnterprise(enterpriseData)
      } catch (err) {
        console.error("Failed to fetch enterprise data:", err)
        setError(t("enterpriseDetail.loadError"))
        // 使用默认数据
        const defaultData = getDefaultEnterpriseData(enterpriseCode)
        if (defaultData) {
          setEnterprise(defaultData)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchEnterpriseData()
  }, [enterpriseCode])

  function getEnterpriseName(code: string): string {
    return getEnterpriseNameByCode(code)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  if (!enterprise) {
    return <div className="text-center py-8 text-slate-500">{t("enterpriseDetail.notFound")}</div>
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
              {t("enterpriseDetail.capacityPrefix")}{enterprise.capacity}{t("enterpriseDetail.capacitySuffix")}
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
                {t("enterpriseDetail.mainTransport")}<TransportLabel mode={enterprise.transportMode} t={t} />
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {t("enterpriseDetail.mainProducts")}{enterprise.mainProducts.slice(0, 2).join(", ")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">{t("enterpriseDetail.inventoryStrategy")}</span>
              <InventoryStrategyBadge strategy={enterprise.inventoryStrategy} t={t} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-500">{t("enterpriseDetail.salesRegions")}</span>
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
              <CardTitle className="text-lg text-slate-900 dark:text-white">{t("enterpriseDetail.factorWeights")}</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs text-slate-500">
              <Info className="h-3 w-3 mr-1" />
              {t("enterpriseDetail.factorWeightsDesc")}
            </Badge>
          </div>
          <CardDescription>
            {t("enterpriseDetail.factorWeightsDetailPrefix")}{enterprise.name}{t("enterpriseDetail.factorWeightsDetailSuffix")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 因子类别图例 */}
          <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
            {Object.entries(CategoryConfig(t)).map(([key, config]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={config.color}>{config.icon}</span>
                <span className="text-xs text-slate-500">{config.label}</span>
              </div>
            ))}
          </div>

          {/* 因子列表 - 带原因说明 */}
          <div className="space-y-4">
            {enterprise.factorWeights.slice(0, 8).map((factor, index) => {
              const catConfig = CategoryConfig(t)[factor.category] || CategoryConfig(t).external
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
              <CardTitle className="text-base text-slate-900 dark:text-white">{t("enterpriseDetail.supplyFactors")}</CardTitle>
            </div>
            <CardDescription className="text-xs">
              {t("enterpriseDetail.supplyFactorsDesc")}
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
                <p className="text-xs text-slate-400 text-center py-2">{t("enterpriseDetail.noSupplyData")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 需求端因素 */}
        <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-violet-500" />
              <CardTitle className="text-base text-slate-900 dark:text-white">{t("enterpriseDetail.demandFactors")}</CardTitle>
            </div>
            <CardDescription className="text-xs">
              {t("enterpriseDetail.demandFactorsDesc")}
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
                <p className="text-xs text-slate-400 text-center py-2">{t("enterpriseDetail.noDemandData")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 库存因素 */}
        <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base text-slate-900 dark:text-white">{t("enterpriseDetail.inventoryFactors")}</CardTitle>
            </div>
            <CardDescription className="text-xs">
              {t("enterpriseDetail.inventoryFactorsDescPrefix")}{enterprise.inventoryStrategy === "aggressive" ? t("enterpriseDetail.strategy.aggressive") : enterprise.inventoryStrategy === "conservative" ? t("enterpriseDetail.strategy.conservative") : t("enterpriseDetail.strategy.moderate")}
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
                <p className="text-xs text-slate-400 text-center py-2">{t("enterpriseDetail.noInventoryData")}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 库存可视化 */}
      {enterprise.inventory && (
        <InventoryVisualization
          inventory={enterprise.inventory}
          inventoryStrategy={enterprise.inventoryStrategy}
          enterpriseColor={enterprise.color}
        />
      )}

      {/* 库存健康度仪表盘 */}
      {enterprise.inventory && (
        <InventoryHealthDashboard inventory={enterprise.inventory} />
      )}

      {/* 价格预测图表 */}
      <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" style={{ color: enterprise.color }} />
            <CardTitle className="text-lg text-slate-900 dark:text-white">{t("enterpriseDetail.pricePrediction")}</CardTitle>
          </div>
          <CardDescription>{t("enterpriseDetail.pricePredictionDesc")}</CardDescription>
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