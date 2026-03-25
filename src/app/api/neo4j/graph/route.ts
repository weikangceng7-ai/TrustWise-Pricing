import { NextResponse } from "next/server"
import { getEnterpriseKnowledgeGraph } from "@/services/knowledge-graph"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const enterprise = searchParams.get("enterprise") || "yihua"

  const graph = await getEnterpriseKnowledgeGraph(enterprise)

  return NextResponse.json(graph)
}