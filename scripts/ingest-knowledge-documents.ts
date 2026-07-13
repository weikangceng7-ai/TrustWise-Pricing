/**
 * 知识库文档入库脚本
 * 读取 yihua-knowledge.json，将文档条目分块、embedding 后存入 knowledge_chunks 表
 *
 * 运行方式: npx tsx scripts/ingest-knowledge-documents.ts
 */

import { config } from "dotenv"
import { resolve, dirname } from "path"
import { readFileSync, existsSync } from "fs"

config({ path: resolve(process.cwd(), ".env.local"), quiet: true })

const EMBEDDING_MODEL = "text-embedding-3-small"

interface KnowledgeItem {
  name: string
  path: string
  relativePath: string
  kind: string
}

interface KnowledgeSection {
  id: string
  label: string
  dir: string
  items: KnowledgeItem[]
}

interface KnowledgeData {
  generatedAt: string
  sections: KnowledgeSection[]
}

async function main() {
  const jsonPath = resolve(process.cwd(), "src/data/yihua-knowledge.json")
  const raw = readFileSync(jsonPath, "utf-8")
  const data: KnowledgeData = JSON.parse(raw)

  console.log("知识库文档入库\n")
  console.log(`生成日期: ${data.generatedAt}`)
  console.log(`章节数: ${data.sections.length}`)

  // 统计
  let totalItems = 0
  const chunks: Array<{
    sourceType: string
    sourceName: string
    content: string
    chunkIndex: number
    metadata: Record<string, unknown>
  }> = []

  for (const section of data.sections) {
    for (const item of section.items) {
      totalItems++
      const content = buildItemContent(item, section)
      chunks.push({
        sourceType: mapKind(item.kind),
        sourceName: item.name,
        content,
        chunkIndex: 0,
        metadata: {
          section: section.label,
          kind: item.kind,
          path: item.relativePath,
        },
      })
    }
  }

  console.log(`总条目: ${totalItems}`)

  // 生成 embeddings
  console.log("\n生成 embeddings...")
  let embeddingCount = 0

  for (let i = 0; i < chunks.length; i++) {
    try {
      const emb = await getEmbedding(chunks[i].content)
      ;(chunks[i] as Record<string, unknown>).embedding = JSON.stringify(emb)
      embeddingCount++
      if ((i + 1) % 10 === 0) {
        console.log(`  已处理 ${i + 1}/${chunks.length} ...`)
      }
    } catch (e) {
      console.warn(`  embedding 失败 (${chunks[i].sourceName}):`, e)
      ;(chunks[i] as Record<string, unknown>).embedding = null
    }
    // 避免 API 限速
    await sleep(100)
  }

  console.log(`embedding 完成: ${embeddingCount}/${chunks.length}`)

  // 写入 DB
  console.log("\n写入数据库...")
  await saveToDatabase(chunks)
  console.log("入库完成!")
}

/**
 * 根据条目信息生成文本描述 chunk
 */
function buildItemContent(item: KnowledgeItem, section: KnowledgeSection): string {
  const parts: string[] = []

  parts.push(`文档名称: ${item.name}`)
  parts.push(`所属分类: ${section.label}`)
  parts.push(`文档类型: ${getKindLabel(item.kind)}`)

  // 从文件名提取关键信息
  const name = item.name.replace(/\.[^.]+$/, "") // 去掉扩展名
  parts.push(`关键词: ${extractKeywords(name, item.kind)}`)

  // 为文献类条目添加更多上下文
  if (item.kind === "pdf" || item.kind === "literature") {
    const yearMatch = name.match(/\b(19|20)\d{2}\b/)
    const year = yearMatch ? yearMatch[0] : null
    if (year) {
      parts.push(`发表年份: ${year}`)
    }
    parts.push(`摘要: 该文献研究${extractTopic(name)}，为${section.label}相关领域提供理论参考。`)
  }

  if (item.kind === "document") {
    parts.push(`内容描述: ${getDocumentDescription(name)}`)
  }

  return parts.join("\n")
}

function extractKeywords(name: string, kind: string): string {
  const keywords: string[] = []

  // 常见关键词提取
  const keywordMap: Record<string, string[]> = {
    "硫磺": ["硫磺", "sulfur", "原材料采购", "市场价格"],
    "价格预测": ["价格预测", "price forecasting", "时间序列", "机器学习"],
    "XGBoost": ["XGBoost", "梯度提升", "ensemble learning"],
    "LSTM": ["LSTM", "长短期记忆", "深度学习", "时间序列"],
    "ARIMA": ["ARIMA", "自回归", "时间序列分析"],
    "Transformer": ["Transformer", "注意力机制", "深度学习"],
    "港口库存": ["港口库存", "库存管理", "供应链"],
    "磷矿": ["磷矿", "phosphate", "原料价格"],
    "二铵": ["磷酸二铵", "DAP", "化肥"],
    "尿素": ["尿素", "urea", "氮肥"],
    "钾肥": ["钾肥", "potash", "MOP"],
    "大宗商品": ["大宗商品", "commodity", "价格波动"],
    "决策支持": ["决策支持", "decision support", "采购决策"],
    "供应链": ["供应链", "supply chain", "需求预测"],
    "神经网络": ["神经网络", "neural network", "深度学习"],
  }

  for (const [key, kws] of Object.entries(keywordMap)) {
    if (name.includes(key)) {
      keywords.push(...kws)
    }
  }

  if (keywords.length === 0) {
    keywords.push("化工", "价格分析", kind)
  }

  return [...new Set(keywords)].slice(0, 10).join(", ")
}

function extractTopic(name: string): string {
  if (name.includes("硫磺") || name.includes("sulfur")) return "硫磺价格预测与市场分析"
  if (name.includes("磷矿") || name.includes("磷肥")) return "磷化工产品价格预测"
  if (name.includes("钾肥") || name.includes("potash")) return "钾肥市场价格预测"
  if (name.includes("尿素") || name.includes("urea")) return "尿素价格分析"
  if (name.includes("原油") || name.includes("oil") || name.includes("石油")) return "原油价格预测"
  if (name.includes("大宗商品") || name.includes("commodity")) return "大宗商品价格预测方法"
  if (name.includes("时间序列") || name.includes("time series")) return "时间序列预测模型"
  if (name.includes("供应链") || name.includes("supply chain")) return "供应链需求预测"
  return "化工产品价格预测方法"
}

function getDocumentDescription(name: string): string {
  if (name.includes("原料价格预判方案")) return "HX集团硫磺等原料价格预判与采购策略方案，包含价格影响因素分析和采购时机建议"
  if (name.includes("系统技术方法研究")) return "硫磺原材料采购价格预测分析的系统技术方法研究，涵盖ARIMA、XGBoost等混合模型方法"
  if (name.includes("柔性供应链")) return "柔性供应链需求预测模型项目研发建议，探讨需求预测在供应链优化中的应用"
  return "企业采购与价格预测相关文档"
}

function mapKind(kind: string): string {
  const map: Record<string, string> = {
    document: "yihua_document",
    spreadsheet: "yihua_spreadsheet",
    pdf: "yihua_literature",
    literature: "yihua_literature",
    image: "yihua_figure",
    diagram: "yihua_figure",
    text: "yihua_document",
    code: "yihua_code",
  }
  return map[kind] || "yihua_document"
}

function getKindLabel(kind: string): string {
  const map: Record<string, string> = {
    document: "企业文档",
    spreadsheet: "数据表格",
    pdf: "学术文献",
    literature: "学术文献",
    image: "图表",
    diagram: "流程图",
    text: "文本资料",
    code: "代码",
  }
  return map[kind] || kind
}

async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"

  if (!apiKey) throw new Error("未配置 OPENAI_API_KEY")

  const response = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000), // 限制输入长度
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Embedding API 返回 ${response.status}: ${text}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

async function saveToDatabase(
  chunks: Array<{
    sourceType: string
    sourceName: string
    content: string
    chunkIndex: number
    embedding?: string | null
    metadata: Record<string, unknown>
  }>
) {
  const { db } = await import("../src/db")
  const { knowledgeChunks } = await import("../src/db/schema-rag")

  if (!db) {
    console.log("数据库不可用，跳过写入。生成的数据:")
    console.log(JSON.stringify(chunks.slice(0, 3), null, 2))
    return
  }

  // 按批次插入
  const batchSize = 20
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    await db.insert(knowledgeChunks).values(
      batch.map((c) => ({
        sourceType: c.sourceType,
        sourceName: c.sourceName,
        content: c.content,
        chunkIndex: c.chunkIndex,
        embedding: c.embedding ?? null,
        metadata: c.metadata,
      }))
    ).onConflictDoNothing()
    console.log(`  已写入 ${Math.min(i + batchSize, chunks.length)}/${chunks.length} 条`)
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch(console.error)
