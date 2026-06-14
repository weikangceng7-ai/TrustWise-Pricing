"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Code, Key, BarChart, Zap, Book, ArrowRight } from "lucide-react"

export default function ApiConsolePage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState("prices")

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">硫磺采购决策 API</h1>
        <p className="text-xl text-muted-foreground mb-6">
          通过 API 接口获取价格预测、决策建议、市场数据和 AI 聊天服务
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/api-keys">
            <Button size="lg">
              <Key className="mr-2 h-5 w-5" />
              获取 API Key
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" size="lg">
              注册账号
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Features Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        {/* 价格预测卡片 */}
        <Card>
          <CardHeader className="pb-2">
            <Zap className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">价格预测</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Hybrid ARIMA + XGBoost 模型预测未来价格走势
            </CardDescription>
          </CardContent>
        </Card>

        {/* 决策建议卡片 */}
        <Card>
          <CardHeader className="pb-2">
            <BarChart className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">决策建议</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              智能采购决策建议，包含库存分析
            </CardDescription>
          </CardContent>
        </Card>

        {/* 数据查询卡片 */}
        <Card>
          <CardHeader className="pb-2">
            <Book className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">数据查询</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              价格、库存、市场新闻等历史数据
            </CardDescription>
          </CardContent>
        </Card>

        {/* AI 聊天卡片 */}
        <Card>
          <CardHeader className="pb-2">
            <Code className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">AI 聊天</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              与专业硫磺采购助手对话问答
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Section */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle>定价方案</CardTitle>
          <CardDescription>灵活的配额方案，满足不同需求</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 免费额度 */}
            <div className="border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">免费额度</h3>
              <div className="text-3xl font-bold mb-4">1000 次<span className="text-muted-foreground text-lg">/月</span></div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>每月自动重置</li>
                <li>所有 API 端点可用</li>
                <li>注册即可获得</li>
              </ul>
            </div>

            {/* 付费额度 */}
            <div className="border rounded-lg p-6 bg-primary/5">
              <h3 className="text-lg font-semibold mb-2">付费额度</h3>
              <div className="text-3xl font-bold mb-4">¥1<span className="text-muted-foreground text-lg">/100 次</span></div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>按需购买，永久有效</li>
                <li>优先扣减免费额度</li>
                <li>超额后自动使用付费额度</li>
              </ul>
              <Badge variant="secondary" className="mt-4">即将上线</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Documentation Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>API 文档</CardTitle>
          <CardDescription>选择端点查看详细说明</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
            <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
              <TabsTrigger value="prices">价格查询</TabsTrigger>
              <TabsTrigger value="predict">价格预测</TabsTrigger>
              <TabsTrigger value="decision">决策建议</TabsTrigger>
              <TabsTrigger value="inventory">库存数据</TabsTrigger>
              <TabsTrigger value="news">市场新闻</TabsTrigger>
              <TabsTrigger value="chat">AI 聊天</TabsTrigger>
            </TabsList>

            {/* 价格查询 */}
            <TabsContent value="prices" className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>GET</Badge>
                  <code className="text-sm">/api/v1/prices</code>
                </div>
                <p className="text-sm text-muted-foreground">获取硫磺价格历史数据</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">请求参数</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">参数</th>
                      <th className="text-left py-2">类型</th>
                      <th className="text-left py-2">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b"><td className="py-2">startDate</td><td className="py-2">string</td><td className="py-2">开始日期 (YYYY-MM-DD)</td></tr>
                    <tr className="border-b"><td className="py-2">endDate</td><td className="py-2">string</td><td className="py-2">结束日期 (YYYY-MM-DD)</td></tr>
                    <tr className="border-b"><td className="py-2">region</td><td className="py-2">string</td><td className="py-2">地区筛选</td></tr>
                    <tr className="border-b"><td className="py-2">market</td><td className="py-2">string</td><td className="py-2">市场筛选</td></tr>
                    <tr><td className="py-2">limit</td><td className="py-2">integer</td><td className="py-2">返回数量 (默认 30)</td></tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h4 className="font-semibold mb-2">示例代码</h4>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`curl -X GET "https://sulfur-agent-web.vercel.app/api/v1/prices?limit=10" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                </pre>
              </div>
            </TabsContent>

            {/* 价格预测 */}
            <TabsContent value="predict" className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default">POST</Badge>
                  <code className="text-sm">/api/v1/prices/predict</code>
                </div>
                <p className="text-sm text-muted-foreground">预测未来硫磺价格</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">请求体</h4>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`{
  "days": 7
}`}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">示例代码</h4>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`curl -X POST "https://sulfur-agent-web.vercel.app/api/v1/prices/predict" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"days": 7}'`}
                </pre>
              </div>
            </TabsContent>

            {/* 决策建议 */}
            <TabsContent value="decision" className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default">POST</Badge>
                  <code className="text-sm">/api/v1/decision</code>
                </div>
                <p className="text-sm text-muted-foreground">获取采购决策建议</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">请求体</h4>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`{
  "days": 7,
  "current_inventory": 5000,
  "daily_consumption": 100,
  "safety_days": 30
}`}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">示例代码</h4>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`curl -X POST "https://sulfur-agent-web.vercel.app/api/v1/decision" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"days": 7, "current_inventory": 5000, "daily_consumption": 100, "safety_days": 30}'`}
                </pre>
              </div>
            </TabsContent>

            {/* 库存数据 */}
            <TabsContent value="inventory" className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>GET</Badge>
                  <code className="text-sm">/api/v1/data/inventory</code>
                </div>
                <p className="text-sm text-muted-foreground">获取港口库存数据</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">请求参数</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">参数</th>
                      <th className="text-left py-2">类型</th>
                      <th className="text-left py-2">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b"><td className="py-2">port</td><td className="py-2">string</td><td className="py-2">港口筛选</td></tr>
                    <tr><td className="py-2">limit</td><td className="py-2">integer</td><td className="py-2">返回数量 (默认 30)</td></tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h4 className="font-semibold mb-2">示例代码</h4>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`curl -X GET "https://sulfur-agent-web.vercel.app/api/v1/data/inventory?limit=10" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                </pre>
              </div>
            </TabsContent>

            {/* 市场新闻 */}
            <TabsContent value="news" className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>GET</Badge>
                  <code className="text-sm">/api/v1/data/news</code>
                </div>
                <p className="text-sm text-muted-foreground">获取市场新闻动态</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">请求参数</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">参数</th>
                      <th className="text-left py-2">类型</th>
                      <th className="text-left py-2">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b"><td className="py-2">keyword</td><td className="py-2">string</td><td className="py-2">关键词筛选</td></tr>
                    <tr><td className="py-2">limit</td><td className="py-2">integer</td><td className="py-2">返回数量 (默认 20)</td></tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h4 className="font-semibold mb-2">示例代码</h4>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`curl -X GET "https://sulfur-agent-web.vercel.app/api/v1/data/news?limit=10" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                </pre>
              </div>
            </TabsContent>

            {/* AI 聊天 */}
            <TabsContent value="chat" className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default">POST</Badge>
                  <code className="text-sm">/api/v1/chat</code>
                </div>
                <p className="text-sm text-muted-foreground">与 AI 聊天助手对话</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">请求体</h4>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`{
  "message": "当前硫磺价格趋势如何？",
  "history": []
}`}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">示例代码</h4>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`curl -X POST "https://sulfur-agent-web.vercel.app/api/v1/chat" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "当前硫磺价格趋势如何？", "history": []}'`}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}