import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx"
import { saveAs } from "file-saver"
import type { Report } from "@/hooks/use-reports"

export async function generateReportDocument(report: Report): Promise<string> {
  const now = new Date()
  const dateStr = now.toLocaleString("zh-CN")

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: report.title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: "━".repeat(40),
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "报告日期：", bold: true }),
              new TextRun(report.reportDate),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "生成时间：", bold: true }),
              new TextRun(dateStr),
            ],
            spacing: { after: 300 },
          }),
          new Paragraph({
            text: "━".repeat(40),
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          }),
          new Paragraph({
            text: "报告摘要",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            text: report.summary,
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: "关键指标",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "指标", alignment: AlignmentType.CENTER })],
                    width: { size: 33, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "数值", alignment: AlignmentType.CENTER })],
                    width: { size: 67, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("价格趋势")] }),
                  new TableCell({ children: [new Paragraph(report.priceTrend || "未知")] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("风险等级")] }),
                  new TableCell({ children: [new Paragraph(report.riskLevel || "未知")] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("采购建议")] }),
                  new TableCell({ children: [new Paragraph(report.recommendation || "无")] }),
                ],
              }),
            ],
          }),
          new Paragraph({
            text: "━".repeat(40),
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
          }),
          new Paragraph({
            text: "报告由硫磺采购决策助手自动生成",
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                italics: true,
                color: "888888",
                size: 20,
              }),
            ],
          }),
        ],
      },
    ],
  })

  const fileName = `${report.title}_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.docx`

  const blob = await Packer.toBlob(doc)
  saveAs(blob, fileName)

  return fileName
}

export async function generateReportPDF(report: Report): Promise<string> {
  const { jsPDF } = await import("jspdf")
  const { default: autoTable } = await import("jspdf-autotable")

  const doc = new jsPDF()
  const now = new Date()
  const dateStr = now.toLocaleString("zh-CN")

  doc.setFontSize(18)
  doc.text(report.title, 105, 20, { align: "center" })

  doc.setFontSize(10)
  doc.text(`报告日期: ${report.reportDate}`, 14, 35)
  doc.text(`生成时间: ${dateStr}`, 14, 42)

  doc.setFontSize(14)
  doc.text("报告摘要", 14, 55)

  doc.setFontSize(10)
  const summaryLines = doc.splitTextToSize(report.summary, 180)
  doc.text(summaryLines, 14, 65)

  const summaryHeight = summaryLines.length * 6 + 10

  doc.setFontSize(14)
  doc.text("关键指标", 14, 65 + summaryHeight)

  autoTable(doc, {
    startY: 75 + summaryHeight,
    head: [["指标", "数值"]],
    body: [
      ["价格趋势", report.priceTrend || "未知"],
      ["风险等级", report.riskLevel || "未知"],
      ["采购建议", report.recommendation || "无"],
    ],
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185] },
  })

  doc.setFontSize(8)
  doc.text("报告由硫磺采购决策助手自动生成", 105, 285, { align: "center" })

  const fileName = `${report.title}_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.pdf`

  doc.save(fileName)

  return fileName
}

export async function generateReportExcel(report: Report): Promise<string> {
  const XLSX = await import("xlsx")
  const now = new Date()

  const data = [
    ["硫磺采购分析报告"],
    [],
    ["报告标题", report.title],
    ["报告日期", report.reportDate],
    ["生成时间", now.toLocaleString("zh-CN")],
    [],
    ["报告摘要"],
    [report.summary],
    [],
    ["关键指标"],
    ["指标", "数值"],
    ["价格趋势", report.priceTrend || "未知"],
    ["风险等级", report.riskLevel || "未知"],
    ["采购建议", report.recommendation || "无"],
    [],
    ["报告由硫磺采购决策助手自动生成"],
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)
  ws["!cols"] = [{ wch: 20 }, { wch: 60 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "报告详情")

  const fileName = `${report.title}_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.xlsx`

  XLSX.writeFile(wb, fileName)

  return fileName
}
