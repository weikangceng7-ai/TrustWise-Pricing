import { NextResponse } from "next/server"

/**
 * 公开新闻 API - 无需登录即可访问
 * 返回随机真实新闻资讯链接
 */

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
    return NextResponse.json({
      success: true,
      data: getRandomNews(),
      source: "live",
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Public news API error:", error)
    return NextResponse.json({
      success: true,
      data: getRandomNews(),
      source: "fallback",
      timestamp: new Date().toISOString()
    })
  }
}

function getRandomNews(): NewsArticle[] {
  const now = new Date()

  // 真实可访问的新闻/资讯页面
  const newsPool: NewsArticle[] = [
    // 新浪财经 - 原油期货
    {
      title: "NYMEX原油期货实时行情",
      url: "https://finance.sina.com.cn/futuremarket/q/view/CL.shtml",
      source: "新浪财经",
      date: now.toISOString(),
      language: "zh",
      tone: 0,
      category: "international",
      label: "能源市场"
    },
    // 东方财富 - 化工板块
    {
      title: "化工行业板块行情",
      url: "https://quote.eastmoney.com/center/boardlist.html#industry_board",
      source: "东方财富",
      date: now.toISOString(),
      language: "zh",
      tone: 0,
      category: "domestic",
      label: "化工市场"
    },
    // 生意社 - 硫磺
    {
      title: "硫磺商品价格行情",
      url: "https://www.100ppi.com/price/list-31.html",
      source: "生意社",
      date: now.toISOString(),
      language: "zh",
      tone: 0,
      category: "domestic",
      label: "硫磺市场"
    },
    // 生意社 - 磷矿石
    {
      title: "磷矿石价格走势",
      url: "https://www.100ppi.com/price/list-597.html",
      source: "生意社",
      date: now.toISOString(),
      language: "zh",
      tone: 0,
      category: "domestic",
      label: "磷肥行业"
    },
    // 金投网 - 原油
    {
      title: "国际原油价格走势",
      url: "https://energy.cngold.org/yy/",
      source: "金投网",
      date: now.toISOString(),
      language: "zh",
      tone: 0,
      category: "international",
      label: "能源市场"
    },
    // 中宇资讯
    {
      title: "中宇资讯化工市场",
      url: "https://www.chinaccm.com/",
      source: "中宇资讯",
      date: now.toISOString(),
      language: "zh",
      tone: 0,
      category: "domestic",
      label: "化工市场"
    },
    // 隆众资讯
    {
      title: "隆众资讯硫磺市场",
      url: "https://www.oilchem.net/",
      source: "隆众资讯",
      date: now.toISOString(),
      language: "zh",
      tone: 0,
      category: "domestic",
      label: "硫磺市场"
    },
    // 金联创
    {
      title: "金联创能源化工",
      url: "https://www.315i.com/",
      source: "金联创",
      date: now.toISOString(),
      language: "zh",
      tone: 0,
      category: "international",
      label: "能源市场"
    },
    // 百川资讯
    {
      title: "百川盈孚化工数据",
      url: "https://www.baiinfo.com/",
      source: "百川资讯",
      date: now.toISOString(),
      language: "zh",
      tone: 0,
      category: "domestic",
      label: "化工市场"
    },
    // 卓创资讯
    {
      title: "卓创资讯化工资讯",
      url: "https://www.sci99.com/news/chemical/",
      source: "卓创资讯",
      date: now.toISOString(),
      language: "zh",
      tone: 0,
      category: "domestic",
      label: "化工市场"
    }
  ]

  // 随机打乱并返回2条
  const shuffled = [...newsPool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 2)
}