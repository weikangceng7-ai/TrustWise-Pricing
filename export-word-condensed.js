const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } = require('docx')
const fs = require('fs')
const path = require('path')

const outputPath = path.join(__dirname, '..', '技术架构与数据流-浓缩版.docx')

// 创建文档
const doc = new Document({
  sections: [{
    properties: {
      page: {
        margin: { top: 720, right: 720, bottom: 720, left: 720 } // 约1.27cm边距
      }
    },
    children: [
      // 标题
      new Paragraph({
        text: '技术架构与数据流',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),

      // 第一页内容：技术架构
      new Paragraph({
        text: '一、技术架构概述',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 150, after: 100 }
      }),

      new Paragraph({
        children: [
          new TextRun({ text: '系统围绕数据接入、信息组织、趋势分析、企业建模、结果生成五个环节，结合价格预测、知识图谱与大语言模型，形成双引擎决策系统。', size: 21 })
        ],
        spacing: { after: 150 }
      }),

      // 前端架构
      new Paragraph({
        text: '【前端架构】',
        spacing: { before: 100, after: 50 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Next.js 16 + React 19 + Tailwind CSS 4 + Shadcn UI + Recharts可视化。路由分组：(auth)认证模块、(dashboard)业务模块。核心组件：价格图表、库存面板、知识图谱、企业详情、AI对话窗口。', size: 21 })
        ],
        spacing: { after: 100 }
      }),

      // 后端架构
      new Paragraph({
        text: '【后端架构】',
        spacing: { before: 100, after: 50 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Node.js + Next.js API Routes + Hono框架。数据库：PostgreSQL（Neon）+ Drizzle ORM，核心表含价格、库存、企业档案、预测结果。认证：Better Auth + RBAC权限控制。', size: 21 })
        ],
        spacing: { after: 100 }
      }),

      // AI与预测
      new Paragraph({
        text: '【AI能力与预测模型】',
        spacing: { before: 100, after: 50 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'AI集成：OpenRouter SDK，支持StepFun/Qwen/Gemma模型，通过意图识别自动切换。预测模型：Hybrid ARIMA + XGBoost混合，ARIMA捕捉趋势、XGBoost修正残差，Python服务独立部署提供/predict、/trend、/decision接口。', size: 21 })
        ],
        spacing: { after: 100 }
      }),

      // 知识图谱
      new Paragraph({
        text: '【双层知识图谱（Neo4j）】',
        spacing: { before: 100, after: 50 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '第一层宏观图谱：价格、供给、需求、成本、政策节点，推理市场影响路径。第二层企业图谱：企业档案、库存配置、影响因子权重，推理个性化决策。', size: 21 })
        ],
        spacing: { after: 150 }
      }),

      // 第二页内容：数据流
      new Paragraph({
        text: '二、系统数据流',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      }),

      new Paragraph({
        children: [
          new TextRun({ text: '数据流始于用户提问 → 意图识别 → 三路数据获取 → 双引擎处理 → LLM整合输出。', size: 21, bold: true })
        ],
        spacing: { after: 100 }
      }),

      // 意图识别表格
      new Paragraph({
        text: '意图识别：',
        spacing: { before: 50, after: 50 }
      }),
      new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: '价格查询', size: 20 })], width: { size: 25, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ text: '趋势分析', size: 20 })], width: { size: 25, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ text: '采购建议', size: 20 })], width: { size: 25, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ text: '风险评估', size: 20 })], width: { size: 25, type: WidthType.PERCENTAGE } })
            ]
          })
        ],
        width: { size: 100, type: WidthType.PERCENTAGE }
      }),

      new Paragraph({ text: '', spacing: { after: 100 } }),

      // 三路数据获取
      new Paragraph({
        text: '三路数据获取：',
        spacing: { before: 50, after: 50 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '① 外部数据：EIA原油、FRED宏观、GDELT新闻、AkShare国内价格（定时采集）', size: 21 })
        ],
        spacing: { after: 30 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '② 内部数据：PostgreSQL历史价格/库存/企业配置、Neo4j图谱关系', size: 21 })
        ],
        spacing: { after: 30 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '③ 企业配置：三类企业（保守30天/均衡15天/激进7天安全库存）', size: 21 })
        ],
        spacing: { after: 100 }
      }),

      // 双引擎处理表格
      new Paragraph({
        text: '双引擎处理：',
        spacing: { before: 50, after: 50 }
      }),
      new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: '引擎', size: 20, bold: true })], width: { size: 33, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ text: '功能', size: 20, bold: true })], width: { size: 33, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ text: '输出', size: 20, bold: true })], width: { size: 34, type: WidthType.PERCENTAGE } })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: '宏观分析引擎', size: 20 })] }),
              new TableCell({ children: [new Paragraph({ text: 'Python预测服务', size: 20 })] }),
              new TableCell({ children: [new Paragraph({ text: '价格曲线、置信度', size: 20 })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: '企业决策引擎', size: 20 })] }),
              new TableCell({ children: [new Paragraph({ text: '库存+配置计算', size: 20 })] }),
              new TableCell({ children: [new Paragraph({ text: '采购时机、采购量', size: 20 })] })
            ]
          })
        ],
        width: { size: 100, type: WidthType.PERCENTAGE }
      }),

      new Paragraph({ text: '', spacing: { after: 100 } }),

      // LLM输出
      new Paragraph({
        text: 'LLM整合输出：',
        spacing: { before: 50, after: 50 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '第一板块——市场分析：价格走势（7-30天）、影响因素、风险等级', size: 21 })
        ],
        spacing: { after: 30 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '第二板块——企业建议：最佳采购时机、建议采购量、库存预警', size: 21 })
        ],
        spacing: { after: 100 }
      }),

      new Paragraph({
        children: [
          new TextRun({ text: '支持导出Word/PDF/Excel格式报告。', size: 21 })
        ],
        spacing: { after: 150 }
      }),

      // 项目信息
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: '在线地址：sulfur-agent-web.vercel.app | GitHub：TrustWise-Pricing', size: 20, color: '666666' })
        ],
        spacing: { before: 100 }
      })
    ]
  }]
})

// 导出为 Word 文件
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer)
  console.log('浓缩版 Word 文档已生成: 技术架构与数据流-浓缩版.docx')
})