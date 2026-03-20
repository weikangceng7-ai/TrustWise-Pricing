"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  FileSpreadsheet,
  FileText,
  ImageIcon,
  BookMarked,
  Database,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useYihuaKnowledge } from "@/hooks/use-yihua-knowledge"

export function YihuaKnowledgePanel() {
  const { data, isLoading, error } = useYihuaKnowledge()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>宜化知识库</CardTitle>
          <CardDescription>无法加载知识库统计，请稍后重试。</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const { totals, literatureByYear, recentLiteratureSamples, literatureLang, source } = data
  const yearBars = literatureByYear.slice(0, 8)
  const maxCount = Math.max(1, ...yearBars.map((y) => y.count))

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <CardTitle className="text-lg">宜化知识库</CardTitle>
          <span className="text-xs text-muted-foreground">
            来源：{source === "database" ? "数据库" : "本地清单"}
            {data.generatedAt ? ` · ${new Date(data.generatedAt).toLocaleDateString("zh-CN")}` : ""}
          </span>
        </div>
        <CardDescription>
          资料、图表与文献已预处理（年份/语言）；将静态文件放到{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">public/yihua/</code>{" "}
          下即可通过链接访问。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            icon={FileText}
            label="方案/文档"
            value={totals.documents}
            sub="docx"
          />
          <StatTile
            icon={FileSpreadsheet}
            label="数据表"
            value={totals.spreadsheets}
            sub="xlsx"
          />
          <StatTile
            icon={ImageIcon}
            label="图表"
            value={totals.images + totals.diagrams}
            sub={`${totals.images} 图 · ${totals.diagrams} 图示`}
          />
          <StatTile
            icon={BookMarked}
            label="文献 PDF"
            value={totals.pdfs}
            sub={`中文 ${literatureLang.zh} · 外文 ${literatureLang.en}`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Database className="h-4 w-4" />
              文献年份分布（近若干年有标注的样本）
            </div>
            {yearBars.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无解析到年份的文献条目。</p>
            ) : (
              <ul className="space-y-2">
                {yearBars.map(({ year, count }) => (
                  <li key={year} className="flex items-center gap-3 text-sm">
                    <span className="w-12 tabular-nums text-muted-foreground">{year}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/80"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right tabular-nums">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 text-sm font-medium text-muted-foreground">近年文献（示例）</div>
            <ul className="max-h-[220px] space-y-2 overflow-y-auto pr-1 text-sm">
              {recentLiteratureSamples.map((item) => (
                <li key={item.publicPath} className="truncate">
                  <Link
                    href={item.publicPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    {item.name.replace(/\.pdf$/i, "")}
                  </Link>
                  {item.year != null && (
                    <span className="ml-2 text-xs text-muted-foreground">{item.year}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatTile(props: {
  icon: LucideIcon
  label: string
  value: number
  sub: string
}) {
  const Icon = props.icon
  return (
    <div className="flex flex-col rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-xs font-medium">{props.label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{props.value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{props.sub}</p>
    </div>
  )
}
