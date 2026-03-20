import { useQuery } from "@tanstack/react-query"
import type { YihuaAnalytics } from "@/lib/yihua-preprocess"

interface Response {
  success: boolean
  data?: YihuaAnalytics
}

async function fetchYihua(): Promise<YihuaAnalytics> {
  const res = await fetch("/api/yihua/knowledge")
  if (!res.ok) throw new Error("加载宜化知识库失败")
  const j = (await res.json()) as Response
  if (!j.success || !j.data) throw new Error("数据无效")
  return j.data
}

export function useYihuaKnowledge() {
  return useQuery({
    queryKey: ["yihuaKnowledge"],
    queryFn: fetchYihua,
    staleTime: 60_000,
  })
}
