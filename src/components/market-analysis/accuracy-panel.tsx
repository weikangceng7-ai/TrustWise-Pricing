"use client"

import { useQuery } from "@tanstack/react-query"
import {
  TrendingUp,
  Target,
  Activity,
  BarChart3,
  DollarSign,
  TrendingDown,
  Zap,
  Shield,
} from "lucide-react"
import {
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { useLanguage } from "@/contexts/language-context"

interface AccuracyData {
  overview: {
    mae: number
    rmse: number
    mape: number
    r2: number
    totalPredictions: number
  }
  accuracyTrend: Array<{ date: string; mape: number; mae: number }>
  historicalPredictions: Array<{
    date: string
    actual: number
    predicted: number
    lowerBound: number
    upperBound: number
  }>
  byEnterprise: Array<{
    code: string
    name: string
    mape: number
    mae: number
    predictionCount: number
  }>
  dataSource?: "backtest" | "naive_backtest" | "db_records" | "none"
  insufficientData?: boolean
  message?: string
}

interface CombinedPrediction {
  date: string
  predicted_price: number
  lower_bound: number
  upper_bound: number
  confidence: number
  arima_component: number
  transformer_component: number
}

interface CombinedPredictionData {
  commodity_code: string
  current_price: number
  trend: string
  change_percent: number
  regime: string
  risk_adjustment: number
  predictions: CombinedPrediction[]
  weights: {
    arima_xgb: number
    transformer: number
  }
  model_metrics: {
    arima_mape: number
    transformer_mape: number
  }
  prediction_days: number
  generated_at: string
}

const DATA_SOURCE_LABEL = (t: (key: string) => string): Record<string, string> => ({
  backtest: t("accuracy.sourceLabel.backtest"),
  naive_backtest: t("accuracy.sourceLabel.naiveBacktest"),
  db_records: t("accuracy.sourceLabel.dbRecords"),
  none: t("accuracy.sourceLabel.none"),
})

function EnterpriseAccuracyCard({
  enterprise,
  index,
}: {
  enterprise: AccuracyData["byEnterprise"][0]
  index: number
}) {
  const { t } = useLanguage()
  const colors = [
    { bg: "bg-cyan-50/50 dark:bg-cyan-500/10", border: "border-cyan-200/50 dark:border-cyan-500/20", text: "text-cyan-700 dark:text-cyan-300", bar: "bg-cyan-500" },
    { bg: "bg-violet-50/50 dark:bg-violet-500/10", border: "border-violet-200/50 dark:border-violet-500/20", text: "text-violet-700 dark:text-violet-300", bar: "bg-violet-500" },
    { bg: "bg-amber-50/50 dark:bg-amber-500/10", border: "border-amber-200/50 dark:border-amber-500/20", text: "text-amber-700 dark:text-amber-300", bar: "bg-amber-500" },
  ]
  const c = colors[index % colors.length]

  return (
    <div className={`p-4 rounded-lg ${c.bg} ${c.border}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-sm font-semibold ${c.text}`}>{enterprise.name}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {enterprise.predictionCount}{t("accuracy.predictionCountSuffix")}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">MAPE</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">
            {enterprise.mape}%
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">MAE (¥)</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">
            ¥{enterprise.mae}
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-white/5">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t("accuracy.accuracyRating")}</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full ${c.bar} transition-all`}
              style={{ width: `${100 - enterprise.mape * 10}%` }}
            />
          </div>
          <span className={`text-xs font-medium ${c.text}`}>
            {enterprise.mape < 3.5 ? t("accuracy.grade.excellent") : enterprise.mape < 4 ? t("accuracy.grade.good") : t("accuracy.grade.pass")}
          </span>
        </div>
      </div>
    </div>
  )
}

export function AccuracyPanel() {
  const { t } = useLanguage()

  // 查询精度数据
  const { data, isLoading, error } = useQuery({
    queryKey: ["accuracy"],
    queryFn: async () => {
      const res = await fetch("/api/accuracy")
      const json = await res.json()
      return json.data as AccuracyData
    },
  })

  // 查询融合预测数据
  const { data: combinedData } = useQuery({
    queryKey: ["combined-prediction"],
    queryFn: async () => {
      const res = await fetch("/api/combined-prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 7 }),
      })
      const json = await res.json()
      return json.data as CombinedPredictionData
    },
    refetchInterval: 1000 * 60 * 30, // 30分钟刷新
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-slate-400 text-sm animate-pulse">{t("accuracy.loading")}</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-slate-400 text-sm">{t("accuracy.loadFailed")}</div>
      </div>
    )
  }

  const { overview, accuracyTrend, historicalPredictions, byEnterprise } = data

  // 诚实空态：无真实数据时展示说明，而非伪造数字
  if (data.insufficientData || overview.totalPredictions === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-2">
        <div className="text-slate-500 dark:text-slate-400 text-sm">
          {data.message || t("accuracy.insufficientData")}
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500">
          {t("accuracy.insufficientDataHint")}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* 面板说明 */}
      <div className="flex items-center gap-2 mb-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("accuracy.panelDescPrefix")}{overview.totalPredictions}{t("accuracy.panelDescSuffix")}
        </p>
        {data.dataSource && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400">
            {DATA_SOURCE_LABEL(t)[data.dataSource] || data.dataSource}
          </span>
        )}
      </div>

      {/* 四个指标卡片 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {/* MAPE: 平均误差百分比。如 MAPE=5% 表示预测价与实际价平均偏差 5%。
            阈值按商品价格比例设定：<5%优秀(绿)，5-10%良好(黄)，>10%需关注(红) */}
        {(() => {
          const mapeVal = overview.mape
          const mapeColor = mapeVal < 5 ? "emerald" : mapeVal < 10 ? "amber" : "red"
          const mapeBg = mapeColor === "emerald" ? "from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10" : mapeColor === "amber" ? "from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/10" : "from-red-50 to-rose-50 dark:from-red-500/10 dark:to-rose-500/10"
          const mapeBorder = mapeColor === "emerald" ? "border-emerald-200/50 dark:border-emerald-500/20" : mapeColor === "amber" ? "border-amber-200/50 dark:border-amber-500/20" : "border-red-200/50 dark:border-red-500/20"
          const mapeText = mapeColor === "emerald" ? "text-emerald-600 dark:text-emerald-400" : mapeColor === "amber" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
          const mapeIcon = mapeColor === "emerald" ? "text-emerald-600 dark:text-emerald-400" : mapeColor === "amber" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
          const mapeLabel = mapeColor === "emerald" ? "优秀" : mapeColor === "amber" ? "良好" : "需关注"
          const mapeExplain = mapeColor === "emerald" ? "预测偏差<5%，可直接参考" : mapeColor === "amber" ? "偏差5-10%，建议结合判断" : "偏差>10%，仅供参考趋势"
          return (
            <div className={`bg-gradient-to-br ${mapeBg} backdrop-blur-sm rounded-lg p-3 border ${mapeBorder}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm text-slate-500 dark:text-slate-400">MAPE <span className="text-xs text-slate-400">(误差百分比)</span></span>
                <Target className={`h-4 w-4 ${mapeIcon}`} />
              </div>
              <span className={`text-lg font-bold ${mapeText}`}>
                {mapeVal}%
              </span>
              <div className="flex items-center gap-1 mt-1">
                <span className={`text-xs px-1.5 py-0.5 rounded ${mapeColor === "emerald" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : mapeColor === "amber" ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"}`}>
                  {mapeLabel}
                </span>
                <span className="text-xs text-slate-400">{mapeExplain}</span>
              </div>
            </div>
          )
        })()}

        {/* MAE: 平均绝对误差。如 MAE=¥30 表示预测价与实际价平均每次偏差 30 元。
            阈值按硫磺价格(~940元/吨)设定：<30元优秀(绿)，30-60元良好(黄)，>60元需关注(红) */}
        {(() => {
          const maeVal = overview.mae
          const maeColor = maeVal < 30 ? "emerald" : maeVal < 60 ? "amber" : "red"
          const maeBg = maeColor === "emerald" ? "from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10" : maeColor === "amber" ? "from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/10" : "from-red-50 to-rose-50 dark:from-red-500/10 dark:to-rose-500/10"
          const maeBorder = maeColor === "emerald" ? "border-emerald-200/50 dark:border-emerald-500/20" : maeColor === "amber" ? "border-amber-200/50 dark:border-amber-500/20" : "border-red-200/50 dark:border-red-500/20"
          const maeText = maeColor === "emerald" ? "text-emerald-600 dark:text-emerald-400" : maeColor === "amber" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
          const maeIcon = maeColor === "emerald" ? "text-emerald-600 dark:text-emerald-400" : maeColor === "amber" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
          const maeLabel = maeColor === "emerald" ? "优秀" : maeColor === "amber" ? "良好" : "需关注"
          const maeExplain = maeColor === "emerald" ? "平均偏差<30元，精度高" : maeColor === "amber" ? "偏差30-60元，可参考" : "平均偏差>60元，仅看趋势"
          return (
            <div className={`bg-gradient-to-br ${maeBg} backdrop-blur-sm rounded-lg p-3 border ${maeBorder}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm text-slate-500 dark:text-slate-400">MAE <span className="text-xs text-slate-400">(每次偏差多少元)</span></span>
                <Activity className={`h-4 w-4 ${maeIcon}`} />
              </div>
              <span className={`text-lg font-bold ${maeText}`}>
                ¥{maeVal}
              </span>
              <div className="flex items-center gap-1 mt-1">
                <span className={`text-xs px-1.5 py-0.5 rounded ${maeColor === "emerald" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : maeColor === "amber" ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"}`}>
                  {maeLabel}
                </span>
                <span className="text-xs text-slate-400">{maeExplain}</span>
              </div>
            </div>
          )
        })()}

        {/* RMSE: 均方根误差。与 MAE 类似，但对特别大的偏差更敏感。
            比如某次预测偏差 200 元，RMSE 会放大这个影响。阈值：<40元优秀(绿)，40-80元良好(黄)，>80元需关注(红) */}
        {(() => {
          const rmseVal = overview.rmse
          const rmseColor = rmseVal < 40 ? "emerald" : rmseVal < 80 ? "amber" : "red"
          const rmseBg = rmseColor === "emerald" ? "from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10" : rmseColor === "amber" ? "from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/10" : "from-red-50 to-rose-50 dark:from-red-500/10 dark:to-rose-500/10"
          const rmseBorder = rmseColor === "emerald" ? "border-emerald-200/50 dark:border-emerald-500/20" : rmseColor === "amber" ? "border-amber-200/50 dark:border-amber-500/20" : "border-red-200/50 dark:border-red-500/20"
          const rmseText = rmseColor === "emerald" ? "text-emerald-600 dark:text-emerald-400" : rmseColor === "amber" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
          const rmseIcon = rmseColor === "emerald" ? "text-emerald-600 dark:text-emerald-400" : rmseColor === "amber" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
          const rmseLabel = rmseColor === "emerald" ? "优秀" : rmseColor === "amber" ? "良好" : "需关注"
          const rmseExplain = rmseColor === "emerald" ? "无异常大偏差，稳定可靠" : rmseColor === "amber" ? "偶有较大偏差，需注意" : "存在较大偏差，谨慎参考"
          return (
            <div className={`bg-gradient-to-br ${rmseBg} backdrop-blur-sm rounded-lg p-3 border ${rmseBorder}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm text-slate-500 dark:text-slate-400">RMSE <span className="text-xs text-slate-400">(大偏差放大)</span></span>
                <BarChart3 className={`h-4 w-4 ${rmseIcon}`} />
              </div>
              <span className={`text-lg font-bold ${rmseText}`}>
                ¥{rmseVal}
              </span>
              <div className="flex items-center gap-1 mt-1">
                <span className={`text-xs px-1.5 py-0.5 rounded ${rmseColor === "emerald" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : rmseColor === "amber" ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"}`}>
                  {rmseLabel}
                </span>
                <span className="text-xs text-slate-400">{rmseExplain}</span>
              </div>
            </div>
          )
        })()}

        {/* R²: 决定系数。衡量模型预测的可靠程度。
            1.0 = 完美预测，0.8-0.9 = 较可靠，<0 = 模型还不如直接取平均值。
            >0.9优秀(绿)，0.7-0.9良好(黄)，<0.7需关注(红) */}
        {(() => {
          const r2Val = overview.r2
          const r2Color = r2Val > 0.9 ? "emerald" : r2Val > 0.7 ? "amber" : "red"
          const r2Bg = r2Color === "emerald" ? "from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10" : r2Color === "amber" ? "from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/10" : "from-red-50 to-rose-50 dark:from-red-500/10 dark:to-rose-500/10"
          const r2Border = r2Color === "emerald" ? "border-emerald-200/50 dark:border-emerald-500/20" : r2Color === "amber" ? "border-amber-200/50 dark:border-amber-500/20" : "border-red-200/50 dark:border-red-500/20"
          const r2Text = r2Color === "emerald" ? "text-emerald-600 dark:text-emerald-400" : r2Color === "amber" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
          const r2Icon = r2Color === "emerald" ? "text-emerald-600 dark:text-emerald-400" : r2Color === "amber" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
          const r2Label = r2Color === "emerald" ? "优秀" : r2Color === "amber" ? "良好" : "需关注"
          const r2Explain = r2Val > 0.9 ? "预测非常可靠" : r2Val > 0.7 ? "预测较可靠" : r2Val > 0 ? "有一定参考价值" : "需积累更多数据训练"
          return (
            <div className={`bg-gradient-to-br ${r2Bg} backdrop-blur-sm rounded-lg p-3 border ${r2Border}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm text-slate-500 dark:text-slate-400">R² <span className="text-xs text-slate-400">(预测可靠度)</span></span>
                <TrendingUp className={`h-4 w-4 ${r2Icon}`} />
              </div>
              <span className={`text-lg font-bold ${r2Text}`}>
                {r2Val}
              </span>
              <div className="flex items-center gap-1 mt-1">
                <span className={`text-xs px-1.5 py-0.5 rounded ${r2Color === "emerald" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : r2Color === "amber" ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"}`}>
                  {r2Label}
                </span>
                <span className="text-xs text-slate-400">{r2Explain}</span>
              </div>
            </div>
          )
        })()}
      </div>

      {/* 精度说明 */}
      <div className="mb-4 px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          <span className="font-medium text-slate-600 dark:text-slate-300">指标说明：</span>
          绿色 = 精度高可直接参考，黄色 = 有一定偏差建议结合判断，红色 = 偏差较大仅看趋势方向。
          当前模型训练数据有限，精度会随数据积累逐步提升。R² 为负数表示模型尚未优于简单平均值预测，属于训练初期的正常现象。
        </p>
      </div>

      {/* 融合预测展示 */}
      {combinedData && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              融合预测（ARIMA+XGBoost + PatchTST）
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300">
              动态权重
            </span>
          </div>

          {/* 权重和 Regime 状态 */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 rounded-lg p-3 border border-violet-200/50 dark:border-violet-500/20">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">ARIMA+XGBoost 权重</div>
              <div className="text-lg font-bold text-violet-600 dark:text-violet-400">
                {(combinedData.weights.arima_xgb * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-slate-400 mt-1">MAPE: {combinedData.model_metrics.arima_mape}%</div>
            </div>

            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-500/10 dark:to-blue-500/10 rounded-lg p-3 border border-cyan-200/50 dark:border-cyan-500/20">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">PatchTST 权重</div>
              <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                {(combinedData.weights.transformer * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-slate-400 mt-1">MAPE: {combinedData.model_metrics.transformer_mape}%</div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 rounded-lg p-3 border border-amber-200/50 dark:border-amber-500/20">
              <div className="flex items-center gap-1 mb-1">
                <Shield className="h-3 w-3" />
                <span className="text-xs text-slate-500 dark:text-slate-400">市场状态</span>
              </div>
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {combinedData.regime === "low" ? "低波动" : combinedData.regime === "high" ? "高波动" : "正常"}
              </div>
              <div className="text-xs text-slate-400 mt-1">风险系数: {combinedData.risk_adjustment}</div>
            </div>
          </div>

          {/* 融合预测图表 */}
          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-slate-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  未来 7 天价格预测对比
                </h4>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                combinedData.weights.transformer > combinedData.weights.arima_xgb
                  ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300"
              }`}>
                主导模型: {combinedData.weights.transformer > combinedData.weights.arima_xgb ? "PatchTST (Transformer)" : "ARIMA+XGBoost"}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={combinedData.predictions}>
                <defs>
                  <linearGradient id="combinedConfidenceBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                  formatter={(value, name) => {
                    const numValue = Number(value)
                    const label = String(name)
                    if (label === "置信区间上界" || label === "置信区间下界") return [numValue.toFixed(2), label]
                    return [`¥${numValue.toFixed(2)}`, label]
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="upper_bound"
                  stroke="none"
                  fill="url(#combinedConfidenceBand)"
                  name="置信区间上界"
                />
                <Area
                  type="monotone"
                  dataKey="lower_bound"
                  stroke="none"
                  fill="url(#combinedConfidenceBand)"
                  name="置信区间下界"
                />
                <Line
                  type="monotone"
                  dataKey="arima_component"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: "#06b6d4" }}
                  name="ARIMA+XGBoost"
                />
                <Line
                  type="monotone"
                  dataKey="transformer_component"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={{ r: 3, fill: "#10b981" }}
                  name="PatchTST (Transformer)"
                />
                <Line
                  type="monotone"
                  dataKey="predicted_price"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#8b5cf6" }}
                  name="融合预测"
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 text-center">
              当前价格: ¥{combinedData.current_price.toFixed(2)} | 预测趋势: {combinedData.trend} ({combinedData.change_percent > 0 ? "+" : ""}{combinedData.change_percent.toFixed(2)}%)
            </div>

            {/* 逐日预测明细表 */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    <th className="text-left py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">日期</th>
                    <th className="text-right py-2 px-2 text-cyan-600 dark:text-cyan-400 font-medium">ARIMA+XGBoost</th>
                    <th className="text-right py-2 px-2 text-emerald-600 dark:text-emerald-400 font-medium">PatchTST (Transformer)</th>
                    <th className="text-right py-2 px-2 text-violet-600 dark:text-violet-400 font-medium">融合预测</th>
                    <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400 font-medium">置信区间</th>
                  </tr>
                </thead>
                <tbody>
                  {combinedData.predictions.map((p, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300">{p.date.slice(5)}</td>
                      <td className="py-1.5 px-2 text-right text-cyan-700 dark:text-cyan-300">¥{p.arima_component.toFixed(2)}</td>
                      <td className="py-1.5 px-2 text-right text-emerald-700 dark:text-emerald-300">¥{p.transformer_component.toFixed(2)}</td>
                      <td className="py-1.5 px-2 text-right font-semibold text-violet-700 dark:text-violet-300">¥{p.predicted_price.toFixed(2)}</td>
                      <td className="py-1.5 px-2 text-right text-slate-400">¥{p.lower_bound.toFixed(0)} ~ ¥{p.upper_bound.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 主图表区域 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* 预测 vs 实际对比 */}
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t("accuracy.chartTitle.predictedVsActual")}
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={historicalPredictions}>
              <defs>
                <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="upperBound"
                stroke="none"
                fill="url(#confidenceBand)"
                name={t("accuracy.chart.confidenceInterval")}
              />
              <Area
                type="monotone"
                dataKey="lowerBound"
                stroke="none"
                fill="url(#confidenceBand)"
                name=""
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
                name={t("accuracy.chart.actualPrice")}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name={t("accuracy.chart.predictedPrice")}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* MAPE 趋势 */}
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t("accuracy.chartTitle.mapeTrend")}
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={accuracyTrend}>
              <defs>
                <linearGradient id="mapeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} domain={[0, "auto"]} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                }}
                formatter={(value, name) => {
                  if (name === "MAPE") return [`${value}%`, "MAPE"]
                  return [value, name]
                }}
              />
              <Line
                type="monotone"
                dataKey="mape"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#10b981" }}
                name="MAPE"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 按企业精度分布 */}
      {byEnterprise.length > 0 && (
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t("accuracy.byEnterprise")}
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {byEnterprise.map((enterprise, idx) => (
              <EnterpriseAccuracyCard key={enterprise.code} enterprise={enterprise} index={idx} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
