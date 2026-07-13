import { pgTable, serial, text, integer, jsonb, timestamp, varchar } from "drizzle-orm/pg-core"

/**
 * 知识库文档分块表（RAG）
 * embedding 使用 text 存储 JSON 序列化的 float 数组，兼容所有 PostgreSQL 实例
 * 数据量大时可迁移至 pgvector 扩展
 */
export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: serial("id").primaryKey(),
  sourceType: varchar("source_type", { length: 32 }).notNull(), // yihua_document | market_report | enterprise_doc
  sourceId: varchar("source_id", { length: 64 }), // 关联 yihua_knowledge_items.id
  sourceName: text("source_name").notNull(), // 源文件名
  chunkIndex: integer("chunk_index").notNull(), // 分块序号
  content: text("content").notNull(), // 文本内容
  embedding: text("embedding"), // JSON 序列化的 float[] 向量 (1536 维)
  metadata: jsonb("metadata").$type<{ year?: number; lang?: string; section?: string }>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
})
