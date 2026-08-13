import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="container mx-auto px-4 py-4">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>
      </div>

      <div className="container mx-auto px-4 pb-16 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">隐私政策</h1>
        <p className="text-sm text-muted-foreground mb-8">更新日期：2026年8月5日</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. 信息收集</h2>
            <p>我们收集以下类型的信息：</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>账户信息：</strong>注册时提供的邮箱地址、手机号码、企业名称。</li>
              <li><strong>使用数据：</strong>API 调用记录、功能使用频率、页面访问记录。</li>
              <li><strong>设备信息：</strong>IP 地址、浏览器类型、操作系统版本。</li>
              <li><strong>支付信息：</strong>订单记录、发票信息。支付卡号由 Stripe 直接处理，我们不存储完整卡号。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. 信息使用</h2>
            <p>我们使用收集的信息用于：</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>提供、维护和改进我们的服务</li>
              <li>处理订单和支付</li>
              <li>发送服务相关通知（如配额预警、系统更新）</li>
              <li>检测和防止欺诈、滥用</li>
              <li>遵守法律义务</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. 数据存储与安全</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>数据存储于 PostgreSQL（Neon）和 Neo4j 图数据库。</li>
              <li>传输过程使用 TLS 加密。</li>
              <li>密码使用 bcrypt 哈希存储，不可逆。</li>
              <li>我们采取合理的技术措施保护您的数据，但不能保证绝对安全。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. 数据共享</h2>
            <p>我们不会出售您的个人信息。在以下情况下可能共享数据：</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>服务提供商：</strong>支付处理（Stripe）、邮件发送（Resend）、错误追踪（Sentry）。</li>
              <li><strong>法律要求：</strong>应法院命令或法律程序要求披露。</li>
              <li><strong>业务转移：</strong>公司合并、收购或资产出售时。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. 用户权利</h2>
            <p>根据《中华人民共和国个人信息保护法》，您有权：</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>查阅、更正您的个人信息</li>
              <li>删除您的账户和数据</li>
              <li>撤回同意（不影响撤回前基于同意的处理）</li>
              <li>投诉至监管机构</li>
            </ul>
            <p className="mt-2">行使上述权利请联系：<strong>privacy@sulfur-agent.com</strong></p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Cookie 政策</h2>
            <p>我们使用必要的 Cookie 用于：</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>会话管理（登录状态保持）</li>
              <li>安全防护（CSRF Token）</li>
            </ul>
            <p>我们不使用第三方广告或追踪 Cookie。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. 政策更新</h2>
            <p>我们可能会不时更新本隐私政策。重大变更将通过电子邮件或系统通知告知。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. 联系方式</h2>
            <p>如有隐私相关问题，请联系：</p>
            <p>邮箱：privacy@sulfur-agent.com</p>
          </section>
        </div>
      </div>
    </div>
  )
}
