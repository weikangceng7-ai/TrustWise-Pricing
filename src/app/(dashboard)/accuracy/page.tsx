import { redirect } from "next/navigation"

// 已合并至市场分析页，保留旧路由重定向
export default function AccuracyDashboardPage() {
  redirect("/market-analysis?tab=accuracy")
}
