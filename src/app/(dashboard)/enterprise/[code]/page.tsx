import { EnterpriseDetail } from "@/components/enterprise-detail"
import { notFound } from "next/navigation"

const validEnterprises = ["yihua", "luxi", "jinzhengda"]

export function generateStaticParams() {
  return validEnterprises.map((code) => ({
    code: code,
  }))
}

export default async function EnterprisePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  if (!validEnterprises.includes(code)) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a1a] p-6">
      <EnterpriseDetail enterpriseCode={code as "yihua" | "luxi" | "jinzhengda"} />
    </div>
  )
}