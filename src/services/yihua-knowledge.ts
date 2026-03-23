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

  // 直接使用本地JSON文件，避免数据库连接问题
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
