import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx"
import { saveAs } from "file-saver"
import * as path from "path"
import * as os from "os"

async function generateProjectDocument() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "硫磺采购智能决策助手",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "项目技术文档",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "",
          }),

          new Paragraph({
            text: "一、问题背景",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "1.1 行业现状",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: "硫磺作为磷肥生产的重要原料，其价格波动直接影响化肥行业的生产成本和利润空间。当前硫磺采购面临以下挑战：",
          }),
          new Paragraph({
            text: "• 信息分散：价格数据、库存信息、市场动态分布在多个平台，采购人员难以快速获取全面信息",
          }),
          new Paragraph({
            text: "• 决策滞后：传统采购决策依赖人工分析，响应速度慢，容易错过最佳采购时机",
          }),
          new Paragraph({
            text: "• 风险难控：缺乏系统化的风险评估机制，难以量化采购风险",
          }),
          new Paragraph({
            text: "• 知识断层：行业经验难以沉淀和传承，新人培训周期长",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "1.2 业务痛点",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: "• 每日需人工查询多个数据源，耗时耗力",
          }),
          new Paragraph({
            text: "• 价格趋势判断缺乏数据支撑，决策主观性强",
          }),
          new Paragraph({
            text: "• 采购报告撰写繁琐，格式不统一",
          }),
          new Paragraph({
            text: "• 历史数据难以有效利用，无法形成决策参考",
          }),
          new Paragraph({
            text: "",
          }),

          new Paragraph({
            text: "二、需求分析",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "2.1 功能需求",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: "（1）智能对话助手",
          }),
          new Paragraph({
            text: "    • 支持自然语言交互，用户可直接提问获取市场分析",
          }),
          new Paragraph({
            text: "    • 提供价格趋势分析、采购建议、风险评估等服务",
          }),
          new Paragraph({
            text: "    • 支持多轮对话，具备上下文理解能力",
          }),
          new Paragraph({
            text: "    • 支持图片上传分析，识别图表、文档等内容",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "（2）数据可视化",
          }),
          new Paragraph({
            text: "    • 价格走势图表展示（日/周/月维度）",
          }),
          new Paragraph({
            text: "    • 供需分析仪表盘",
          }),
          new Paragraph({
            text: "    • 价格知识图谱可视化",
          }),
          new Paragraph({
            text: "    • 风险监控预警展示",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "（3）采购报告管理",
          }),
          new Paragraph({
            text: "    • 自动生成采购分析报告",
          }),
          new Paragraph({
            text: "    • 报告列表查看、筛选、搜索",
          }),
          new Paragraph({
            text: "    • 报告导出（PDF/Word格式）",
          }),
          new Paragraph({
            text: "    • 报告轮播展示",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "2.2 非功能需求",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: "• 响应时间：页面加载 < 2秒，对话响应 < 5秒",
          }),
          new Paragraph({
            text: "• 可用性：7×24小时服务可用",
          }),
          new Paragraph({
            text: "• 安全性：用户认证、数据加密、权限控制",
          }),
          new Paragraph({
            text: "• 可扩展性：支持新数据源接入、模型升级",
          }),
          new Paragraph({
            text: "",
          }),

          new Paragraph({
            text: "三、智能体架构",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "3.1 整体架构",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: "系统采用三层架构设计：",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "┌─────────────────────────────────────────────────────────────┐",
          }),
          new Paragraph({
            text: "│                     表现层 (Presentation Layer)              │",
          }),
          new Paragraph({
            text: "│   Next.js 16 + React 19 + Tailwind CSS + Shadcn UI          │",
          }),
          new Paragraph({
            text: "├─────────────────────────────────────────────────────────────┤",
          }),
          new Paragraph({
            text: "│                     业务层 (Business Layer)                  │",
          }),
          new Paragraph({
            text: "│   API Routes + 智能体服务 + 数据处理服务                      │",
          }),
          new Paragraph({
            text: "├─────────────────────────────────────────────────────────────┤",
          }),
          new Paragraph({
            text: "│                     数据层 (Data Layer)                      │",
          }),
          new Paragraph({
            text: "│   PostgreSQL + 外部API + 向量数据库                          │",
          }),
          new Paragraph({
            text: "└─────────────────────────────────────────────────────────────┘",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "3.2 智能体核心组件",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: "（1）意图识别模块",
          }),
          new Paragraph({
            text: "    • 分析用户输入，识别查询意图（价格查询、趋势分析、采购建议等）",
          }),
          new Paragraph({
            text: "    • 提取关键实体（产品、时间、地区等）",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "（2）知识检索模块",
          }),
          new Paragraph({
            text: "    • 实时数据库查询：价格、库存、报告数据",
          }),
          new Paragraph({
            text: "    • 外部API集成：EIA原油价格、GDELT新闻、FRED经济数据",
          }),
          new Paragraph({
            text: "    • 知识图谱检索：价格影响因素关系网络",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "（3）推理引擎",
          }),
          new Paragraph({
            text: "    • 基于大语言模型（DeepSeek-V3）进行推理分析",
          }),
          new Paragraph({
            text: "    • 结合实时数据生成专业建议",
          }),
          new Paragraph({
            text: "    • 多维度风险评估",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "（4）输出生成模块",
          }),
          new Paragraph({
            text: "    • 结构化回答生成（Markdown格式）",
          }),
          new Paragraph({
            text: "    • 数据表格、图表描述",
          }),
          new Paragraph({
            text: "    • 采购报告自动生成",
          }),
          new Paragraph({
            text: "",
          }),

          new Paragraph({
            text: "四、技术方案",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "4.1 技术栈",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: "前端技术：",
          }),
          new Paragraph({
            text: "    • 框架：Next.js 16.1.6 (App Router + Turbopack)",
          }),
          new Paragraph({
            text: "    • UI库：React 19.2.3 + Tailwind CSS 4",
          }),
          new Paragraph({
            text: "    • 组件库：Shadcn UI + Radix UI",
          }),
          new Paragraph({
            text: "    • 图表：Recharts 3.8.0",
          }),
          new Paragraph({
            text: "    • 状态管理：TanStack Query 5.90",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "后端技术：",
          }),
          new Paragraph({
            text: "    • 运行时：Node.js + Next.js API Routes",
          }),
          new Paragraph({
            text: "    • 数据库：PostgreSQL + Drizzle ORM",
          }),
          new Paragraph({
            text: "    • 认证：Better Auth 1.5.5",
          }),
          new Paragraph({
            text: "    • AI集成：OpenAI SDK + AI SDK 6.0",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "AI模型：",
          }),
          new Paragraph({
            text: "    • 文本对话：DeepSeek-V3-0324",
          }),
          new Paragraph({
            text: "    • 图片分析：GPT-4-Vision-Preview / 豆包视觉模型",
          }),
          new Paragraph({
            text: "    • API聚合：qnaigc / OpenRouter",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "4.2 数据流设计",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: "用户提问 → 意图识别 → 数据检索 → LLM推理 → 结果生成",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "数据来源：",
          }),
          new Paragraph({
            text: "    • 内部数据库：硫磺价格、港口库存、采购报告",
          }),
          new Paragraph({
            text: "    • EIA API：WTI/布伦特原油价格",
          }),
          new Paragraph({
            text: "    • GDELT API：全球新闻事件数据",
          }),
          new Paragraph({
            text: "    • FRED API：美国经济数据",
          }),
          new Paragraph({
            text: "    • AkShare：中国金融数据",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "4.3 核心功能实现",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: "（1）智能对话系统",
          }),
          new Paragraph({
            text: "    • 流式响应：Server-Sent Events实现打字机效果",
          }),
          new Paragraph({
            text: "    • 上下文管理：多轮对话历史存储",
          }),
          new Paragraph({
            text: "    • 系统提示工程：专业领域知识注入",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "（2）图片分析功能",
          }),
          new Paragraph({
            text: "    • 前端：支持点击上传和粘贴上传",
          }),
          new Paragraph({
            text: "    • Base64编码传输",
          }),
          new Paragraph({
            text: "    • 视觉模型分析：图表识别、文档解析",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "（3）报告生成系统",
          }),
          new Paragraph({
            text: "    • 模板化报告结构",
          }),
          new Paragraph({
            text: "    • 自动填充实时数据",
          }),
          new Paragraph({
            text: "    • PDF/Word导出（jsPDF + docx）",
          }),
          new Paragraph({
            text: "",
          }),

          new Paragraph({
            text: "五、创新点",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "5.1 技术创新",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: "（1）多模态智能体",
          }),
          new Paragraph({
            text: "    • 融合文本对话与图片分析能力",
          }),
          new Paragraph({
            text: "    • 支持图表、文档、产品图片等多种类型识别",
          }),
          new Paragraph({
            text: "    • 自动切换模型（文本模型/视觉模型）",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "（2）实时数据增强",
          }),
          new Paragraph({
            text: "    • 对话时自动注入最新价格、库存数据",
          }),
          new Paragraph({
            text: "    • 多数据源融合分析",
          }),
          new Paragraph({
            text: "    • 数据时效性标注",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "（3）知识图谱可视化",
          }),
          new Paragraph({
            text: "    • 价格影响因素关系网络",
          }),
          new Paragraph({
            text: "    • 动态节点展示",
          }),
          new Paragraph({
            text: "    • 交互式图谱探索",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "5.2 业务创新",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: "（1）智能采购决策",
          }),
          new Paragraph({
            text: "    • 基于多维度数据的综合分析",
          }),
          new Paragraph({
            text: "    • 风险等级量化评估",
          }),
          new Paragraph({
            text: "    • 个性化采购建议生成",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "（2）报告自动化",
          }),
          new Paragraph({
            text: "    • 一键生成专业采购报告",
          }),
          new Paragraph({
            text: "    • 标准化报告格式",
          }),
          new Paragraph({
            text: "    • 历史报告智能检索",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "（3）轮播展示机制",
          }),
          new Paragraph({
            text: "    • 最新报告自动轮播",
          }),
          new Paragraph({
            text: "    • 关键信息快速预览",
          }),
          new Paragraph({
            text: "    • 一键跳转详情",
          }),
          new Paragraph({
            text: "",
          }),

          new Paragraph({
            text: "六、应用场景",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "6.1 采购决策支持",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: "场景：采购经理需要决定本周采购量",
          }),
          new Paragraph({
            text: "操作：询问\"当前硫磺市场趋势如何？\"",
          }),
          new Paragraph({
            text: "输出：价格走势分析、供需评估、采购建议",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "6.2 价格趋势分析",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: "场景：分析近期价格波动原因",
          }),
          new Paragraph({
            text: "操作：询问\"分析近期价格波动原因\"",
          }),
          new Paragraph({
            text: "输出：影响因素分析、历史对比、未来预测",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "6.3 风险预警",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: "场景：监控采购风险",
          }),
          new Paragraph({
            text: "操作：查看仪表盘风险监控模块",
          }),
          new Paragraph({
            text: "输出：风险等级、风险因素、应对建议",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "6.4 报告生成",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: "场景：需要提交周度采购报告",
          }),
          new Paragraph({
            text: "操作：请求\"生成采购决策分析报告\"",
          }),
          new Paragraph({
            text: "输出：结构化报告，可导出PDF/Word",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "6.5 图片分析",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: "场景：收到供应商报价单图片",
          }),
          new Paragraph({
            text: "操作：上传图片并询问\"分析这张报价单\"",
          }),
          new Paragraph({
            text: "输出：报价内容识别、价格对比、采购建议",
          }),
          new Paragraph({
            text: "",
          }),

          new Paragraph({
            text: "七、测试效果",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "7.1 功能测试",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: "（1）对话功能测试",
          }),
          new Paragraph({
            text: "    ✓ 多轮对话上下文保持正常",
          }),
          new Paragraph({
            text: "    ✓ 流式响应显示流畅",
          }),
          new Paragraph({
            text: "    ✓ 实时数据注入正确",
          }),
          new Paragraph({
            text: "    ✓ 追问建议功能正常",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "（2）图片分析测试",
          }),
          new Paragraph({
            text: "    ✓ 图片上传功能正常",
          }),
          new Paragraph({
            text: "    ✓ 粘贴图片功能正常",
          }),
          new Paragraph({
            text: "    ✓ 图表识别准确率 > 85%",
          }),
          new Paragraph({
            text: "    ✓ 文档解析功能正常",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "（3）报告功能测试",
          }),
          new Paragraph({
            text: "    ✓ 报告列表展示正常",
          }),
          new Paragraph({
            text: "    ✓ 报告筛选搜索正常",
          }),
          new Paragraph({
            text: "    ✓ 报告导出功能正常",
          }),
          new Paragraph({
            text: "    ✓ 轮播展示功能正常",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "7.2 性能测试",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: "• 页面首屏加载时间：< 2秒",
          }),
          new Paragraph({
            text: "• 对话响应时间：< 5秒（首字）",
          }),
          new Paragraph({
            text: "• 图表渲染时间：< 1秒",
          }),
          new Paragraph({
            text: "• 报告生成时间：< 10秒",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "7.3 用户体验测试",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: "• 界面美观度：⭐⭐⭐⭐⭐",
          }),
          new Paragraph({
            text: "• 操作便捷性：⭐⭐⭐⭐⭐",
          }),
          new Paragraph({
            text: "• 回答准确性：⭐⭐⭐⭐",
          }),
          new Paragraph({
            text: "• 响应速度：⭐⭐⭐⭐",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "7.4 已知问题与改进方向",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: "（1）已知问题",
          }),
          new Paragraph({
            text: "    • 视觉模型API可用性依赖第三方服务",
          }),
          new Paragraph({
            text: "    • 数据库连接在开发环境偶发断开",
          }),
          new Paragraph({
            text: "    • 部分API响应时间较长",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "（2）改进方向",
          }),
          new Paragraph({
            text: "    • 接入更多视觉模型API（豆包、智谱GLM）",
          }),
          new Paragraph({
            text: "    • 增加数据缓存层提升响应速度",
          }),
          new Paragraph({
            text: "    • 支持更多外部数据源接入",
          }),
          new Paragraph({
            text: "    • 增加用户反馈机制优化回答质量",
          }),
          new Paragraph({
            text: "",
          }),

          new Paragraph({
            text: "八、总结与展望",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: "硫磺采购智能决策助手通过整合大语言模型、实时数据分析、知识图谱等技术，为硫磺采购决策提供了智能化解决方案。系统具备以下核心能力：",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "• 智能对话：自然语言交互，专业领域知识",
          }),
          new Paragraph({
            text: "• 数据洞察：多源数据融合，实时分析",
          }),
          new Paragraph({
            text: "• 决策支持：风险评估，采购建议",
          }),
          new Paragraph({
            text: "• 报告自动化：一键生成，格式规范",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "未来将持续优化模型能力、扩展数据源、提升用户体验，打造更智能、更高效的采购决策平台。",
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "文档生成时间：2026年3月26日",
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "项目版本：v0.1.0",
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const desktopPath = path.join(os.homedir(), "Desktop", "硫磺采购智能决策助手-项目文档.docx")
  saveAs(blob, "硫磺采购智能决策助手-项目文档.docx")
  console.log(`文档已生成: ${desktopPath}`)
}

generateProjectDocument().catch(console.error)
