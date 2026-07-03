import { NextResponse } from "next/server"
import {
  checkNeo4jConnection,
  initKnowledgeGraphSchema,
  clearKnowledgeGraph,
} from "@/lib/neo4j"
import { queryKnowledgeGraph } from "@/services/knowledge-graph-reasoning"

export async function GET() {
  const status = await checkNeo4jConnection()

  return NextResponse.json({
    neo4j: status,
    config: {
      uri: process.env.NEO4J_URI || "bolt://localhost:7687",
      user: process.env.NEO4J_USER || "neo4j",
      configured: Boolean(process.env.NEO4J_PASSWORD),
    },
  })
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  if (action === "query") {
    try {
      const body = await request.json()
      const { query } = body as { query: string }
      if (!query || typeof query !== "string") {
        return NextResponse.json({ error: "Missing or invalid 'query' parameter" }, { status: 400 })
      }

      const result = await queryKnowledgeGraph(query)
      return NextResponse.json({
        success: true,
        data: result,
      })
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: {
          code: "QUERY_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      }, { status: 500 })
    }
  }

  if (action === "init") {
    const success = await initKnowledgeGraphSchema()
    return NextResponse.json({
      success,
      message: success ? "Schema initialized" : "Failed to initialize schema",
    })
  }

  if (action === "clear") {
    const success = await clearKnowledgeGraph()
    return NextResponse.json({
      success,
      message: success ? "Graph cleared" : "Failed to clear graph",
    })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
