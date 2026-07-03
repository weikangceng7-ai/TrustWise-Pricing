const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx')
const fs = require('fs')
const path = require('path')

// 读取 Markdown 文件内容
const markdownPath = path.join(__dirname, '..', '技术架构与数据流.md')
const outputPath = path.join(__dirname, '..', '技术架构与数据流.docx')
const markdownContent = fs.readFileSync(markdownPath, 'utf-8')

// 解析 Markdown 并转换为 docx 元素
function parseMarkdownToDocx(markdown) {
  const lines = markdown.split('\n')
  const elements = []
  let inTable = false
  let tableRows = []
  let tableHeaders = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // 空行
    if (!line) {
      if (inTable && tableRows.length > 0) {
        elements.push(createTable(tableHeaders, tableRows))
        tableHeaders = []
        tableRows = []
        inTable = false
      }
      continue
    }

    // 标题
    if (line.startsWith('# ')) {
      elements.push(new Paragraph({
        text: line.replace('# ', ''),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      }))
    } else if (line.startsWith('## ')) {
      elements.push(new Paragraph({
        text: line.replace('## ', ''),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 }
      }))
    } else if (line.startsWith('### ')) {
      elements.push(new Paragraph({
        text: line.replace('### ', ''),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 }
      }))
    }
    // 表格
    else if (line.startsWith('|')) {
      inTable = true
      const cells = line.split('|').filter(c => c.trim()).map(c => c.trim())

      if (line.includes('---')) {
        // 表头分隔行，跳过
        continue
      } else if (tableHeaders.length === 0) {
        tableHeaders = cells
      } else {
        tableRows.push(cells)
      }
    }
    // 列表项
    else if (line.startsWith('- **') || line.startsWith('* **')) {
      const text = line.replace(/^[-*] /, '').replace(/\*\*/g, '')
      elements.push(new Paragraph({
        children: [
          new TextRun({ text: '• ', bold: true }),
          new TextRun({ text: text })
        ],
        spacing: { before: 50, after: 50 }
      }))
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const text = line.replace(/^[-*] /, '')
      elements.push(new Paragraph({
        text: '• ' + text,
        spacing: { before: 50, after: 50 }
      }))
    }
    // 水平分隔线
    else if (line.startsWith('---')) {
      elements.push(new Paragraph({
        text: '',
        spacing: { before: 200, after: 200 },
        border: {
          bottom: { color: "666666", space: 1, style: BorderStyle.SINGLE, size: 6 }
        }
      }))
    }
    // 普通文本段落
    else {
      // 处理加粗文本
      const boldRegex = /\*\*(.*?)\*\*/g
      const children = []
      let lastIndex = 0
      let match

      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          children.push(new TextRun({ text: line.slice(lastIndex, match.index) }))
        }
        children.push(new TextRun({ text: match[1], bold: true }))
        lastIndex = match.index + match[0].length
      }

      if (lastIndex < line.length) {
        children.push(new TextRun({ text: line.slice(lastIndex) }))
      }

      if (children.length === 0) {
        children.push(new TextRun({ text: line }))
      }

      elements.push(new Paragraph({
        children: children,
        spacing: { before: 100, after: 100 }
      }))
    }
  }

  // 处理最后的表格
  if (inTable && tableRows.length > 0) {
    elements.push(createTable(tableHeaders, tableRows))
  }

  return elements
}

function createTable(headers, rows) {
  const tableRows = [
    new TableRow({
      children: headers.map(h => new TableCell({
        children: [new Paragraph({ text: h, bold: true })],
        width: { size: 100 / headers.length, type: WidthType.PERCENTAGE }
      }))
    }),
    ...rows.map(row => new TableRow({
      children: row.map(cell => new TableCell({
        children: [new Paragraph({ text: cell })],
        width: { size: 100 / headers.length, type: WidthType.PERCENTAGE }
      }))
    }))
  ]

  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE }
  })
}

// 创建文档
const doc = new Document({
  sections: [{
    properties: {},
    children: parseMarkdownToDocx(markdownContent)
  }]
})

// 导出为 Word 文件
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer)
  console.log('Word 文档已生成: 技术架构与数据流.docx')
})