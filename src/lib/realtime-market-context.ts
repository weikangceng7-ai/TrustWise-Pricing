/**
 * 实时市场上下文获取模块
 *
 * 当 RAG 检索结果不足时，通过 Firecrawl 实时爬取硫磺行业新闻，
 * 为 AI 聊天提供最新市场信息。
 */

import { scrapePage } from "@/lib/firecrawl-client"
import { isFirecrawlAvailable } from "@/lib/firecrawl-client"

// 市场相关关键词
const MARKET_KEYWORDS = [
  "价格", "行情", "走势", "涨跌", "市场", "供需", "库存", "港口",
  "硫磺", "硫酸", "磷肥", "化肥", "原油", "化工",
  "采购", "备库", "观望", "上涨", "下跌", "稳定",
  "隆众", "卓创", "百川", "生意社",
]

/**
 * 判断用户消息是否与市场行情相关
 */
export function isMarketRelatedQuery(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  return MARKET_KEYWORDS.some(keyword => lowerMessage.includes(keyword))
}

/**
 * 实时爬取市场上下文
 * 从硫磺行业网站获取最新新闻，提取关键信息
 */
export async function fetchRealtimeMarketContext(message: string): Promise<string | undefined> {
  if (!isFirecrawlAvailable()) {
    return undefined
  }

  try {
    // 根据用户问题选择最相关的源
    const sources = selectSourcesForQuery(message)
    const results: string[] = []

    for (const source of sources) {
      const page = await scrapePage(source.url, {
        formats: ["markdown"],
      })

      if (page && page.markdown) {
        // 提取与用户问题相关的内容片段
        const relevantContent = extractRelevantContent(page.markdown, message, source.name)
        if (relevantContent) {
          results.push(relevantContent)
        }
      }

      // 限制爬取数量，避免超时
      if (results.length >= 2) break
    }

    if (results.length > 0) {
      return `\n## 实时市场资讯\n${results.join("\n\n")}`
    }

    return undefined
  } catch (error) {
    console.warn("实时市场上下文获取失败:", error)
    return undefined
  }
}

/**
 * 根据用户问题选择最相关的爬取源
 */
function selectSourcesForQuery(message: string): Array<{ name: string; url: string }> {
  const sources: Array<{ name: string; url: string; keywords: string[] }> = [
    {
      name: "生意社硫磺频道",
      url: "https://www.100ppi.com/price/list-31.html",
      keywords: ["硫磺", "价格", "行情"],
    },
    {
      name: "生意社硫酸频道",
      url: "https://www.100ppi.com/price/list-597.html",
      keywords: ["硫酸", "价格"],
    },
    {
      name: "百川资讯",
      url: "https://www.baiinfo.com/",
      keywords: ["百川", "化工", "市场"],
    },
    {
      name: "卓创资讯",
      url: "https://www.sci99.com/news/chemical/",
      keywords: ["卓创", "化工", "资讯"],
    },
    {
      name: "隆众资讯",
      url: "https://www.oilchem.net/",
      keywords: ["隆众", "市场", "分析"],
    },
  ]

  // 根据关键词匹配度排序
  const scored = sources.map(source => {
    let score = 0
    for (const keyword of source.keywords) {
      if (message.includes(keyword)) {
        score += 2
      }
    }
    return { ...source, score }
  })

  scored.sort((a, b) => b.score - a.score)

  // 返回前 2-3 个最相关的源
  return scored.slice(0, 3).map(({ name, url }) => ({ name, url }))
}

/**
 * 从爬取内容中提取与用户问题相关的片段
 */
function extractRelevantContent(markdown: string, message: string, sourceName: string): string | null {
  // 按段落分割
  const paragraphs = markdown.split(/\n\n+/)

  // 提取用户问题中的关键词
  const keywords = extractKeywords(message)

  // 为每个段落打分
  const scoredParagraphs = paragraphs
    .map(paragraph => {
      let score = 0
      const lowerParagraph = paragraph.toLowerCase()

      for (const keyword of keywords) {
        if (lowerParagraph.includes(keyword)) {
          score += 1
        }
      }

      // 包含数字/价格的段落加分
      if (/\d+/.test(paragraph)) {
        score += 0.5
      }

      // 包含涨跌关键词加分
      if (/涨|跌|升|降|上涨|下跌/.test(paragraph)) {
        score += 1
      }

      return { paragraph, score }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)

  // 取前 2 个最相关的段落
  const topParagraphs = scoredParagraphs.slice(0, 2).map(item => item.paragraph)

  if (topParagraphs.length === 0) {
    return null
  }

  // 限制长度，避免过长
  const content = topParagraphs.join("\n\n").slice(0, 1000)

  return `**${sourceName}**:\n${content}`
}

/**
 * 从消息中提取关键词
 */
function extractKeywords(message: string): string[] {
  // 简单的关键词提取：按空格/标点分割，过滤短词
  const tokens = message.split(/[\s,，。！？、]+/).filter(t => t.length >= 2)

  // 去重
  return Array.from(new Set(tokens))
}
