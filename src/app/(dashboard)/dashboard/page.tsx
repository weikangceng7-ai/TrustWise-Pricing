import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Package, DollarSign } from "lucide-react"
import { SummaryCards } from "@/components/summary-cards"
import { YihuaKnowledgePanel } from "@/components/yihua-knowledge-panel"
import { PriceChart } from "@/components/price-chart"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">仪表盘</h2>
        <p className="text-muted-foreground">
          硫磺市场价格概览与预测分析
        </p>
      </div>

      {/* 数据概览卡片 */}
      <SummaryCards />

      {/* 宜化资料 / 图 / 文献：预处理统计与快捷入口 */}
      <YihuaKnowledgePanel />

      {/* 价格趋势图 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            价格趋势
          </CardTitle>
          <CardDescription>
            实际价格与预测价格走势对比（含未来7天预测）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PriceChart />
        </CardContent>
      </Card>

      {/* 底部信息区 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 最新动态 */}
        <Card>
          <CardHeader>
            <CardTitle>最新动态</CardTitle>
            <CardDescription>市场新闻与系统通知</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium">国际硫磺价格上涨</p>
                <p className="text-xs text-muted-foreground">2小时前</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <Package className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium">库存预警已更新</p>
                <p className="text-xs text-muted-foreground">5小时前</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
                <DollarSign className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium">周度采购报告已生成</p>
                <p className="text-xs text-muted-foreground">1天前</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 快捷操作 */}
        <Card>
          <CardHeader>
            <CardTitle>快捷操作</CardTitle>
            <CardDescription>常用功能入口</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <a
              href="/agent-chat"
              className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium">AI 决策助手</span>
            </a>
            <a
              href="/reports"
              className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium">采购报告</span>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
