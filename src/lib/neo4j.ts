let driver: any = null
let neo4jAvailable = false

function initNeo4j() {
  if (typeof window !== 'undefined') return
  
  try {
    const neo4j = require("neo4j-driver")
    neo4jAvailable = true
    
    const NEO4J_URI = process.env.NEO4J_URI || "bolt://localhost:7687"
    const NEO4J_USER = process.env.NEO4J_USER || "neo4j"
    const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || ""

    if (NEO4J_PASSWORD) {
      try {
        driver = neo4j.driver(
          NEO4J_URI,
          neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
          {
            maxConnectionLifetime: 3 * 60 * 60 * 1000,
            maxConnectionPoolSize: 50,
            connectionAcquisitionTimeout: 2 * 60 * 1000,
          }
        )
      } catch (error) {
        console.warn("Failed to create Neo4j driver:", error)
      }
    }
  } catch (error) {
    console.warn("Neo4j driver not available, using fallback data")
    neo4jAvailable = false
  }
}

export function getNeo4jDriver(): any | null {
  if (!driver && !neo4jAvailable) {
    initNeo4j()
  }
  return driver
}

export async function runCypher<T = Record<string, unknown>>(
  query: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const d = getNeo4jDriver()
  if (!d) {
    return []
  }

  const session = d.session()
  try {
    const result = await session.run(query, params)
    return result.records.map((record: any) => {
      const obj: Record<string, unknown> = {}
      record.keys.forEach((key: string) => {
        const value = record.get(key)
        const k = String(key)
        if (value && typeof value === "object" && typeof value.toNumber === "function") {
          obj[k] = value.toNumber()
        } else if (value && typeof value === "object" && value.properties) {
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

export async function withTransaction<T>(
  fn: (tx: any) => Promise<T>
): Promise<T | null> {
  const d = getNeo4jDriver()
  if (!d) {
    return null
  }

  const session = d.session()
  try {
    return await session.executeWrite(fn)
  } catch (error) {
    console.error("Neo4j transaction error:", error)
    return null
  } finally {
    await session.close()
  }
}

export async function checkNeo4jConnection(): Promise<{
  connected: boolean
  version?: string
  error?: string
}> {
  initNeo4j()
  
  if (!neo4jAvailable) {
    return { connected: false, error: "Neo4j driver not available" }
  }
  
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

export async function initKnowledgeGraphSchema(): Promise<boolean> {
  const d = getNeo4jDriver()
  if (!d) {
    return false
  }

  const session = d.session()
  try {
    const constraints = [
      "CREATE CONSTRAINT IF NOT EXISTS FOR (e:Enterprise) REQUIRE e.code IS UNIQUE",
      "CREATE CONSTRAINT IF NOT EXISTS FOR (f:Factor) REQUIRE f.id IS UNIQUE",
      "CREATE CONSTRAINT IF NOT EXISTS FOR (p:Price) REQUIRE p.date IS UNIQUE",
    ]

    const indexes = [
      "CREATE INDEX IF NOT EXISTS FOR (e:Enterprise) ON (e.name)",
      "CREATE INDEX IF NOT EXISTS FOR (f:Factor) ON (f.category)",
    ]

    for (const cypher of [...constraints, ...indexes]) {
      await session.run(cypher)
    }

    return true
  } catch (error) {
    console.error("Failed to initialize Neo4j schema:", error)
    return false
  } finally {
    await session.close()
  }
}

export async function clearKnowledgeGraph(): Promise<boolean> {
  if (process.env.NODE_ENV === "production") {
    return false
  }

  const d = getNeo4jDriver()
  if (!d) {
    return false
  }

  const session = d.session()
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
