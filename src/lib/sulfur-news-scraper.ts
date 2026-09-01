/**
 * 硫磺行业新闻爬取模块
 *
 * 使用 Firecrawl 爬取硫磺行业网站（百川资讯、卓创资讯、隆众资讯等），
 * 提取新闻标题、日期、摘要、链接，供 RAG 知识库入库和 AI 聊天上下文使用。
 *
 * 依赖: src/lib/firecrawl-client.ts (Firecrawl SDK 封装)
 */

import { scrapePage, mapUrls, type ScrapedPage } from "@/lib/firecrawl-client"

// ---- 类型定义 ----

export interface NewsItem {
  title: string
  url: string
  source: string
  date: string
  summary: string
}

export interface ScrapeResult {
  source: string
  items: NewsItem[]
  count: number
  success: boolean
  error?: string
}

// ---- 目标网站配置 ----

interface SourceConfig {
  name: string
  /** 硫磺行业频道页 URL */
  channelUrl: string
  /** 用于 mapUrls 搜索的关键词 */
  searchKeywords: string[]
  /** URL 过滤：只保留包含这些路径的页面 */
  urlFilters: string[]
}

const SOURCES: SourceConfig[] = [
  {
    // 生意社硫磺基准价新闻（productId=404），已有 commodity-scraper.ts 验证可用
    name: "生意社-硫磺基准价",
    channelUrl: "https://chem.100ppi.com/news/list--404-1.html",
    searchKeywords: ["硫磺"],
    urlFilters: ["/news/list--404"],
  },
  {
    // 生意社硫酸基准价新闻（productId=558）
    name: "生意社-硫酸基准价",
    channelUrl: "https://chem.100ppi.com/news/list--558-1.html",
    searchKeywords: ["硫酸"],
    urlFilters: ["/news/list--558"],
  },
  {
    // 生意社磷矿石基准价新闻
    name: "生意社-磷矿石基准价",
    channelUrl: "https://chem.100ppi.com/news/list--597-1.html",
    searchKeywords: ["磷矿石", "磷酸"],
    urlFilters: ["/news/list--597"],
  },
]

// ---- 内容提取 ----

/**
 * 从 markdown 内容中提取新闻条目
 * 生意社新闻列表页的链接格式：
 *   - 新闻详情: /news/detail--{productId}-{id}.html
 *   - 产品页: /mprice/plist-... (跳过)
 */
function extractNewsFromMarkdown(
  markdown: string,
  baseUrl: string,
  sourceName: string,
  urlFilters: string[]
): NewsItem[] {
  const items: NewsItem[] = []
  const lines = markdown.split("\n")

  // 匹配 markdown 链接: [标题](url)
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g
  // 匹配日期: 2024-01-15, 2024/01/15, 2024年01月15日
  const datePattern = /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)/

  // 新闻详情页 URL 模式（生意社）
  // 格式: /news/detail-YYYYMMDD-ID.html
  const newsDetailPattern = /\/news\/detail-\d{8}-\d+\.html/

  let match: RegExpExecArray | null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.length < 10) continue

    // 重置正则
    linkPattern.lastIndex = 0

    while ((match = linkPattern.exec(trimmed)) !== null) {
      const title = match[1].trim()
      let url = match[2].trim()

      // 跳过非新闻链接
      if (
        !title ||
        title.length < 4 ||
        url.startsWith("#") ||
        url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)
      ) {
        continue
      }

      // 相对 URL 转绝对 URL
      if (url.startsWith("/")) {
        try {
          const base = new URL(baseUrl)
          url = `${base.protocol}//${base.host}${url}`
        } catch {
          continue
        }
      }

      // 只保留新闻详情页链接（/news/detail--...）
      // 跳过产品页（/mprice/）、列表页（/news/list--）等
      if (!newsDetailPattern.test(url)) {
        continue
      }

      // 提取日期
      const dateMatch = datePattern.exec(trimmed)
      const date = dateMatch
        ? normalizeDate(dateMatch[1])
        : new Date().toISOString().split("T")[0]

      // 提取摘要（链接后面的文本）
      const afterLink = trimmed.slice(match.index + match[0].length).trim()
      const summary = afterLink.length > 20 ? afterLink.slice(0, 200) : ""

      items.push({
        title: title.slice(0, 200),
        url,
        source: sourceName,
        date,
        summary: summary.slice(0, 500),
      })
    }
  }

  return items
}

/**
 * 标准化日期格式为 YYYY-MM-DD
 */
function normalizeDate(dateStr: string): string {
  // 2024年01月15日 → 2024-01-15
  const zhMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日?/)
  if (zhMatch) {
    return `${zhMatch[1]}-${zhMatch[2].padStart(2, "0")}-${zhMatch[3].padStart(2, "0")}`
  }
  // 2024/01/15 → 2024-01-15
  return dateStr.replace(/\//g, "-")
}

// ---- 去重 ----

/**
 * 对新闻列表去重（按 URL）
 */
function deduplicateNews(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>()
  const result: NewsItem[] = []

  for (const item of items) {
    // 规范化 URL（去除 trailing slash、query params）
    const normalizedUrl = item.url.split("?")[0].replace(/\/$/, "")
    if (!seen.has(normalizedUrl)) {
      seen.add(normalizedUrl)
      result.push(item)
    }
  }

  return result
}

// ---- 公开 API ----

/**
 * 从单个源爬取硫磺新闻
 */
export async function scrapeNewsFromSource(
  source: SourceConfig
): Promise<ScrapeResult> {
  // 1. 爬取频道页
  const page = await scrapePage(source.channelUrl)

  if (!page) {
    return {
      source: source.name,
      items: [],
      count: 0,
      success: false,
      error: "频道页爬取失败",
    }
  }

  // 2. 从 markdown 提取新闻条目
  const items = extractNewsFromMarkdown(
    page.markdown,
    source.channelUrl,
    source.name,
    source.urlFilters
  )

  // 3. 去重
  const deduplicated = deduplicateNews(items)

  return {
    source: source.name,
    items: deduplicated,
    count: deduplicated.length,
    success: true,
  }
}

/**
 * 从所有配置的源爬取硫磺新闻
 */
export async function scrapeAllSulfurNews(): Promise<ScrapeResult[]> {
  const results = await Promise.allSettled(
    SOURCES.map((source) => scrapeNewsFromSource(source))
  )

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value
    }
    return {
      source: SOURCES[index].name,
      items: [],
      count: 0,
      success: false,
      error: String(result.reason),
    }
  })
}

/**
 * 爬取单个新闻详情页的完整内容（用于 RAG 入库）
 */
export async function scrapeNewsDetail(url: string): Promise<string | null> {
  const page = await scrapePage(url)
  return page?.markdown || null
}

/**
 * 获取所有配置的硫磺行业源信息
 */
export function getSulfurNewsSources(): Array<{ name: string; url: string }> {
  return SOURCES.map((s) => ({ name: s.name, url: s.channelUrl }))
}
