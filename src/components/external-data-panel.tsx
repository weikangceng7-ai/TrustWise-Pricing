"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useMarketDataOverview } from "@/hooks/use-external-data"
import { TrendingUp, TrendingDown, Minus, RefreshCw, Globe, Newspaper, BarChart3 } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

/**
 * 外部数据面板组件
 * 展示 AKShare 行情数据、FRED 经济数据、GDELT 新闻数据
 */

export function ExternalDataPanel() {
  const { oil, brent, usdcny, bdi, news, loading, errors } = useMarketDataOverview()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            外部数据
          </CardTitle>
          <CardDescription>正在加载市场数据...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (errors.length > 0) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>外部数据加载失败</CardTitle>
          <CardDescription>{errors.join(", ")}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* 行情数据卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            市场行情
          </CardTitle>
          <CardDescription>
            实时行情数据 (每10分钟自动更新)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <MarketDataCard
              title="WTI原油"
              data={oil?.data}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <MarketDataCard
              title="布伦特原油"
              data={brent?.data}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <MarketDataCard
              title="美元/人民币"
              data={usdcny?.data}
              icon={<Globe className="h-4 w-4" />}
            />
            <MarketDataCard
              title="波罗的海指数"
              data={bdi?.data}
              icon={<BarChart3 className="h-4 w-4" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* 价格走势图 */}
      <Card>
        <CardHeader>
          <CardTitle>原油价格走势</CardTitle>
          <CardDescription>最近30天价格变化</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={oil?.data?.history?.slice(-30) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value.slice(5)}
                />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(2)}`, '价格']}
                  labelFormatter={(label) => `日期: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 新闻舆情 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            行业新闻舆情
          </CardTitle>
          <CardDescription>
            基于 GDELT 全球事件数据库 (每30分钟自动更新)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewsSection news={news} />
        </CardContent>
      </Card>
    </div>
  )
}

// 单个行情数据卡片
function MarketDataCard({
  title,
  data,
  icon
}: {
  title: string
  data?: { name: string; unit: string; latest?: { value: number; change: number; changePercent: number }; history?: any[] }
  icon: React.ReactNode
}) {
  if (!data?.latest) {
    return (
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{title}</span>
          {icon}
        </div>
        <div className="mt-2 text-2xl font-bold">--</div>
      </div>
    )
  }

  const { latest, unit } = data
  const isUp = latest.change > 0
  const isDown = latest.change < 0

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-bold">
        {latest.value.toFixed(2)}
        <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <Badge variant={isUp ? "default" : isDown ? "destructive" : "secondary"} className="text-xs">
          {isUp && <TrendingUp className="mr-1 h-3 w-3" />}
          {isDown && <TrendingDown className="mr-1 h-3 w-3" />}
          {!isUp && !isDown && <Minus className="mr-1 h-3 w-3" />}
          {isUp ? "+" : ""}{latest.change.toFixed(2)} ({isUp ? "+" : ""}{latest.changePercent.toFixed(2)}%)
        </Badge>
      </div>
    </div>
  )
}

// 新闻区块组件
function NewsSection({ news }: { news: any }) {
  if (!news?.data?.topics) {
    return <div className="text-muted-foreground">暂无新闻数据</div>
  }

  const { topics, totalArticles } = news.data

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        共找到 <Badge variant="outline">{totalArticles}</Badge> 篇相关文章
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {topics.map((topic: any, index: number) => (
          <div key={index} className="rounded-lg border p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{topic.keyword}</span>
              <Badge variant="secondary">{topic.count} 篇</Badge>
            </div>
            <div className="space-y-2">
              {topic.articles.slice(0, 2).map((article: any, i: number) => (
                <a
                  key={i}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-muted-foreground hover:text-primary truncate"
                >
                  {article.title}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ExternalDataPanel