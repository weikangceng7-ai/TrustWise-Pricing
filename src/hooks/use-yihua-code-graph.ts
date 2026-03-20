import { useQuery } from "@tanstack/react-query"

export type CodeGraphNodeType = "group" | "kind" | "theme" | "file"

export interface CodeGraphNode {
  id: string
  type: CodeGraphNodeType
  label: string
  fileName?: string
  relativePath?: string
  ext?: string
  kind?: string
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
  topFolder?: string
  kind?: string
  theme?: string
  ontologyView?: "business" | "algorithm" | "data"
  q?: string
  maxFiles?: number
}

async function fetchCodeGraph(params: GetYihuaCodeGraphParams): Promise<CodeGraphResponse> {
  // 仅传递有效参数，避免 URL 出现冗余默认值，便于调试与缓存命中。
  const sp = new URLSearchParams()
  if (params.topFolder && params.topFolder !== "all") sp.set("topFolder", params.topFolder)
  if (params.kind && params.kind !== "all") sp.set("kind", params.kind)
  if (params.theme && params.theme !== "all") sp.set("theme", params.theme)
  if (params.ontologyView) sp.set("ontologyView", params.ontologyView)
  if (params.q && params.q.trim()) sp.set("q", params.q.trim())
  if (params.maxFiles != null) sp.set("maxFiles", String(params.maxFiles))

  const qs = sp.toString()
  const res = await fetch(`/api/yihua/code-graph${qs ? `?${qs}` : ""}`)
  if (!res.ok) throw new Error("加载代码知识图谱失败")
  const j = (await res.json()) as { success: boolean; data: CodeGraphResponse }
  if (!j.success) throw new Error("代码知识图谱接口异常")
  return j.data
}

export function useYihuaCodeGraph(params: GetYihuaCodeGraphParams) {
  return useQuery({
    // 参数对象作为 queryKey 的一部分，确保不同筛选条件独立缓存。
    queryKey: ["yihuaCodeGraph", params],
    queryFn: () => fetchCodeGraph(params),
    staleTime: 60_000,
  })
}

