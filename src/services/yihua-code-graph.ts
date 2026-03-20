import { db } from "@/db"
import { yihuaCodeItems, type YihuaCodeItem } from "@/db/schema"
import { buildYihuaCodeIndex, type YihuaCodeIndex } from "@/services/yihua-code-index"

export type CodeGraphNodeType = "group" | "kind" | "theme" | "file"

export interface CodeGraphNode {
  id: string
  type: CodeGraphNodeType
  label: string
  // file 节点信息
  fileName?: string
  relativePath?: string
  ext?: string
  kind?: YihuaCodeItem["kind"]
  topFolder?: string
}

export interface CodeGraphLink {
  source: string
  target: string
  relation: "BELONGS_TO_DIR" | "HAS_CODE_KIND" | "USES_THEME" | "IMPLEMENTS_FILE"
}

export interface CodeGraphResponse {
  nodes: CodeGraphNode[]
  links: CodeGraphLink[]
  totals: {
    allFiles: number
    filteredFiles: number
    groups: number
    kinds: number
    themes: number
    files: number
  }
  folderOptions: Array<{ label: string; count: number }>
  themeOptions: Array<{ label: string; count: number }>
  kindCounts: Record<string, number>
  ontology: {
    classes: Array<{ id: string; label: string; description: string }>
    relations: Array<{ id: CodeGraphLink["relation"]; label: string; from: string; to: string }>
  }
}

export interface GetYihuaCodeGraphParams {
  topFolder?: string // "all" or actual folder name
  kind?: string // "all" or python | matlab | notebook | markdown
  theme?: string // "all" or lstm/arima/eemd/xgboost/...
  ontologyView?: "business" | "algorithm" | "data"
  q?: string
  maxFiles?: number
}

function normalizeSearch(q: string | undefined) {
  const s = (q ?? "").trim()
  return s.length ? s.toLowerCase() : ""
}

function inferTheme(text: string): string {
  const s = text.toLowerCase()
  if (s.includes("lstm")) return "LSTM"
  if (s.includes("arima")) return "ARIMA"
  if (s.includes("eemd") || s.includes("emd")) return "EEMD/EMD"
  if (s.includes("xgboost")) return "XGBoost"
  if (s.includes("transformer") || s.includes("informer") || s.includes("kan")) return "Transformer"
  if (s.includes("rf") || s.includes("random forest")) return "RandomForest"
  if (s.includes("svm")) return "SVM"
  if (s.includes("prophet")) return "Prophet"
  if (s.includes("cnn")) return "CNN"
  return "其他"
}

export async function getYihuaCodeGraph(
  params: GetYihuaCodeGraphParams,
): Promise<CodeGraphResponse> {
  // 统一处理查询参数，保证 API 对空值/默认值行为稳定。
  const q = normalizeSearch(params.q)
  const topFolder = (params.topFolder ?? "all").trim()
  const kind = (params.kind ?? "all").trim()
  const theme = (params.theme ?? "all").trim()
  const maxFiles = params.maxFiles ?? 60
  const ontologyView = params.ontologyView ?? "algorithm"

  const items: Array<YihuaCodeIndex> = []

  if (db) {
    // 优先从数据库读取，避免每次都扫描文件系统。
    const rows = await db.select().from(yihuaCodeItems)
    for (const r of rows) {
      items.push({
        relativePath: r.relativePath,
        fileName: r.fileName,
        ext: r.ext,
        kind: r.kind,
        topFolder: r.topFolder,
        meta: (r.meta ?? {}) as YihuaCodeIndex["meta"],
      })
    }
  } else {
    // 无数据库时降级为文件扫描，保证页面仍可展示基础图谱。
    const scanned = await buildYihuaCodeIndex()
    items.push(...scanned)
  }

  const kindCounts: Record<string, number> = {}
  for (const it of items) kindCounts[it.kind] = (kindCounts[it.kind] ?? 0) + 1

  const themeAllMap = new Map<string, number>()
  for (const it of items) {
    const t = inferTheme(`${it.fileName} ${it.relativePath}`)
    themeAllMap.set(t, (themeAllMap.get(t) ?? 0) + 1)
  }
  const themeOptions = Array.from(themeAllMap.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .map(([label, count]) => ({ label, count }))

  const folderAllMap = new Map<string, number>()
  for (const it of items) folderAllMap.set(it.topFolder, (folderAllMap.get(it.topFolder) ?? 0) + 1)
  const folderOptions = Array.from(folderAllMap.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .map(([label, count]) => ({ label, count }))

  let filtered = items
  if (topFolder !== "all") filtered = filtered.filter((it) => it.topFolder === topFolder)
  if (kind !== "all") filtered = filtered.filter((it) => it.kind === kind)
  if (theme !== "all") {
    filtered = filtered.filter((it) => inferTheme(`${it.fileName} ${it.relativePath}`) === theme)
  }
  if (q) {
    filtered = filtered.filter(
      (it) =>
        it.fileName.toLowerCase().includes(q) ||
        it.relativePath.toLowerCase().includes(q) ||
        it.topFolder.toLowerCase().includes(q),
    )
  }

  // 限制文件节点数量，避免图谱过载导致前端布局拥挤与交互卡顿。
  filtered.sort((a, b) => {
    if (a.topFolder !== b.topFolder) return a.topFolder.localeCompare(b.topFolder, "zh-CN")
    return a.fileName.localeCompare(b.fileName, "zh-CN")
  })
  const filteredFiles = filtered.length
  const limited = filtered.slice(0, maxFiles)

  const groups = Array.from(new Set(limited.map((it) => it.topFolder))).sort((a, b) =>
    a.localeCompare(b, "zh-CN"),
  )

  const nodes: CodeGraphNode[] = []
  const links: CodeGraphLink[] = []
  const kinds = Array.from(new Set(limited.map((it) => it.kind)))
  const themes = Array.from(new Set(limited.map((it) => inferTheme(`${it.fileName} ${it.relativePath}`))))

  for (const g of groups) nodes.push({ id: `group:${g}`, type: "group", label: g })
  for (const k of kinds) nodes.push({ id: `kind:${k}`, type: "kind", label: k })
  for (const t of themes) nodes.push({ id: `theme:${t}`, type: "theme", label: t })

  for (const it of limited) {
    const fileId = `file:${it.relativePath}`
    const themeLabel = inferTheme(`${it.fileName} ${it.relativePath}`)
    const gid = `group:${it.topFolder}`
    const kid = `kind:${it.kind}`
    const tid = `theme:${themeLabel}`
    nodes.push({
      id: fileId,
      type: "file",
      label: it.fileName.replace(/\.(py|ipynb|m|md)$/i, ""),
      fileName: it.fileName,
      relativePath: it.relativePath,
      ext: it.ext,
      kind: it.kind,
      topFolder: it.topFolder,
    })
    links.push({ source: gid, target: kid, relation: "HAS_CODE_KIND" })
    links.push({ source: kid, target: tid, relation: "USES_THEME" })
    links.push({ source: tid, target: fileId, relation: "IMPLEMENTS_FILE" })
  }

  // 去重链路，防止同一关系重复绘制。
  const uniq = new Set<string>()
  const dedupLinks: CodeGraphLink[] = []
  for (const l of links) {
    const key = `${l.source}->${l.target}::${l.relation}`
    if (uniq.has(key)) continue
    uniq.add(key)
    dedupLinks.push(l)
  }

  return {
    nodes,
    links: dedupLinks,
    totals: {
      allFiles: items.length,
      filteredFiles,
      groups: groups.length,
      kinds: kinds.length,
      themes: themes.length,
      files: limited.length,
    },
    folderOptions,
    themeOptions,
    kindCounts,
    ontology: getOntologyTemplate(ontologyView),
  }
}

function getOntologyTemplate(view: "business" | "algorithm" | "data") {
  if (view === "business") {
    return {
      classes: [
        { id: "BusinessDomain", label: "业务域实体", description: "采购与预测业务模块边界（如模型库、实验集）" },
        { id: "Capability", label: "能力实体", description: "算法能力类型（时序建模、分解重构、对比实验）" },
        { id: "Scenario", label: "场景实体", description: "业务关注主题（LSTM/ARIMA/EEMD 等）" },
        { id: "Asset", label: "资产实体", description: "具体可执行资产（脚本/Notebook/配置）" },
      ],
      relations: [
        { id: "HAS_CODE_KIND" as const, label: "提供能力", from: "BusinessDomain", to: "Capability" },
        { id: "USES_THEME" as const, label: "面向场景", from: "Capability", to: "Scenario" },
        { id: "IMPLEMENTS_FILE" as const, label: "落地资产", from: "Scenario", to: "Asset" },
      ],
    }
  }
  if (view === "data") {
    return {
      classes: [
        { id: "DatasetGroup", label: "数据组实体", description: "数据来源或数据组织目录" },
        { id: "FeatureType", label: "特征类型实体", description: "特征加工方式对应的代码类型" },
        { id: "ModelFamily", label: "模型族实体", description: "主题算法族（LSTM/ARIMA/EEMD 等）" },
        { id: "DataArtifact", label: "数据工件实体", description: "实际数据处理脚本/笔记本文件" },
      ],
      relations: [
        { id: "HAS_CODE_KIND" as const, label: "包含特征处理", from: "DatasetGroup", to: "FeatureType" },
        { id: "USES_THEME" as const, label: "映射模型族", from: "FeatureType", to: "ModelFamily" },
        { id: "IMPLEMENTS_FILE" as const, label: "生成工件", from: "ModelFamily", to: "DataArtifact" },
      ],
    }
  }
  return {
    classes: [
      { id: "Directory", label: "目录实体", description: "代码资产的归属目录（项目/模块）" },
      { id: "CodeKind", label: "代码类型实体", description: "Python/Notebook/Matlab/Markdown 等类型" },
      { id: "Theme", label: "算法主题实体", description: "LSTM、ARIMA、EEMD 等算法主题" },
      { id: "File", label: "文件实体", description: "具体代码文件与路径对象" },
    ],
    relations: [
      { id: "HAS_CODE_KIND" as const, label: "包含类型", from: "Directory", to: "CodeKind" },
      { id: "USES_THEME" as const, label: "关联主题", from: "CodeKind", to: "Theme" },
      { id: "IMPLEMENTS_FILE" as const, label: "实例化为文件", from: "Theme", to: "File" },
    ],
  }
}

