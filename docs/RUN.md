# TrustWise 智能硫磺定价决策系统 - 运行说明

## 一、环境要求

### 1.1 软件环境

| 软件 | 版本要求 | 说明 |
|:-----|:---------|:-----|
| Node.js | ≥ 18.17.0 | JavaScript运行环境 |
| npm | ≥ 9.0.0 | 包管理器 |
| PostgreSQL | ≥ 14.0 | 数据库（可选） |
| Neo4j | ≥ 4.4 | 知识图谱数据库（可选） |

### 1.2 操作系统

- Windows 10/11
- macOS 10.15+
- Ubuntu 18.04+

---

## 二、安装步骤

### 2.1 进入项目目录

```bash
cd D:\trustwise\TrustWise-Pricing
```

### 2.2 安装依赖

```bash
npm install
```

### 2.3 配置环境变量

创建 `.env.local` 文件（项目根目录），内容如下：

```env
# OpenAI API 配置
OPENAI_API_KEY=your-api-key-here
OPENAI_BASE_URL=https://api.qnaigc.com/v1

# 数据库配置（可选）
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/sulfur_agent

# 认证配置
BETTER_AUTH_URL=http://localhost:3000

# Neo4j 配置（可选）
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=sulfur123

# 运行环境
NODE_ENV=development
```

---

## 三、运行项目

### 3.1 开发模式

```bash
npm run dev
```

启动成功后，浏览器访问：**http://localhost:3000**

### 3.2 生产模式

```bash
npm run build
npm run start
```

---

## 四、页面导航

| 页面 | 地址 | 功能说明 |
|:-----|:-----|:---------|
| 首页 | http://localhost:3000 | 系统首页 |
| 仪表盘 | http://localhost:3000/dashboard | 价格走势、供需分析、企业预测 |
| 价格预测知识图谱 | http://localhost:3000/knowledge-graph | 影响因子图谱、节点详情 |
| Agent决策助手 | http://localhost:3000/agent-chat | 智能问答、采购建议 |
| 采购报告单 | http://localhost:3000/reports | 报告列表、导出 |
| 湖北宜化 | http://localhost:3000/enterprise/yihua | 企业分析、价格预测 |
| 鲁西化工 | http://localhost:3000/enterprise/luxi | 企业分析、价格预测 |
| 金正大 | http://localhost:3000/enterprise/jinzhengda | 企业分析、价格预测 |

---

## 五、常见问题

### 5.1 端口被占用

```bash
# Windows 查看端口占用
netstat -ano | findstr :3000

# 结束占用进程
taskkill /PID <进程ID> /F
```

### 5.2 依赖安装失败

```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules 文件夹后重新安装
rmdir /s /q node_modules
npm install
```

### 5.3 数据库连接失败

- 检查 PostgreSQL 服务是否启动
- 确认 `.env.local` 中的数据库连接字符串正确
- 系统会在数据库不可用时自动使用兜底数据

### 5.4 Neo4j 连接失败

- 检查 Neo4j 服务是否启动
- 确认端口 7687 是否开放
- 系统会在 Neo4j 不可用时自动使用模拟数据

---

## 六、技术栈

| 类型 | 技术 |
|:-----|:-----|
| 前端框架 | Next.js 16.1.6 + React 18 |
| UI组件 | Tailwind CSS + Shadcn UI |
| 图表可视化 | Recharts |
| 后端服务 | Next.js API Routes |
| 数据库 | PostgreSQL + Drizzle ORM |
| 知识图谱 | Neo4j |
| AI模型 | OpenAI SDK + DeepSeek-V3 |
| 价格预测 | Hybrid ARIMA + XGBoost |

---

## 七、项目结构

```
TrustWise-Pricing/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # 仪表盘布局
│   │   │   ├── dashboard/      # 仪表盘页面
│   │   │   ├── agent-chat/     # Agent助手页面
│   │   │   ├── reports/        # 采购报告页面
│   │   │   └── enterprise/     # 企业分析页面
│   │   └── api/                # API接口
│   ├── components/             # React组件
│   ├── services/               # 业务服务
│   ├── lib/                    # 工具库
│   └── data/                   # 数据文件
├── public/                     # 静态资源
├── .env.local                  # 环境变量
└── package.json                # 项目配置
```

---

## 八、核心功能

### 8.1 仪表盘

- 价格走势展示（日/周/月）
- 供需分析（当前价格、港口库存）
- 影响因子知识图谱
- 企业硫磺价格预测

### 8.2 Agent决策助手

- 自然语言交互
- 价格趋势预测
- 采购建议生成
- 双板块输出（宏观分析 + 企业建议）

### 8.3 企业分析

- 企业详情展示
- 企业知识图谱
- LSTM价格预测曲线
- 影响因子权重分析

---

## 九、联系方式

如有问题，请联系项目维护人员。

---

**TrustWise——构建硫磺定价决策的智能护城河。**
