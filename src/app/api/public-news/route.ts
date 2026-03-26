import { NextResponse } from "next/server"

/**
 * 公开新闻 API - 无需登录即可访问
 * 从 GDELT 获取国际/国内时事新闻
 */

const GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc"

// 国际国内时势关键词
const NEWS_KEYWORDS = [
  // 国际
  { keyword: "oil price OR crude oil", category: "international", label: "能源市场" },
  { keyword: "OPEC", category: "international", label: "OPEC动态" },
  { keyword: "global trade", category: "international", label: "全球贸易" },
  { keyword: "commodity prices", category: "international", label: "大宗商品" },
  // 国内
  { keyword: "化工市场", category: "domestic", label: "化工市场" },
  { keyword: "磷肥", category: "domestic", label: "磷肥行业" },
  { keyword: "硫磺", category: "domestic", label: "硫磺市场" },
]

interface NewsArticle {
  title: string
  url: string
  source: string
  date: string
  language: string
  tone: number
  category: string
  label: string
}

export async function GET() {
  try {
    // 随机选择一个关键词获取新闻
    const selectedKeyword = NEWS_KEYWORDS[Math.floor(Math.random() * NEWS_KEYWORDS.length)]

    const news = await fetchNews(selectedKeyword.keyword, selectedKeyword.category, selectedKeyword.label)

    if (news.length === 0) {
      // 返回备用新闻
      return NextResponse.json({
        success: true,
        data: getFallbackNews(),
        source: "fallback",
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: true,
      data: news,
      source: "GDELT",
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Public news API error:", error)
    return NextResponse.json({
      success: true,
      data: getFallbackNews(),
      source: "fallback",
      timestamp: new Date().toISOString()
    })
  }
}

async function fetchNews(keyword: string, category: string, label: string): Promise<NewsArticle[]> {
  try {
    const searchQuery = `${keyword} (sourcelang:zh OR sourcelang:en)`
    const url = `${GDELT_DOC_API}?query=${encodeURIComponent(searchQuery)}&mode=artlist&format=json&maxrecords=5&last24hrs=yes`

    const response = await fetch(url, {
      headers: {
        "User-Agent": "SulfurAgent/1.0"
      },
      next: { revalidate: 1800 } // 缓存30分钟
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return parseNewsData(data, category, label)
  } catch (error) {
    console.error("Fetch news error:", error)
    return []
  }
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

function parseNewsData(data: GDELTNewsData, category: string, label: string): NewsArticle[] {
  if (!data?.articles || !Array.isArray(data.articles)) {
    return []
  }

  return data.articles
    .filter(article => article.title && article.url)
    .slice(0, 2) // 最多返回2条
    .map((article) => ({
      title: article.title || "",
      url: article.url || "",
      source: article.sourcecountry || "",
      date: article.seendate || "",
      language: article.language || "",
      tone: article.tone || 0,
      category,
      label
    }))
}

function getFallbackNews(): NewsArticle[] {
  const now = new Date()
  // 随机返回一条国际或国内新闻
  const newsPool = [
    {
      title: "国际原油市场波动加剧，供应端不确定性增加",
      url: "https://example.com/market/oil",
      source: "Global",
      date: now.toISOString(),
      language: "zh",
      tone: -2.5,
      category: "international",
      label: "能源市场"
    },
    {
      title: "OPEC+ 会议召开在即，市场关注产量政策调整",
      url: "https://example.com/market/opec",
      source: "Global",
      date: now.toISOString(),
      language: "zh",
      tone: 1.2,
      category: "international",
      label: "OPEC动态"
    },
    {
      title: "全球化工原料供应链持续承压，价格走势分化",
      url: "https://example.com/market/chemical",
      source: "China",
      date: now.toISOString(),
      language: "zh",
      tone: -1.8,
      category: "domestic",
      label: "化工市场"
    },
    {
      title: "国内磷肥市场稳中向好，出口订单增加",
      url: "https://example.com/market/fertilizer",
      source: "China",
      date: now.toISOString(),
      language: "zh",
      tone: 1.5,
      category: "domestic",
      label: "磷肥行业"
    },
    {
      title: "硫磺进口量环比上涨，港口库存维持高位",
      url: "https://example.com/market/sulfur",
      source: "China",
      date: now.toISOString(),
      language: "zh",
      tone: 0.8,
      category: "domestic",
      label: "硫磺市场"
    }
  ]

  // 随机返回1条
  const randomIndex = Math.floor(Math.random() * newsPool.length)
  return [newsPool[randomIndex]]
}