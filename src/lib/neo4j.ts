import neo4j, { Driver, Session, ManagedTransaction } from "neo4j-driver"

// Neo4j 连接配置
const NEO4J_URI = process.env.NEO4J_URI || "bolt://localhost:7687"
const NEO4J_USER = process.env.NEO4J_USER || "neo4j"
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || ""

// 单例 Driver
let driver: Driver | null = null

/**
 * 获取 Neo4j Driver 实例
 * 支持无密码本地开发和远程连接
 */
export function getNeo4jDriver(): Driver | null {
  if (!NEO4J_PASSWORD && process.env.NODE_ENV !== "development") {
    console.warn("NEO4J_PASSWORD not set, Neo4j features disabled")
    return null
  }

  if (!driver) {
    try {
      driver = neo4j.driver(
        NEO4J_URI,
        neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
        {
          maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
        }
      )
    } catch (error) {
      console.error("Failed to create Neo4j driver:", error)
      return null
    }
  }
  return driver
}

/**
 * 执行 Cypher 查询
 */
export async function runCypher<T = Record<string, unknown>>(
  query: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const driver = getNeo4jDriver()
  if (!driver) {
    return []
  }

  const session = driver.session()
  try {
    const result = await session.run(query, params)
    return result.records.map((record) => {
      const obj: Record<string, unknown> = {}
      record.keys.forEach((key) => {
        const value = record.get(key)
        const k = String(key)
        // 处理 Neo4j Integer 类型 (有 toNumber 方法)
        if (value && typeof value === "object" && typeof (value as { toNumber?: () => number }).toNumber === "function") {
          obj[k] = (value as { toNumber: () => number }).toNumber()
        } else if (value && typeof value === "object" && value.properties) {
          // 处理节点和关系
          obj[k] = value.properties
        } else {
          obj[k] = value
        }
      })
      return obj as T
    })
  } catch (error) {
    console.error("Neo4j query error:", error)
    return []
  } finally {
    await session.close()
  }
}

/**
 * 执行事务
 */
export async function withTransaction<T>(
  fn: (tx: ManagedTransaction) => Promise<T>
): Promise<T | null> {
  const driver = getNeo4jDriver()
  if (!driver) {
    return null
  }

  const session = driver.session()
  try {
    return await session.executeWrite(fn)
  } catch (error) {
    console.error("Neo4j transaction error:", error)
    return null
  } finally {
    await session.close()
  }
}

/**
 * 初始化知识图谱约束和索引
 */
export async function initKnowledgeGraphSchema(): Promise<boolean> {
  const driver = getNeo4jDriver()
  if (!driver) {
    return false
  }

  const session = driver.session()
  try {
    // 创建唯一约束
    const constraints = [
      "CREATE CONSTRAINT IF NOT EXISTS FOR (e:Enterprise) REQUIRE e.code IS UNIQUE",
      "CREATE CONSTRAINT IF NOT EXISTS FOR (f:Factor) REQUIRE f.id IS UNIQUE",
      "CREATE CONSTRAINT IF NOT EXISTS FOR (p:Price) REQUIRE p.date IS UNIQUE",
      "CREATE CONSTRAINT IF NOT EXISTS FOR (s:Supplier) REQUIRE s.id IS UNIQUE",
      "CREATE CONSTRAINT IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE",
    ]

    // 创建索引
    const indexes = [
      "CREATE INDEX IF NOT EXISTS FOR (e:Enterprise) ON (e.name)",
      "CREATE INDEX IF NOT EXISTS FOR (f:Factor) ON (f.category)",
      "CREATE INDEX IF NOT EXISTS FOR (p:Price) ON (p.date)",
    ]

    for (const cypher of [...constraints, ...indexes]) {
      await session.run(cypher)
    }

    console.log("Neo4j schema initialized successfully")
    return true
  } catch (error) {
    console.error("Failed to initialize Neo4j schema:", error)
    return false
  } finally {
    await session.close()
  }
}

/**
 * 检查 Neo4j 连接状态
 */
export async function checkNeo4jConnection(): Promise<{
  connected: boolean
  version?: string
  error?: string
}> {
  const driver = getNeo4jDriver()
  if (!driver) {
    return { connected: false, error: "Neo4j driver not initialized" }
  }

  const session = driver.session()
  try {
    const result = await session.run("CALL dbms.components() YIELD name, versions, edition RETURN name, versions[0] as version, edition")
    const record = result.records[0]
    return {
      connected: true,
      version: record.get("version"),
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  } finally {
    await session.close()
  }
}

/**
 * 清空知识图谱（仅开发环境）
 */
export async function clearKnowledgeGraph(): Promise<boolean> {
  if (process.env.NODE_ENV === "production") {
    console.warn("Cannot clear knowledge graph in production")
    return false
  }

  const driver = getNeo4jDriver()
  if (!driver) {
    return false
  }

  const session = driver.session()
  try {
    await session.run("MATCH (n) DETACH DELETE n")
    return true
  } catch (error) {
    console.error("Failed to clear knowledge graph:", error)
    return false
  } finally {
    await session.close()
  }
}

// 导出类型
export type { Driver, Session, ManagedTransaction }