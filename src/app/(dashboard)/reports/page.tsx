import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, Filter } from "lucide-react";

const reports = [
  {
    id: 1,
    title: "周度采购报告",
    date: "2024-01-15",
    type: "weekly",
    summary: "本周硫磺市场整体稳定，建议保持现有采购节奏",
  },
  {
    id: 2,
    title: "月度市场分析",
    date: "2024-01-01",
    type: "monthly",
    summary: "上月价格波动较大，预测本月趋于平稳",
  },
  {
    id: 3,
    title: "供应商评估报告",
    date: "2024-01-10",
    type: "supplier",
    summary: "主要供应商综合评分及报价对比分析",
  },
  {
    id: 4,
    title: "库存预警报告",
    date: "2024-01-12",
    type: "inventory",
    summary: "当前库存水平健康，建议下周补充采购",
  },
];

const reportTypeColors: Record<string, string> = {
  weekly: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  monthly: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  supplier: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  inventory: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
};

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">采购报告</h2>
          <p className="text-muted-foreground">
            历史报告与数据分析
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            筛选
          </Button>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            日期范围
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">总报告数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">128</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">本周新增</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">本月新增</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">待审核</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>最近报告</CardTitle>
          <CardDescription>查看和下载历史报告</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-start justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{report.title}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          reportTypeColors[report.type]
                        }`}
                      >
                        {report.type === "weekly"
                          ? "周报"
                          : report.type === "monthly"
                          ? "月报"
                          : report.type === "supplier"
                          ? "供应商"
                          : "库存"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {report.summary}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {report.date}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
