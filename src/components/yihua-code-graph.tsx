"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Network, TrendingUp, Database, Building2, FileText, Lightbulb, DollarSign, BarChart3, Newspaper, RefreshCw, ArrowUpRight, ArrowDownRight, Minus, Clock } from "lucide-react"
import { useMarketDataOverview } from "@/hooks/use-external-data"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"

// 缓存过期时间：10分钟
const CACHE_DURATION_MS = 10 * 60 * 1000
// localStorage key
const CACHE_KEY = "yihua-knowledge-graph-cache"

// 硫磺价格预测知识图谱数据 - 第一阶段：市场资讯库、企业经验库、制度规则库
const KNOWLEDGE_DATA = {
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

type NodeType = "core" | "dataSource" | "market" | "enterprise" | "rule" | "application"
type RelationType = "影响" | "关联" | "参考" | "研判" | "支撑" | "约束" | "规范" | "预测" | "监测" | "提供"

// 节点实时数据映射配置 - 包含所有节点类型
const NODE_REALTIME_DATA_CONFIG: Record<string, {
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

  // 缓存状态：记录上次缓存的时间和数据
  const [cacheTime, setCacheTime] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 初始化时从 localStorage 读取缓存时间
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CACHE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.cacheTime) {
          setCacheTime(new Date(parsed.cacheTime))
        }
      }
    } catch {
      // 忽略解析错误
    }
  }, [])

  // 检查缓存是否有效（10分钟内）
  const isCacheValid = (cacheTime: Date | null): boolean => {
    if (!cacheTime) return false
    return Date.now() - cacheTime.getTime() < CACHE_DURATION_MS
  }

  // 手动刷新数据
  const handleRefresh = () => {
    if (isRefreshing) return

    // 如果缓存仍然有效，不刷新数据
    if (isCacheValid(cacheTime)) {
      return
    }

    setIsRefreshing(true)

    // 记录新的缓存时间
    const newCacheTime = new Date()
    setCacheTime(newCacheTime)

    // 保存到 localStorage
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        cacheTime: newCacheTime.toISOString()
      }))
    } catch {
      // 忽略存储错误
    }

    // 刷新数据
    marketData.refetchAll()

    setTimeout(() => {
      setIsRefreshing(false)
    }, 500)
  }

  // 计算显示的时间：如果缓存有效，显示"10分钟前"
  const getDisplayTime = (): Date | null => {
    if (isCacheValid(cacheTime)) {
      // 返回一个模拟的"10分钟前"时间
      return new Date(Date.now() - 10 * 60 * 1000)
    }
    return null
  }

  const displayTime = getDisplayTime()

  // 计算因子权重数据（基于实时数据）- 使用 useMemo 替代 useEffect + setState
  const liveWeights = useMemo(() => {
    if (marketData.loading) return KNOWLEDGE_DATA.factorWeights

    const updated = KNOWLEDGE_DATA.factorWeights.map(f => ({ ...f }))

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

    return updated
  }, [marketData.loading, marketData.oil, marketData.usdcny, marketData.bdi])

  // 构建节点列表
  const nodes: GraphNode[] = useMemo(() => {
    const allNodes: GraphNode[] = []

    KNOWLEDGE_DATA.core.forEach(c => {
      allNodes.push({ id: c.id, name: c.name, type: "core", description: c.description })
    })

    KNOWLEDGE_DATA.dataSources.forEach((d: { id: string; name: string; description: string; category?: string }) => {
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
    coreNodes.forEach((n) => {
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
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing || marketData.loading || isCacheValid(cacheTime)}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
                刷新数据
              </Button>
              {displayTime && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  数据时间: {formatDistanceToNow(displayTime, { addSuffix: true, locale: zhCN })}
                </span>
              )}
            </div>
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
                {marketData.loading ? "..." : ("totalArticles" in (marketData.news?.data || {}) ? (marketData.news?.data as { totalArticles: number }).totalArticles : "--")}
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
              <div className="rounded-lg border bg-muted/10 p-3 space-y-3">
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

                {/* 实时数据区域 */}
                <NodeRealtimeDataSection
                  nodeId={selectedNode.id}
                  marketData={marketData}
                  liveWeights={liveWeights}
                  loading={marketData.loading}
                />

                {/* 显示相关关系 */}
                <div className="pt-3 border-t">
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
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing || marketData.loading || isCacheValid(cacheTime)}>
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
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

// 节点实时数据展示组件
function NodeRealtimeDataSection({
  nodeId,
  marketData,
  liveWeights,
  loading
}: {
  nodeId: string
  marketData: ReturnType<typeof useMarketDataOverview>
  liveWeights: typeof KNOWLEDGE_DATA.factorWeights
  loading: boolean
}) {
  const config = NODE_REALTIME_DATA_CONFIG[nodeId]

  if (!config) return null

  // 价格类型数据
  if (config.dataType === 'price' && config.marketKey) {
    const data = marketData[config.marketKey]

    if (loading) {
      return (
        <div className="pt-3 border-t">
          <div className="text-xs text-muted-foreground mb-2">{config.title}</div>
          <div className="text-sm text-muted-foreground">加载中...</div>
        </div>
      )
    }

    // 类型守卫：检查是否为 AkShare 类型数据
    type AkShareData = { data: { latest: { value: number; change: number; changePercent: number }; unit: string } }
    const isAkShareData = (d: unknown): d is AkShareData => {
      if (typeof d !== 'object' || d === null) return false
      const obj = d as Record<string, unknown>
      if (!('data' in obj)) return false
      const dataObj = obj.data as Record<string, unknown>
      return 'latest' in dataObj && 'unit' in dataObj
    }

    if (!data || !isAkShareData(data)) return null

    const latest = data.data.latest
    const isUp = latest.changePercent > 0
    const isDown = latest.changePercent < 0

    return (
      <div className="pt-3 border-t">
        <div className="text-xs text-muted-foreground mb-2">{config.title}</div>
        <div className="flex items-center gap-3">
          <span className="text-xl font-semibold tabular-nums">
            {latest.value.toFixed(config.marketKey === 'usdcny' ? 4 : 2)}
          </span>
          <span className="text-xs text-muted-foreground">{data.data.unit}</span>
          <Badge
            variant={isUp ? "default" : isDown ? "destructive" : "secondary"}
            className="text-xs"
          >
            {isUp && <ArrowUpRight className="mr-1 h-3 w-3" />}
            {isDown && <ArrowDownRight className="mr-1 h-3 w-3" />}
            {!isUp && !isDown && <Minus className="mr-1 h-3 w-3" />}
            {isUp ? "+" : ""}{latest.change.toFixed(2)} ({isUp ? "+" : ""}{latest.changePercent.toFixed(2)}%)
          </Badge>
        </div>
      </div>
    )
  }

  // 新闻类型数据
  if (config.dataType === 'news' && config.marketKey === 'news') {
    const newsData = marketData.news

    if (loading) {
      return (
        <div className="pt-3 border-t">
          <div className="text-xs text-muted-foreground mb-2">{config.title}</div>
          <div className="text-sm text-muted-foreground">加载中...</div>
        </div>
      )
    }

    const newsContent = newsData?.data as { topics?: { keyword: string; count: number; articles: { title: string; url: string }[] }[]; totalArticles?: number } | undefined
    if (!newsContent?.topics?.length) return null

    return (
      <div className="pt-3 border-t">
        <div className="text-xs text-muted-foreground mb-2">
          {config.title}
          <Badge variant="outline" className="ml-2">{newsContent.totalArticles} 篇</Badge>
        </div>
        <div className="space-y-2">
          {newsContent.topics.slice(0, 2).map((topic, i) => (
            <div key={i} className="text-xs">
              <div className="font-medium">{topic.keyword} <Badge variant="secondary" className="text-[10px]">{topic.count}</Badge></div>
              {topic.articles[0] && (
                <a
                  href={topic.articles[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary truncate block mt-1"
                >
                  • {topic.articles[0].title}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 权重类型数据
  if (config.dataType === 'weight') {
    return (
      <div className="pt-3 border-t">
        <div className="text-xs text-muted-foreground mb-2">{config.title}</div>
        <div className="space-y-1">
          {liveWeights
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 5)
            .map((f, i) => (
              <div key={f.factor} className="flex items-center gap-2 text-xs">
                <span className="w-4 text-muted-foreground">{i + 1}.</span>
                <span className="flex-1">{f.factor}</span>
                <span className="text-muted-foreground">{(f.weight * 100).toFixed(0)}%</span>
                <span className={f.trend === "up" ? "text-red-500" : f.trend === "down" ? "text-green-500" : "text-muted-foreground"}>
                  {f.trend === "up" ? "↑" : f.trend === "down" ? "↓" : "→"}
                </span>
              </div>
            ))}
        </div>
      </div>
    )
  }

  // 数据源类型
  if (config.dataType === 'source') {
    const sourceInfo = KNOWLEDGE_DATA.dataSourceInfo.find(s => s.name === config.title)

    if (!sourceInfo) return null

    return (
      <div className="pt-3 border-t space-y-2">
        <div className="text-xs text-muted-foreground">数据源信息</div>
        <div className="text-xs space-y-1.5">
          <div className="flex items-start gap-1">
            <span className="text-muted-foreground shrink-0">描述：</span>
            <span>{sourceInfo.description}</span>
          </div>
          <div className="flex items-start gap-1">
            <span className="text-muted-foreground shrink-0">API：</span>
            <span className={sourceInfo.apiKey.includes('无需') ? 'text-green-600' : 'text-amber-600'}>
              {sourceInfo.apiKey}
            </span>
          </div>
          <div className="flex items-start gap-1">
            <span className="text-muted-foreground shrink-0">数据：</span>
            <span className="flex flex-wrap gap-1">
              {sourceInfo.dataTypes.slice(0, 4).map((t, i) => (
                <Badge key={i} variant="outline" className="text-[10px] px-1 py-0">{t}</Badge>
              ))}
            </span>
          </div>
          {'endpoints' in sourceInfo && sourceInfo.endpoints && (
            <div className="flex items-start gap-1">
              <span className="text-muted-foreground shrink-0">接口：</span>
              <code className="text-[10px] bg-muted px-1 rounded break-all">
                {sourceInfo.endpoints[0]}
              </code>
            </div>
          )}
          {'status' in sourceInfo && sourceInfo.status && (
            <div className="flex items-start gap-1">
              <span className="text-muted-foreground shrink-0">状态：</span>
              <span className="text-muted-foreground">{sourceInfo.status}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 静态信息类型 - 显示节点相关的详细分析信息
  if (config.dataType === 'static') {
    const staticInfo = getStaticNodeInfo(nodeId, liveWeights, marketData)
    return (
      <div className="pt-3 border-t space-y-2">
        <div className="text-xs text-muted-foreground">{config.title}</div>
        <div className="text-xs space-y-1.5">
          {staticInfo.map((item, i) => (
            <div key={i} className="flex items-start gap-1">
              <span className="text-muted-foreground shrink-0">{item.label}：</span>
              <span className={item.highlight ? 'text-primary font-medium' : ''}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}

// 获取静态节点的详细信息
function getStaticNodeInfo(
  nodeId: string,
  weights: typeof KNOWLEDGE_DATA.factorWeights,
  marketData: ReturnType<typeof useMarketDataOverview>
): { label: string; value: string; highlight?: boolean }[] {
  switch (nodeId) {
    case 'supply-factor':
      return [
        { label: '国内产量', value: '月均约 80-100 万吨' },
        { label: '进口量', value: '月均约 60-80 万吨' },
        { label: '主要来源', value: '中东(沙特、阿联酋)、加拿大' },
        { label: '供应趋势', value: '当前供应平稳，中东出货正常', highlight: true },
      ]
    case 'demand-factor':
      return [
        { label: '磷肥需求', value: '春耕备肥期需求旺盛' },
        { label: '硫酸需求', value: '化工行业需求稳定' },
        { label: '下游开工率', value: '约 75-80%' },
        { label: '需求趋势', value: '短期需求偏强，关注春耕进度', highlight: true },
      ]
    case 'inventory':
      return [
        { label: '主要港口库存', value: '约 45-55 万吨' },
        { label: '库存消费比', value: '约 3-4 周' },
        { label: '库存预警线', value: '低于 40 万吨为紧张' },
        { label: '库存状态', value: '当前库存处于合理区间', highlight: true },
      ]
    case 'seasonal':
      return [
        { label: '春耕备肥', value: '2-4月，需求高峰期' },
        { label: '秋季备肥', value: '8-10月，次高峰期' },
        { label: '淡季', value: '5-7月、11-1月' },
        { label: '当前阶段', value: '春耕备肥期，价格易涨难跌', highlight: true },
      ]
    case 'fertilizer':
      return [
        { label: '磷酸一铵', value: '约 3200-3500 元/吨' },
        { label: '磷酸二铵', value: '约 3600-4000 元/吨' },
        { label: '开工率', value: '约 70-75%' },
        { label: '市场状态', value: '价格稳中有升，企业利润改善', highlight: true },
      ]
    case 'sulfuric-acid':
      return [
        { label: '硫酸价格', value: '约 150-250 元/吨' },
        { label: '主要用途', value: '磷肥生产(约 70%)' },
        { label: '供应来源', value: '冶炼酸、硫磺制酸' },
        { label: '市场状态', value: '供应充足，价格稳定', highlight: true },
      ]
    case 'purchase-record':
      return [
        { label: '最近采购', value: '2024年1月，均价 950 元/吨' },
        { label: '采购量', value: '月均约 5000 吨' },
        { label: '主要供应商', value: '沙特阿美、中化' },
        { label: '采购策略', value: '分批采购，控制库存风险', highlight: true },
      ]
    case 'price-judgment':
      return [
        { label: '价格区间', value: '近期 900-1000 元/吨' },
        { label: '趋势判断', value: '短期偏强震荡' },
        { label: '关键点位', value: '支撑 900，压力 1050' },
        { label: '专家观点', value: '建议逢低分批采购', highlight: true },
      ]
    case 'inventory-strategy':
      return [
        { label: '安全库存', value: '10-15 天用量' },
        { label: '备货周期', value: '进口周期约 30-45 天' },
        { label: '库存预警', value: '低于 7 天用量需紧急补库' },
        { label: '策略建议', value: '春耕前适当增加库存', highlight: true },
      ]
    case 'supplier-relation':
      return [
        { label: '主要供应商', value: '沙特阿美、中化、中海油' },
        { label: '合作年限', value: '5-10 年长期合作' },
        { label: '付款条件', value: '信用证 30-60 天' },
        { label: '合作状态', value: '关系稳定，优先供货保障', highlight: true },
      ]
    case 'risk-case':
      return [
        { label: '2023年案例', value: '价格从 800 涨至 1200 元/吨' },
        { label: '原因分析', value: '国际原油上涨 + 春耕需求' },
        { label: '应对措施', value: '提前锁定部分长单' },
        { label: '经验教训', value: '关注原油走势，提前布局', highlight: true },
      ]
    case 'procurement-rule':
      return [
        { label: '审批流程', value: '采购申请 → 审批 → 合同签订' },
        { label: '审批权限', value: '10万以下经理审批，以上需副总' },
        { label: '采购周期', value: '月度计划，周度执行' },
        { label: '合规要求', value: '需三家比价或长期协议', highlight: true },
      ]
    case 'quality-standard':
      return [
        { label: '纯度要求', value: '≥ 99.5%' },
        { label: '水分', value: '≤ 0.5%' },
        { label: '灰分', value: '≤ 0.1%' },
        { label: '检验标准', value: 'GB/T 2449-2014', highlight: true },
      ]
    case 'contract-rule':
      return [
        { label: '定价机制', value: '公式定价(基准价+升贴水)' },
        { label: '结算方式', value: '信用证结算' },
        { label: '交货方式', value: 'CFR 中国港口' },
        { label: '违约条款', value: '延迟交货每日罚 0.5%', highlight: true },
      ]
    case 'risk-policy':
      return [
        { label: '价格预警', value: '单周涨跌超 5% 触发预警' },
        { label: '库存预警', value: '库存低于 7 天用量预警' },
        { label: '应对预案', value: '启动备选供应商、调整采购计划' },
        { label: '止损机制', value: '设置采购价格上限', highlight: true },
      ]
    case 'storage-rule':
      return [
        { label: '存储条件', value: '干燥通风，远离火源' },
        { label: '堆放要求', value: '不超过 3 层，离地 10cm' },
        { label: '损耗标准', value: '≤ 0.5%/月' },
        { label: '安全要求', value: '配备消防设施，定期检查', highlight: true },
      ]
    case 'short-forecast':
      const oilTrend = weights.find(w => w.factor === '原油价格')?.trend || 'stable'
      const shortTermTrend = oilTrend === 'up' ? '偏强震荡' : oilTrend === 'down' ? '偏弱运行' : '平稳运行'
      return [
        { label: '预测周期', value: '1-4 周' },
        { label: '价格区间', value: '920-980 元/吨' },
        { label: '趋势判断', value: shortTermTrend, highlight: true },
        { label: '置信度', value: '中等 (65%)' },
      ]
    case 'medium-forecast':
      return [
        { label: '预测周期', value: '1-3 个月' },
        { label: '价格区间', value: '900-1050 元/吨' },
        { label: '趋势判断', value: '震荡偏强，关注春耕需求', highlight: true },
        { label: '关键变量', value: '原油价格、港口库存、下游开工' },
      ]
    case 'decision-support':
      return [
        { label: '采购建议', value: '分批采购，控制节奏' },
        { label: '建议采购量', value: '满足 15-20 天用量' },
        { label: '价格参考', value: '低于 950 可适当增加采购' },
        { label: '执行建议', value: '关注原油走势，择机锁定长单', highlight: true },
      ]
    case 'risk-warning':
      const riskLevel = weights.find(w => w.factor === '供应端因素')?.weight || 0.5
      const riskStatus = riskLevel > 0.85 ? '偏高' : riskLevel > 0.7 ? '中等' : '较低'
      return [
        { label: '风险等级', value: riskStatus, highlight: true },
        { label: '主要风险', value: '原油价格波动、汇率风险' },
        { label: '监测指标', value: '原油、汇率、港口库存' },
        { label: '建议措施', value: '保持安全库存，关注市场动态' },
      ]
    default:
      return [
        { label: '状态', value: '正常' },
      ]
  }
}