import { db } from "@/db"
import { yihuaCodeItems, type YihuaCodeItem, type NewYihuaCodeItem } from "@/db/schema"

export type YihuaCodeIndex = Omit<NewYihuaCodeItem, "createdAt">

const CODE_ROOT = "d:\\市场方案agent\\宜化价格预测\\宜化价格预测\\代码"

function extToKind(ext: string): YihuaCodeIndex["kind"] {
  const lower = ext.toLowerCase()
  if (lower === ".py") return "python"
  if (lower === ".ipynb") return "notebook"
  if (lower === ".m") return "matlab"
  return "markdown"
}

export async function buildYihuaCodeIndex(): Promise<YihuaCodeIndex[]> {
  // 该函数主要用于种子脚本生成“文件元数据”，运行在 Node 环境。
  // 避免直接依赖 Next 的 runtime。
  const fs = await import("fs/promises")
  const path = await import("path")

  const allowedExt = new Set([".py", ".ipynb", ".m", ".md"])

  const out: YihuaCodeIndex[] = []
  const stack: string[] = [CODE_ROOT]

  while (stack.length > 0) {
    const dir = stack.pop()!
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const ent of entries) {
      const full = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        stack.push(full)
        continue
      }

      const ext = path.extname(ent.name)
      if (!allowedExt.has(ext)) continue

      // CODE_ROOT/TopFolder/...
      const rel = path.relative(CODE_ROOT, full).replaceAll("\\", "/")
      const parts = rel.split("/")
      const topFolder = parts[0] || "root"
      const fileName = ent.name

      out.push({
        relativePath: rel,
        fileName,
        ext,
        kind: extToKind(ext),
        topFolder,
        meta: {},
      })
    }
  }

  return out
}

export async function upsertYihuaCodeIndex(rows: YihuaCodeIndex[]) {
  if (!db) throw new Error("Database not configured")

  if (rows.length === 0) return

  await db
    .insert(yihuaCodeItems)
    .values(rows as unknown as YihuaCodeItem[])
    .onConflictDoNothing({ target: yihuaCodeItems.relativePath })
}

