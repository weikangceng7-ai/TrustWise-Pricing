"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Package,
  Factory,
  Truck,
  Globe,
  DollarSign,
  BarChart3,
  Activity,
  Warehouse,
  Users,
  Target,
  Brain
} from "lucide-react"
import { EnterprisePredictionChart } from "./enterprise-prediction-chart"
import { Neo4jKnowledgeGraph } from "./neo4j-knowledge-graph"

// 企业详细配置
const ENTERPRISE_DETAILS: Record<string, {
  name: string
  code: string
  color: string
  description: string
  location: string
  capacity: string
  mainProducts: string[]
  influenceFactors: { name: string; weight: number; trend: "up" | "down" | "stable" }[]
  supplyFactors: { name: string; value: string; status: "good" | "warning" | "critical" }[]
  demandFactors: { name: string; value: string; trend: "up" | "down" | "stable" }[]
  inventory: { current: number; max: number; days: number; trend: "up" | "down" | "stable" }
}> = {
  yihua: {
    name: "湖北宜化集团",
    code: "yihua",
    color: "#06b6d4",
    description: "国内领先的硫磺生产企业，主营化肥、化工产品",
    location: "湖北省宜昌市",
    capacity: "120万吨/年",
    mainProducts: ["尿素", "磷酸一铵", "硫磺", "硫酸"],
    influenceFactors: [
      { name: "国际硫磺价格", weight: 28, trend: "up" },
      { name: "化肥市场需求", weight: 22, trend: "stable" },
      { name: "运输成本", weight: 18, trend: "up" },
      { name: "环保政策", weight: 15, trend: "down" },
      { name: "汇率波动", weight: 10, trend: "stable" },
      { name: "库存水平", weight: 7, trend: "down" },
    ],
    supplyFactors: [
      { name: "原材料供应", value: "充足", status: "good" },
      { name: "进口依赖度", value: "65%", status: "warning" },
      { name: "供应商集中度", value: "中等", status: "good" },
      { name: "物流效率", value: "良好", status: "good" },
    ],
    demandFactors: [
      { name: "农业需求", value: "旺季", trend: "up" },
      { name: "工业需求", value: "稳定", trend: "stable" },
      { name: "出口订单", value: "增长", trend: "up" },
      { name: "库存补货", value: "积极", trend: "up" },
    ],
    inventory: { current: 8500, max: 15000, days: 28, trend: "down" },
  },
  luxi: {
    name: "鲁西化工集团",
    code: "luxi",
    color: "#8b5cf6",
    description: "山东大型化工企业，硫磺制酸产能居前",
    location: "山东省聊城市",
    capacity: "95万吨/年",
    mainProducts: ["硫酸", "磷酸", "硫磺", "复合肥"],
    influenceFactors: [
      { name: "区域供需平衡", weight: 25, trend: "stable" },
      { name: "下游化工需求", weight: 23, trend: "up" },
      { name: "运输成本", weight: 20, trend: "up" },
      { name: "竞争格局", weight: 12, trend: "stable" },
      { name: "政策因素", weight: 12, trend: "down" },
      { name: "库存周转", weight: 8, trend: "stable" },
    ],
    supplyFactors: [
      { name: "原材料供应", value: "稳定", status: "good" },
      { name: "进口依赖度", value: "55%", status: "warning" },
      { name: "供应商集中度", value: "分散", status: "good" },
      { name: "物流效率", value: "优秀", status: "good" },
    ],
    demandFactors: [
      { name: "农业需求", value: "平稳", trend: "stable" },
      { name: "工业需求", value: "旺盛", trend: "up" },
      { name: "出口订单", value: "稳定", trend: "stable" },
      { name: "库存补货", value: "正常", trend: "stable" },
    ],
    inventory: { current: 6200, max: 12000, days: 22, trend: "stable" },
  },
  jinzhengda: {
    name: "金正大生态工程",
    code: "jinzhengda",
    color: "#f59e0b",
    description: "化肥行业龙头，硫磺需求稳定",
    location: "山东省临沂市",
    capacity: "80万吨/年",
    mainProducts: ["复合肥", "缓控释肥", "硫磺", "硫酸钾"],
    influenceFactors: [
      { name: "化肥市场价格", weight: 30, trend: "up" },
      { name: "农产品价格", weight: 20, trend: "up" },
      { name: "季节性需求", weight: 18, trend: "up" },
      { name: "运输成本", weight: 15, trend: "up" },
      { name: "库存策略", weight: 10, trend: "stable" },
      { name: "汇率影响", weight: 7, trend: "stable" },
    ],
    supplyFactors: [
      { name: "原材料供应", value: "偏紧", status: "warning" },
      { name: "进口依赖度", value: "70%", status: "critical" },
      { name: "供应商集中度", value: "集中", status: "warning" },
      { name: "物流效率", value: "良好", status: "good" },
    ],
    demandFactors: [
      { name: "农业需求", value: "旺季", trend: "up" },
      { name: "工业需求", value: "一般", trend: "stable" },
      { name: "出口订单", value: "下降", trend: "down" },
      { name: "库存补货", value: "积极", trend: "up" },
    ],
    inventory: { current: 4800, max: 10000, days: 18, trend: "down" },
  },
}

interface EnterpriseDetailProps {
  enterpriseCode: "yihua" | "luxi" | "jinzhengda"
}

export function EnterpriseDetail({ enterpriseCode }: EnterpriseDetailProps) {
  const enterprise = ENTERPRISE_DETAILS[enterpriseCode]

  if (!enterprise) {
    return <div>企业信息不存在</div>
  }

  const inventoryPercent = (enterprise.inventory.current / enterprise.inventory.max) * 100

  return (
    <div className="space-y-6">
      {/* 企业概览卡片 */}
      <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${enterprise.color}20` }}
              >
                <Building2 className="h-6 w-6" style={{ color: enterprise.color }} />
              </div>
              <div>
                <CardTitle className="text-xl text-slate-900 dark:text-white">
                  {enterprise.name}
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  {enterprise.description}
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-sm px-3 py-1"
              style={{ borderColor: enterprise.color, color: enterprise.color }}
            >
              <Factory className="h-3.5 w-3.5 mr-1" />
              产能 {enterprise.capacity}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">{enterprise.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">主营: {enterprise.mainProducts.slice(0, 2).join("、")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 影响因子权重 */}
      <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" style={{ color: enterprise.color }} />
            <CardTitle className="text-lg text-slate-900 dark:text-white">价格影响因子权重</CardTitle>
          </div>
          <CardDescription>不同因素对企业硫磺采购价格的影响程度</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {enterprise.influenceFactors.map((factor, index) => (
              <div key={index} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{factor.name}</span>
                  <div className="flex items-center gap-2">
                    {factor.trend === "up" && <TrendingUp className="h-4 w-4 text-rose-500" />}
                    {factor.trend === "down" && <TrendingDown className="h-4 w-4 text-emerald-500" />}
                    {factor.trend === "stable" && <Activity className="h-4 w-4 text-slate-400" />}
                    <span className="text-sm font-semibold" style={{ color: enterprise.color }}>{factor.weight}%</span>
                  </div>
                </div>
                <Progress
                  value={factor.weight}
                  className="h-2"
                  style={{
                    background: `linear-gradient(90deg, ${enterprise.color}40, transparent)`,
                  }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 供应端因素 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-lg text-slate-900 dark:text-white">供应端因素</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {enterprise.supplyFactors.map((factor, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-sm text-slate-600 dark:text-slate-300">{factor.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{factor.value}</span>
                    <div className={`w-2 h-2 rounded-full ${
                      factor.status === "good" ? "bg-emerald-500" :
                      factor.status === "warning" ? "bg-amber-500" : "bg-rose-500"
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 需求端因素 */}
        <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-violet-500" />
              <CardTitle className="text-lg text-slate-900 dark:text-white">需求端因素</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {enterprise.demandFactors.map((factor, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-sm text-slate-600 dark:text-slate-300">{factor.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{factor.value}</span>
                    {factor.trend === "up" && <TrendingUp className="h-4 w-4 text-rose-500" />}
                    {factor.trend === "down" && <TrendingDown className="h-4 w-4 text-emerald-500" />}
                    {factor.trend === "stable" && <Activity className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 库存信息 */}
      <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg text-slate-900 dark:text-white">库存状态</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 库存可视化 */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">当前库存</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {enterprise.inventory.current.toLocaleString()}
                  </span>
                  <span className="text-sm text-slate-500">/ {enterprise.inventory.max.toLocaleString()} 吨</span>
                  {enterprise.inventory.trend === "down" && <TrendingDown className="h-4 w-4 text-rose-500" />}
                  {enterprise.inventory.trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                  {enterprise.inventory.trend === "stable" && <Activity className="h-4 w-4 text-slate-400" />}
                </div>
              </div>
              <Progress
                value={inventoryPercent}
                className="h-4"
                style={{
                  background: `linear-gradient(90deg, ${enterprise.color}60, ${enterprise.color}20)`,
                }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-slate-500">0</span>
                <span className="text-xs text-slate-500">{enterprise.inventory.max.toLocaleString()} 吨</span>
              </div>
            </div>

            {/* 库存天数 */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div className="text-3xl font-bold text-slate-900 dark:text-white">{enterprise.inventory.days}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">可用天数</div>
              <Badge
                variant="outline"
                className={`mt-2 ${
                  enterprise.inventory.days < 20 ? "border-rose-500 text-rose-500" :
                  enterprise.inventory.days < 30 ? "border-amber-500 text-amber-500" :
                  "border-emerald-500 text-emerald-500"
                }`}
              >
                {enterprise.inventory.days < 20 ? "库存紧张" : enterprise.inventory.days < 30 ? "库存适中" : "库存充足"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 价格预测图表 */}
      <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" style={{ color: enterprise.color }} />
            <CardTitle className="text-lg text-slate-900 dark:text-white">价格预测趋势</CardTitle>
          </div>
          <CardDescription>EEMD-LSTM 模型预测结果</CardDescription>
        </CardHeader>
        <CardContent>
          <EnterprisePredictionChart enterpriseCode={enterpriseCode} days={90} />
        </CardContent>
      </Card>

      {/* 知识图谱 */}
      <Neo4jKnowledgeGraph enterpriseCode={enterpriseCode} />
    </div>
  )
}