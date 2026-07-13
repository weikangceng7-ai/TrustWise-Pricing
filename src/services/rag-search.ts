/**
 * RAG 向量检索服务
 * 检索知识库文档 chunk，返回最相关内容
 */

import { db } from "@/db"
import { knowledgeChunks } from "@/db/schema-rag"
import { sql, type SQL } from "drizzle-orm"

const EMBEDDING_MODEL = "text-embedding-3-small"
const EMBEDDING_DIM = 1536

export interface KnowledgeSearchResult {
  id: number
  sourceType: string
  sourceName: string
  content: string
  metadata: Record<string, unknown> | null
  similarity: number
}

/**
 * 生成文本的 embedding 向量
 */
async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY 未配置")
  }

  const response = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Embedding API 返回错误: ${response.status} - ${errText}`)
  }

  const data = await response.json()
  return data.data[0].embedding as number[]
}

/**
 * 计算两个向量的余弦相似度
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * 向量检索：根据查询文本搜索最相关的知识库 chunk
 */
export async function searchKnowledge(
  query: string,
  limit = 5
): Promise<KnowledgeSearchResult[]> {
  return searchWithFilter(query, {}, limit)
}

/**
 * 带过滤条件的向量检索
 */
export async function searchWithFilter(
  query: string,
  filters: { sourceType?: string; year?: number },
  limit = 5
): Promise<KnowledgeSearchResult[]> {
  if (!db) return []

  try {
    // 生成查询 embedding
    const queryEmbedding = await getEmbedding(query)

    // 查询所有 chunk
    const whereConditions: SQL[] = []

    let query_builder = db.select().from(knowledgeChunks).$dynamic()

    if (filters.sourceType) {
      query_builder = query_builder.where(
        sql`${knowledgeChunks.sourceType} = ${filters.sourceType}`
      )
    }

    const chunks = await query_builder

    // 计算相似度排序
    const results: KnowledgeSearchResult[] = chunks
      .map((chunk) => {
        let similarity = 0
        if (chunk.embedding) {
          try {
            const emb = JSON.parse(chunk.embedding) as number[]
            similarity = cosineSimilarity(queryEmbedding, emb)
          } catch {
            similarity = 0
          }
        }

        return {
          id: chunk.id,
          sourceType: chunk.sourceType,
          sourceName: chunk.sourceName,
          content: chunk.content,
          metadata: chunk.metadata as Record<string, unknown> | null,
          similarity,
        }
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    return results
  } catch (error) {
    console.warn("RAG 检索失败:", error)
    // fallback: 关键词检索
    return keywordFallback(query, limit)
  }
}

/**
 * Embedding 不可用时的关键词 fallback 检索
 */
async function keywordFallback(
  query: string,
  limit = 5
): Promise<KnowledgeSearchResult[]> {
  if (!db) return []

  try {
    // 使用 PostgreSQL 的 ILIKE 做关键词匹配
    const keywords = query.split(/[\s,，。！？、]+/).filter((k) => k.length >= 2)

    if (keywords.length === 0) return []

    const chunks = await db
      .select()
      .from(knowledgeChunks)
      .limit(100) // 取前 100 条做内存过滤

    const results = chunks
      .map((chunk) => {
        let score = 0
        for (const kw of keywords) {
          if (chunk.content.toLowerCase().includes(kw.toLowerCase())) {
            score += 1
          }
        }
        return {
          id: chunk.id,
          sourceType: chunk.sourceType,
          sourceName: chunk.sourceName,
          content: chunk.content,
          metadata: chunk.metadata as Record<string, unknown> | null,
          similarity: score / keywords.length,
        }
      })
      .filter((r) => r.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    return results
  } catch (e) {
    console.warn("关键词检索 fallback 失败:", e)
    return []
  }
}

/**
 * 格式化检索结果为对话上下文
 */
export function formatKnowledgeContext(results: KnowledgeSearchResult[]): string {
  if (results.length === 0) return ""

  const parts = results.map((r, i) => {
    const source = r.sourceName
    return `[${i + 1}] 来源: ${source}\n${r.content}`
  })

  return `\n## 知识库参考\n以下是从企业知识库中检索到的相关信息，请参考这些内容来回答问题:\n\n${parts.join("\n\n")}`
}
