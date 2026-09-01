import { fetchDashboardData } from "@/services/dashboard"
import { DashboardContent } from "./dashboard-content"
import { QueryProvider } from "@/components/query-provider"

export const dynamic = "force-dynamic"
export const maxDuration = 15

export default async function DashboardPage() {
  // 在服务端预取初始数据，首屏无需等待客户端 API 请求
  let initialData = null
  try {
    initialData = await fetchDashboardData("sulfur")
  } catch (error) {
    console.error("Dashboard 预取失败:", error)
  }

  return (
    <QueryProvider>
      <DashboardContent initialData={initialData} />
    </QueryProvider>
  )
}
