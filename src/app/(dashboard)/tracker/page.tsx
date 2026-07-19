import { redirect } from "next/navigation"

// 已合并至市场分析页，保留旧路由重定向
export default function TrackerPage() {
  redirect("/market-analysis?tab=tracker")
}
