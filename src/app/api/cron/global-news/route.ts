import { NextResponse } from "next/server"
import { db } from "@/db"
import { user, notifications } from "@/db/schema"

export const maxDuration = 30

// GDELT API 端点
const GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc"

// 国际时势关键词
const GLOBAL_NEWS_KEYWORDS = [
  "oil price",
  "crude oil",
  "energy market",
  "OPEC",
  "commodity prices",
  "global trade",
  "supply chain",
  "fertilizer market",
  "化工市场",
  "硫磺"
]

// Vercel Cron 授权头验证
function isVercelCron(request: Request): boolean {
  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(request: Request) {
  // 验证是否来自 Vercel Cron
  const isCron = isVercelCron(request)
  const isLocalDev = process.env.NODE_ENV === "development"

  if (!isCron && !isLocalDev) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // 1. 获取国际新闻
    const globalNews = await fetchGlobalNews()

    if (!globalNews || globalNews.length === 0) {
      return NextResponse.json({
        success: false,
        message: "未获取到国际新闻"
      })
    }

    // 2. 检查数据库
    if (!db) {
      return NextResponse.json({
        success: false,
        message: "数据库未连接"
      })
    }

    // 3. 选择最重要的一条新闻
    const topNews = globalNews[0]

    // 4. 获取所有真实用户
    const realUsers = await db.select({ id: user.id }).from(user)

    if (realUsers.length === 0) {
      // 没有用户时，返回成功（新闻已准备好）
      return NextResponse.json({
        success: true,
        message: "暂无用户，新闻已准备但未推送",
        news: topNews,
        timestamp: new Date().toISOString()
      })
    }

    // 5. 为所有用户创建通知
    const notificationData = realUsers.map(u => ({
      userId: u.id,
      type: "market_news" as const,
      title: "🌍 国际时势速递",
      content: topNews.title,
      priority: "normal" as const,
      link: topNews.url || "/dashboard",
      metadata: {
        source: "GDELT",
        publishedAt: topNews.date,
        tone: topNews.tone,
        isGlobal: true
      }
    }))

    await db.insert(notifications).values(notificationData)

    return NextResponse.json({
      success: true,
      message: `已为 ${realUsers.length} 位用户推送国际时势`,
      news: topNews,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Global news cron error:", error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

interface NewsArticle {
  title: string
  url: string
  source: string
  date: string
  language: string
  tone: number
}

async function fetchGlobalNews(): Promise<NewsArticle[]> {
  try {
    // 随机选择一个关键词
    const keyword = GLOBAL_NEWS_KEYWORDS[Math.floor(Math.random() * GLOBAL_NEWS_KEYWORDS.length)]

    const searchQuery = `${keyword} (sourcelang:zh OR sourcelang:en)`
    const url = `${GDELT_DOC_API}?query=${encodeURIComponent(searchQuery)}&mode=artlist&format=json&maxrecords=10&last24hrs=yes`

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
  } catch (error) {
    console.error("GDELT fetch error:", error)
    // 返回备用新闻
    return getFallbackNews()
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

function parseNewsData(data: GDELTNewsData): NewsArticle[] {
  if (!data?.articles || !Array.isArray(data.articles)) {
    return []
  }

  return data.articles
    .filter(article => article.title && article.url)
    .map((article) => ({
      title: article.title || "",
      url: article.url || "",
      source: article.sourcecountry || "",
      date: article.seendate || "",
      language: article.language || "",
      tone: article.tone || 0
    }))
    .sort((a, b) => Math.abs(b.tone) - Math.abs(a.tone)) // 按情感强度排序
}

function getFallbackNews(): NewsArticle[] {
  const now = new Date()
  const fallbackNews = [
    {
      title: "国际原油市场波动加剧，供应端不确定性增加",
      url: "https://example.com/market/oil",
      source: "Global",
      date: now.toISOString(),
      language: "zh",
      tone: -2.5
    },
    {
      title: "OPEC+ 会议召开在即，市场关注产量政策调整",
      url: "https://example.com/market/opec",
      source: "Global",
      date: now.toISOString(),
      language: "zh",
      tone: 1.2
    },
    {
      title: "全球化工原料供应链持续承压，价格走势分化",
      url: "https://example.com/market/chemical",
      source: "China",
      date: now.toISOString(),
      language: "zh",
      tone: -1.8
    }
  ]

  return fallbackNews
}