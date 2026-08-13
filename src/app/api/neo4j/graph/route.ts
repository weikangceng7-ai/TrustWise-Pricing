import { NextResponse } from "next/server"
import { getEnterpriseKnowledgeGraph } from "@/services/knowledge-graph"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const enterprise = searchParams.get("enterprise") || "yihua"

    const graph = await getEnterpriseKnowledgeGraph(enterprise)

    return NextResponse.json({
      ...graph,
      enterprise: enterprise,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Neo4j Graph API] 获取知识图谱失败:", error)
    return NextResponse.json(
      { error: "获取知识图谱失败，请检查 Neo4j 连接" },
      { status: 500 }
    )
  }
}