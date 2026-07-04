import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, AlignmentType, WidthType } from "docx";
import { writeFileSync } from "fs";

async function generate() {
  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children: [
          // Title
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({ text: "MCP Server 设计方案", bold: true, size: 36, font: "微软雅黑" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [
              new TextRun({ text: "硫磺采购价格预测系统", size: 24, font: "微软雅黑", color: "666666" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 800 },
            children: [
              new TextRun({ text: "生成日期：2026-07-03", size: 20, font: "微软雅黑", color: "999999" }),
            ],
          }),
          new Paragraph({ text: "", spacing: { before: 400 } }),

          // 1. 概述
          heading1("1. 概述"),
          heading2("1.1 目标"),
          para("为硫磺采购价格预测系统提供标准化的 MCP（Model Context Protocol）接口，让各类 AI 客户端（Claude Desktop、Cherry Studio、Continue 等）能够直接调用硫磺市场数据查询、价格预测、告警订阅等工具。"),

          heading2("1.2 设计原则"),
          ...bullets([
            "无状态优先：每个 HTTP 请求独立处理，避免 session 管理复杂度",
            "最小依赖：仅依赖 @modelcontextprotocol/sdk，不引入 Express/Fastify 等框架",
            "双传输支持：同时支持 stdio（本地）和 HTTP（远程）两种传输方式",
            "零配置体验：通过 DEMO 模式让用户无需 API Key 即可试用",
          ]),

          // 2. 架构设计
          heading1("2. 架构设计"),
          heading2("2.1 三层架构"),
          codeBlock([
            "┌─────────────────────────────────────────────────────┐",
            "│                   MCP Clients                        │",
            "│  Claude Desktop  |  Cherry Studio  |  Continue       │",
            "─────────────────┬───────────────────────────────────┘",
            "                  │ stdio / HTTP (JSON-RPC 2.0)",
            "─────────────────▼───────────────────────────────────",
            "│                  MCP Server                          │",
            "│  ┌──────────────────────────────────────────────┐  │",
            "│  │  McpServer + StreamableHTTPServerTransport   │  │",
            "│  │  (每个请求新建实例，stateless 模式)           │  │",
            "│  └──────────────────────────────────────────────┘  │",
            "│  11 个工具：价格/库存/新闻/预测/知识图谱/订阅/告警  │",
            "─────────────────┬───────────────────────────────────",
            "                  │ HTTP fetch + Bearer Token",
            "┌─────────────────▼───────────────────────────────────┐",
            "│               Next.js Backend API                    │",
            "│  (Vercel: https://sulfur-agent-web.vercel.app)      │",
            "│  /api/v1/prices, /api/prediction, /api/neo4j ...    │",
            "└─────────────────────────────────────────────────────┘",
          ]),

          heading2("2.2 工具分类"),
          table(["分类", "工具", "说明"], [
            ["价格 & 数据", "get_prices, get_inventory, get_news", "查询硫磺价格、库存、新闻"],
            ["预测", "predict_prices", "ARIMA + XGBoost 混合模型预测"],
            ["知识图谱", "query_knowledge_graph", "Neo4j 查询供应链、影响因子"],
            ["订阅 & 告警", "subscribe_alert, list_subscriptions, update_subscription, get_alerts", "价格告警管理"],
            ["报告 & 状态", "generate_report, get_tracker_status", "追踪报告和运行状态"],
          ]),

          // 3. 传输协议设计
          heading1("3. 传输协议设计"),
          heading2("3.1 stdio 模式（Claude Desktop）"),
          ...bullets([
            "通过 stdin/stdout 传输 JSON-RPC 2.0 消息",
            "客户端 spawn 子进程，自动加载工具",
            "环境变量由客户端配置文件注入",
          ]),

          heading2("3.2 HTTP 模式（远程客户端）"),
          ...bullets([
            "使用 StreamableHTTPServerTransport",
            "Endpoint: http://host:3100/mcp",
            "stateless 模式：每个 HTTP 请求创建新实例",
            "避免 session ID 管理和多客户端冲突",
          ]),

          heading2("3.3 为什么选择 stateless 而非 stateful"),
          table(["特性", "stateful (session)", "stateless (无状态)"], [
            ["多客户端", "✗ 冲突", "✓ 支持"],
            ["Session 管理", "需要 UUID 管理", "不需要"],
            ["初始化冲突", "可能 'Already initialized'", "不会"],
            ["性能", "略高（复用实例）", "略低（每请求新建）"],
            ["复杂度", "高", "低"],
            ["适用场景", "单个客户端长连接", "多客户端短连接"],
          ]),
          new Paragraph({
            children: [new TextRun({ text: "决策：MCP Server 面向多客户端场景，选择 stateless 模式。", bold: true, size: 24, font: "微软雅黑", color: "C62828" })],
            spacing: { before: 120, after: 200 },
          }),

          // 4. 部署方案
          heading1("4. 部署方案"),
          heading2("4.1 本地开发"),
          codeBlock([
            "npm run mcp:dev    # stdio",
            "npm run mcp:http   # HTTP",
            "npm run mcp:both   # 双模式",
          ]),

          heading2("4.2 Docker 多阶段构建"),
          codeBlock([
            "Stage 1 (builder)   → 安装依赖 + tsc 编译",
            "Stage 2 (runtime)   → 仅装生产依赖 + node dist/index.js",
          ]),

          heading2("4.3 云平台部署"),
          ...bullets([
            "Railway: railway.json 配置",
            "Render: render.yaml 配置",
            "健康检查: /health 端点",
          ]),

          // 5. 安全设计
          heading1("5. 安全设计"),
          heading2("5.1 认证"),
          ...bullets([
            "API Key 通过 Authorization: Bearer <key> 传递",
            "环境变量注入，不写入代码",
            "DEMO 模式可跳过认证（仅用于体验）",
          ]),

          heading2("5.2 配额"),
          ...bullets([
            "每次工具调用消耗 1 次 API 配额",
            "默认每月 1000 次免费配额",
          ]),

          // 6. 环境变量
          heading1("6. 环境变量"),
          table(["变量", "必填", "默认值", "说明"], [
            ["API_BASE_URL", "否", "https://sulfur-agent-web.vercel.app", "后端 API 地址"],
            ["API_KEY", "是*", "—", "用户 API Key (*DEMO 模式除外)"],
            ["INDUSTRY_CODE", "否", "sulfur", "行业代码"],
            ["MCP_TRANSPORT", "否", "stdio", "传输方式"],
            ["MCP_PORT", "否", "3100", "HTTP 端口"],
            ["DEMO_MODE", "否", "false", "跳过认证"],
          ]),

          // 7. 文件结构
          heading1("7. 文件结构"),
          codeBlock([
            "mcp-server/",
            "├── index.ts              # 入口：加载配置 + 选择传输方式",
            "├── config.ts             # 环境变量加载 + 校验",
            "├── client.ts             # HTTP 客户端封装",
            "├── http-server.ts        # HTTP 传输层（stateless）",
            "├── stdio-server.ts       # stdio 传输层",
            "├── tools/                # 11 个工具实现",
            "│   ├── prices.ts",
            "│   ├── inventory.ts",
            "│   ├── news.ts",
            "│   ├── prediction.ts",
            "│   ├── knowledge-graph.ts",
            "│   ├── subscriptions.ts",
            "│   ├── report.ts",
            "│   └── status.ts",
            "── Dockerfile            # 多阶段构建",
            "├── docker-compose.yml    # Docker 编排",
            "├── railway.json          # Railway 部署配置",
            "├── render.yaml           # Render 部署配置",
            "── README.md             # 使用文档",
          ]),

          // 8. 技术选型
          heading1("8. 技术选型"),
          table(["组件", "选型", "原因"], [
            ["SDK", "@modelcontextprotocol/sdk", "官方 MCP 标准实现"],
            ["传输层", "Node.js http + StreamableHTTPServerTransport", "轻量，无需 Express"],
            ["编译", "TypeScript", "类型安全，与项目一致"],
            ["容器", "Docker multi-stage", "生产最佳实践"],
            ["部署", "Railway / Render", "一键部署，免费额度"],
          ]),

          // 9. 已知限制
          heading1("9. 已知限制"),
          ...[
            "Cherry Studio 兼容性：连接正常，但工具调用可能不生效（取决于客户端实现）",
            "HTTP header 格式：部分客户端请求头格式不标准，需要调试",
            "Windows 环境变量：CMD 不支持 VAR=value cmd 语法，需要改用 .env 或直接传参",
          ].map((item, i) =>
            new Paragraph({
              children: [new TextRun({ text: `${i + 1}. ${item}`, size: 24, font: "微软雅黑" })],
              spacing: { after: 120 },
            })
          ),

          // Footer
          new Paragraph({ text: "", spacing: { before: 400 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "—— 文档结束 ——", size: 20, font: "微软雅黑", color: "999999" })],
            spacing: { before: 200 },
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  writeFileSync("docs/MCP_Server_设计方案.docx", buffer);
  console.log("已生成 docs/MCP_Server_设计方案.docx");
}

function heading1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, size: 28, font: "微软雅黑" })],
    spacing: { before: 400, after: 200 },
  });
}

function heading2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 26, font: "微软雅黑" })],
    spacing: { before: 200, after: 120 },
  });
}

function para(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 24, font: "微软雅黑" })],
    spacing: { after: 200 },
  });
}

function bullets(items: string[]): Paragraph[] {
  return items.map((item) =>
    new Paragraph({
      children: [new TextRun({ text: "• " + item, size: 24, font: "微软雅黑" })],
      spacing: { after: 80 },
    })
  );
}

function codeBlock(lines: string[]): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: lines.join("\n"), size: 18, font: "Consolas" })],
    spacing: { after: 200 },
  });
}

function table(headers: string[], rows: string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((text) =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 22, font: "微软雅黑" })] })],
            shading: { fill: "F5F5F5" },
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
          })
        ),
      }),
      ...rows.map((row) =>
        new TableRow({
          children: row.map((cell) => {
            const isCode = cell.includes("/") || cell.includes("_") || cell.includes("npm") || cell.includes("node") || cell.includes("http") || cell.includes("@");
            return new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: cell, size: isCode ? 20 : 22, font: isCode ? "Consolas" : "微软雅黑", color: isCode ? "2E7D32" : "333333" })] })],
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
            });
          }),
        })
      ),
    ],
  });
}

generate().catch(console.error);
