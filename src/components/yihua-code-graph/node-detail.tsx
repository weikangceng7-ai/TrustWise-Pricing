"use client"

import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"
import { KNOWLEDGE_DATA, NODE_REALTIME_DATA_CONFIG } from "./knowledge-data"
import type { useMarketDataOverview } from "@/hooks/use-external-data"
import { useLanguage } from "@/contexts/language-context"

// 获取静态节点的详细信息
function getStaticNodeInfo(
  nodeId: string,
  weights: typeof KNOWLEDGE_DATA.factorWeights,
  t: (key: string) => string,
): { label: string; value: string; highlight?: boolean }[] {
  switch (nodeId) {
    case 'supply-factor':
      return [
        { label: t('nodeDetail.supply.domesticOutput'), value: t('nodeDetail.supply.domesticOutputVal') },
        { label: t('nodeDetail.supply.importVol'), value: t('nodeDetail.supply.importVolVal') },
        { label: t('nodeDetail.supply.mainSources'), value: t('nodeDetail.supply.mainSourcesVal') },
        { label: t('nodeDetail.supply.supplyTrend'), value: t('nodeDetail.supply.supplyTrendVal'), highlight: true },
      ]
    case 'demand-factor':
      return [
        { label: t('nodeDetail.demand.phosphateFert'), value: t('nodeDetail.demand.phosphateFertVal') },
        { label: t('nodeDetail.demand.sulfuricAcid'), value: t('nodeDetail.demand.sulfuricAcidVal') },
        { label: t('nodeDetail.demand.operatingRate'), value: t('nodeDetail.demand.operatingRateVal') },
        { label: t('nodeDetail.demand.demandTrend'), value: t('nodeDetail.demand.demandTrendVal'), highlight: true },
      ]
    case 'inventory':
      return [
        { label: t('nodeDetail.inventory.majorPort'), value: t('nodeDetail.inventory.majorPortVal') },
        { label: t('nodeDetail.inventory.stockRatio'), value: t('nodeDetail.inventory.stockRatioVal') },
        { label: t('nodeDetail.inventory.warningLine'), value: t('nodeDetail.inventory.warningLineVal') },
        { label: t('nodeDetail.inventory.inventoryStatus'), value: t('nodeDetail.inventory.inventoryStatusVal'), highlight: true },
      ]
    case 'seasonal':
      return [
        { label: t('nodeDetail.seasonal.springPrep'), value: t('nodeDetail.seasonal.springPrepVal') },
        { label: t('nodeDetail.seasonal.autumnPrep'), value: t('nodeDetail.seasonal.autumnPrepVal') },
        { label: t('nodeDetail.seasonal.offSeason'), value: t('nodeDetail.seasonal.offSeasonVal') },
        { label: t('nodeDetail.seasonal.currentPhase'), value: t('nodeDetail.seasonal.currentPhaseVal'), highlight: true },
      ]
    case 'fertilizer':
      return [
        { label: t('nodeDetail.fertilizer.map'), value: t('nodeDetail.fertilizer.mapVal') },
        { label: t('nodeDetail.fertilizer.dap'), value: t('nodeDetail.fertilizer.dapVal') },
        { label: t('nodeDetail.fertilizer.operatingRate'), value: t('nodeDetail.fertilizer.operatingRateVal') },
        { label: t('nodeDetail.fertilizer.marketStatus'), value: t('nodeDetail.fertilizer.marketStatusVal'), highlight: true },
      ]
    case 'sulfuric-acid':
      return [
        { label: t('nodeDetail.sulfuricAcid.price'), value: t('nodeDetail.sulfuricAcid.priceVal') },
        { label: t('nodeDetail.sulfuricAcid.mainUse'), value: t('nodeDetail.sulfuricAcid.mainUseVal') },
        { label: t('nodeDetail.sulfuricAcid.supplySource'), value: t('nodeDetail.sulfuricAcid.supplySourceVal') },
        { label: t('nodeDetail.sulfuricAcid.marketStatus'), value: t('nodeDetail.sulfuricAcid.marketStatusVal'), highlight: true },
      ]
    case 'purchase-record':
      return [
        { label: t('nodeDetail.purchaseRecord.recentPurchase'), value: t('nodeDetail.purchaseRecord.recentPurchaseVal') },
        { label: t('nodeDetail.purchaseRecord.purchaseVol'), value: t('nodeDetail.purchaseRecord.purchaseVolVal') },
        { label: t('nodeDetail.purchaseRecord.mainSuppliers'), value: t('nodeDetail.purchaseRecord.mainSuppliersVal') },
        { label: t('nodeDetail.purchaseRecord.purchaseStrategy'), value: t('nodeDetail.purchaseRecord.purchaseStrategyVal'), highlight: true },
      ]
    case 'price-judgment':
      return [
        { label: t('nodeDetail.priceJudgment.priceRange'), value: t('nodeDetail.priceJudgment.priceRangeVal') },
        { label: t('nodeDetail.priceJudgment.trendJudgment'), value: t('nodeDetail.priceJudgment.trendJudgmentVal') },
        { label: t('nodeDetail.priceJudgment.keyLevels'), value: t('nodeDetail.priceJudgment.keyLevelsVal') },
        { label: t('nodeDetail.priceJudgment.expertView'), value: t('nodeDetail.priceJudgment.expertViewVal'), highlight: true },
      ]
    case 'inventory-strategy':
      return [
        { label: t('nodeDetail.inventoryStrategy.safetyStock'), value: t('nodeDetail.inventoryStrategy.safetyStockVal') },
        { label: t('nodeDetail.inventoryStrategy.stockingCycle'), value: t('nodeDetail.inventoryStrategy.stockingCycleVal') },
        { label: t('nodeDetail.inventoryStrategy.inventoryWarning'), value: t('nodeDetail.inventoryStrategy.inventoryWarningVal') },
        { label: t('nodeDetail.inventoryStrategy.strategyAdvice'), value: t('nodeDetail.inventoryStrategy.strategyAdviceVal'), highlight: true },
      ]
    case 'supplier-relation':
      return [
        { label: t('nodeDetail.supplierRelation.mainSuppliers'), value: t('nodeDetail.supplierRelation.mainSuppliersVal') },
        { label: t('nodeDetail.supplierRelation.cooperationYears'), value: t('nodeDetail.supplierRelation.cooperationYearsVal') },
        { label: t('nodeDetail.supplierRelation.paymentTerms'), value: t('nodeDetail.supplierRelation.paymentTermsVal') },
        { label: t('nodeDetail.supplierRelation.cooperationStatus'), value: t('nodeDetail.supplierRelation.cooperationStatusVal'), highlight: true },
      ]
    case 'risk-case':
      return [
        { label: t('nodeDetail.riskCase.case2023'), value: t('nodeDetail.riskCase.case2023Val') },
        { label: t('nodeDetail.riskCase.causeAnalysis'), value: t('nodeDetail.riskCase.causeAnalysisVal') },
        { label: t('nodeDetail.riskCase.responseMeasures'), value: t('nodeDetail.riskCase.responseMeasuresVal') },
        { label: t('nodeDetail.riskCase.lessonsLearned'), value: t('nodeDetail.riskCase.lessonsLearnedVal'), highlight: true },
      ]
    case 'procurement-rule':
      return [
        { label: t('nodeDetail.procurementRule.approvalProcess'), value: t('nodeDetail.procurementRule.approvalProcessVal') },
        { label: t('nodeDetail.procurementRule.approvalAuth'), value: t('nodeDetail.procurementRule.approvalAuthVal') },
        { label: t('nodeDetail.procurementRule.procurementCycle'), value: t('nodeDetail.procurementRule.procurementCycleVal') },
        { label: t('nodeDetail.procurementRule.complianceReq'), value: t('nodeDetail.procurementRule.complianceReqVal'), highlight: true },
      ]
    case 'quality-standard':
      return [
        { label: t('nodeDetail.qualityStandard.purityReq'), value: t('nodeDetail.qualityStandard.purityReqVal') },
        { label: t('nodeDetail.qualityStandard.moisture'), value: t('nodeDetail.qualityStandard.moistureVal') },
        { label: t('nodeDetail.qualityStandard.ashContent'), value: t('nodeDetail.qualityStandard.ashContentVal') },
        { label: t('nodeDetail.qualityStandard.inspectionStd'), value: 'GB/T 2449-2014', highlight: true },
      ]
    case 'contract-rule':
      return [
        { label: t('nodeDetail.contractRule.pricingMech'), value: t('nodeDetail.contractRule.pricingMechVal') },
        { label: t('nodeDetail.contractRule.settlementMethod'), value: t('nodeDetail.contractRule.settlementMethodVal') },
        { label: t('nodeDetail.contractRule.deliveryMethod'), value: 'CFR ' + t('nodeDetail.contractRule.chinaPorts') },
        { label: t('nodeDetail.contractRule.breachTerms'), value: t('nodeDetail.contractRule.breachTermsVal'), highlight: true },
      ]
    case 'risk-policy':
      return [
        { label: t('nodeDetail.riskPolicy.priceWarning'), value: t('nodeDetail.riskPolicy.priceWarningVal') },
        { label: t('nodeDetail.riskPolicy.inventoryWarning'), value: t('nodeDetail.riskPolicy.inventoryWarningVal') },
        { label: t('nodeDetail.riskPolicy.contingencyPlan'), value: t('nodeDetail.riskPolicy.contingencyPlanVal') },
        { label: t('nodeDetail.riskPolicy.stopLossMech'), value: t('nodeDetail.riskPolicy.stopLossMechVal'), highlight: true },
      ]
    case 'storage-rule':
      return [
        { label: t('nodeDetail.storageRule.storageConditions'), value: t('nodeDetail.storageRule.storageConditionsVal') },
        { label: t('nodeDetail.storageRule.stackingReq'), value: t('nodeDetail.storageRule.stackingReqVal') },
        { label: t('nodeDetail.storageRule.lossStandard'), value: t('nodeDetail.storageRule.lossStandardVal') },
        { label: t('nodeDetail.storageRule.safetyReq'), value: t('nodeDetail.storageRule.safetyReqVal'), highlight: true },
      ]
    case 'short-forecast': {
      const oilTrend = weights.find(w => w.factor === '原油价格')?.trend || 'stable'
      const shortTermTrend = oilTrend === 'up' ? t('nodeDetail.shortForecast.trendUp') : oilTrend === 'down' ? t('nodeDetail.shortForecast.trendDown') : t('nodeDetail.shortForecast.trendStable')
      return [
        { label: t('nodeDetail.shortForecast.forecastCycle'), value: t('nodeDetail.shortForecast.forecastCycleVal') },
        { label: t('nodeDetail.shortForecast.priceRange'), value: t('nodeDetail.shortForecast.priceRangeVal') },
        { label: t('nodeDetail.shortForecast.trendJudgment'), value: shortTermTrend, highlight: true },
        { label: t('nodeDetail.shortForecast.confidence'), value: t('nodeDetail.shortForecast.confidenceVal') },
      ]
    }
    case 'medium-forecast':
      return [
        { label: t('nodeDetail.mediumForecast.forecastCycle'), value: t('nodeDetail.mediumForecast.forecastCycleVal') },
        { label: t('nodeDetail.mediumForecast.priceRange'), value: t('nodeDetail.mediumForecast.priceRangeVal') },
        { label: t('nodeDetail.mediumForecast.trendJudgment'), value: t('nodeDetail.mediumForecast.trendJudgmentVal'), highlight: true },
        { label: t('nodeDetail.mediumForecast.keyVariables'), value: t('nodeDetail.mediumForecast.keyVariablesVal') },
      ]
    case 'decision-support':
      return [
        { label: t('nodeDetail.decisionSupport.purchaseAdvice'), value: t('nodeDetail.decisionSupport.purchaseAdviceVal') },
        { label: t('nodeDetail.decisionSupport.suggestedQty'), value: t('nodeDetail.decisionSupport.suggestedQtyVal') },
        { label: t('nodeDetail.decisionSupport.priceRef'), value: t('nodeDetail.decisionSupport.priceRefVal') },
        { label: t('nodeDetail.decisionSupport.executionAdvice'), value: t('nodeDetail.decisionSupport.executionAdviceVal'), highlight: true },
      ]
    case 'risk-warning': {
      const riskLevel = weights.find(w => w.factor === '供应端因素')?.weight || 0.5
      const riskStatus = riskLevel > 0.85 ? t('nodeDetail.riskWarning.levelHigh') : riskLevel > 0.7 ? t('nodeDetail.riskWarning.levelMedium') : t('nodeDetail.riskWarning.levelLow')
      return [
        { label: t('nodeDetail.riskWarning.riskLevel'), value: riskStatus, highlight: true },
        { label: t('nodeDetail.riskWarning.mainRisks'), value: t('nodeDetail.riskWarning.mainRisksVal') },
        { label: t('nodeDetail.riskWarning.monitoringIndicators'), value: t('nodeDetail.riskWarning.monitoringIndicatorsVal') },
        { label: t('nodeDetail.riskWarning.recommendedMeasures'), value: t('nodeDetail.riskWarning.recommendedMeasuresVal') },
      ]
    }
    default:
      return [
        { label: t('nodeDetail.defaultStatus'), value: t('nodeDetail.defaultStatusVal') },
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
  const { t } = useLanguage()
  const config = NODE_REALTIME_DATA_CONFIG[nodeId]

  if (!config) return null

  // 价格类型数据
  if (config.dataType === 'price' && config.marketKey) {
    const data = marketData[config.marketKey]

    if (loading) {
      return (
        <div className="pt-3 border-t">
          <div className="text-xs text-muted-foreground mb-2">{config.title}</div>
          <div className="text-sm text-muted-foreground">{t("nodeDetail.loading")}</div>
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
          <div className="text-sm text-muted-foreground">{t("nodeDetail.loading")}</div>
        </div>
      )
    }

    const newsContent = newsData?.data as { topics?: { keyword: string; count: number; articles: { title: string; url: string }[] }[]; totalArticles?: number } | undefined
    if (!newsContent?.topics?.length) return null

    return (
      <div className="pt-3 border-t">
        <div className="text-xs text-muted-foreground mb-2">
          {config.title}
          <Badge variant="outline" className="ml-2">{newsContent.totalArticles} {t("nodeDetail.articlesCount")}</Badge>
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
        <div className="text-xs text-muted-foreground">{t("nodeDetail.dataSourceInfo")}</div>
        <div className="text-xs space-y-1.5">
          <div className="flex items-start gap-1">
            <span className="text-muted-foreground shrink-0">{t("nodeDetail.descriptionLabel")}</span>
            <span>{sourceInfo.description}</span>
          </div>
          <div className="flex items-start gap-1">
            <span className="text-muted-foreground shrink-0">API{t("nodeDetail.colonSuffix")}</span>
            <span className={sourceInfo.apiKey.includes('无需') ? 'text-green-600' : 'text-amber-600'}>
              {sourceInfo.apiKey}
            </span>
          </div>
          <div className="flex items-start gap-1">
            <span className="text-muted-foreground shrink-0">{t("nodeDetail.dataLabel")}</span>
            <span className="flex flex-wrap gap-1">
              {sourceInfo.dataTypes.slice(0, 4).map((item, i) => (
                <Badge key={i} variant="outline" className="text-[10px] px-1 py-0">{item}</Badge>
              ))}
            </span>
          </div>
          {'endpoints' in sourceInfo && sourceInfo.endpoints && (
            <div className="flex items-start gap-1">
              <span className="text-muted-foreground shrink-0">{t("nodeDetail.endpointsLabel")}</span>
              <code className="text-[10px] bg-muted px-1 rounded break-all">
                {sourceInfo.endpoints[0]}
              </code>
            </div>
          )}
          {'status' in sourceInfo && sourceInfo.status && (
            <div className="flex items-start gap-1">
              <span className="text-muted-foreground shrink-0">{t("nodeDetail.statusLabel")}</span>
              <span className="text-muted-foreground">{sourceInfo.status}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 静态信息类型 - 显示节点相关的详细分析信息
  if (config.dataType === 'static') {
    const staticInfo = getStaticNodeInfo(nodeId, liveWeights, t)
    return (
      <div className="pt-3 border-t space-y-2">
        <div className="text-xs text-muted-foreground">{config.title}</div>
        <div className="text-xs space-y-1.5">
          {staticInfo.map((item, i) => (
            <div key={i} className="flex items-start gap-1">
              <span className="text-muted-foreground shrink-0">{item.label}{t("nodeDetail.colonSuffix")}</span>
              <span className={item.highlight ? 'text-primary font-medium' : ''}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}
