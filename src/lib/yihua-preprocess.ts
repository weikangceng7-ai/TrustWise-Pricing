/**
 * 宜化知识库：从目录清单文件名做轻量预处理（年份、语言），供统计与检索。
 */

export type YihuaSectionId = "materials" | "figures" | "literature"

export interface RawKnowledgeJson {
  generatedAt?: string
  sections: Array<{
    id: string
    label: string
    dir: string
    items: Array<{
      name: string
      path: string
      relativePath: string
      kind: string
    }>
  }>
}

export interface NormalizedYihuaItem {
  sectionId: YihuaSectionId
  sectionLabel: string
  name: string
  publicPath: string
  kind: string
  meta: { year?: number; lang: "zh" | "en" }
}

const YEAR_RANGE = { min: 1990, max: 2035 }

/** 从文献类文件名解析年份（优先「 - YYYY - 」格式） */
export function parseTitleYear(fileName: string): number | undefined {
  const mDash = fileName.match(/\s-\s(19\d{2}|20\d{2})\s-/)
  if (mDash) {
    const y = parseInt(mDash[1]!, 10)
    if (y >= YEAR_RANGE.min && y <= YEAR_RANGE.max) return y
  }
  const matches = fileName.matchAll(/\b(19\d{2}|20\d{2})\b/g)
  for (const m of matches) {
    const y = parseInt(m[1]!, 10)
    if (y >= YEAR_RANGE.min && y <= YEAR_RANGE.max) return y
  }
  return undefined
}

export function detectLang(fileName: string): "zh" | "en" {
  return /[\u4e00-\u9fff]/.test(fileName) ? "zh" : "en"
}

export function normalizeKnowledgeItems(data: RawKnowledgeJson): NormalizedYihuaItem[] {
  const out: NormalizedYihuaItem[] = []
  for (const sec of data.sections) {
    const sectionId = sec.id as YihuaSectionId
    for (const it of sec.items) {
      const lang = detectLang(it.name)
      const year =
        sectionId === "literature" && it.kind === "pdf" ? parseTitleYear(it.name) : undefined
      out.push({
        sectionId,
        sectionLabel: sec.label,
        name: it.name,
        publicPath: it.path,
        kind: it.kind,
        meta: { lang, ...(year != null ? { year } : {}) },
      })
    }
  }
  return out
}

export interface YihuaAnalytics {
  generatedAt: string | null
  source: "database" | "json"
  totals: {
    all: number
    documents: number
    spreadsheets: number
    images: number
    diagrams: number
    pdfs: number
  }
  sections: Array<{
    id: YihuaSectionId
    label: string
    count: number
    kinds: Record<string, number>
  }>
  /** 文献按年份分布（仅 PDF） */
  literatureByYear: Array<{ year: number; count: number }>
  literatureLang: { zh: number; en: number }
  /** 近年文献示例（按年份降序取前 8 条） */
  recentLiteratureSamples: Array<{
    name: string
    publicPath: string
    year?: number
    lang: "zh" | "en"
  }>
}

function countKind(items: NormalizedYihuaItem[], kind: string) {
  return items.filter((i) => i.kind === kind).length
}

export function buildAnalytics(
  items: NormalizedYihuaItem[],
  source: "database" | "json",
  generatedAt?: string | null,
): YihuaAnalytics {
  const lit = items.filter((i) => i.sectionId === "literature" && i.kind === "pdf")
  const yearMap = new Map<number, number>()
  let zh = 0
  let en = 0
  for (const x of lit) {
    if (x.meta.lang === "zh") zh++
    else en++
    const y = x.meta.year
    if (y != null) yearMap.set(y, (yearMap.get(y) ?? 0) + 1)
  }
  const literatureByYear = [...yearMap.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, count]) => ({ year, count }))

  const recentLiteratureSamples = [...lit]
    .sort((a, b) => {
      const ya = a.meta.year ?? 0
      const yb = b.meta.year ?? 0
      if (yb !== ya) return yb - ya
      return a.name.localeCompare(b.name, "zh")
    })
    .slice(0, 8)
    .map((i) => ({
      name: i.name,
      publicPath: i.publicPath,
      year: i.meta.year,
      lang: i.meta.lang,
    }))

  const sectionMap = new Map<
    YihuaSectionId,
    { id: YihuaSectionId; label: string; items: NormalizedYihuaItem[] }
  >()
  for (const it of items) {
    const cur = sectionMap.get(it.sectionId)
    if (cur) cur.items.push(it)
    else
      sectionMap.set(it.sectionId, {
        id: it.sectionId,
        label: it.sectionLabel,
        items: [it],
      })
  }

  const sections: YihuaAnalytics["sections"] = []
  for (const [, v] of sectionMap) {
    const kinds: Record<string, number> = {}
    for (const it of v.items) kinds[it.kind] = (kinds[it.kind] ?? 0) + 1
    sections.push({
      id: v.id,
      label: v.label,
      count: v.items.length,
      kinds,
    })
  }
  sections.sort((a, b) => {
    const order: YihuaSectionId[] = ["materials", "figures", "literature"]
    return order.indexOf(a.id) - order.indexOf(b.id)
  })

  return {
    generatedAt: generatedAt ?? null,
    source,
    totals: {
      all: items.length,
      documents: countKind(items, "document"),
      spreadsheets: countKind(items, "spreadsheet"),
      images: countKind(items, "image"),
      diagrams: countKind(items, "diagram"),
      pdfs: countKind(items, "pdf"),
    },
    sections,
    literatureByYear,
    literatureLang: { zh, en },
    recentLiteratureSamples,
  }
}
