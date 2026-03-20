import { YihuaCodeKnowledgeGraph } from "@/components/yihua-code-graph"

export default function YihuaCodeGraphPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">代码知识图谱</h2>
        <p className="text-muted-foreground">动态关系视图：目录-文件映射（支持搜索与类型筛选）</p>
      </div>
      <YihuaCodeKnowledgeGraph />
    </div>
  )
}

