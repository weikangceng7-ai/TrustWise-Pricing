import { db } from "@/db"
import { yihuaKnowledgeItems } from "@/db/schema"
import rawJson from "@/data/yihua-knowledge.json"
import {
  buildAnalytics,
  normalizeKnowledgeItems,
  type NormalizedYihuaItem,
  type RawKnowledgeJson,
  type YihuaAnalytics,
} from "@/lib/yihua-preprocess"

export async function getYihuaAnalytics(): Promise<YihuaAnalytics> {
  const json = rawJson as RawKnowledgeJson
  const fromFile = normalizeKnowledgeItems(json)

  if (db) {
    const rows = await db.select().from(yihuaKnowledgeItems)
    if (rows.length > 0) {
      const items: NormalizedYihuaItem[] = rows.map((r) => ({
        sectionId: r.sectionId as NormalizedYihuaItem["sectionId"],
        sectionLabel: sectionLabelFor(r.sectionId),
        name: r.name,
        publicPath: r.publicPath,
        kind: r.kind,
        meta: {
          lang: r.meta.lang ?? "zh",
          ...(r.meta.year != null ? { year: r.meta.year } : {}),
        },
      }))
      return buildAnalytics(items, "database", json.generatedAt ?? null)
    }
  }

  return buildAnalytics(fromFile, "json", json.generatedAt ?? null)
}

function sectionLabelFor(id: string): string {
  if (id === "materials") return "资料与数据"
  if (id === "figures") return "图表"
  if (id === "literature") return "文献收集"
  return id
}

export function getNormalizedItemsForSeed(): NormalizedYihuaItem[] {
  const json = rawJson as RawKnowledgeJson
  return normalizeKnowledgeItems(json)
}
