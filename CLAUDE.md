# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 全局协作偏好

1. 复杂问题尽量使用 Superpowers 插件。
2. 如果需求、边界、字段含义、实现方式存在不明确的地方，先问我，再开始修改代码。
3. 修改代码前，先对齐我当前项目里已有的代码风格、结构和命名习惯，不要为了实现功能额外引入不必要的新写法。
4. 如果现有方法里直接补充逻辑就能完成，就优先沿用原方法风格；不要随意拆出额外的 helper、wrapper 或中间层。
5. 除非我明确要求，否则不要额外写测试类；我会自己测试和联调。
6. 日志、报错文案、注释语言要参考当前文件和当前模块的现有风格，优先保持一致，不要突然换成另一套表达。
7. 回答我关于实现方式或代码风格的问题时，先说明是否符合我现有风格，再给出修改建议。

## 项目概述

硫磺采购价格预测与决策辅助系统（sulfur-agent-web）。主应用为位于 `sulfur-agent-web/` 的 Next.js 项目。系统帮助企业分析硫磺市场趋势、预测价格并生成采购建议。

**在线地址**: https://sulfur-agent-web.vercel.app  
**GitHub**: https://github.com/weikangceng7-ai/TrustWise-Pricing

## 开发命令

```bash
# 开发服务器（使用 Turbopack）
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm run start

# 代码检查
npm run lint

# 数据库操作（Drizzle ORM）
npm run db:generate    # 从 schema 生成迁移文件
npm run db:push        # 将 schema 变更推送至数据库

# 数据填充脚本（在 sulfur-agent-web 目录下运行）
npm run db:seed:yihua       # 填充宜化知识库数据
npm run db:seed:yihua-code  # 填充宜化代码库元数据
```

## 系统架构

### 三层架构结构
- **展示层**: Next.js App Router 页面，路由分组 `(auth)`、`(dashboard)`
- **业务层**: API 路由、服务层、AI 集成
- **数据层**: PostgreSQL（Drizzle ORM）、Neo4j 知识图谱、外部数据源

### 核心组件

**双引擎决策系统**:
1. **宏观分析引擎**: 使用 Hybrid ARIMA + XGBoost 模型进行价格预测、趋势分析、市场新闻处理
2. **企业决策引擎**: 影响因子权重计算、库存分析、个性化采购建议生成

**双层知识图谱（Neo4j）**:
- 第一层：宏观知识图谱 - 价格影响因子关系网络、宏观经济指标关联、产业链结构、市场动态事件
- 第二层：企业知识图谱 - 三类典型企业（A/B/C）个性化参数、影响因子权重矩阵、历史采购决策记录
- 用于从市场变化推理至企业建议

**外部服务**:
- Python 预测服务（默认: http://localhost:5001） - `/predict`、`/trend`、`/decision` 接口
- Neo4j 图数据库（bolt://localhost:7687） - 知识图谱存储
- EIA/FRED/GDELT 数据源 - 外部市场数据
- AI 模型通过 OpenRouter（DeepSeek、StepFun、Qwen）

### 数据库 Schema（PostgreSQL）

主要表定义在 `src/db/schema.ts`:
- `user`、`session`、`account`、`verification` - Better Auth 认证表
- `sulfur_prices` - 硫磺价格数据（含地区、市场、规格）
- `port_inventory` - 港口库存水平
- `enterprises` - 企业档案（含库存、预测配置）
- `enterprise_price_predictions` - 各企业价格预测结果
- `chat_conversations`、`chat_messages` - 聊天历史
- `notifications` - 系统通知
- `yihua_knowledge_items`、`yihua_code_items` - 知识库元数据

### 路由结构

- `/` - 首页落地页
- `/(auth)/login`、`/(auth)/register` - 登录注册
- `/(dashboard)/dashboard` - 主仪表盘
- `/(dashboard)/agent-chat` - AI 聊天界面
- `/(dashboard)/enterprises`、`/enterprise-manage` - 企业管理
- `/(dashboard)/reports` - 报告生成
- `/(dashboard)/yihua-code-graph` - 代码知识图谱可视化

## 技术栈

- **框架**: Next.js 16.1.6 + Turbopack, React 19
- **样式**: Tailwind CSS 4, Shadcn UI, Lucide 图标
- **数据库**: Drizzle ORM + PostgreSQL（Neon）
- **认证**: Better Auth（邮箱密码 + 手机号登录）
- **AI**: OpenRouter SDK + AI SDK（支持 DeepSeek、StepFun、Qwen 模型）
- **图数据库**: Neo4j 知识图谱
- **图表**: Recharts 可视化
- **导出**: jsPDF、docx、xlsx 报告导出

## 环境变量

`.env.local` 中需要配置:
- `DATABASE_URL` - PostgreSQL 连接串
- `BETTER_AUTH_URL` - 认证服务基础 URL
- `NEO4J_URI`、`NEO4J_USER`、`NEO4J_PASSWORD` - Neo4j 连接配置
- `OPENROUTER_API_KEY` - AI 模型访问密钥
- `PREDICTION_SERVICE_URL` - Python 预测服务地址（可选，默认 localhost:5001）

## 关键文件

- `src/db/schema.ts` - 数据库 schema 和类型定义
- `src/lib/auth.ts` - Better Auth 配置（含 RBAC 权限）
- `src/lib/neo4j.ts` - Neo4j 驱动和查询辅助函数
- `src/services/prediction.ts` - Python 预测服务 API 客户端
- `src/services/chat.ts` - 聊天响应服务
- `src/lib/chat-models.ts` - AI 模型配置
- `drizzle.config.ts` - Drizzle ORM 配置