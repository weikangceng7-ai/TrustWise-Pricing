import { fetchDashboardData } from "@/services/dashboard"
import { DashboardContent } from "./dashboard-content"

export const dynamic = "force-dynamic"
export const maxDuration = 15

export default async function DashboardPage() {
  // 在服务端预取初始数据，首屏无需等待客户端 API 请求
  const initialData = await fetchDashboardData("sulfur")

  return <DashboardContent initialData={initialData} />
}
