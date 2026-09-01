import { NextResponse } from "next/server"
import { db } from "@/db"
import { knowledgeChunks } from "@/db/schema-rag"
import {
  scrapeAllSulfurNews,
  scrapeNewsDetail,
  type ScrapeResult,
  type NewsItem,
} from "@/lib/sulfur-news-scraper"
import { isFirecrawlAvailable } from "@/lib/firecrawl-client"

export const maxDuration = 60

// Vercel Cron 授权头验证
function isVercelCron(request: Request): boolean {
  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(request: Request) {
  const isCron = isVercelCron(request)
  const isLocalDev = process.env.NODE_ENV === "development"

  if (!isCron && !isLocalDev) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 检查 Firecrawl 是否可用
  if (!isFirecrawlAvailable()) {
    return NextResponse.json({
      success: false,
      error: "FIRECRAWL_API_KEY 未配置",
      note: "请在 .env.local 中配置 FIRECRAWL_API_KEY，获取地址: https://firecrawl.dev",
    })
  }

  try {
    // 1. 爬取所有硫磺行业新闻列表
    const results = await scrapeAllSulfurNews()

    const allItems: NewsItem[] = []
    const sourceSummary: Record<string, { count: number; success: boolean }> = {}

    for (const result of results) {
      sourceSummary[result.source] = {
        count: result.count,
        success: result.success,
      }
      if (result.success && result.items.length > 0) {
        allItems.push(...result.items)
      }
    }

    if (allItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: "未爬取到新闻条目",
        sources: sourceSummary,
        timestamp: new Date().toISOString(),
      })
    }

    // 2. 对每条新闻爬取详情页内容（限制数量，控制 Firecrawl 用量）
    const maxDetails = Math.min(allItems.length, 10)
    const itemsToIngest = allItems.slice(0, maxDetails)

    let inserted = 0
    let skipped = 0

    if (db) {
      for (const item of itemsToIngest) {
        try {
          // 爬取详情页
          const detail = await scrapeNewsDetail(item.url)
          const content = detail || item.summary || item.title

          if (!content || content.length < 20) {
            skipped++
            continue
          }

          // 分块：按 1000 字符切分
          const chunks = splitIntoChunks(content, 1000)

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i]

            // 生成 embedding（复用 RAG 服务的 OpenAI embedding）
            const embedding = await getEmbedding(chunk)

            await db
              .insert(knowledgeChunks)
              .values({
                sourceType: "web_scrape",
                sourceId: item.url,
                sourceName: `${item.source} - ${item.title}`,
                chunkIndex: i,
                content: chunk,
                embedding: embedding ? JSON.stringify(embedding) : null,
                metadata: {
                  url: item.url,
                  source: item.source,
                  title: item.title,
                  date: item.date,
                  scrapedAt: new Date().toISOString(),
                } as any,
              })

            inserted++
          }
        } catch (e) {
          console.warn(`入库失败: ${item.title.slice(0, 40)}`, e)
          skipped++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `爬取完成: ${allItems.length} 条新闻, 入库 ${inserted} 块, 跳过 ${skipped}`,
      sources: sourceSummary,
      stats: {
        totalNews: allItems.length,
        detailsScraped: maxDetails,
        chunksInserted: inserted,
        chunksSkipped: skipped,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Web content ingestion error:", error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

// ---- 工具函数 ----

/**
 * 将长文本切分为指定大小的块
 */
function splitIntoChunks(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text]

  const chunks: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining)
      break
    }

    // 在句号、换行处切分，避免断句
    let cutPoint = maxLen
    const sentenceEnd = remaining.lastIndexOf("。", maxLen)
    const newline = remaining.lastIndexOf("\n", maxLen)
    const breakPoint = Math.max(sentenceEnd, newline)

    if (breakPoint > maxLen * 0.5) {
      cutPoint = breakPoint + 1
    }

    chunks.push(remaining.slice(0, cutPoint))
    remaining = remaining.slice(cutPoint)
  }

  return chunks
}

/**
 * 生成文本 embedding（复用 rag-search.ts 的逻辑）
 */
async function getEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"

  if (!apiKey) return null

  try {
    const response = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000), // 截断避免超长
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.data[0].embedding as number[]
  } catch {
    return null
  }
}
