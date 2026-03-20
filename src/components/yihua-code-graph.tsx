"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Network, TrendingUp, Database, Building2, FileText, Lightbulb, AlertTriangle, DollarSign, BarChart3, Newspaper, BookOpen, RefreshCw, ExternalLink, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"
import { useMarketDataOverview } from "@/hooks/use-external-data"

// 硫磺价格预测知识图谱数据 - 第一阶段：市场资讯库、企业经验库、制度规则库
const KNOWLEDGE_DATA = {
  // 核心实体：硫磺价格
  core: [
    { id: "sulfur-price", name: "硫磺价格", description: "核心预测目标，受供需、成本、政策等多因素影响" },
  ],

  // 数据源（新增）
  dataSources: [
    { id: "akshare", name: "AkShare", category: "market", description: "开源财经数据接口，提供大宗商品、期货、汇率等实时数据" },
    { id: "fred", name: "FRED", category: "macro", description: "美联储经济数据，提供全球经济指标、利率、通胀等历史数据" },
    { id: "gdelt", name: "GDELT", category: "news", description: "全球事件、情感和位置数据库，实时监测全球新闻事件" },
    { id: "longzhong", name: "隆众资讯", category: "industry", description: "硫磺行业专业数据源，提供价格、库存、供需数据" },
  ],

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
    // 数据源提供数据
    { source: "akshare", target: "crude-oil", type: "提供", weight: 0.95 },
    { source: "akshare", target: "usd-cny", type: "提供", weight: 0.95 },
    { source: "akshare", target: "fertilizer", type: "提供", weight: 0.9 },
    { source: "fred", target: "macro-factor", type: "提供", weight: 0.85 },
    { source: "gdelt", target: "news-event", type: "提供", weight: 0.8 },
    { source: "longzhong", target: "sulfur-price", type: "提供", weight: 1.0 },
    { source: "longzhong", target: "inventory", type: "提供", weight: 0.95 },

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

  // 价格影响权重
  factorWeights: [
    { factor: "供应端因素", weight: 0.9, trend: "up" },
    { factor: "需求端因素", weight: 0.85, trend: "stable" },
    { factor: "原油价格", weight: 0.82, trend: "up" },
    { factor: "成本因素", weight: 0.8, trend: "up" },
    { factor: "磷肥市场", weight: 0.78, trend: "stable" },
    { factor: "国际市场", weight: 0.75, trend: "down" },
    { factor: "港口库存", weight: 0.7, trend: "stable" },
    { factor: "天然气价格", weight: 0.68, trend: "up" },
    { factor: "美元汇率", weight: 0.65, trend: "down" },
    { factor: "海运运费", weight: 0.6, trend: "stable" },
    { factor: "宏观因素", weight: 0.55, trend: "up" },
    { factor: "季节性规律", weight: 0.5, trend: "stable" },
    { factor: "市场资讯", weight: 0.4, trend: "down" },
  ],

  // 数据源说明
  dataSourceInfo: [
    {
      name: "AkShare",
      url: "https://akshare.akfamily.xyz/",
      description: "开源财经数据接口库",
      apiKey: "无需API密钥，直接调用",
      dataTypes: ["期货价格", "汇率", "大宗商品", "A股行情"]
    },
    {
      name: "FRED",
      url: "https://fred.stlouisfed.org/",
      description: "美联储经济数据",
      apiKey: "需要申请API Key",
      dataTypes: ["经济指标", "利率", "通胀率", "GDP"]
    },
    {
      name: "GDELT",
      url: "https://www.gdeltproject.org/",
      description: "全球事件数据库",
      apiKey: "无需API密钥",
      dataTypes: ["全球新闻", "事件情感", "地理数据"]
    },
    {
      name: "隆众资讯",
      url: "https://www.oilchem.net/",
      description: "硫磺行业专业数据",
      apiKey: "需要企业账号",
      dataTypes: ["硫磺价格", "港口库存", "供需数据"]
    }
  ]
}

type NodeType = "core" | "dataSource" | "market" | "enterprise" | "rule" | "application"
type RelationType = "影响" | "关联" | "参考" | "研判" | "支撑" | "约束" | "规范" | "预测" | "监测" | "提供"

interface GraphNode {
  id: string
  name: string
  type: NodeType
  description: string
  category?: string
}

interface GraphLink {
  source: string
  target: string
  type: RelationType
  weight: number
}

export function YihuaCodeKnowledgeGraph() {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [filterType, setFilterType] = useState<NodeType | "all">("all")
  const svgRef = useRef<SVGSVGElement | null>(null)

  // 获取外部数据
  const marketData = useMarketDataOverview()
  const [dataVersion, setDataVersion] = useState(0)

  // 手动刷新数据
  const handleRefresh = () => {
    setDataVersion(v => v + 1)
  }

  // 更新因子权重数据（基于实时数据）
  const [liveWeights, setLiveWeights] = useState(KNOWLEDGE_DATA.factorWeights)

  useEffect(() => {
    if (marketData.loading) return

    const updated = [...KNOWLEDGE_DATA.factorWeights]

    // 根据实时数据更新趋势
    if (marketData.oil?.data?.latest) {
      const oilChange = marketData.oil.data.latest.changePercent
      const oilFactor = updated.find(f => f.factor === "原油价格")
      if (oilFactor) {
        oilFactor.trend = oilChange > 0.5 ? "up" : oilChange < -0.5 ? "down" : "stable"
      }
    }

    if (marketData.usdcny?.data?.latest) {
      const rateChange = marketData.usdcny.data.latest.changePercent
      const rateFactor = updated.find(f => f.factor === "美元汇率")
      if (rateFactor) {
        rateFactor.trend = rateChange > 0.2 ? "up" : rateChange < -0.2 ? "down" : "stable"
      }
    }

    if (marketData.bdi?.data?.latest) {
      const bdiChange = marketData.bdi.data.latest.changePercent
      const freightFactor = updated.find(f => f.factor === "海运运费")
      if (freightFactor) {
        freightFactor.trend = bdiChange > 1 ? "up" : bdiChange < -1 ? "down" : "stable"
      }
    }

    setLiveWeights(updated)
  }, [marketData.loading, marketData.oil, marketData.usdcny, marketData.bdi])

  // 构建节点列表
  const nodes: GraphNode[] = useMemo(() => {
    const allNodes: GraphNode[] = []

    KNOWLEDGE_DATA.core.forEach(c => {
      allNodes.push({ id: c.id, name: c.name, type: "core", description: c.description })
    })

    KNOWLEDGE_DATA.dataSources.forEach(d => {
      allNodes.push({ id: d.id, name: d.name, type: "dataSource", description: d.description, category: d.category })
    })

    KNOWLEDGE_DATA.marketNews.forEach(m => {
      allNodes.push({ id: m.id, name: m.name, type: "market", description: m.description, category: m.category })
    })

    KNOWLEDGE_DATA.enterpriseExp.forEach(e => {
      allNodes.push({ id: e.id, name: e.name, type: "enterprise", description: e.description })
    })

    KNOWLEDGE_DATA.rules.forEach(r => {
      allNodes.push({ id: r.id, name: r.name, type: "rule", description: r.description })
    })

    KNOWLEDGE_DATA.applications.forEach(a => {
      allNodes.push({ id: a.id, name: a.name, type: "application", description: a.description })
    })

    return allNodes
  }, [])

  // 构建连接关系
  const links: GraphLink[] = useMemo(() => {
    return KNOWLEDGE_DATA.relations.map(r => ({
      source: r.source,
      target: r.target,
      type: r.type as RelationType,
      weight: r.weight || 0.5,
    }))
  }, [])

  // 四舍五入到固定小数位，避免 SSR hydration 不匹配
  const round = (n: number, decimals: number = 2) => Number(n.toFixed(decimals))

  // 计算节点位置 - 放射状布局
  const positions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number; r: number; angle: number }>()
    const W = 900
    const H = 600
    const cx = W / 2
    const cy = H / 2

    // 按类型分组
    const coreNodes = nodes.filter(n => n.type === "core")
    const dataSourceNodes = nodes.filter(n => n.type === "dataSource")
    const marketNodes = nodes.filter(n => n.type === "market")
    const enterpriseNodes = nodes.filter(n => n.type === "enterprise")
    const ruleNodes = nodes.filter(n => n.type === "rule")
    const appNodes = nodes.filter(n => n.type === "application")

    // 核心节点 - 中心
    coreNodes.forEach((n, i) => {
      pos.set(n.id, { x: cx, y: cy, r: 24, angle: 0 })
    })

    // 数据源 - 内环（最靠近核心）
    dataSourceNodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / dataSourceNodes.length - Math.PI / 2
      const radius = 120
      pos.set(n.id, {
        x: round(cx + radius * Math.cos(angle)),
        y: round(cy + radius * Math.sin(angle)),
        r: 14,
        angle: angle
      })
    })

    // 市场因素 - 第二环
    marketNodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / marketNodes.length - Math.PI / 2
      const radius = 200
      pos.set(n.id, {
        x: round(cx + radius * Math.cos(angle)),
        y: round(cy + radius * Math.sin(angle)),
        r: 14,
        angle: angle
      })
    })

    // 企业经验 - 第三环
    enterpriseNodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / enterpriseNodes.length - Math.PI / 4
      const radius = 300
      pos.set(n.id, {
        x: round(cx + radius * Math.cos(angle)),
        y: round(cy + radius * Math.sin(angle)),
        r: 12,
        angle: angle
      })
    })

    // 制度规则 - 第四环
    ruleNodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / ruleNodes.length + Math.PI / 6
      const radius = 380
      pos.set(n.id, {
        x: round(cx + radius * Math.cos(angle)),
        y: round(cy + radius * Math.sin(angle)),
        r: 10,
        angle: angle
      })
    })

    // 应用场景 - 第五环（最外层）
    appNodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / appNodes.length
      const radius = 440
      pos.set(n.id, {
        x: round(cx + radius * Math.cos(angle)),
        y: round(cy + radius * Math.sin(angle)),
        r: 16,
        angle: angle
      })
    })

    return pos
  }, [nodes])

  // 过滤后的数据
  const filteredNodes = useMemo(() => {
    if (filterType === "all") return nodes
    return nodes.filter(n => n.type === filterType)
  }, [nodes, filterType])

  const filteredLinks = useMemo(() => {
    const filteredIds = new Set(filteredNodes.map(n => n.id))
    return links.filter(l => filteredIds.has(l.source) && filteredIds.has(l.target))
  }, [links, filteredNodes])

  // 相关节点
  const relatedIds = useMemo(() => {
    if (!selectedNode) return new Set<string>()
    const set = new Set<string>([selectedNode.id])
    links.forEach(l => {
      if (l.source === selectedNode.id) set.add(l.target)
      if (l.target === selectedNode.id) set.add(l.source)
    })
    return set
  }, [selectedNode, links])

  const isDimmed = (id: string) => selectedNode != null && !relatedIds.has(id)

  // 节点颜色
  const getNodeColor = (type: NodeType) => {
    switch (type) {
      case "core":
        return { fill: "rgba(239, 68, 68, 0.9)", stroke: "#EF4444", glow: "rgba(239, 68, 68, 0.6)" }
      case "dataSource":
        return { fill: "rgba(6, 182, 212, 0.8)", stroke: "#06B6D4", glow: "rgba(6, 182, 212, 0.5)" }
      case "market":
        return { fill: "rgba(59, 130, 246, 0.8)", stroke: "#3B82F6", glow: "rgba(59, 130, 246, 0.5)" }
      case "enterprise":
        return { fill: "rgba(16, 185, 129, 0.8)", stroke: "#10B981", glow: "rgba(16, 185, 129, 0.5)" }
      case "rule":
        return { fill: "rgba(245, 158, 11, 0.8)", stroke: "#F59E0B", glow: "rgba(245, 158, 11, 0.5)" }
      case "application":
        return { fill: "rgba(139, 92, 246, 0.8)", stroke: "#8B5CF6", glow: "rgba(139, 92, 246, 0.5)" }
      default:
        return { fill: "rgba(148, 163, 184, 0.8)", stroke: "#94A3B8", glow: "rgba(148, 163, 184, 0.5)" }
    }
  }

  // 连线颜色
  const getLinkColor = (type: RelationType) => {
    switch (type) {
      case "提供": return "rgba(6, 182, 212, 0.5)"
      case "影响": return "rgba(239, 68, 68, 0.5)"
      case "关联": return "rgba(59, 130, 246, 0.4)"
      case "参考": return "rgba(16, 185, 129, 0.4)"
      case "研判": return "rgba(16, 185, 129, 0.5)"
      case "支撑": return "rgba(139, 92, 246, 0.4)"
      case "约束": return "rgba(245, 158, 11, 0.5)"
      case "规范": return "rgba(245, 158, 11, 0.4)"
      case "预测": return "rgba(236, 72, 153, 0.5)"
      case "监测": return "rgba(236, 72, 153, 0.4)"
      default: return "rgba(148, 163, 184, 0.3)"
    }
  }

  // 柔和曲线
  const linkPathD = (sx: number, sy: number, tx: number, ty: number) => {
    const mx = round((sx + tx) / 2)
    const my = round((sy + ty) / 2)
    const dx = tx - sx
    const dy = ty - sy
    const len = Math.hypot(dx, dy) || 1
    const bend = Math.min(30, len * 0.2)
    const cpx = round(mx - dy / len * bend)
    const cpy = round(my + dx / len * bend)
    return `M ${sx} ${sy} Q ${cpx} ${cpy} ${tx} ${ty}`
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Network className="h-5 w-5" />
                硫磺价格预测知识图谱
              </CardTitle>
              <CardDescription>
                第一阶段：市场资讯库、企业经验库、制度规则库
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={marketData.loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${marketData.loading ? "animate-spin" : ""}`} />
              刷新数据
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 实时市场数据卡片 */}
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border bg-linear-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <BarChart3 className="h-3 w-3" />
                  WTI原油
                </span>
                {marketData.oil?.data?.latest && (
                  <span className={marketData.oil.data.latest.changePercent > 0 ? "text-red-500" : marketData.oil.data.latest.changePercent < 0 ? "text-green-500" : "text-muted-foreground"}>
                    {marketData.oil.data.latest.changePercent > 0 ? <ArrowUpRight className="h-3 w-3 inline" /> : marketData.oil.data.latest.changePercent < 0 ? <ArrowDownRight className="h-3 w-3 inline" /> : <Minus className="h-3 w-3 inline" />}
                    {marketData.oil.data.latest.changePercent > 0 ? "+" : ""}{marketData.oil.data.latest.changePercent.toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums">
                {marketData.loading ? "..." : marketData.oil?.data?.latest?.value?.toFixed(2) || "--"}
              </div>
              <div className="text-xs text-muted-foreground">美元/桶</div>
            </div>
            <div className="rounded-lg border bg-linear-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3" />
                  美元汇率
                </span>
                {marketData.usdcny?.data?.latest && (
                  <span className={marketData.usdcny.data.latest.changePercent > 0 ? "text-red-500" : marketData.usdcny.data.latest.changePercent < 0 ? "text-green-500" : "text-muted-foreground"}>
                    {marketData.usdcny.data.latest.changePercent > 0 ? <ArrowUpRight className="h-3 w-3 inline" /> : marketData.usdcny.data.latest.changePercent < 0 ? <ArrowDownRight className="h-3 w-3 inline" /> : <Minus className="h-3 w-3 inline" />}
                    {marketData.usdcny.data.latest.changePercent > 0 ? "+" : ""}{marketData.usdcny.data.latest.changePercent.toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums">
                {marketData.loading ? "..." : marketData.usdcny?.data?.latest?.value?.toFixed(4) || "--"}
              </div>
              <div className="text-xs text-muted-foreground">人民币/美元</div>
            </div>
            <div className="rounded-lg border bg-linear-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-950/30 dark:to-cyan-900/20 p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3" />
                  BDI指数
                </span>
                {marketData.bdi?.data?.latest && (
                  <span className={marketData.bdi.data.latest.changePercent > 0 ? "text-red-500" : marketData.bdi.data.latest.changePercent < 0 ? "text-green-500" : "text-muted-foreground"}>
                    {marketData.bdi.data.latest.changePercent > 0 ? <ArrowUpRight className="h-3 w-3 inline" /> : marketData.bdi.data.latest.changePercent < 0 ? <ArrowDownRight className="h-3 w-3 inline" /> : <Minus className="h-3 w-3 inline" />}
                    {marketData.bdi.data.latest.changePercent > 0 ? "+" : ""}{marketData.bdi.data.latest.changePercent.toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums">
                {marketData.loading ? "..." : marketData.bdi?.data?.latest?.value?.toFixed(0) || "--"}
              </div>
              <div className="text-xs text-muted-foreground">波罗的海干散货</div>
            </div>
            <div className="rounded-lg border bg-linear-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Newspaper className="h-3 w-3" />
                  相关新闻
                </span>
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums">
                {marketData.loading ? "..." : (marketData.news?.data as any)?.totalArticles || "--"}
              </div>
              <div className="text-xs text-muted-foreground">GDELT数据源</div>
            </div>
          </div>

          {/* 统计卡片 */}
          <div className="grid gap-3 md:grid-cols-6">
            <div className="rounded-lg border bg-linear-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                核心实体
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{KNOWLEDGE_DATA.core.length}</div>
            </div>
            <div className="rounded-lg border bg-linear-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-950/30 dark:to-cyan-900/20 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Database className="h-3 w-3" />
                数据源
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{KNOWLEDGE_DATA.dataSources.length}</div>
            </div>
            <div className="rounded-lg border bg-linear-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Newspaper className="h-3 w-3" />
                市场资讯
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{KNOWLEDGE_DATA.marketNews.length}</div>
            </div>
            <div className="rounded-lg border bg-linear-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                企业经验
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{KNOWLEDGE_DATA.enterpriseExp.length}</div>
            </div>
            <div className="rounded-lg border bg-linear-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                制度规则
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{KNOWLEDGE_DATA.rules.length}</div>
            </div>
            <div className="rounded-lg border bg-linear-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lightbulb className="h-3 w-3" />
                预测应用
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{KNOWLEDGE_DATA.applications.length}</div>
            </div>
          </div>

          {/* 过滤器 */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("all")}
            >
              全部
            </Button>
            <Button
              variant={filterType === "core" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("core")}
            >
              核心实体
            </Button>
            <Button
              variant={filterType === "dataSource" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("dataSource")}
            >
              数据源
            </Button>
            <Button
              variant={filterType === "market" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("market")}
            >
              市场资讯
            </Button>
            <Button
              variant={filterType === "enterprise" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("enterprise")}
            >
              企业经验
            </Button>
            <Button
              variant={filterType === "rule" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("rule")}
            >
              制度规则
            </Button>
            <Button
              variant={filterType === "application" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("application")}
            >
              预测应用
            </Button>
          </div>

          {/* 知识图谱 */}
          <div className="rounded-lg border overflow-hidden">
            <svg
              ref={svgRef}
              viewBox="0 0 900 600"
              className="w-full h-[500px]"
              style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}
            >
              <defs>
                {/* 发光效果 */}
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* 柔和阴影 */}
                <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                  <feOffset dx="0" dy="2" />
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.3" />
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* 流体效果滤镜 */}
                <filter id="fluid" x="-20%" y="-20%" width="140%" height="140%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" result="noise" seed="1">
                    <animate attributeName="seed" values="1;20;1" dur="15s" repeatCount="indefinite" />
                  </feTurbulence>
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
                </filter>

                <style>
                  {`
                    .kg-line {
                      stroke-linecap: round;
                      transition: opacity 0.3s ease;
                    }
                    .kg-node {
                      transition: all 0.3s ease;
                      cursor: pointer;
                    }
                    .kg-node:hover {
                      filter: url(#glow);
                    }

                    /* 节点浮动动画 */
                    @keyframes float {
                      0%, 100% { transform: translateY(0px); }
                      50% { transform: translateY(-8px); }
                    }

                    @keyframes floatSlow {
                      0%, 100% { transform: translateY(0px); }
                      50% { transform: translateY(-5px); }
                    }

                    @keyframes pulse {
                      0%, 100% { opacity: 0.4; }
                      50% { opacity: 0.8; }
                    }

                    @keyframes dash {
                      to { stroke-dashoffset: -20; }
                    }

                    @keyframes ripple {
                      0% { r: 0; opacity: 0.6; }
                      100% { r: 40; opacity: 0; }
                    }

                    @keyframes glow-pulse {
                      0%, 100% { opacity: 0.3; }
                      50% { opacity: 0.6; }
                    }

                    @keyframes rotate {
                      from { transform: rotate(0deg); }
                      to { transform: rotate(360deg); }
                    }

                    .node-float {
                      animation: float 5s ease-in-out infinite;
                    }

                    .node-float-slow {
                      animation: floatSlow 7s ease-in-out infinite;
                    }

                    .line-pulse {
                      animation: pulse 4s ease-in-out infinite;
                    }

                    .line-flow {
                      stroke-dasharray: 6, 4;
                      animation: dash 1.5s linear infinite;
                    }

                    .ripple {
                      animation: ripple 2.5s ease-out infinite;
                    }

                    .glow-pulse {
                      animation: glow-pulse 3s ease-in-out infinite;
                    }
                  `}
                </style>
              </defs>

              {/* 背景装饰圆环 */}
              <circle cx="450" cy="300" r="180" fill="none" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="1" className="line-pulse" />
              <circle cx="450" cy="300" r="280" fill="none" stroke="rgba(16, 185, 129, 0.1)" strokeWidth="1" style={{ animationDelay: "0.5s" }} className="line-pulse" />
              <circle cx="450" cy="300" r="360" fill="none" stroke="rgba(245, 158, 11, 0.1)" strokeWidth="1" style={{ animationDelay: "1s" }} className="line-pulse" />
              <circle cx="450" cy="300" r="430" fill="none" stroke="rgba(139, 92, 246, 0.1)" strokeWidth="1" style={{ animationDelay: "1.5s" }} className="line-pulse" />

              {/* 关系线 */}
              {filteredLinks.map((l, idx) => {
                const s = positions.get(l.source)
                const t = positions.get(l.target)
                if (!s || !t) return null
                const isHighlighted = selectedNode && (l.source === selectedNode.id || l.target === selectedNode.id)
                return (
                  <path
                    key={idx}
                    d={linkPathD(s.x, s.y, t.x, t.y)}
                    className={`kg-line ${isHighlighted ? "line-flow" : ""}`}
                    stroke={isHighlighted ? "#60A5FA" : getLinkColor(l.type)}
                    strokeWidth={isHighlighted ? 2.5 : Math.max(1, l.weight * 2)}
                    opacity={selectedNode ? (isHighlighted ? 1 : 0.08) : 0.5}
                    fill="none"
                  />
                )
              })}

              {/* 节点 */}
              {filteredNodes.map((n, nodeIdx) => {
                const p = positions.get(n.id)
                if (!p) return null
                const isSelected = selectedNode?.id === n.id
                const colors = getNodeColor(n.type)
                const dimmed = isDimmed(n.id)

                return (
                  <g
                    key={n.id}
                    className={`kg-node ${n.type === "core" ? "node-float" : n.type === "market" ? "node-float-slow" : ""}`}
                    style={{ animationDelay: `${nodeIdx * 0.1}s` }}
                    onClick={() => setSelectedNode(n)}
                  >
                    {/* 选中涟漪 */}
                    {isSelected && (
                      <>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={p.r + 4}
                          fill="none"
                          stroke={colors.stroke}
                          strokeWidth="2"
                          className="ripple"
                        />
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={p.r + 20}
                          fill="none"
                          stroke={colors.stroke}
                          strokeWidth="1"
                          className="ripple"
                          style={{ animationDelay: "0.5s" }}
                        />
                      </>
                    )}
                    {/* 节点光晕 */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={p.r + 6}
                      fill={colors.glow}
                      opacity={dimmed ? 0.05 : 0.3}
                      className="glow-pulse"
                    />
                    {/* 节点主体 */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={p.r + (isSelected ? 4 : 0)}
                      fill={colors.fill}
                      stroke={isSelected ? "#fff" : colors.stroke}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      opacity={dimmed ? 0.15 : 1}
                      filter="url(#softShadow)"
                    />
                    {/* 高光 */}
                    <circle
                      cx={p.x - p.r * 0.25}
                      cy={p.y - p.r * 0.25}
                      r={p.r * 0.3}
                      fill="rgba(255,255,255,0.4)"
                      opacity={dimmed ? 0.05 : 1}
                    />
                    {/* 标签 */}
                    <text
                      x={p.x}
                      y={p.y - p.r - 10}
                      textAnchor="middle"
                      fill="#E2E8F0"
                      fontSize="11"
                      fontWeight="500"
                      opacity={dimmed ? 0.3 : 1}
                    >
                      {n.name.length > 8 ? `${n.name.slice(0, 8)}…` : n.name}
                    </text>
                    <title>{`${n.name} - ${n.description}`}</title>
                  </g>
                )
              })}
            </svg>
          </div>

          {/* 图例 */}
          <div className="flex flex-wrap gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              核心实体
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-cyan-500" />
              数据源
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              市场资讯
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              企业经验
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              制度规则
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-violet-500" />
              预测应用
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 详情面板 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">节点详情</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {selectedNode ? (
              <div className="rounded-lg border bg-muted/10 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {selectedNode.type === "core" ? "核心实体" :
                      selectedNode.type === "dataSource" ? "数据源" :
                      selectedNode.type === "market" ? "市场资讯" :
                      selectedNode.type === "enterprise" ? "企业经验" :
                      selectedNode.type === "rule" ? "制度规则" : "预测应用"}
                  </Badge>
                  {selectedNode.category && (
                    <Badge variant="secondary">{selectedNode.category}</Badge>
                  )}
                </div>
                <div className="font-semibold text-lg">{selectedNode.name}</div>
                <p className="text-muted-foreground">{selectedNode.description}</p>

                {/* 显示相关关系 */}
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-muted-foreground mb-2">相关关系</div>
                  <div className="space-y-1">
                    {links
                      .filter(l => l.source === selectedNode.id || l.target === selectedNode.id)
                      .slice(0, 6)
                      .map((l, i) => {
                        const isSource = l.source === selectedNode.id
                        const otherId = isSource ? l.target : l.source
                        const otherNode = nodes.find(n => n.id === otherId)
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">
                              {isSource ? "→" : "←"}
                            </span>
                            <Badge variant="outline" className="text-[10px]">{l.type}</Badge>
                            <span className="font-medium">{otherNode?.name || otherId}</span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">点击图谱中的节点查看详细信息</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">价格影响因子权重</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={marketData.loading}>
                <RefreshCw className={`h-4 w-4 ${marketData.loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {liveWeights
                .sort((a, b) => b.weight - a.weight)
                .map((f, i) => (
                  <div key={f.factor} className="flex items-center gap-3 text-sm">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? "bg-red-500 text-white" :
                      i === 1 ? "bg-slate-400 text-white" :
                      i === 2 ? "bg-amber-700 text-white" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 font-medium">{f.factor}</div>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-blue-500 to-purple-500 rounded-full"
                        style={{ width: `${f.weight * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground w-10 text-right">
                      {(f.weight * 100).toFixed(0)}%
                    </div>
                    <div className={`text-xs ${
                      f.trend === "up" ? "text-red-500" :
                      f.trend === "down" ? "text-green-500" :
                      "text-muted-foreground"
                    }`}>
                      {f.trend === "up" ? "↑" : f.trend === "down" ? "↓" : "→"}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

          </div>
  )
}