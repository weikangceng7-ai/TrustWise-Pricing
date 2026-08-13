"use client"

import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"
import { KNOWLEDGE_DATA, NODE_REALTIME_DATA_CONFIG } from "./knowledge-data"
import type { useMarketDataOverview } from "@/hooks/use-external-data"

// 获取静态节点的详细信息
function getStaticNodeInfo(
  nodeId: string,
  weights: typeof KNOWLEDGE_DATA.factorWeights
): { label: string; value: string; highlight?: boolean }[] {
  switch (nodeId) {
    case 'supply-factor':
      return [
        { label: '国内产量', value: '月均约 80-100 万吨' },
        { label: '进口量', value: '月均约 60-80 万吨' },
        { label: '主要来源', value: '中东(沙特、阿联酋)、加拿大' },
        { label: '供应趋势', value: '当前供应平稳，中东出货正常', highlight: true },
      ]
    case 'demand-factor':
      return [
        { label: '磷肥需求', value: '春耕备肥期需求旺盛' },
        { label: '硫酸需求', value: '化工行业需求稳定' },
        { label: '下游开工率', value: '约 75-80%' },
        { label: '需求趋势', value: '短期需求偏强，关注春耕进度', highlight: true },
      ]
    case 'inventory':
      return [
        { label: '主要港口库存', value: '约 45-55 万吨' },
        { label: '库存消费比', value: '约 3-4 周' },
        { label: '库存预警线', value: '低于 40 万吨为紧张' },
        { label: '库存状态', value: '当前库存处于合理区间', highlight: true },
      ]
    case 'seasonal':
      return [
        { label: '春耕备肥', value: '2-4月，需求高峰期' },
        { label: '秋季备肥', value: '8-10月，次高峰期' },
        { label: '淡季', value: '5-7月、11-1月' },
        { label: '当前阶段', value: '春耕备肥期，价格易涨难跌', highlight: true },
      ]
    case 'fertilizer':
      return [
        { label: '磷酸一铵', value: '约 3200-3500 元/吨' },
        { label: '磷酸二铵', value: '约 3600-4000 元/吨' },
        { label: '开工率', value: '约 70-75%' },
        { label: '市场状态', value: '价格稳中有升，企业利润改善', highlight: true },
      ]
    case 'sulfuric-acid':
      return [
        { label: '硫酸价格', value: '约 150-250 元/吨' },
        { label: '主要用途', value: '磷肥生产(约 70%)' },
        { label: '供应来源', value: '冶炼酸、硫磺制酸' },
        { label: '市场状态', value: '供应充足，价格稳定', highlight: true },
      ]
    case 'purchase-record':
      return [
        { label: '最近采购', value: '2024年1月，均价 950 元/吨' },
        { label: '采购量', value: '月均约 5000 吨' },
        { label: '主要供应商', value: '华能化工、恒盛贸易' },
        { label: '采购策略', value: '分批采购，控制库存风险', highlight: true },
      ]
    case 'price-judgment':
      return [
        { label: '价格区间', value: '近期 900-1000 元/吨' },
        { label: '趋势判断', value: '短期偏强震荡' },
        { label: '关键点位', value: '支撑 900，压力 1050' },
        { label: '专家观点', value: '建议逢低分批采购', highlight: true },
      ]
    case 'inventory-strategy':
      return [
        { label: '安全库存', value: '10-15 天用量' },
        { label: '备货周期', value: '进口周期约 30-45 天' },
        { label: '库存预警', value: '低于 7 天用量需紧急补库' },
        { label: '策略建议', value: '春耕前适当增加库存', highlight: true },
      ]
    case 'supplier-relation':
      return [
        { label: '主要供应商', value: '华能化工、恒盛贸易、天源国际' },
        { label: '合作年限', value: '5-10 年长期合作' },
        { label: '付款条件', value: '信用证 30-60 天' },
        { label: '合作状态', value: '关系稳定，优先供货保障', highlight: true },
      ]
    case 'risk-case':
      return [
        { label: '2023年案例', value: '价格从 800 涨至 1200 元/吨' },
        { label: '原因分析', value: '国际原油上涨 + 春耕需求' },
        { label: '应对措施', value: '提前锁定部分长单' },
        { label: '经验教训', value: '关注原油走势，提前布局', highlight: true },
      ]
    case 'procurement-rule':
      return [
        { label: '审批流程', value: '采购申请 → 审批 → 合同签订' },
        { label: '审批权限', value: '10万以下经理审批，以上需副总' },
        { label: '采购周期', value: '月度计划，周度执行' },
        { label: '合规要求', value: '需三家比价或长期协议', highlight: true },
      ]
    case 'quality-standard':
      return [
        { label: '纯度要求', value: '≥ 99.5%' },
        { label: '水分', value: '≤ 0.5%' },
        { label: '灰分', value: '≤ 0.1%' },
        { label: '检验标准', value: 'GB/T 2449-2014', highlight: true },
      ]
    case 'contract-rule':
      return [
        { label: '定价机制', value: '公式定价(基准价+升贴水)' },
        { label: '结算方式', value: '信用证结算' },
        { label: '交货方式', value: 'CFR 中国港口' },
        { label: '违约条款', value: '延迟交货每日罚 0.5%', highlight: true },
      ]
    case 'risk-policy':
      return [
        { label: '价格预警', value: '单周涨跌超 5% 触发预警' },
        { label: '库存预警', value: '库存低于 7 天用量预警' },
        { label: '应对预案', value: '启动备选供应商、调整采购计划' },
        { label: '止损机制', value: '设置采购价格上限', highlight: true },
      ]
    case 'storage-rule':
      return [
        { label: '存储条件', value: '干燥通风，远离火源' },
        { label: '堆放要求', value: '不超过 3 层，离地 10cm' },
        { label: '损耗标准', value: '≤ 0.5%/月' },
        { label: '安全要求', value: '配备消防设施，定期检查', highlight: true },
      ]
    case 'short-forecast': {
      const oilTrend = weights.find(w => w.factor === '原油价格')?.trend || 'stable'
      const shortTermTrend = oilTrend === 'up' ? '偏强震荡' : oilTrend === 'down' ? '偏弱运行' : '平稳运行'
      return [
        { label: '预测周期', value: '1-4 周' },
        { label: '价格区间', value: '920-980 元/吨' },
        { label: '趋势判断', value: shortTermTrend, highlight: true },
        { label: '置信度', value: '中等 (65%)' },
      ]
    }
    case 'medium-forecast':
      return [
        { label: '预测周期', value: '1-3 个月' },
        { label: '价格区间', value: '900-1050 元/吨' },
        { label: '趋势判断', value: '震荡偏强，关注春耕需求', highlight: true },
        { label: '关键变量', value: '原油价格、港口库存、下游开工' },
      ]
    case 'decision-support':
      return [
        { label: '采购建议', value: '分批采购，控制节奏' },
        { label: '建议采购量', value: '满足 15-20 天用量' },
        { label: '价格参考', value: '低于 950 可适当增加采购' },
        { label: '执行建议', value: '关注原油走势，择机锁定长单', highlight: true },
      ]
    case 'risk-warning': {
      const riskLevel = weights.find(w => w.factor === '供应端因素')?.weight || 0.5
      const riskStatus = riskLevel > 0.85 ? '偏高' : riskLevel > 0.7 ? '中等' : '较低'
      return [
        { label: '风险等级', value: riskStatus, highlight: true },
        { label: '主要风险', value: '原油价格波动、汇率风险' },
        { label: '监测指标', value: '原油、汇率、港口库存' },
        { label: '建议措施', value: '保持安全库存，关注市场动态' },
      ]
    }
    default:
      return [
        { label: '状态', value: '正常' },
      ]
  }
}

// 节点实时数据展示组件
export function NodeRealtimeDataSection({
  nodeId,
  marketData,
  liveWeights,
  loading
}: {
  nodeId: string
  marketData: ReturnType<typeof useMarketDataOverview>
  liveWeights: typeof KNOWLEDGE_DATA.factorWeights
  loading: boolean
}) {
  const config = NODE_REALTIME_DATA_CONFIG[nodeId]

  if (!config) return null

  // 价格类型数据
  if (config.dataType === 'price' && config.marketKey) {
    const data = marketData[config.marketKey]

    if (loading) {
      return (
        <div className="pt-3 border-t">
          <div className="text-xs text-muted-foreground mb-2">{config.title}</div>
          <div className="text-sm text-muted-foreground">加载中...</div>
        </div>
      )
    }

    // 类型守卫：检查是否为 AkShare 类型数据
    type AkShareData = { data: { latest: { value: number; change: number; changePercent: number }; unit: string } }
    const isAkShareData = (d: unknown): d is AkShareData => {
      if (typeof d !== 'object' || d === null) return false
      const obj = d as Record<string, unknown>
      if (!('data' in obj)) return false
      const dataObj = obj.data as Record<string, unknown>
      return 'latest' in dataObj && 'unit' in dataObj
    }

    if (!data || !isAkShareData(data)) return null

    const latest = data.data.latest
    const isUp = latest.changePercent > 0
    const isDown = latest.changePercent < 0

    return (
      <div className="pt-3 border-t">
        <div className="text-xs text-muted-foreground mb-2">{config.title}</div>
        <div className="flex items-center gap-3">
          <span className="text-xl font-semibold tabular-nums">
            {latest.value.toFixed(config.marketKey === 'usdcny' ? 4 : 2)}
          </span>
          <span className="text-xs text-muted-foreground">{data.data.unit}</span>
          <Badge
            variant={isUp ? "default" : isDown ? "destructive" : "secondary"}
            className="text-xs"
          >
            {isUp && <ArrowUpRight className="mr-1 h-3 w-3" />}
            {isDown && <ArrowDownRight className="mr-1 h-3 w-3" />}
            {!isUp && !isDown && <Minus className="mr-1 h-3 w-3" />}
            {isUp ? "+" : ""}{latest.change.toFixed(2)} ({isUp ? "+" : ""}{latest.changePercent.toFixed(2)}%)
          </Badge>
        </div>
      </div>
    )
  }

  // 新闻类型数据
  if (config.dataType === 'news' && config.marketKey === 'news') {
    const newsData = marketData.news

    if (loading) {
      return (
        <div className="pt-3 border-t">
          <div className="text-xs text-muted-foreground mb-2">{config.title}</div>
          <div className="text-sm text-muted-foreground">加载中...</div>
        </div>
      )
    }

    const newsContent = newsData?.data as { topics?: { keyword: string; count: number; articles: { title: string; url: string }[] }[]; totalArticles?: number } | undefined
    if (!newsContent?.topics?.length) return null

    return (
      <div className="pt-3 border-t">
        <div className="text-xs text-muted-foreground mb-2">
          {config.title}
          <Badge variant="outline" className="ml-2">{newsContent.totalArticles} 篇</Badge>
        </div>
        <div className="space-y-2">
          {newsContent.topics.slice(0, 2).map((topic, i) => (
            <div key={i} className="text-xs">
              <div className="font-medium">{topic.keyword} <Badge variant="secondary" className="text-[10px]">{topic.count}</Badge></div>
              {topic.articles[0] && (
                <a
                  href={topic.articles[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary truncate block mt-1"
                >
                  &bull; {topic.articles[0].title}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 权重类型数据
  if (config.dataType === 'weight') {
    return (
      <div className="pt-3 border-t">
        <div className="text-xs text-muted-foreground mb-2">{config.title}</div>
        <div className="space-y-1">
          {liveWeights
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 5)
            .map((f, i) => (
              <div key={f.factor} className="flex items-center gap-2 text-xs">
                <span className="w-4 text-muted-foreground">{i + 1}.</span>
                <span className="flex-1">{f.factor}</span>
                <span className="text-muted-foreground">{(f.weight * 100).toFixed(0)}%</span>
                <span className={f.trend === "up" ? "text-red-500" : f.trend === "down" ? "text-green-500" : "text-muted-foreground"}>
                  {f.trend === "up" ? "↑" : f.trend === "down" ? "↓" : "→"}
                </span>
              </div>
            ))}
        </div>
      </div>
    )
  }

  // 数据源类型
  if (config.dataType === 'source') {
    const sourceInfo = KNOWLEDGE_DATA.dataSourceInfo.find(s => s.name === config.title)

    if (!sourceInfo) return null

    return (
      <div className="pt-3 border-t space-y-2">
        <div className="text-xs text-muted-foreground">数据源信息</div>
        <div className="text-xs space-y-1.5">
          <div className="flex items-start gap-1">
            <span className="text-muted-foreground shrink-0">描述：</span>
            <span>{sourceInfo.description}</span>
          </div>
          <div className="flex items-start gap-1">
            <span className="text-muted-foreground shrink-0">API：</span>
            <span className={sourceInfo.apiKey.includes('无需') ? 'text-green-600' : 'text-amber-600'}>
              {sourceInfo.apiKey}
            </span>
          </div>
          <div className="flex items-start gap-1">
            <span className="text-muted-foreground shrink-0">数据：</span>
            <span className="flex flex-wrap gap-1">
              {sourceInfo.dataTypes.slice(0, 4).map((t, i) => (
                <Badge key={i} variant="outline" className="text-[10px] px-1 py-0">{t}</Badge>
              ))}
            </span>
          </div>
          {'endpoints' in sourceInfo && sourceInfo.endpoints && (
            <div className="flex items-start gap-1">
              <span className="text-muted-foreground shrink-0">接口：</span>
              <code className="text-[10px] bg-muted px-1 rounded break-all">
                {sourceInfo.endpoints[0]}
              </code>
            </div>
          )}
          {'status' in sourceInfo && sourceInfo.status && (
            <div className="flex items-start gap-1">
              <span className="text-muted-foreground shrink-0">状态：</span>
              <span className="text-muted-foreground">{sourceInfo.status}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 静态信息类型 - 显示节点相关的详细分析信息
  if (config.dataType === 'static') {
    const staticInfo = getStaticNodeInfo(nodeId, liveWeights)
    return (
      <div className="pt-3 border-t space-y-2">
        <div className="text-xs text-muted-foreground">{config.title}</div>
        <div className="text-xs space-y-1.5">
          {staticInfo.map((item, i) => (
            <div key={i} className="flex items-start gap-1">
              <span className="text-muted-foreground shrink-0">{item.label}：</span>
              <span className={item.highlight ? 'text-primary font-medium' : ''}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}
