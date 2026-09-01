"use client"

import { YihuaCodeKnowledgeGraph } from "@/components/yihua-code-graph"
import { useLanguage } from "@/contexts/language-context"

export default function YihuaCodeGraphPage() {
  const { t } = useLanguage()
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("codeGraphPage.title")}</h2>
        <p className="text-muted-foreground">{t("codeGraphPage.desc")}</p>
      </div>
      <YihuaCodeKnowledgeGraph />
    </div>
  )
}

