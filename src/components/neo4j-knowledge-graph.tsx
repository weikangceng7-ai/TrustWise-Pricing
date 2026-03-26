"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Database, AlertTriangle, CheckCircle, Network, TrendingUp, TrendingDown, Activity } from "lucide-react"

interface GraphNode {
  id: string
  label: string
  type: string
  properties: Record<string, unknown>
}

interface GraphLink {
  source: string
  target: string
  type: string
  weight?: number
  reason?: string
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
  enterprise?: string
}

interface Neo4jStatus {
  connected: boolean
  version?: string
  error?: string
}

// 企业颜色配置
const ENTERPRISE_COLORS: Record<string, { primary: string; secondary: string; glow: string }> = {
  yihua: { primary: "#06b6d4", secondary: "#0891b2", glow: "rgba(6, 182, 212, 0.5)" },
  luxi: { primary: "#8b5cf6", secondary: "#7c3aed", glow: "rgba(139, 92, 246, 0.5)" },
  jinzhengda: { primary: "#f59e0b", secondary: "#d97706", glow: "rgba(245, 158, 11, 0.5)" },
}

// 因子类别颜色
const FACTOR_COLORS: Record<string, { primary: string; gradient: string }> = {
  supply: { primary: "#3b82f6", gradient: "from-blue-500 to-blue-600" },
  demand: { primary: "#8b5cf6", gradient: "from-violet-500 to-violet-600" },
  inventory: { primary: "#f59e0b", gradient: "from-amber-500 to-amber-600" },
  external: { primary: "#06b6d4", gradient: "from-cyan-500 to-cyan-600" },
  internal: { primary: "#10b981", gradient: "from-emerald-500 to-emerald-600" },
}

// 节点位置计算 - 力导向布局简化版
function calculateNodePositions(nodes: GraphNode[], links: GraphLink[], width: number, height: number) {
  const positions: Record<string, { x: number; y: number; z: number }> = {}

  // 找到企业节点
  const enterpriseNode = nodes.find(n => n.type === "Enterprise")
  const factorNodes = nodes.filter(n => n.type === "Factor")

  // 企业节点在中心
  if (enterpriseNode) {
    positions[enterpriseNode.id] = { x: width / 2, y: height / 2, z: 0 }
  }

  // 因子节点围绕企业节点排列
  const factorCount = factorNodes.length
  const radius = Math.min(width, height) * 0.35

  factorNodes.forEach((node, index) => {
    // 根据权重计算角度偏移
    const link = links.find(l => l.target === node.id && l.source === enterpriseNode?.id)
    const weight = link?.weight || 10
    const angleOffset = weight * 0.02 // 权重影响角度

    const baseAngle = (index / factorCount) * 2 * Math.PI - Math.PI / 2
    const angle = baseAngle + angleOffset

    // 添加一些随机扰动
    const randomOffset = Math.sin(index * 1.5) * 15
    const r = radius + randomOffset

    positions[node.id] = {
      x: width / 2 + r * Math.cos(angle),
      y: height / 2 + r * Math.sin(angle),
      z: Math.cos(angle * 2) * 20, // Z轴深度感
    }
  })

  return positions
}

export function Neo4jKnowledgeGraph({ enterpriseCode }: { enterpriseCode: string }) {
  const [status, setStatus] = useState<Neo4jStatus | null>(null)
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const enterpriseColor = ENTERPRISE_COLORS[enterpriseCode] || ENTERPRISE_COLORS.yihua

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/neo4j")
      const data = await res.json()
      setStatus(data.neo4j || data)
    } catch {
      setStatus({ connected: false, error: "Failed to check connection" })
    }
  }, [])

  const loadGraph = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/neo4j/graph?enterprise=${enterpriseCode}`)
      if (res.ok) {
        const data = await res.json()
        setGraph(data)
      }
    } catch (error) {
      console.error("Failed to load graph:", error)
    } finally {
      setIsLoading(false)
    }
  }, [enterpriseCode])

  useEffect(() => {
    checkConnection()
    loadGraph()
  }, [checkConnection, loadGraph])

  const handleSeed = async () => {
    setIsLoading(true)
    try {
      await fetch("/api/neo4j/seed", { method: "GET" })
      await loadGraph()
    } catch (error) {
      console.error("Failed to seed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!status) {
    return (
      <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-violet-500 to-amber-500" />
        <CardContent className="p-6 flex items-center justify-center">
          <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    )
  }

  if (!status.connected) {
    return (
      <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-amber-500 to-red-500" />
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Neo4j 未连接</CardTitle>
          </div>
          <CardDescription>知识图谱功能需要 Neo4j 数据库</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <p className="mb-2">请配置以下环境变量：</p>
            <ul className="list-disc list-inside space-y-1">
              <li><code className="text-cyan-600">NEO4J_URI</code> - 连接地址</li>
              <li><code className="text-cyan-600">NEO4J_USER</code> - 用户名</li>
              <li><code className="text-cyan-600">NEO4J_PASSWORD</code> - 密码</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 计算节点位置
  const width = 600
  const height = 400
  const positions = graph ? calculateNodePositions(graph.nodes, graph.links, width, height) : {}

  return (
    <div className="space-y-6">
      {/* 知识图谱标题卡片 */}
      <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${enterpriseColor.primary}, ${enterpriseColor.secondary}, #8b5cf6)` }} />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Network className="h-5 w-5" style={{ color: enterpriseColor.primary }} />
                <div className="absolute inset-0 blur-md" style={{ backgroundColor: enterpriseColor.glow }} />
              </div>
              <CardTitle className="text-lg">知识图谱</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
                <CheckCircle className="h-3 w-3 mr-1" />
                Neo4j {status.version}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSeed}
                disabled={isLoading}
                className="border-slate-200 hover:bg-slate-100"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                更新数据
              </Button>
            </div>
          </div>
          <CardDescription>供应链影响因子关系网络</CardDescription>
        </CardHeader>
      </Card>

      {/* 3D 风格图谱可视化 */}
      <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 overflow-hidden shadow-2xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-[450px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <RefreshCw className="h-8 w-8 animate-spin text-cyan-500" />
                  <div className="absolute inset-0 blur-xl bg-cyan-500/30" />
                </div>
                <span className="text-slate-400 text-sm">加载知识图谱...</span>
              </div>
            </div>
          ) : graph && graph.nodes.length > 0 ? (
            <div className="relative h-[450px]" ref={containerRef}>
              {/* 背景网格 */}
              <div className="absolute inset-0 opacity-10">
                <svg width="100%" height="100%">
                  <defs>
                    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-500" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>

              {/* 光晕效果 */}
              <div
                className="absolute w-64 h-64 rounded-full blur-3xl opacity-20"
                style={{
                  background: `radial-gradient(circle, ${enterpriseColor.primary}, transparent)`,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              />

              {/* SVG 图层 */}
              <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="relative">
                <defs>
                  {/* 节点渐变 */}
                  {Object.entries({ ...FACTOR_COLORS, enterprise: { primary: enterpriseColor.primary } }).map(([key, color]) => (
                    <radialGradient key={key} id={`nodeGradient-${key}`} cx="30%" cy="30%" r="70%">
                      <stop offset="0%" stopColor={key === 'enterprise' ? enterpriseColor.primary : color.primary} stopOpacity="1" />
                      <stop offset="100%" stopColor={key === 'enterprise' ? enterpriseColor.secondary : color.primary} stopOpacity="0.8" />
                    </radialGradient>
                  ))}

                  {/* 发光效果 */}
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* 阴影效果 */}
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="rgba(0,0,0,0.3)" />
                  </filter>

                  {/* 线条渐变 */}
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={enterpriseColor.primary} stopOpacity="0.6" />
                    <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
                  </linearGradient>

                  {/* 箭头标记 */}
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill={enterpriseColor.primary} opacity="0.6" />
                  </marker>
                </defs>

                {/* 连接线 - 贝塞尔曲线 */}
                <g className="links">
                  {graph.links.map((link, index) => {
                    const sourcePos = positions[link.source]
                    const targetPos = positions[link.target]
                    if (!sourcePos || !targetPos) return null

                    // 计算贝塞尔曲线控制点
                    const midX = (sourcePos.x + targetPos.x) / 2
                    const midY = (sourcePos.y + targetPos.y) / 2
                    const dx = targetPos.x - sourcePos.x
                    const dy = targetPos.y - sourcePos.y
                    const dist = Math.sqrt(dx * dx + dy * dy)

                    // 曲线偏移
                    const offset = Math.min(dist * 0.2, 30)
                    const controlX = midX - dy * offset / dist
                    const controlY = midY + dx * offset / dist

                    const pathD = `M ${sourcePos.x} ${sourcePos.y} Q ${controlX} ${controlY} ${targetPos.x} ${targetPos.y}`

                    const isHighlighted = hoveredNode === link.source || hoveredNode === link.target
                    const linkWeight = link.weight || 10
                    const strokeWidth = Math.max(1.5, linkWeight / 15)

                    return (
                      <g key={index}>
                        {/* 发光线条 */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke={enterpriseColor.primary}
                          strokeWidth={strokeWidth + 4}
                          strokeOpacity={isHighlighted ? 0.3 : 0.1}
                          filter="url(#glow)"
                          className="transition-all duration-300"
                        />
                        {/* 主线条 */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke={isHighlighted ? enterpriseColor.primary : "url(#lineGradient)"}
                          strokeWidth={strokeWidth}
                          strokeOpacity={isHighlighted ? 0.9 : 0.5}
                          strokeDasharray={link.type === "INFLUENCES" ? "6 3" : "none"}
                          markerEnd={link.type === "INFLUENCES" ? "url(#arrowhead)" : undefined}
                          className="transition-all duration-300"
                        />
                      </g>
                    )
                  })}
                </g>

                {/* 节点 */}
                <g className="nodes">
                  {graph.nodes.map((node) => {
                    const pos = positions[node.id]
                    if (!pos) return null

                    const isEnterprise = node.type === "Enterprise"
                    const category = node.properties?.category as string || "external"
                    const factorColor = FACTOR_COLORS[category] || FACTOR_COLORS.external

                    // 获取节点权重
                    const link = graph.links.find(l => l.target === node.id && l.source !== node.id)
                    const weight = link?.weight || 10
                    const nodeRadius = isEnterprise ? 35 : Math.max(18, 15 + weight * 0.4)

                    const isHovered = hoveredNode === node.id

                    // 趋势图标
                    const trend = node.properties?.trend as string
                    const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Activity
                    const trendColor = trend === "up" ? "#ef4444" : trend === "down" ? "#10b981" : "#6b7280"

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        className="cursor-pointer"
                        style={{ filter: isHovered ? 'url(#glow)' : 'url(#shadow)' }}
                      >
                        {/* 外圈光晕 */}
                        <circle
                          r={nodeRadius + 8}
                          fill={isEnterprise ? enterpriseColor.glow : `${factorColor.primary}20`}
                          opacity={isHovered ? 0.6 : 0.2}
                          className="transition-opacity duration-300"
                        />

                        {/* 主圆形节点 */}
                        <circle
                          r={nodeRadius}
                          fill={isEnterprise ? `url(#nodeGradient-enterprise)` : `url(#nodeGradient-${category})`}
                          stroke={isEnterprise ? enterpriseColor.primary : factorColor.primary}
                          strokeWidth={isEnterprise ? 3 : 2}
                          className="transition-all duration-300"
                        />

                        {/* 内部渐变高光 */}
                        <circle
                          r={nodeRadius * 0.6}
                          cx={-nodeRadius * 0.2}
                          cy={-nodeRadius * 0.2}
                          fill="white"
                          opacity={0.15}
                        />

                        {/* 节点文本 */}
                        <text
                          textAnchor="middle"
                          dy={isEnterprise ? -5 : 0}
                          fill="white"
                          fontSize={isEnterprise ? 11 : 9}
                          fontWeight={isEnterprise ? "bold" : "500"}
                          className="pointer-events-none select-none"
                          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                        >
                          {isEnterprise ? node.label : node.label.length > 6 ? node.label.slice(0, 5) + '...' : node.label}
                        </text>

                        {/* 权重显示 */}
                        {!isEnterprise && link && (
                          <text
                            textAnchor="middle"
                            dy={12}
                            fill="white"
                            fontSize={8}
                            opacity={0.8}
                            className="pointer-events-none"
                          >
                            {weight}%
                          </text>
                        )}

                        {/* 企业节点额外信息 */}
                        {isEnterprise && (
                          <text
                            textAnchor="middle"
                            dy={10}
                            fill="white"
                            fontSize={8}
                            opacity={0.7}
                            className="pointer-events-none"
                          >
                            {String(node.properties?.capacity || 100)}万吨/年
                          </text>
                        )}

                        {/* 趋势指示器 */}
                        {!isEnterprise && trend && (
                          <g transform={`translate(${nodeRadius * 0.7}, ${-nodeRadius * 0.7})`}>
                            <circle r={6} fill={trendColor} opacity={0.2} />
                            <TrendIcon
                              x={-4}
                              y={-4}
                              width={8}
                              height={8}
                              stroke={trendColor}
                              strokeWidth={2}
                              fill="none"
                            />
                          </g>
                        )}
                      </g>
                    )
                  })}
                </g>
              </svg>

              {/* 悬浮信息卡片 */}
              {hoveredNode && (
                <div className="absolute bottom-4 left-4 right-4 p-3 bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-700 shadow-xl">
                  {(() => {
                    const node = graph.nodes.find(n => n.id === hoveredNode)
                    if (!node) return null

                    const link = graph.links.find(l => l.target === node.id && l.source !== node.id)
                    const category = node.properties?.category as string || "external"

                    return (
                      <div className="flex items-start gap-3">
                        <div
                          className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                          style={{ backgroundColor: node.type === "Enterprise" ? enterpriseColor.primary : FACTOR_COLORS[category]?.primary }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white text-sm">{node.label}</div>
                          {(() => {
                            const desc = node.properties?.description
                            if (desc && typeof desc === 'string') {
                              return <p className="text-xs text-slate-400 mt-0.5 truncate">{desc}</p>
                            }
                            return null
                          })()}
                          {(() => {
                            const reason = link?.reason
                            if (reason && typeof reason === 'string') {
                              return <p className="text-xs text-cyan-400 mt-1">💡 {reason}</p>
                            }
                            return null
                          })()}
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="outline" className="text-xs border-slate-600">
                              {node.type === "Enterprise" ? "企业节点" : `${category}因素`}
                            </Badge>
                            {link && (
                              <Badge variant="outline" className="text-xs border-slate-600">
                                权重 {link.weight}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          ) : (
            <div className="h-[450px] flex flex-col items-center justify-center text-slate-400">
              <div className="relative">
                <Database className="h-12 w-12" />
                <div className="absolute inset-0 blur-xl bg-slate-500/30" />
              </div>
              <p className="text-sm mt-3">暂无知识图谱数据</p>
              <Button size="sm" variant="outline" className="mt-3 border-slate-600 hover:bg-slate-800" onClick={handleSeed}>
                导入企业数据
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 图例和统计 */}
      {graph && graph.nodes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 图例 */}
          <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">图例说明</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(FACTOR_COLORS).map(([key, color]) => {
                  const labels: Record<string, string> = {
                    supply: "供应端",
                    demand: "需求端",
                    inventory: "库存",
                    external: "外部因素",
                    internal: "内部因素",
                  }
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${color.primary}, ${color.primary}cc)` }}
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-400">{labels[key]}</span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <div className="w-6 border-t-2 border-dashed border-violet-400" />
                    <span>影响关系</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-6 border-t-2 border-slate-400" />
                    <span>拥有关系</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 统计 */}
          <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">图谱统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20">
                  <div className="text-2xl font-bold" style={{ color: enterpriseColor.primary }}>{graph.nodes.length}</div>
                  <div className="text-xs text-slate-500 mt-1">节点总数</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-800/20">
                  <div className="text-2xl font-bold text-violet-600">{graph.links.length}</div>
                  <div className="text-xs text-slate-500 mt-1">关系数量</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
                  <div className="text-2xl font-bold text-amber-600">
                    {graph.nodes.filter(n => n.type === "Factor").length}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">影响因子</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}