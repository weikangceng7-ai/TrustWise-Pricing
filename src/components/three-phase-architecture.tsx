"use client"

import Link from "next/link"
import { Database, Filter, Brain, BarChart3, Building, Scale, ChevronRight } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
} from "recharts"

// ============================================================
// 颜色定义说明
// ============================================================
// #06b6d4 - cyan-400   青色   - 用于：价格行情、采购案例、已清洗数据、数据利用率
// #8b5cf6 - violet-400 紫罗兰 - 用于：供需动态、供应商管理、已标注数据、标注完成率
// #f59e0b - amber-400  琥珀色 - 用于：政策法规、风险案例、制度规则库
// #10b981 - emerald-400 翡翠绿 - 用于：国际市场、最佳实践、模型训练数据、模型准确率
// #f43f5e - rose-400   玫瑰红 - 用于：行业资讯
// #3b82f6 - blue-400   蓝色   - 用于：处理后数据条形图
// #64748b - slate-400  灰色   - 用于：原始数据、处理前数据条形图
// ============================================================

// ============================================================
// 第一阶段：数据基础 - 市场资讯库统计
// 颜色说明：青色(价格行情)、紫罗兰(供需动态)、琥珀色(政策法规)、翡翠绿(国际市场)、玫瑰红(行业资讯)
// ============================================================
const marketNewsData = [
  { name: "价格行情", count: 1250, fill: "#06b6d4" },  // cyan-400 青色
  { name: "供需动态", count: 890, fill: "#8b5cf6" },   // violet-400 紫罗兰
  { name: "政策法规", count: 456, fill: "#f59e0b" },   // amber-400 琥珀色
  { name: "国际市场", count: 678, fill: "#10b981" },   // emerald-400 翡翠绿
  { name: "行业资讯", count: 934, fill: "#f43f5e" },   // rose-400 玫瑰红
]

// ============================================================
// 第一阶段：数据基础 - 企业经验库数据
// 颜色说明：青色(采购案例)、紫罗兰(供应商管理)、琥珀色(风险案例)、翡翠绿(最佳实践)
// ============================================================
const enterpriseData = [
  { name: "采购案例", value: 35, fill: "#06b6d4" },    // cyan-400 青色
  { name: "供应商管理", value: 25, fill: "#8b5cf6" },  // violet-400 紫罗兰
  { name: "风险案例", value: 20, fill: "#f59e0b" },    // amber-400 琥珀色
  { name: "最佳实践", value: 20, fill: "#10b981" },    // emerald-400 翡翠绿
]

// ============================================================
// 第一阶段：数据基础 - 制度规则库数据
// 颜色说明：使用 COLORS 数组循环配色
// ============================================================
const rulesData = [
  { name: "采购制度", count: 45 },   // cyan-400 青色
  { name: "质量标准", count: 38 },   // violet-400 紫罗兰
  { name: "合规要求", count: 28 },   // amber-400 琥珀色
  { name: "操作规程", count: 52 },   // emerald-400 翡翠绿
  { name: "风险管理", count: 35 },   // rose-400 玫瑰红
]

// ============================================================
// 第二阶段：数据处理 - 数据处理统计
// 颜色说明：灰色(原始数据)、青色(已清洗)、紫罗兰(已标注)、翡翠绿(模型训练)
// ============================================================
const dataProcessingStats = [
  { name: "原始数据", value: 4208, fill: "#64748b" },  // slate-400 灰色
  { name: "已清洗", value: 3856, fill: "#06b6d4" },    // cyan-400 青色
  { name: "已标注", value: 2150, fill: "#8b5cf6" },    // violet-400 紫罗兰
  { name: "模型训练", value: 1680, fill: "#10b981" },  // emerald-400 翡翠绿
]

// ============================================================
// 第二阶段：数据处理 - 处理效率数据
// 条形图颜色：灰色(处理前)、蓝色(处理后)
// ============================================================
const processingEfficiency = [
  { stage: "去重", before: 4208, after: 4012 },
  { stage: "格式化", before: 4012, after: 3856 },
  { stage: "标注", before: 3856, after: 2150 },
  { stage: "训练集", before: 2150, after: 1680 },
]

// 通用颜色数组，用于制度规则库等需要循环配色的图表
const COLORS = ["#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#f43f5e"]

interface ThreePhaseArchitectureProps {
  className?: string
}

export function ThreePhaseArchitecture({ className }: ThreePhaseArchitectureProps) {
  return (
    <div className={`bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-5 w-5 text-cyan-400" />
        <h3 className="text-white font-semibold">系统架构</h3>
      </div>

      {/* 三阶段架构 */}
      <div className="space-y-4">
        {/* 第一阶段 - 数据库层 - 主色调：青色#06b6d4 */}
        <div className="relative">
          <div className="absolute -left-3 top-0 w-1 h-full bg-linear-to-b from-cyan-500 via-cyan-500 to-cyan-500/30 rounded-full" />
          <div className="pl-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <span className="text-xs font-bold text-cyan-400">1</span>
              </div>
              <h4 className="text-sm font-medium text-cyan-400">第一阶段：数据基础</h4>
            </div>

            {/* 三个数据库卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 市场资讯库 - 主色调：青色#06b6d4，条形图使用多彩配色 */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-medium text-white">市场资讯库</span>
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={marketNewsData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="rgba(255,255,255,0.2)" />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 9, fill: "#94a3b8" }}
                        stroke="rgba(255,255,255,0.2)"
                        width={60}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "#f1f5f9" }}
                        itemStyle={{ color: "#cbd5e1" }}
                        formatter={(value) => [`${value} 条`, "数据量"]}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {marketNewsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-center">
                  <span className="text-xs text-slate-400">共 4,208 条数据</span>
                </div>
              </div>

              {/* 企业经验库 - 主色调：紫罗兰#8b5cf6，饼图使用多彩配色 */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-violet-500/30 transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <Building className="h-4 w-4 text-violet-400" />
                  <span className="text-sm font-medium text-white">企业经验库</span>
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={enterpriseData}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={45}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {enterpriseData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                        }}
                        formatter={(value) => [`${value}%`, "占比"]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={20}
                        formatter={(value) => <span className="text-xs text-slate-400">{value}</span>}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 制度规则库 - 主色调：琥珀色#f59e0b，条形图使用COLORS循环配色 */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-amber-500/30 transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <Scale className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-medium text-white">制度规则库</span>
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rulesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 9, fill: "#94a3b8" }}
                        stroke="rgba(255,255,255,0.2)"
                        angle={-20}
                        textAnchor="end"
                        height={40}
                      />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="rgba(255,255,255,0.2)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                        }}
                        formatter={(value) => [`${value} 项`, "数量"]}
                      />
                      <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                        {rulesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-center">
                  <span className="text-xs text-slate-400">198 项制度</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 连接线 */}
        <div className="flex justify-center py-2">
          <div className="w-0.5 h-8 bg-linear-to-b from-cyan-500 to-violet-500" />
        </div>

        {/* 第二阶段 - 数据处理层 - 主色调：紫罗兰#8b5cf6 */}
        <div className="relative">
          <div className="absolute -left-3 top-0 w-1 h-full bg-linear-to-b from-violet-500 via-violet-500 to-violet-500/30 rounded-full" />
          <div className="pl-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center">
                <span className="text-xs font-bold text-violet-400">2</span>
              </div>
              <h4 className="text-sm font-medium text-violet-400">第二阶段：数据处理</h4>
            </div>

            {/* 数据处理统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* 处理进度环形图 - 颜色：灰色#64748b(原始)、青色#06b6d4(已清洗)、紫罗兰#8b5cf6(已标注)、翡翠绿#10b981(模型训练) */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-violet-500/30 transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="h-4 w-4 text-violet-400" />
                  <span className="text-sm font-medium text-white">数据清洗进度</span>
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={dataProcessingStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {dataProcessingStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                        }}
                        formatter={(value) => [`${(value as number)?.toLocaleString() ?? 0} 条`, "数据量"]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={20}
                        formatter={(value) => <span className="text-xs text-slate-400">{value}</span>}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 处理效率对比图 - 颜色：灰色#64748b(处理前)、蓝色#3b82f6(处理后) */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-blue-500/30 transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">处理效率分析</span>
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processingEfficiency} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="rgba(255,255,255,0.2)" />
                      <YAxis
                        type="category"
                        dataKey="stage"
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        stroke="rgba(255,255,255,0.2)"
                        width={50}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "#f1f5f9" }}
                        itemStyle={{ color: "#cbd5e1" }}
                      />
                      <Bar dataKey="before" fill="#64748b" name="处理前" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="after" fill="#3b82f6" name="处理后" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 处理能力指标 - 颜色：青色#06b6d4(数据利用率)、紫罗兰#8b5cf6(标注完成率)、翡翠绿#10b981(模型准确率) */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-center">
                <div className="text-lg font-bold text-cyan-400">91.6%</div>
                <div className="text-xs text-slate-400">数据利用率</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-center">
                <div className="text-lg font-bold text-violet-400">55.8%</div>
                <div className="text-xs text-slate-400">标注完成率</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-center">
                <div className="text-lg font-bold text-emerald-400">78.1%</div>
                <div className="text-xs text-slate-400">模型准确率</div>
              </div>
            </div>
          </div>
        </div>

        {/* 连接线 */}
        <div className="flex justify-center py-2">
          <div className="w-0.5 h-8 bg-linear-to-b from-violet-500 to-emerald-500" />
        </div>

        {/* 第三阶段 - AI Agent 层 - 主色调：翡翠绿#10b981 */}
        <div className="relative">
          <div className="absolute -left-3 top-0 w-1 h-full bg-linear-to-b from-emerald-500 via-emerald-500 to-emerald-500/30 rounded-full" />
          <div className="pl-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-xs font-bold text-emerald-400">3</span>
              </div>
              <h4 className="text-sm font-medium text-emerald-400">第三阶段：AI 智能体中心</h4>
            </div>

            <Link href="/agent-chat" className="block">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-emerald-500/30 transition-all cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-emerald-500/30 to-cyan-500/30 border border-emerald-400/50 flex items-center justify-center">
                      <Brain className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">智能决策助手</div>
                      <div className="text-xs text-slate-400">智能决策、自动化采购、风险预警</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                      <span className="text-xs text-emerald-400">已激活</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}