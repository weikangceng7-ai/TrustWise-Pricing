"use client"

import { useMemo, useState, useRef, useLayoutEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Network, Building2, FileText, Lightbulb, DollarSign, BarChart3, Newspaper, RefreshCw, ArrowUpRight, ArrowDownRight, Minus, Clock } from "lucide-react"
import { useMarketDataOverview } from "@/hooks/use-external-data"
import { usePriceSummary } from "@/hooks/use-prices"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { KNOWLEDGE_DATA, type NodeType, type RelationType, type GraphNode, type GraphLink } from "./yihua-code-graph/knowledge-data"
import { NodeRealtimeDataSection } from "./yihua-code-graph/node-detail"

// 缓存过期时间：10分钟
const CACHE_DURATION_MS = 10 * 60 * 1000
// localStorage key
const CACHE_KEY = "yihua-knowledge-graph-cache"


export function YihuaCodeKnowledgeGraph() {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [filterType, setFilterType] = useState<NodeType | "all">("all")
  const svgRef = useRef<SVGSVGElement | null>(null)

  // 节点拖拽状态
  const [nodeOffsets, setNodeOffsets] = useState<Map<string, { x: number; y: number }>>(new Map())
  const [isDragging, setIsDragging] = useState(false)
  const dragNodeRef = useRef<{ node: GraphNode; startX: number; startY: number; offsetX: number; offsetY: number } | null>(null)

  // 还原节点位置
  const handleResetPositions = () => {
    setNodeOffsets(new Map())
  }

  // 获取 SVG 坐标
  const getSvgCoordinates = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const scaleX = 900 / rect.width
    const scaleY = 700 / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  // 开始拖拽节点
  const handleNodeMouseDown = (e: React.MouseEvent<SVGGElement>, node: GraphNode, originalX: number, originalY: number) => {
    e.stopPropagation()
    const coords = getSvgCoordinates(e as React.MouseEvent<SVGSVGElement>)
    const currentOffset = nodeOffsets.get(node.id)
    const currentX = currentOffset ? currentOffset.x : originalX
    const currentY = currentOffset ? currentOffset.y : originalY
    dragNodeRef.current = {
      node,
      startX: coords.x,
      startY: coords.y,
      offsetX: coords.x - currentX,
      offsetY: coords.y - currentY
    }
    setIsDragging(true)
    setSelectedNode(node)
  }

  // 拖拽移动 - 限制在边界内
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return
    const dragInfo = dragNodeRef.current
    if (!dragInfo) return
    const coords = getSvgCoordinates(e)
    // 边界限制：节点半径约 20px，留出边距
    const margin = 30
    const newX = Math.max(margin, Math.min(900 - margin, coords.x - dragInfo.offsetX))
    const newY = Math.max(margin, Math.min(700 - margin, coords.y - dragInfo.offsetY))
    setNodeOffsets(prev => {
      const next = new Map(prev)
      next.set(dragInfo.node.id, { x: newX, y: newY })
      return next
    })
  }

  // 结束拖拽
  const handleMouseUp = () => {
    setIsDragging(false)
    dragNodeRef.current = null
  }

  // 点击空白处取消选中
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) return
    setSelectedNode(null)
  }

  // 获取外部数据
  const marketData = useMarketDataOverview()
  // 获取硫磺价格（PostgreSQL 真实数据）
  const priceSummary = usePriceSummary("sulfur")

  // 缓存状态：记录上次缓存的时间和数据
  const [cacheTime, setCacheTime] = useState<Date | null>(() => {
    // 初始化时从 localStorage 读取缓存时间
    try {
      const stored = localStorage.getItem(CACHE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.cacheTime) {
          return new Date(parsed.cacheTime)
        }
      }
    } catch {
      // 忽略解析错误
    }
    return null
  })
  const [isRefreshing, setIsRefreshing] = useState(false)
  // 使用 ref 存储时间戳，避免在 effect 中调用 setState
  const currentTimestampRef = useRef<number | null>(null)

  // 初始化时间戳（仅在客户端首次渲染后执行一次）
  useLayoutEffect(() => {
    if (currentTimestampRef.current === null) {
      currentTimestampRef.current = Date.now()
    }
  }, [])

  const isCacheValid = (cacheTime: Date | null): boolean => {
    if (!cacheTime || currentTimestampRef.current === null) return false
    return currentTimestampRef.current - cacheTime.getTime() < CACHE_DURATION_MS
  }

  // 手动刷新数据
  const handleRefresh = () => {
    if (isRefreshing) return

    // 更新时间戳 - 在事件处理器中调用 Date.now() 是安全的
    // eslint-disable-next-line react-hooks/purity
    currentTimestampRef.current = Date.now()

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
  const displayTime = useMemo(() => {
    if (isCacheValid(cacheTime) && currentTimestampRef.current !== null) {
      // 返回一个模拟的"10分钟前"时间
      return new Date(currentTimestampRef.current - 10 * 60 * 1000)
    }
    return null
  }, [cacheTime])

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

    return updated
  }, [marketData.loading, marketData.oil, marketData.usdcny])

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

  // 计算节点位置 - 放射状布局（优化视觉美感）
  const positions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number; r: number; angle: number }>()
    const W = 900
    const H = 700
    const cx = W / 2
    const cy = H / 2 // 350

    // 按类型分组
    const coreNodes = nodes.filter(n => n.type === "core")
    const dataSourceNodes = nodes.filter(n => n.type === "dataSource")
    const marketNodes = nodes.filter(n => n.type === "market")
    const enterpriseNodes = nodes.filter(n => n.type === "enterprise")
    const ruleNodes = nodes.filter(n => n.type === "rule")
    const appNodes = nodes.filter(n => n.type === "application")

    // 核心节点 - 中心，最大最突出
    coreNodes.forEach((n) => {
      pos.set(n.id, { x: cx, y: cy, r: 22, angle: 0 })
    })

    // 数据源 - 内环（最靠近核心）
    dataSourceNodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / dataSourceNodes.length - Math.PI / 2
      const radius = 110
      pos.set(n.id, {
        x: round(cx + radius * Math.cos(angle)),
        y: round(cy + radius * Math.sin(angle)),
        r: 10,
        angle: angle
      })
    })

    // 市场因素 - 第二环，按类别分组排列（扇区布局），增大间距
    const marketByCategory: Record<string, GraphNode[]> = {}
    marketNodes.forEach(n => {
      const cat = n.category || "other"
      if (!marketByCategory[cat]) marketByCategory[cat] = []
      marketByCategory[cat].push(n)
    })
    const categories = Object.keys(marketByCategory)
    const categorySectorAngles: Record<string, { start: number; end: number }> = {}
    const sectorSize = (2 * Math.PI) / Math.max(categories.length, 1)
    categories.forEach((cat, i) => {
      const startAngle = -Math.PI / 2 + i * sectorSize
      categorySectorAngles[cat] = { start: startAngle, end: startAngle + sectorSize }
    })

    categories.forEach(cat => {
      const nodesInCat = marketByCategory[cat]
      const sector = categorySectorAngles[cat]
      nodesInCat.forEach((n, i) => {
        const angle = sector.start + sectorSize * (i + 0.5) / nodesInCat.length
        const radius = 170
        pos.set(n.id, {
          x: round(cx + radius * Math.cos(angle)),
          y: round(cy + radius * Math.sin(angle)),
          r: 8,
          angle: angle
        })
      })
    })

    // 企业经验 - 第三环，均匀分布，间距更大
    enterpriseNodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / enterpriseNodes.length + Math.PI / 10
      const radius = 220
      pos.set(n.id, {
        x: round(cx + radius * Math.cos(angle)),
        y: round(cy + radius * Math.sin(angle)),
        r: 7,
        angle: angle
      })
    })

    // 制度规则 - 第四环，交替分布避免重叠
    ruleNodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / ruleNodes.length - Math.PI / 8 + (i % 2 === 0 ? 0.12 : -0.12)
      const radius = 270
      pos.set(n.id, {
        x: round(cx + radius * Math.cos(angle)),
        y: round(cy + radius * Math.sin(angle)),
        r: 6,
        angle: angle
      })
    })

    // 应用场景 - 第五环（最外层），均匀分布
    appNodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / appNodes.length + Math.PI / 4
      const radius = 310
      pos.set(n.id, {
        x: round(cx + radius * Math.cos(angle)),
        y: round(cy + radius * Math.sin(angle)),
        r: 10,
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
                硫磺督价与采购智能决策知识图谱
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
                  {marketData.oil?.isMock && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">模拟</Badge>
                  )}
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
                  {marketData.usdcny?.isMock && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">模拟</Badge>
                  )}
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
            <div className="rounded-lg border bg-linear-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3" />
                  硫磺价格
                </span>
                {priceSummary.data?.data?.changePercent && (
                  <span className={Number(priceSummary.data?.data?.changePercent) > 0 ? "text-red-500" : Number(priceSummary.data?.data?.changePercent) < 0 ? "text-green-500" : "text-muted-foreground"}>
                    {Number(priceSummary.data?.data?.changePercent) > 0 ? <ArrowUpRight className="h-3 w-3 inline" /> : Number(priceSummary.data?.data?.changePercent) < 0 ? <ArrowDownRight className="h-3 w-3 inline" /> : <Minus className="h-3 w-3 inline" />}
                    {Number(priceSummary.data?.data?.changePercent) > 0 ? "+" : ""}{Number(priceSummary.data?.data?.changePercent).toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums">
                {priceSummary.isLoading ? "..." : priceSummary.data?.data?.currentPrice ? `¥${Number(priceSummary.data?.data?.currentPrice).toLocaleString()}` : "--"}
              </div>
              <div className="text-xs text-muted-foreground">元/吨</div>
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
          <div className="rounded-lg border overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative">
            {/* 还原按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetPositions}
              className="absolute top-2 right-2 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              还原位置
            </Button>
            <svg
              ref={svgRef}
              viewBox="0 0 900 700"
              className="w-full h-[600px] bg-transparent"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
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

              {/* 背景装饰圆环 - 与节点布局匹配 */}
              <rect x="0" y="0" width="900" height="700" fill="transparent" onClick={() => setSelectedNode(null)} style={{ cursor: "default" }} />
              <circle cx="450" cy="350" r="100" fill="none" stroke="rgba(6, 182, 212, 0.12)" strokeWidth="1" className="line-pulse dark:opacity-100" />
              <circle cx="450" cy="350" r="155" fill="none" stroke="rgba(59, 130, 246, 0.12)" strokeWidth="1" style={{ animationDelay: "0.5s" }} className="line-pulse dark:opacity-100" />
              <circle cx="450" cy="350" r="205" fill="none" stroke="rgba(16, 185, 129, 0.12)" strokeWidth="1" style={{ animationDelay: "1s" }} className="line-pulse dark:opacity-100" />
              <circle cx="450" cy="350" r="250" fill="none" stroke="rgba(245, 158, 11, 0.12)" strokeWidth="1" style={{ animationDelay: "1.5s" }} className="line-pulse dark:opacity-100" />
              <circle cx="450" cy="350" r="295" fill="none" stroke="rgba(139, 92, 246, 0.12)" strokeWidth="1" style={{ animationDelay: "2s" }} className="line-pulse dark:opacity-100" />

              {/* 关系线 */}
              {filteredLinks.map((l, idx) => {
                const s = positions.get(l.source)
                const t = positions.get(l.target)
                if (!s || !t) return null
                const isHighlighted = selectedNode && (l.source === selectedNode.id || l.target === selectedNode.id)
                // 使用节点偏移位置（如果有）
                const sOffset = nodeOffsets.get(l.source)
                const tOffset = nodeOffsets.get(l.target)
                const sx = sOffset ? sOffset.x : s.x
                const sy = sOffset ? sOffset.y : s.y
                const tx = tOffset ? tOffset.x : t.x
                const ty = tOffset ? tOffset.y : t.y
                return (
                  <path
                    key={idx}
                    d={linkPathD(sx, sy, tx, ty)}
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

                // 使用节点偏移位置（如果有）
                const offset = nodeOffsets.get(n.id)
                const nodeX = offset ? offset.x : p.x
                const nodeY = offset ? offset.y : p.y

                return (
                  <g
                    key={n.id}
                    className={`kg-node ${n.type === "core" ? "node-float" : n.type === "market" ? "node-float-slow" : ""}`}
                    style={{ animationDelay: `${nodeIdx * 0.1}s` }}
                    onMouseDown={(e) => handleNodeMouseDown(e, n, p.x, p.y)}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedNode(n)
                    }}
                  >
                    {/* 选中涟漪 */}
                    {isSelected && (
                      <>
                        <circle
                          cx={nodeX}
                          cy={nodeY}
                          r={p.r + 4}
                          fill="none"
                          stroke={colors.stroke}
                          strokeWidth="2"
                          className="ripple"
                        />
                        <circle
                          cx={nodeX}
                          cy={nodeY}
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
                      cx={nodeX}
                      cy={nodeY}
                      r={p.r + 6}
                      fill={colors.glow}
                      opacity={dimmed ? 0.05 : 0.3}
                      className="glow-pulse"
                    />
                    {/* 节点主体 - 无阴影 */}
                    <circle
                      cx={nodeX}
                      cy={nodeY}
                      r={p.r + (isSelected ? 4 : 0)}
                      fill={colors.fill}
                      stroke={isSelected ? "#fff" : colors.stroke}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      opacity={dimmed ? 0.15 : 1}
                    />
                    {/* 高光 */}
                    <circle
                      cx={nodeX - p.r * 0.25}
                      cy={nodeY - p.r * 0.25}
                      r={p.r * 0.3}
                      fill="rgba(255,255,255,0.4)"
                      opacity={dimmed ? 0.05 : 1}
                    />
                    {/* 标签 - 智能位置，避免重叠 */}
                    <text
                      x={nodeX}
                      y={p.angle > -Math.PI/2 && p.angle < Math.PI/2 ? nodeY - p.r - 14 : nodeY + p.r + 14}
                      textAnchor="middle"
                      dominantBaseline={p.angle > -Math.PI/2 && p.angle < Math.PI/2 ? "auto" : "hanging"}
                      className="fill-slate-700 dark:fill-slate-100"
                      fontSize="12"
                      fontWeight="500"
                      opacity={dimmed ? 0.25 : 1}
                      style={{ pointerEvents: "none" }}
                    >
                      {n.name.length > 5 ? `${n.name.slice(0, 4)}…` : n.name}
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
                        style={{ width: `${(f.weight / 0.15) * 100}%` }}
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

