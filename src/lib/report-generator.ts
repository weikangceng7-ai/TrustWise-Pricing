import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx"
import { saveAs } from "file-saver"
import { generateKnowledgeGraphContext, formatGraphContextAsText } from "@/services/knowledge-graph-reasoning"

export interface ReportMessage {
  role: "user" | "agent"
  content: string
  timestamp: Date
}

export interface ReportOptions {
  title?: string
  includeKnowledgeGraph?: boolean
}

export async function generateChatReport(
  messages: ReportMessage[],
  options: ReportOptions = {}
): Promise<string> {
  const { title = "硫磺采购决策报告", includeKnowledgeGraph = true } = options
  const now = new Date()
  const dateStr = now.toLocaleString("zh-CN")

  // 获取知识图谱上下文
  let knowledgeGraphText = ""
  if (includeKnowledgeGraph) {
    try {
      const lastUserMessage = [...messages].reverse().find(m => m.role === "user")
      const question = lastUserMessage?.content || ""
      const graphContext = await generateKnowledgeGraphContext(question)
      if (graphContext.enterprises.length > 0 || graphContext.factors.length > 0) {
        knowledgeGraphText = formatGraphContextAsText(graphContext)
      }
    } catch (error) {
      console.error("Failed to get knowledge graph context:", error)
    }
  }

  // 创建文档内容
  const children: Paragraph[] = [
    // 标题
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    // 分隔线
    new Paragraph({
      text: "━".repeat(40),
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    // 报告信息
    new Paragraph({
      children: [
        new TextRun({ text: "生成时间：", bold: true }),
        new TextRun(dateStr),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "对话数量：", bold: true }),
        new TextRun(`${messages.length} 条消息`),
      ],
      spacing: { after: 300 },
    }),
    // 分隔线
    new Paragraph({
      text: "━".repeat(40),
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
  ]

  // 添加对话内容
  messages.forEach((message, index) => {
    const isUser = message.role === "user"
    const roleLabel = isUser ? "👤 用户" : "🤖 顾问"
    const timeStr = message.timestamp.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })

    // 角色标题
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${roleLabel} [${timeStr}]`,
            bold: true,
            color: isUser ? "0066CC" : "339933",
            size: 24,
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    )

    // 消息内容 - 按行分割处理
    const lines = message.content.split("\n")
    lines.forEach((line) => {
      children.push(
        new Paragraph({
          text: line || " ",
          spacing: { after: 60 },
        })
      )
    })

    // 分隔
    if (index < messages.length - 1) {
      children.push(
        new Paragraph({
          text: "─".repeat(30),
          alignment: AlignmentType.CENTER,
          spacing: { before: 150, after: 150 },
        })
      )
    }
  })

  // 添加知识图谱分析章节
  if (knowledgeGraphText) {
    children.push(
      new Paragraph({
        text: "━".repeat(40),
        alignment: AlignmentType.CENTER,
        spacing: { before: 300, after: 200 },
      }),
      new Paragraph({
        text: "📊 知识图谱分析",
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 },
      })
    )

    // 解析知识图谱文本并添加到报告
    const kgLines = knowledgeGraphText.split("\n")
    kgLines.forEach((line) => {
      if (line.startsWith("### ")) {
        children.push(
          new Paragraph({
            text: line.replace("### ", ""),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 150, after: 100 },
          })
        )
      } else if (line.startsWith("## ")) {
        // 跳过主标题，已单独添加
      } else if (line.trim()) {
        children.push(
          new Paragraph({
            text: line,
            spacing: { after: 60 },
          })
        )
      }
    })
  }

  // 页脚
  children.push(
    new Paragraph({
      text: "━".repeat(40),
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
    }),
    new Paragraph({
      text: "报告由硫磺采购决策助手自动生成",
      alignment: AlignmentType.CENTER,
      spacing: { before: 100 },
      children: [
        new TextRun({
          italics: true,
          color: "888888",
          size: 20,
        }),
      ],
    })
  )

  // 创建文档
  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  })

  // 生成文件名
  const fileName = `硫磺采购决策报告_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.docx`

  // 生成并下载
  const blob = await Packer.toBlob(doc)
  saveAs(blob, fileName)

  return fileName
}

// TXT 格式报告（备用）
export function generateTxtReport(messages: ReportMessage[], title: string = "硫磺采购决策报告"): string {
  const now = new Date()
  const dateStr = now.toLocaleString("zh-CN")

  let content = `${title}\n`
  content += `${"=".repeat(50)}\n\n`
  content += `生成时间: ${dateStr}\n`
  content += `对话数量: ${messages.length} 条消息\n\n`
  content += `${"=".repeat(50)}\n\n`

  messages.forEach((message) => {
    const isUser = message.role === "user"
    const roleLabel = isUser ? "【用户】" : "【顾问】"
    const timeStr = message.timestamp.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })

    content += `${roleLabel} ${timeStr}\n`
    content += `${"-".repeat(40)}\n`
    content += `${message.content}\n\n`
  })

  content += `\n${"=".repeat(50)}\n`
  content += `报告由硫磺采购决策助手自动生成\n`

  const fileName = `硫磺采购决策报告_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.txt`

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return fileName
}