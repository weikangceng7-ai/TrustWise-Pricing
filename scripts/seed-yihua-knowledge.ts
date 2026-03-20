/**
 * 将 src/data/yihua-knowledge.json 预处理结果写入 yihua_knowledge_items（需 DATABASE_URL）。
 * 用法: npx tsx --tsconfig tsconfig.json scripts/seed-yihua-knowledge.ts
 */
import "dotenv/config"
import { db } from "@/db"
import { yihuaKnowledgeItems } from "@/db/schema"
import { getNormalizedItemsForSeed } from "@/services/yihua-knowledge"

async function main() {
  if (!process.env.DATABASE_URL || !db) {
    console.error("请配置 DATABASE_URL 后再执行种子脚本。")
    process.exit(1)
  }

  const items = getNormalizedItemsForSeed()
  const rows = items.map((i) => ({
    sectionId: i.sectionId,
    name: i.name,
    publicPath: i.publicPath,
    kind: i.kind,
    meta: { lang: i.meta.lang, ...(i.meta.year != null ? { year: i.meta.year } : {}) },
  }))

  await db.insert(yihuaKnowledgeItems).values(rows).onConflictDoNothing({
    target: yihuaKnowledgeItems.publicPath,
  })

  console.log(`已写入/跳过 ${rows.length} 条宜化知识库元数据（按 public_path 去重）。`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
