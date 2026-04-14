import { EnterpriseDetail } from "@/components/enterprise-detail"
import { ENTERPRISE_CONFIGS } from "@/services/enterprise-knowledge-config"

// 静态企业用于预构建
const staticEnterpriseCodes = ENTERPRISE_CONFIGS.map(e => e.code)

export function generateStaticParams() {
  return staticEnterpriseCodes.map((code) => ({
    code: code,
  }))
}

export default async function EnterprisePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  // 不再限制企业 code，任何 code 都可访问
  // EnterpriseDetail 组件会处理不存在的情况
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a1a] p-6">
      <EnterpriseDetail enterpriseCode={code} />
    </div>
  )
}