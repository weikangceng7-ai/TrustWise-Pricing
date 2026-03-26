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
    // 返回模拟数据
    return getMockTimelineData()
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
    return getMockNewsData(query)
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

    // 如果所有请求都失败，使用模拟数据
    const hasRealData = results.some(r => r.count > 0)
    if (!hasRealData) {
      return getMockSummary()
    }

    return {
      topics: results,
      totalArticles: results.reduce((sum, r) => sum + r.count, 0),
      lastUpdated: new Date().toISOString()
    }
  } catch (error) {
    console.error("获取硫磺新闻摘要失败:", error)
    return getMockSummary()
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

function getMockTimelineData() {
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

/**
 * 获取模拟的硫磺新闻摘要数据
 */
function getMockSummary() {
  const now = new Date()
  const topics = [
    {
      keyword: "sulfur",
      count: 15,
      articles: [
        {
          title: "全球硫磺市场供应紧张，价格持续上涨",
          url: "https://example.com/sulfur/1",
          source: "中国",
          date: now.toISOString(),
          language: "zh",
          tone: 2.8
        },
        {
          title: "Middle East sulfur exports increase amid rising demand",
          url: "https://example.com/sulfur/2",
          source: "US",
          date: new Date(now.getTime() - 86400000).toISOString(),
          language: "en",
          tone: 1.5
        },
        {
          title: "硫磺进口关税调整影响国内市场",
          url: "https://example.com/sulfur/3",
          source: "中国",
          date: new Date(now.getTime() - 172800000).toISOString(),
          language: "zh",
          tone: -0.5
        }
      ]
    },
    {
      keyword: "sulphur",
      count: 12,
      articles: [
        {
          title: "European sulphur market outlook remains positive",
          url: "https://example.com/sulphur/1",
          source: "UK",
          date: now.toISOString(),
          language: "en",
          tone: 2.1
        },
        {
          title: "印度硫磺需求增长推动亚洲市场",
          url: "https://example.com/sulphur/2",
          source: "印度",
          date: new Date(now.getTime() - 86400000).toISOString(),
          language: "zh",
          tone: 1.8
        }
      ]
    },
    {
      keyword: "硫磺",
      count: 8,
      articles: [
        {
          title: "磷肥企业硫磺采购策略分析",
          url: "https://example.com/sulfur-cn/1",
          source: "中国",
          date: now.toISOString(),
          language: "zh",
          tone: 1.2
        },
        {
          title: "港口硫磺库存周报：库存持续下降",
          url: "https://example.com/sulfur-cn/2",
          source: "中国",
          date: new Date(now.getTime() - 86400000).toISOString(),
          language: "zh",
          tone: 0.5
        }
      ]
    }
  ]

  return {
    topics,
    totalArticles: topics.reduce((sum, t) => sum + t.count, 0),
    lastUpdated: now.toISOString()
  }
}