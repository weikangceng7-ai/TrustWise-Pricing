"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Bell, Layers, Target } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getBackgroundImage } from "@/config/images"
import { TrackerPanel } from "@/components/market-analysis/tracker-panel"
import { CommoditiesPanel } from "@/components/market-analysis/commodities-panel"
import { AccuracyPanel } from "@/components/market-analysis/accuracy-panel"

const TAB_KEYS = ["tracker", "commodities", "accuracy"] as const
type TabKey = (typeof TAB_KEYS)[number]

function MarketAnalysisContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const initialTab: TabKey = TAB_KEYS.includes(tabParam as TabKey) ? (tabParam as TabKey) : "tracker"
  const [tab, setTab] = useState<TabKey>(initialTab)
  const bgImage = getBackgroundImage("dashboardBackground")

  const handleTabChange = (value: string) => {
    setTab(value as TabKey)
    router.replace(`/market-analysis?tab=${value}`, { scroll: false })
  }

  return (
    <div className="min-h-screen relative overflow-hidden pb-16 bg-slate-50 dark:bg-[#0a0a1a]">
      {/* 背景图片 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      {/* 背景遮罩层 */}
      <div className="absolute inset-0 bg-white/80 dark:bg-[#0a0a1a]/80 backdrop-blur-sm" />

      {/* 背景渐变和光晕效果 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-300/30 dark:bg-purple-600/20 blur-[120px] rounded-full" />
        <div className="absolute top-20 right-0 w-[300px] h-[300px] bg-blue-200/30 dark:bg-blue-500/15 blur-[100px] rounded-full" />
      </div>

      <div className="relative px-4 pt-4 pb-3 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">市场分析</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">价格追踪、品种对比与模型精度评估</p>
          </div>
        </div>

        {/* Tab 切换 */}
        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList className="mb-3">
            <TabsTrigger value="tracker" className="gap-1.5 px-3">
              <Bell className="h-3.5 w-3.5" />
              Tracker 追踪
            </TabsTrigger>
            <TabsTrigger value="commodities" className="gap-1.5 px-3">
              <Layers className="h-3.5 w-3.5" />
              品种对比
            </TabsTrigger>
            <TabsTrigger value="accuracy" className="gap-1.5 px-3">
              <Target className="h-3.5 w-3.5" />
              模型精度
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracker">
            <TrackerPanel />
          </TabsContent>
          <TabsContent value="commodities">
            <CommoditiesPanel />
          </TabsContent>
          <TabsContent value="accuracy">
            <AccuracyPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default function MarketAnalysisPage() {
  return (
    <Suspense fallback={null}>
      <MarketAnalysisContent />
    </Suspense>
  )
}
