import { YihuaCodeKnowledgeGraph } from "@/components/yihua-code-graph"

export default function YihuaCodeGraphPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">价格预测知识图谱</h2>
        <p className="text-muted-foreground">第一阶段：市场资讯库、企业经验库、制度规则库</p>
      </div>
      <YihuaCodeKnowledgeGraph />
    </div>
  )
}

