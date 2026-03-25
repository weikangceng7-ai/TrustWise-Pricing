import { NextResponse } from "next/server"
import {
  checkNeo4jConnection,
  initKnowledgeGraphSchema,
  clearKnowledgeGraph,
} from "@/lib/neo4j"

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