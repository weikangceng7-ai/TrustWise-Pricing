import { NextResponse } from "next/server"
import { checkNeo4jConnection, initKnowledgeGraphSchema } from "@/lib/neo4j"
import { seedEnterpriseKnowledgeGraph } from "@/services/knowledge-graph"

export async function GET() {
  try {
    // 检查连接
    const status = await checkNeo4jConnection()
    if (!status.connected) {
      return NextResponse.json({
        success: false,
        error: "Neo4j not connected",
        details: status.error,
      }, { status: 503 })
    }

    // 初始化 schema
    const schemaInit = await initKnowledgeGraphSchema()
    if (!schemaInit) {
      return NextResponse.json({
        success: false,
        error: "Failed to initialize schema",
      }, { status: 500 })
    }

    // 导入数据
    const result = await seedEnterpriseKnowledgeGraph()

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Successfully seeded knowledge graph: ${result.stats.enterprises} enterprises, ${result.stats.factors} factors, ${result.stats.relations} relations`
        : "Failed to seed knowledge graph",
      stats: result.stats,
      details: result.details,
      neo4jVersion: status.version,
    })
  } catch (error) {
    console.error("[Neo4j Seed API] 初始化知识图谱失败:", error)
    return NextResponse.json(
      { success: false, error: "初始化知识图谱失败，请检查 Neo4j 连接" },
      { status: 500 }
    )
  }
}