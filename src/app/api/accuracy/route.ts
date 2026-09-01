import { NextResponse } from "next/server"
import { db, enterprisePricePredictions, sulfurPrices } from "@/db"
import { and, isNotNull, eq, desc } from "drizzle-orm"
import { backtestModel } from "@/services/prediction"

interface AccuracyMetrics {
  mae: number
  rmse: number
  mape: number
  r2: number
  totalPredictions: number
}

interface AccuracyTrendPoint {
  date: string
  mape: number
  mae: number
}

interface HistoricalPrediction {
  date: string
  actual: number
  predicted: number
  lowerBound: number
  upperBound: number
}

interface EnterpriseAccuracy {
  code: string
  name: string
  mape: number
  mae: number
  predictionCount: number
}

interface AccuracyData {
  overview: AccuracyMetrics
  accuracyTrend: AccuracyTrendPoint[]
  historicalPredictions: HistoricalPrediction[]
  byEnterprise: EnterpriseAccuracy[]
  dataSource: "backtest" | "naive_backtest" | "db_records" | "none"
  insufficientData: boolean
  message?: string
}

interface AccuracyPoint {
  date: string
  actual: number
  predicted: number
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/** 从逐点预测 vs 实际计算真实精度指标 */
function computeMetrics(points: AccuracyPoint[]): AccuracyMetrics | null {
  const n = points.length
  if (n === 0) return null

  const errors = points.map((p) => p.actual - p.predicted)
  const absErrors = errors.map((e) => Math.abs(e))
  const mae = absErrors.reduce((a, b) => a + b, 0) / n
  const mse = errors.reduce((a, b) => a + b * b, 0) / n
  const rmse = Math.sqrt(mse)
  const mape =
    (points.reduce((sum, p) => sum + Math.abs(p.actual - p.predicted) / Math.abs(p.actual), 0) / n) * 100
  const meanActual = points.reduce((sum, p) => sum + p.actual, 0) / n
  const ssRes = errors.reduce((a, b) => a + b * b, 0)
  const ssTot = points.reduce((sum, p) => sum + (p.actual - meanActual) ** 2, 0)
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot

  return {
    mae: round(mae),
    rmse: round(rmse),
    mape: round(mape),
    r2: round(r2, 3),
    totalPredictions: n,
  }
}

/** 朴素回测（Naive forecast）：pred[t] = actual[t-1]，逐点预测 */
function naiveBacktest(
  sorted: { date: string; price: number }[]
): AccuracyPoint[] {
  if (sorted.length < 3) return []

  // 用后 20% 作测试集，其余训练
  const split = Math.max(1, Math.floor(sorted.length * 0.8))
  const train = sorted.slice(0, split)
  const test = sorted.slice(split)

  const predictions: AccuracyPoint[] = []
  for (let i = 0; i < test.length; i++) {
    if (i === 0) {
      // 第一个测试点：用训练集最后价格预测
      predictions.push({
        date: test[i].date,
        actual: test[i].price,
        predicted: train[train.length - 1].price,
      })
    } else {
      // 后续测试点：用前一天实际值预测（naive forecast）
      predictions.push({
        date: test[i].date,
        actual: test[i].price,
        predicted: test[i - 1].price,
      })
    }
  }

  return predictions
}

/** 计算某日期所在周的周一（用于按周聚合 MAPE 趋势） */
function weekStart(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  const day = (d.getUTCDay() + 6) % 7 // Monday = 0
  d.setUTCDate(d.getUTCDate() - day)
  return d.toISOString().split("T")[0]
}

function buildAccuracyTrend(points: AccuracyPoint[]): AccuracyTrendPoint[] {
  const byWeek = new Map<string, AccuracyPoint[]>()
  for (const p of points) {
    const ws = weekStart(p.date)
    if (!byWeek.has(ws)) byWeek.set(ws, [])
    byWeek.get(ws)!.push(p)
  }

  return [...byWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([week, weekPoints]) => {
      const m = computeMetrics(weekPoints)!
      return { date: week, mape: m.mape, mae: m.mae }
    })
}

function buildHistorical(points: AccuracyPoint[]): HistoricalPrediction[] {
  return [...points]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({
      date: p.date,
      actual: p.actual,
      predicted: p.predicted,
      lowerBound: p.predicted,
      upperBound: p.predicted,
    }))
}

/** 从企业预测表读取真实记录（actual vs predicted） */
async function getEnterpriseRecords(): Promise<(AccuracyPoint & { code: string; name: string })[]> {
  if (!db) return []

  try {
    const rows = await db
      .select({
        code: enterprisePricePredictions.enterpriseCode,
        name: enterprisePricePredictions.enterpriseName,
        date: enterprisePricePredictions.date,
        actual: enterprisePricePredictions.actualPrice,
        predicted: enterprisePricePredictions.predictedPrice,
      })
      .from(enterprisePricePredictions)
      .where(
        and(
          isNotNull(enterprisePricePredictions.actualPrice),
          isNotNull(enterprisePricePredictions.predictedPrice)
        )
      )

    return rows
      .filter((r) => r.actual !== null && r.predicted !== null)
      .map((r) => ({
        code: r.code,
        name: r.name,
        date: typeof r.date === "string" ? r.date : (r.date as Date).toISOString().split("T")[0],
        actual: Number(r.actual),
        predicted: Number(r.predicted),
      })) as unknown as (AccuracyPoint & { code: string; name: string })[]
  } catch (error) {
    console.error("[Accuracy API] 读取企业预测记录失败:", error)
    return [] as unknown as (AccuracyPoint & { code: string; name: string })[]
  }
}

function buildEnterpriseAccuracy(
  records: (AccuracyPoint & { code: string; name: string })[]
): EnterpriseAccuracy[] {
  const grouped = new Map<string, { code: string; name: string; points: AccuracyPoint[] }>()
  for (const r of records) {
    if (!grouped.has(r.code)) grouped.set(r.code, { code: r.code, name: r.name, points: [] })
    grouped.get(r.code)!.points.push({ date: r.date, actual: r.actual, predicted: r.predicted })
  }

  return [...grouped.values()]
    .map((g) => {
      const m = computeMetrics(g.points)!
      return { code: g.code, name: g.name, mape: m.mape, mae: m.mae, predictionCount: m.totalPredictions }
    })
    .sort((a, b) => a.mape - b.mape)
}

function emptyData(message: string): AccuracyData {
  return {
    overview: { mae: 0, rmse: 0, mape: 0, r2: 0, totalPredictions: 0 },
    accuracyTrend: [],
    historicalPredictions: [],
    byEnterprise: [],
    dataSource: "none",
    insufficientData: true,
    message,
  }
}

export async function GET() {
  try {
    // 优先级 1：调用 Python 服务做真实回测（Hybrid ARIMA + XGBoost）
    const backtest = await backtestModel(0.1)
    if (backtest.success && backtest.predictions && backtest.predictions.length > 0) {
      const points: AccuracyPoint[] = backtest.predictions.map((p) => ({
        date: p.date,
        actual: p.actual,
        predicted: p.predicted,
      }))
      const metrics = computeMetrics(points)!
      const data: AccuracyData = {
        overview: { ...metrics },
        accuracyTrend: buildAccuracyTrend(points),
        historicalPredictions: buildHistorical(points),
        byEnterprise: buildEnterpriseAccuracy(await getEnterpriseRecords()),
        dataSource: "backtest",
        insufficientData: false,
        message: `基于 ${points.length} 个测试点的真实回测（数据源：${backtest.data_source || "未知"}）`,
      }
      return NextResponse.json({ success: true, data })
    }

    // 优先级 2：DB 原生朴素回测（Naive forecast: pred[t] = last_train_price）
    // 不依赖 Python 服务，直接用 sulfur_prices 表数据
    if (db) {
      try {
        const prices = await db
          .select({
            date: sulfurPrices.date,
            price: sulfurPrices.mainPrice,
          })
          .from(sulfurPrices)
          .where(
            and(
              eq(sulfurPrices.commodityCode, "sulfur"),
              isNotNull(sulfurPrices.mainPrice)
            )
          )
          .orderBy(desc(sulfurPrices.date))

        if (prices.length >= 5) {
          // 按日期升序（朴素回测需要时序顺序）
          const sorted = prices
            .map((p) => ({ date: p.date, price: Number(p.price) }))
            .reverse()

          const points = naiveBacktest(sorted)
          if (points.length > 0) {
            const metrics = computeMetrics(points)!
            const data: AccuracyData = {
              overview: { ...metrics },
              accuracyTrend: buildAccuracyTrend(points),
              historicalPredictions: buildHistorical(points),
              byEnterprise: buildEnterpriseAccuracy(await getEnterpriseRecords()),
              dataSource: "naive_backtest",
              insufficientData: false,
              message: `朴素基准模型（Naive forecast）回测，${points.length} 个测试点，共 ${sorted.length} 条硫磺价格记录`,
            }
            return NextResponse.json({ success: true, data })
          }
        }
      } catch (error) {
        console.warn("[Accuracy API] 朴素回测失败，回退到企业记录:", error)
      }
    }

    // 优先级 3：数据库中的企业预测记录（actual vs predicted）
    const records = await getEnterpriseRecords()
    if (records.length > 0) {
      const points: AccuracyPoint[] = records.map((r) => ({
        date: r.date,
        actual: r.actual,
        predicted: r.predicted,
      }))
      const metrics = computeMetrics(points)!
      const data: AccuracyData = {
        overview: { ...metrics },
        accuracyTrend: buildAccuracyTrend(points),
        historicalPredictions: buildHistorical(points).slice(0, 30),
        byEnterprise: buildEnterpriseAccuracy(records),
        dataSource: "db_records",
        insufficientData: false,
        message: `基于 ${records.length} 条企业预测记录`,
      }
      return NextResponse.json({ success: true, data })
    }

    // 无数据：诚实返回空态
    return NextResponse.json({
      success: true,
      data: emptyData("暂无足够的历史预测与实价对比数据，无法计算模型精度"),
    })
  } catch (error) {
    console.error("[Accuracy API] 获取精度数据失败:", error)
    return NextResponse.json(
      { success: false, error: "获取精度数据失败" },
      { status: 500 }
    )
  }
}
