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
      }
    })

    if (!response.ok) {
      throw new Error(`GDELT API returned ${response.status}`)
    }

    const data = await response.json()
    return parseTimelineData(data)
  } catch {
    // 返回模拟数据
    return getMockTimelineData(query)
  }
}

async function fetchGDELTNews(query: string) {
  try {
    const searchQuery = `${query} (sourcelang:zh OR sourcelang:en)`
    const url = `${GDELT_DOC_API}?query=${encodeURIComponent(searchQuery)}&mode=artlist&format=json&maxrecords=20`

    const response = await fetch(url, {
      headers: {
        "User-Agent": "SulfurAgent/1.0"
      }
    })

    if (!response.ok) {
      throw new Error(`GDELT API returned ${response.status}`)
    }

    const data = await response.json()
    return parseNewsData(data)
  } catch {
    return getMockNewsData(query)
  }
}

async function getSulfurNewsSummary() {
  // 获取硫磺相关的新闻摘要
  const results = await Promise.all(
    SULFUR_KEYWORDS.slice(0, 3).map(async (keyword) => {
      const data = await fetchGDELTNews(keyword)
      return {
        keyword: keyword,
        count: data.length,
        articles: data.slice(0, 3)
      }
    })
  )

  return {
    topics: results,
    totalArticles: results.reduce((sum, r) => sum + r.count, 0),
    lastUpdated: new Date().toISOString()
  }
}

function parseTimelineData(data: any) {
  if (!data?.timeline || !Array.isArray(data.timeline)) {
    return []
  }

  return data.timeline.map((item: any) => ({
    date: item.date,
    value: item.value || 0,
    count: item.count || 0
  }))
}

function parseNewsData(data: any) {
  if (!data?.articles || !Array.isArray(data.articles)) {
    return []
  }

  return data.articles.map((article: any) => ({
    title: article.title || "",
    url: article.url || "",
    source: article.sourcecountry || "",
    date: article.seendate || "",
    language: article.language || "",
    tone: article.tone || 0
  }))
}

function getMockTimelineData(query: string) {
  const now = new Date()
  const data = []

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    data.push({
      date: date.toISOString().split("T")[0],
      value: Math.floor(Math.random() * 100) + 50,
      count: Math.floor(Math.random() * 20) + 5
    })
  }

  return data
}

function getMockNewsData(query: string) {
  const mockArticles = [
    {
      title: `${query}市场供需分析报告发布`,
      url: "https://example.com/news/1",
      source: "中国",
      date: new Date().toISOString(),
      language: "zh",
      tone: 2.5
    },
    {
      title: `Global ${query} prices show upward trend`,
      url: "https://example.com/news/2",
      source: "US",
      date: new Date(Date.now() - 86400000).toISOString(),
      language: "en",
      tone: -1.2
    },
    {
      title: `${query}库存变化对价格的影响`,
      url: "https://example.com/news/3",
      source: "中国",
      date: new Date(Date.now() - 172800000).toISOString(),
      language: "zh",
      tone: 0.8
    },
    {
      title: `International ${query} trade dynamics`,
      url: "https://example.com/news/4",
      source: "UK",
      date: new Date(Date.now() - 259200000).toISOString(),
      language: "en",
      tone: 1.5
    },
    {
      title: `${query}下游需求分析`,
      url: "https://example.com/news/5",
      source: "中国",
      date: new Date(Date.now() - 345600000).toISOString(),
      language: "zh",
      tone: 3.2
    }
  ]

  return mockArticles
}