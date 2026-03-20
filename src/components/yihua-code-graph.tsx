"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useYihuaCodeGraph, type CodeGraphNode } from "@/hooks/use-yihua-code-graph"
import { Skeleton } from "@/components/ui/skeleton"
import { Code, Search, Folder, FileCode2 } from "lucide-react"

type KindFilter = "all" | "python" | "notebook" | "matlab" | "markdown"

function uniqBy<T>(arr: T[], keyFn: (t: T) => string) {
  const m = new Map<string, T>()
  for (const it of arr) {
    const k = keyFn(it)
    if (!m.has(k)) m.set(k, it)
  }
  return Array.from(m.values())
}

function relationColor(rel: "BELONGS_TO_DIR" | "HAS_CODE_KIND" | "USES_THEME" | "IMPLEMENTS_FILE") {
  if (rel === "HAS_CODE_KIND") return "hsl(var(--chart-1))"
  if (rel === "USES_THEME") return "hsl(var(--chart-4))"
  if (rel === "IMPLEMENTS_FILE") return "hsl(var(--chart-2))"
  return "hsl(var(--muted-foreground)/0.4)"
}

export function YihuaCodeKnowledgeGraph() {
  const [keyword, setKeyword] = useState("")
  const [q, setQ] = useState("")
  const [kind, setKind] = useState<KindFilter>("all")
  const [theme, setTheme] = useState("all")
  const [ontologyView, setOntologyView] = useState<"business" | "algorithm" | "data">("algorithm")
  const [topFolder, setTopFolder] = useState("all")
  const [maxFiles, setMaxFiles] = useState(60)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [nodeOffset, setNodeOffset] = useState<Record<string, { x: number; y: number }>>({})
  const [boxSelect, setBoxSelect] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([])
  const [pinnedIds, setPinnedIds] = useState<Record<string, boolean>>({})

  const { data, isLoading, error } = useYihuaCodeGraph({
    q,
    kind,
    theme,
    ontologyView,
    topFolder,
    maxFiles,
  })

  const [selected, setSelected] = useState<CodeGraphNode | null>(null)
  const dragNodeRef = useRef<{ id: string; startX: number; startY: number; ox: number; oy: number } | null>(null)
  const panRef = useRef<{ startX: number; startY: number; px: number; py: number } | null>(null)
  const boxRef = useRef<{ x0: number; y0: number } | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setQ(keyword.trim()), 220)
    return () => window.clearTimeout(t)
  }, [keyword])

  useEffect(() => {
    // 过滤条件变化后清空选择，避免显示与图不一致
    setSelected(null)
    setMultiSelectedIds([])
    setBoxSelect(null)
  }, [q, kind, theme, topFolder, maxFiles])

  useEffect(() => {
    setNodeOffset((prev) => {
      const keep: Record<string, { x: number; y: number }> = {}
      for (const [id, p] of Object.entries(prev)) {
        if (pinnedIds[id]) keep[id] = p
      }
      return keep
    })
    setPan({ x: 0, y: 0 })
    setZoom(1)
  }, [q, kind, theme, topFolder, maxFiles, pinnedIds])

  const fileNodes = useMemo(() => (data?.nodes ?? []).filter((n) => n.type === "file"), [data])

  const graph = useMemo(() => {
    const nodes = data?.nodes ?? []
    const links = data?.links ?? []
    if (!nodes.length) return { positioned: false, nodes: [], links: [], positions: new Map<string, { x: number; y: number; r: number }>() }

    // 统一 SVG 坐标系：1000x600
    const W = 1000
    const H = 600
    const cx = W / 2
    const cy = H / 2

    const groups = nodes.filter((n) => n.type === "group")
    const kinds = nodes.filter((n) => n.type === "kind")
    const themes = nodes.filter((n) => n.type === "theme")
    const files = nodes.filter((n) => n.type === "file")

    const radiusGroup = 250
    const radiusKind = 190
    const radiusTheme = 130
    const radiusFile = 80
    const baseAngle = -Math.PI / 2

    const pos = new Map<string, { x: number; y: number; r: number }>()

    const placeRing = (ringNodes: CodeGraphNode[], radius: number, r: number) => {
      const count = Math.max(1, ringNodes.length)
      ringNodes
        .slice()
        .sort((a, b) => a.label.localeCompare(b.label, "zh-CN"))
        .forEach((n, i) => {
          const angle = baseAngle + (i / count) * Math.PI * 2
          pos.set(n.id, { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle), r })
        })
    }

    placeRing(groups, radiusGroup, 9)
    placeRing(kinds, radiusKind, 8)
    placeRing(themes, radiusTheme, 7)
    placeRing(files, radiusFile, 4.5)

    return { positioned: true, nodes, links, positions: pos }
  }, [data])

  const sortedFiles = useMemo(() => {
    return [...fileNodes].sort((a, b) => {
      const ka = `${a.topFolder ?? ""}/${a.fileName ?? ""}`
      const kb = `${b.topFolder ?? ""}/${b.fileName ?? ""}`
      return ka.localeCompare(kb, "zh-CN")
    })
  }, [fileNodes])

  const neighborIds = useMemo(() => {
    if (!selected || !data) return new Set<string>()
    const set = new Set<string>([selected.id])
    for (const l of data.links) {
      if (l.source === selected.id) set.add(l.target)
      if (l.target === selected.id) set.add(l.source)
    }
    return set
  }, [selected, data])

  const isDimmed = (id: string) => selected != null && !neighborIds.has(id)
  const strongSelectedIds = useMemo(() => {
    const ids = new Set<string>(multiSelectedIds)
    if (selected?.id) ids.add(selected.id)
    return ids
  }, [multiSelectedIds, selected])

  const toSvgPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    return {
      x: ((clientX - rect.left) / rect.width) * 1000,
      y: ((clientY - rect.top) / rect.height) * 600,
    }
  }

  const getExportMeta = () => {
    const now = new Date().toLocaleString("zh-CN")
    const filters = [
      `本体=${ontologyView}`,
      `目录=${topFolder}`,
      `类型=${kind}`,
      `主题=${theme}`,
      `关键词=${q || "无"}`,
      `节点上限=${maxFiles}`,
    ].join(" | ")
    return { now, filters }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Code className="h-5 w-5" />
                代码知识图谱
              </CardTitle>
              <CardDescription>
                基于 `宜化价格预测/宜化价格预测/代码` 的关键文件元数据生成的关系图谱，可按目录/类型/关键字动态筛选，并支持本体视图切换。
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant={ontologyView === "business" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOntologyView("business")}
                >
                  业务本体
                </Button>
                <Button
                  variant={ontologyView === "algorithm" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOntologyView("algorithm")}
                >
                  算法本体
                </Button>
                <Button
                  variant={ontologyView === "data" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOntologyView("data")}
                >
                  数据本体
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMaxFiles((v) => (v === 60 ? 90 : 60))}
              >
                显示上限：{maxFiles}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {data?.ontology && (
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-2 text-sm font-medium">本体模型（Ontology）</div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">实体类</div>
                  <div className="space-y-1">
                    {data.ontology.classes.map((c) => (
                      <div key={c.id} className="rounded border bg-background px-2 py-1 text-xs">
                        <span className="font-medium">{c.label}</span> · {c.description}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">关系类</div>
                  <div className="space-y-1">
                    {data.ontology.relations.map((r) => (
                      <div key={r.id} className="rounded border bg-background px-2 py-1 text-xs">
                        <span className="font-medium">{r.label}</span>（{r.from} → {r.to}）
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {data && (
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">代码总量</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">{data.totals.allFiles}</div>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">筛选命中</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">{data.totals.filteredFiles}</div>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">当前目录节点</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">{data.totals.groups}</div>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">当前文件节点</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">{data.totals.files}</div>
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索文件名 / 相对路径 / 目录（例如：EEMD / LSTM）"
                  className="flex-1"
                />
                {keyword.trim() && (
                  <Button variant="ghost" size="sm" onClick={() => setKeyword("")}>
                    清空
                  </Button>
                )}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", "全部"],
                    ["python", "Python"],
                    ["notebook", "Notebook"],
                    ["matlab", "Matlab"],
                    ["markdown", "Markdown"],
                  ] as const
                ).map(([k, label]) => (
                  <Button
                    key={k}
                    variant={kind === k ? "default" : "outline"}
                    size="sm"
                    onClick={() => setKind(k)}
                    className="h-7"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
              <Folder className="h-4 w-4" />
              目录筛选（点击节点可聚焦）
            </div>
            {isLoading ? (
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-8 w-24 rounded-full" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant={topFolder === "all" ? "default" : "outline"} size="sm" onClick={() => setTopFolder("all")}>
                  全部目录
                </Button>
                {(data?.folderOptions ?? [])
                  .slice(0, 12)
                  .map((g) => (
                    <Button
                      key={g.label}
                      variant={topFolder === g.label ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTopFolder(g.label)}
                      className="h-7"
                      title={`${g.label} (${g.count})`}
                    >
                      {g.label} ({g.count})
                    </Button>
                  ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="mb-2 text-sm font-medium text-muted-foreground">主题筛选</div>
            {isLoading ? (
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-8 w-20 rounded-full" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant={theme === "all" ? "default" : "outline"} size="sm" onClick={() => setTheme("all")}>
                  全部主题
                </Button>
                {(data?.themeOptions ?? []).slice(0, 10).map((t) => (
                  <Button
                    key={t.label}
                    variant={theme === t.label ? "default" : "outline"}
                    size="sm"
                    className="h-7"
                    onClick={() => setTheme(t.label)}
                  >
                    {t.label} ({t.count})
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border">
            <div className="relative">
              {isLoading ? (
                <div className="p-6">
                  <Skeleton className="h-[420px] w-full" />
                </div>
              ) : error || !data ? (
                <div className="p-6 text-sm text-muted-foreground">无法加载知识图谱，请稍后重试。</div>
              ) : data.nodes.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">当前筛选条件下暂无可用的代码文件元数据。</div>
              ) : (
                <svg
                  ref={svgRef}
                  viewBox="0 0 1000 600"
                  className="w-full h-[420px]"
                  onWheel={(e) => {
                    e.preventDefault()
                    const p = toSvgPoint(e.clientX, e.clientY)
                    if (!p) return
                    const next = Math.max(0.6, Math.min(1.8, Number((zoom + (e.deltaY > 0 ? -0.08 : 0.08)).toFixed(2))))
                    const worldX = (p.x - pan.x) / zoom
                    const worldY = (p.y - pan.y) / zoom
                    setZoom(next)
                    setPan({
                      x: p.x - worldX * next,
                      y: p.y - worldY * next,
                    })
                  }}
                >
                  <rect
                    x={0}
                    y={0}
                    width={1000}
                    height={600}
                    fill="transparent"
                    style={{ cursor: panRef.current ? "grabbing" : "grab" }}
                    onMouseDown={(e) => {
                      const p = toSvgPoint(e.clientX, e.clientY)
                      if (!p) return
                      if (e.shiftKey) {
                        boxRef.current = { x0: p.x, y0: p.y }
                        setBoxSelect({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
                        return
                      }
                      panRef.current = { startX: e.clientX, startY: e.clientY, px: pan.x, py: pan.y }
                    }}
                    onMouseMove={(e) => {
                      if (boxRef.current) {
                        const p = toSvgPoint(e.clientX, e.clientY)
                        if (!p) return
                        setBoxSelect({ x0: boxRef.current.x0, y0: boxRef.current.y0, x1: p.x, y1: p.y })
                        return
                      }
                      if (!panRef.current) return
                      const dx = e.clientX - panRef.current.startX
                      const dy = e.clientY - panRef.current.startY
                      setPan({ x: panRef.current.px + dx, y: panRef.current.py + dy })
                    }}
                    onMouseUp={() => {
                      if (boxRef.current && boxSelect) {
                        const xMin = Math.min(boxSelect.x0, boxSelect.x1)
                        const xMax = Math.max(boxSelect.x0, boxSelect.x1)
                        const yMin = Math.min(boxSelect.y0, boxSelect.y1)
                        const yMax = Math.max(boxSelect.y0, boxSelect.y1)

                        const canvasMinX = (xMin - pan.x) / zoom
                        const canvasMaxX = (xMax - pan.x) / zoom
                        const canvasMinY = (yMin - pan.y) / zoom
                        const canvasMaxY = (yMax - pan.y) / zoom

                        const picked: string[] = []
                        for (const n of graph.nodes) {
                          if (n.type !== "file") continue
                          const base = graph.positions.get(n.id)
                          if (!base) continue
                          const off = nodeOffset[n.id] ?? { x: 0, y: 0 }
                          const x = base.x + off.x
                          const y = base.y + off.y
                          if (x >= canvasMinX && x <= canvasMaxX && y >= canvasMinY && y <= canvasMaxY) {
                            picked.push(n.id)
                          }
                        }
                        setMultiSelectedIds(picked)
                      }
                      boxRef.current = null
                      setBoxSelect(null)
                      panRef.current = null
                    }}
                    onMouseLeave={() => {
                      boxRef.current = null
                      setBoxSelect(null)
                      panRef.current = null
                    }}
                  />
                  <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                  {/* 中心标签 */}
                  <circle cx="500" cy="300" r="22" fill="hsl(var(--primary)/0.12)" stroke="hsl(var(--primary))" />
                  <text x="500" y="308" textAnchor="middle" className="fill-foreground font-semibold text-sm">
                    代码知识图谱
                  </text>

                  {/* 关系线 */}
                  {graph.links.map((l, idx) => {
                    const s = graph.positions.get(l.source)
                    const t = graph.positions.get(l.target)
                    if (!s || !t) return null
                    return (
                      <line
                        key={idx}
                        x1={s.x}
                        y1={s.y}
                        x2={t.x}
                        y2={t.y}
                        stroke={selected && (l.source === selected.id || l.target === selected.id)
                          ? "hsl(var(--primary))"
                          : relationColor(l.relation)}
                        strokeWidth={selected && (l.source === selected.id || l.target === selected.id) ? 1.8 : 1}
                        opacity={selected ? (l.source === selected.id || l.target === selected.id ? 0.9 : 0.2) : 1}
                      />
                    )
                  })}

                  {boxSelect && (
                    <rect
                      x={(Math.min(boxSelect.x0, boxSelect.x1) - pan.x) / zoom}
                      y={(Math.min(boxSelect.y0, boxSelect.y1) - pan.y) / zoom}
                      width={Math.abs(boxSelect.x1 - boxSelect.x0) / zoom}
                      height={Math.abs(boxSelect.y1 - boxSelect.y0) / zoom}
                      fill="hsl(var(--primary)/0.15)"
                      stroke="hsl(var(--primary))"
                      strokeDasharray="4 2"
                    />
                  )}

                  {/* 节点 */}
                  {graph.nodes
                    .filter((n) => n.type === "group" || n.type === "kind" || n.type === "theme" || n.type === "file")
                    .map((n) => {
                      const p = graph.positions.get(n.id)
                      if (!p) return null
                      const isSelected = selected?.id === n.id
                      const isMulti = strongSelectedIds.has(n.id)
                      const isGroup = n.type === "group"
                      const isKind = n.type === "kind"
                      const isTheme = n.type === "theme"
                      return (
                        <g
                          key={n.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            if (n.type === "group") {
                              setTopFolder((n.label as string) || "all")
                              return
                            }
                            if (n.type === "theme") {
                              setTheme((n.label as string) || "all")
                              return
                            }
                            setSelected(n)
                          }}
                          onMouseDown={(e) => {
                            if (n.type === "group" || n.type === "kind" || n.type === "theme") return
                            e.stopPropagation()
                            const cur = nodeOffset[n.id] ?? { x: 0, y: 0 }
                            dragNodeRef.current = {
                              id: n.id,
                              startX: e.clientX,
                              startY: e.clientY,
                              ox: cur.x,
                              oy: cur.y,
                            }
                          }}
                          onMouseMove={(e) => {
                            if (!dragNodeRef.current || dragNodeRef.current.id !== n.id) return
                            e.stopPropagation()
                            const dx = (e.clientX - dragNodeRef.current.startX) / zoom
                            const dy = (e.clientY - dragNodeRef.current.startY) / zoom
                            setNodeOffset((prev) => ({
                              ...prev,
                              [n.id]: { x: dragNodeRef.current!.ox + dx, y: dragNodeRef.current!.oy + dy },
                            }))
                          }}
                          onMouseUp={() => {
                            dragNodeRef.current = null
                          }}
                          onMouseLeave={() => {
                            dragNodeRef.current = null
                          }}
                        >
                          {(() => {
                            const off = nodeOffset[n.id] ?? { x: 0, y: 0 }
                            const x = p.x + off.x
                            const y = p.y + off.y
                            return (
                              <>
                          <circle
                            cx={x}
                            cy={y}
                            r={p.r + (isSelected ? 2 : 0)}
                            fill={
                              isGroup
                                ? isSelected
                                  ? "hsl(var(--primary))"
                                  : "hsl(var(--primary)/0.18)"
                                : isKind
                                  ? isSelected
                                    ? "hsl(var(--chart-3))"
                                    : "hsl(var(--chart-3)/0.2)"
                                : isTheme
                                  ? isSelected
                                    ? "hsl(var(--chart-4))"
                                    : "hsl(var(--chart-4)/0.2)"
                                : isSelected
                                  ? "hsl(var(--chart-2))"
                                  : "hsl(var(--chart-2)/0.18)"
                            }
                            stroke={isSelected ? "hsl(var(--primary))" : "hsl(var(--border))"}
                            strokeWidth={isSelected ? 1.8 : isMulti ? 1.5 : 1.25}
                            strokeDasharray={pinnedIds[n.id] ? "3 2" : undefined}
                            opacity={isDimmed(n.id) ? 0.25 : 1}
                          >
                            <title>
                              {n.type === "group"
                                ? `目录：${n.label}`
                                : n.type === "kind"
                                  ? `类型：${n.label}`
                                : n.type === "theme"
                                  ? `主题：${n.label}`
                                : `文件：${n.fileName}\n类型：${n.kind}\n路径：${n.relativePath}`}
                            </title>
                          </circle>
                          {(isGroup || isKind || isTheme) && (
                            <text
                              x={x}
                              y={y - 16}
                              textAnchor="middle"
                              className="fill-muted-foreground text-[11px]"
                              opacity={isDimmed(n.id) ? 0.35 : 1}
                            >
                              {String(n.label).length > 10 ? `${String(n.label).slice(0, 10)}…` : n.label}
                            </text>
                          )}
                              </>
                            )
                          })()}
                        </g>
                      )
                    })}
                  </g>
                </svg>
              )}
              <div className="absolute right-3 top-3 z-10 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))}
                >
                  -
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.1).toFixed(2))))}
                >
                  +
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setZoom(1)
                    setPan({ x: 0, y: 0 })
                    setNodeOffset({})
                  }}
                >
                  重置视图
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!multiSelectedIds.length) return
                    setPinnedIds((prev) => {
                      const next = { ...prev }
                      for (const id of multiSelectedIds) next[id] = true
                      return next
                    })
                  }}
                >
                  固定选中
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!multiSelectedIds.length) return
                    setPinnedIds((prev) => {
                      const next = { ...prev }
                      for (const id of multiSelectedIds) delete next[id]
                      return next
                    })
                  }}
                >
                  取消固定
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMultiSelectedIds([])}
                >
                  清空框选
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const svg = svgRef.current
                    if (!svg) return
                    const { now, filters } = getExportMeta()
                    const serializer = new XMLSerializer()
                    const source = serializer.serializeToString(svg)
                    const wrapped = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1060" viewBox="0 0 1600 1060">
  <rect width="1600" height="1060" fill="#ffffff"/>
  <text x="36" y="44" font-size="28" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" fill="#111827">宜化代码知识图谱（${ontologyView}）</text>
  <text x="36" y="74" font-size="15" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" fill="#4b5563">导出时间：${now}</text>
  <text x="36" y="98" font-size="13" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" fill="#6b7280">${filters}</text>
  <g transform="translate(0,100)">
    ${source}
  </g>
</svg>`
                    const blob = new Blob([wrapped], { type: "image/svg+xml;charset=utf-8" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `yihua-kg-${ontologyView}.svg`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  导出 SVG
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const svg = svgRef.current
                    if (!svg) return
                    const { now, filters } = getExportMeta()
                    const serializer = new XMLSerializer()
                    const source = serializer.serializeToString(svg)
                    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" })
                    const url = URL.createObjectURL(blob)
                    const img = new Image()
                    img.onload = () => {
                      const canvas = document.createElement("canvas")
                      canvas.width = 1600
                      canvas.height = 1060
                      const ctx = canvas.getContext("2d")
                      if (!ctx) return
                      ctx.fillStyle = "#ffffff"
                      ctx.fillRect(0, 0, canvas.width, canvas.height)
                      ctx.fillStyle = "#111827"
                      ctx.font = "bold 28px Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif"
                      ctx.fillText(`宜化代码知识图谱（${ontologyView}）`, 36, 48)
                      ctx.fillStyle = "#4b5563"
                      ctx.font = "15px Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif"
                      ctx.fillText(`导出时间：${now}`, 36, 76)
                      ctx.fillStyle = "#6b7280"
                      ctx.font = "13px Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif"
                      ctx.fillText(filters, 36, 100)
                      ctx.drawImage(img, 0, 100, canvas.width, 960)
                      const png = canvas.toDataURL("image/png")
                      const a = document.createElement("a")
                      a.href = png
                      a.download = `yihua-kg-${ontologyView}.png`
                      a.click()
                      URL.revokeObjectURL(url)
                    }
                    img.src = url
                  }}
                >
                  导出 PNG
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded border px-2 py-1">关系图例</span>
            <span className="rounded border px-2 py-1" style={{ borderColor: relationColor("HAS_CODE_KIND"), color: relationColor("HAS_CODE_KIND") }}>包含类型</span>
            <span className="rounded border px-2 py-1" style={{ borderColor: relationColor("USES_THEME"), color: relationColor("USES_THEME") }}>关联主题</span>
            <span className="rounded border px-2 py-1" style={{ borderColor: relationColor("IMPLEMENTS_FILE"), color: relationColor("IMPLEMENTS_FILE") }}>实例化为文件</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCode2 className="h-4 w-4" />
            详情
          </CardTitle>
          <CardDescription>点击任意“文件节点”查看元信息。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {selected ? (
            <>
              <div className="rounded-lg border bg-muted/10 p-3">
                <div className="font-semibold">{selected.fileName}</div>
                <div className="mt-1 text-muted-foreground">
                  类型：{selected.kind} · 扩展名：{selected.ext}
                </div>
                <div className="mt-1 text-muted-foreground">目录：{selected.topFolder}</div>
                <div className="mt-2 text-xs text-muted-foreground break-all">
                  相对路径：{selected.relativePath}
                </div>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground">尚未选择节点。</div>
          )}

          {data && (
            <div className="text-muted-foreground text-xs">
              当前图谱：{data.totals.groups} 目录 · {data.totals.kinds} 类型 · {data.totals.themes} 主题 · {data.totals.files} 文件（筛选命中 {data.totals.filteredFiles}）
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">节点文件清单</CardTitle>
          <CardDescription>点击文件可同步定位到“详情”。</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : sortedFiles.length === 0 ? (
            <div className="text-sm text-muted-foreground">暂无可展示文件。</div>
          ) : (
            <div className="max-h-[260px] overflow-y-auto rounded-lg border">
              {sortedFiles.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/40 ${
                    selected?.id === f.id ? "bg-muted/60" : ""
                  }`}
                  onClick={() => setSelected(f)}
                >
                  <div className="truncate font-medium">{f.fileName}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {f.topFolder} · {f.kind}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  )
}

