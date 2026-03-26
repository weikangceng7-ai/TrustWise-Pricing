"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Database, AlertTriangle, CheckCircle } from "lucide-react"

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
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

interface Neo4jStatus {
  connected: boolean
  version?: string
  error?: string
}

const NODE_COLORS: Record<string, string> = {
  Enterprise: "#06b6d4",
  Factor: "#8b5cf6",
  Price: "#f59e0b",
  Supplier: "#10b981",
  Document: "#6366f1",
}

const RELATION_LABELS: Record<string, string> = {
  HAS_FACTOR: "影响因子",
  INFLUENCES: "影响",
  SUPPLIES_TO: "供应",
  CORRELATES_WITH: "相关",
  PREDICTED_BY: "预测",
}

export function Neo4jKnowledgeGraph({ enterpriseCode }: { enterpriseCode: string }) {
  const [status, setStatus] = useState<Neo4jStatus | null>(null)
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
      <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
        <CardContent className="p-6 flex items-center justify-center">
          <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    )
  }

  if (!status.connected) {
    return (
      <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
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
          <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-xs text-slate-500">
            <p>本地开发: 安装 <a href="https://neo4j.com/download/" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">Neo4j Desktop</a></p>
            <p className="mt-1">云服务: <a href="https://neo4j.com/cloud/aura/" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">Neo4j Aura</a> (免费版)</p>
          </div>
          {status.error && (
            <div className="text-xs text-red-500">{status.error}</div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-cyan-500" />
            <CardTitle className="text-lg">知识图谱</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              Neo4j {status.version}
            </Badge>
            <Button size="sm" variant="outline" onClick={handleSeed} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              导入数据
            </Button>
          </div>
        </div>
        <CardDescription>价格影响因子关系图谱</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : graph && graph.nodes.length > 0 ? (
          <div className="space-y-4">
            {/* 图例 */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(NODE_COLORS).map(([type, color]) => (
                <Badge key={type} variant="outline" className="gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  {type}
                </Badge>
              ))}
            </div>

            {/* 简化的图谱可视化 */}
            <div className="relative h-80 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900/30">
              {graph.nodes.map((node, index) => {
                // 简单的圆形布局
                const angle = (index / graph.nodes.length) * 2 * Math.PI
                const radius = node.type === "Enterprise" ? 0 : 120
                const centerX = 200
                const centerY = 150

                const x = node.type === "Enterprise" ? centerX : centerX + radius * Math.cos(angle)
                const y = node.type === "Enterprise" ? centerY : centerY + radius * Math.sin(angle)

                const color = NODE_COLORS[node.type] || "#64748b"

                return (
                  <div
                    key={node.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                    }}
                  >
                    <div
                      className={`px-3 py-1.5 rounded-full text-xs font-medium shadow-lg ${
                        node.type === "Enterprise"
                          ? "text-white"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                      style={{
                        backgroundColor: node.type === "Enterprise" ? color : `${color}30`,
                        border: `2px solid ${color}`,
                      }}
                    >
                      {node.label}
                    </div>
                  </div>
                )
              })}

              {/* 关系线（简化表示） */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {graph.links.map((link, index) => {
                  const sourceNode = graph.nodes.find((n) => n.id === link.source)
                  const targetNode = graph.nodes.find((n) => n.id === link.target)
                  if (!sourceNode || !targetNode) return null

                  const sIndex = graph.nodes.findIndex((n) => n.id === link.source)
                  const tIndex = graph.nodes.findIndex((n) => n.id === link.target)

                  const sAngle = (sIndex / graph.nodes.length) * 2 * Math.PI
                  const tAngle = (tIndex / graph.nodes.length) * 2 * Math.PI
                  const radius = sourceNode.type === "Enterprise" ? 0 : 120

                  const x1 = sourceNode.type === "Enterprise" ? 200 : 200 + radius * Math.cos(sAngle)
                  const y1 = sourceNode.type === "Enterprise" ? 150 : 150 + radius * Math.sin(sAngle)
                  const x2 = targetNode.type === "Enterprise" ? 200 : 200 + radius * Math.cos(tAngle)
                  const y2 = targetNode.type === "Enterprise" ? 150 : 150 + radius * Math.sin(tAngle)

                  return (
                    <line
                      key={index}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={NODE_COLORS[targetNode.type] || "#64748b"}
                      strokeWidth={link.weight ? Math.max(1, link.weight / 10) : 1}
                      strokeOpacity={0.4}
                      strokeDasharray={link.type === "INFLUENCES" ? "4 2" : "none"}
                    />
                  )
                })}
              </svg>
            </div>

            {/* 统计信息 */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-slate-100 dark:bg-slate-800/50">
                <div className="text-lg font-bold text-cyan-600">{graph.nodes.length}</div>
                <div className="text-xs text-slate-500">节点</div>
              </div>
              <div className="p-2 rounded bg-slate-100 dark:bg-slate-800/50">
                <div className="text-lg font-bold text-violet-600">{graph.links.length}</div>
                <div className="text-xs text-slate-500">关系</div>
              </div>
              <div className="p-2 rounded bg-slate-100 dark:bg-slate-800/50">
                <div className="text-lg font-bold text-emerald-600">
                  {graph.nodes.filter((n) => n.type === "Factor").length}
                </div>
                <div className="text-xs text-slate-500">影响因子</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <Database className="h-10 w-10 mb-2" />
            <p className="text-sm">暂无数据</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={handleSeed}>
              导入示例数据
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}