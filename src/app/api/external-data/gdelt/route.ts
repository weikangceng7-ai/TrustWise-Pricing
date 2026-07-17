import { NextResponse } from "next/server"

/**
 * GDELT 全球事件数据库 API
 * 文档：https://www.gdeltproject.org/
 * 无需 API 密钥
 *
 * GDELT API 端点：
 * - https://api.gdeltproject.org/api/v2/doc/doc
 * - https://api.gdeltproject.org/api/v2/tv/tv
 * - https://api.gdeltproject.org/api/v2/geo/geo
 */

export const maxDuration = 30

const GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc"

// 硫磺相关的关键词
const SULFUR_KEYWORDS = [
  "sulfur",
  "sulphur",
  "硫磺",
  "fertilizer",
  "phosphate",
  "化工",
  "磷肥"
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q") || "sulfur"
  const mode = searchParams.get("mode") || "timeline"

  try {
    if (mode === "timeline") {
      // 获取时间线数据
      const timelineData = await fetchGDELTTimeline(query)
      return NextResponse.json({
        success: true,
        isMock: false,
        source: "GDELT",
        query: query,
        mode: mode,
        data: timelineData,
        timestamp: new Date().toISOString()
      })
    } else if (mode === "search") {
      // 搜索新闻
      const newsData = await fetchGDELTNews(query)
      return NextResponse.json({
        success: true,
        isMock: false,
        source: "GDELT",
        query: query,
        mode: mode,
        data: newsData,
        timestamp: new Date().toISOString()
      })
    } else {
      // 返回硫磺相关摘要
      const summary = await getSulfurNewsSummary()
      return NextResponse.json({
        success: true,
        isMock: false,
        source: "GDELT",
        mode: "summary",
        data: summary,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error("GDELT API error:", error)
    return NextResponse.json(
      { success: false, error: "获取数据失败" },
      { status: 500 }
    )
  }
}

async function fetchGDELTTimeline(query: string) {
  // GDELT 查询格式
  const searchQuery = `${query} (sourcelang:zh OR sourcelang:en)`

  try {
    // 使用 GDELT Doc API 获取时间线
    const url = `${GDELT_DOC_API}?query=${encodeURIComponent(searchQuery)}&mode=timelinevol&format=json&datanorm=perc&timelinesmooth=0&datacomb=sep&timezoom=yes&TIMELINE=1`

    const response = await fetch(url, {
      headers: {
        "User-Agent": "SulfurAgent/1.0"
      },
      next: { revalidate: 3600 } // 缓存1小时
    })

    if (!response.ok) {
      throw new Error(`GDELT API returned ${response.status}`)
    }

    const data = await response.json()
    return parseTimelineData(data)
  } catch (error) {
    console.error("获取GDELT时间线失败:", error)
    // 不再使用模拟数据，失败时返回空数据
    return []
  }
}

async function fetchGDELTNews(query: string) {
  try {
    const searchQuery = `${query} (sourcelang:zh OR sourcelang:en)`
    const url = `${GDELT_DOC_API}?query=${encodeURIComponent(searchQuery)}&mode=artlist&format=json&maxrecords=20`

    const response = await fetch(url, {
      headers: {
        "User-Agent": "SulfurAgent/1.0"
      },
      next: { revalidate: 3600 } // 缓存1小时
    })

    if (!response.ok) {
      throw new Error(`GDELT API returned ${response.status}`)
    }

    const data = await response.json()
    return parseNewsData(data)
  } catch (error) {
    console.error("获取GDELT新闻失败:", error)
    return []
  }
}

async function getSulfurNewsSummary() {
  try {
    // 获取硫磺相关的新闻摘要
    const results = await Promise.all(
      SULFUR_KEYWORDS.slice(0, 3).map(async (keyword) => {
        try {
          const data = await fetchGDELTNews(keyword)
          return {
            keyword: keyword,
            count: data.length,
            articles: data.slice(0, 3)
          }
        } catch {
          return {
            keyword: keyword,
            count: 0,
            articles: []
          }
        }
      })
    )

    // 全部请求失败时返回空摘要，不再使用模拟数据
    return {
      topics: results,
      totalArticles: results.reduce((sum, r) => sum + r.count, 0),
      lastUpdated: new Date().toISOString()
    }
  } catch (error) {
    console.error("获取硫磺新闻摘要失败:", error)
    return {
      topics: [],
      totalArticles: 0,
      lastUpdated: new Date().toISOString()
    }
  }
}

interface GDELTTimelineItem {
  date: string
  value?: number
  count?: number
}

interface GDELTTimelineData {
  timeline?: GDELTTimelineItem[]
}

function parseTimelineData(data: GDELTTimelineData) {
  if (!data?.timeline || !Array.isArray(data.timeline)) {
    return []
  }

  return data.timeline.map((item) => ({
    date: item.date,
    value: item.value || 0,
    count: item.count || 0
  }))
}

interface GDELTArticle {
  title?: string
  url?: string
  sourcecountry?: string
  seendate?: string
  language?: string
  tone?: number
}

interface GDELTNewsData {
  articles?: GDELTArticle[]
}

function parseNewsData(data: GDELTNewsData) {
  if (!data?.articles || !Array.isArray(data.articles)) {
    return []
  }

  return data.articles.map((article) => ({
    title: article.title || "",
    url: article.url || "",
    source: article.sourcecountry || "",
    date: article.seendate || "",
    language: article.language || "",
    tone: article.tone || 0
  }))
}
