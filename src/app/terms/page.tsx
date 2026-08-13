import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="container mx-auto px-4 py-4">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>
      </div>

      <div className="container mx-auto px-4 pb-16 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">用户协议</h1>
        <p className="text-sm text-muted-foreground mb-8">更新日期：2026年8月5日</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. 服务说明</h2>
            <p>硫磺督价与采购智能决策系统（以下简称&ldquo;本服务&rdquo;）提供硫磺市场价格预测、采购决策建议、市场趋势分析等数据智能服务。使用本服务即表示您同意本协议条款。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. 账户管理</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>您需提供真实、准确的注册信息。</li>
              <li>您对账户下的一切活动负责，包括 API Key 的使用。</li>
              <li>禁止转售、共享或转让账户。</li>
              <li>我们保留因违反协议而暂停或终止账户的权利。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. 付费与退款</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>服务按套餐定价收费，价格可能调整，调整前将提前通知。</li>
              <li>API 调用额度按自然月计算，过期不累积。</li>
              <li>支付后 7 天内且未使用超过 10% 额度的，可申请全额退款。</li>
              <li>退款申请请联系：sales@sulfur-agent.com</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. 使用限制</h2>
            <p>使用本服务时，您不得：</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>违反适用法律法规</li>
              <li>进行反向工程或试图获取源代码</li>
              <li>利用本服务进行自动化攻击或恶意爬取</li>
              <li>超过合理使用范围（单 Key 每分钟 100 次请求）</li>
              <li>上传或传播恶意代码</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. 知识产权</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>本服务的软件、算法、数据和文档的知识产权归我方所有。</li>
              <li>您通过本服务产生的分析报告和建议，知识产权归您所有。</li>
              <li>您授予我方为提供服务而处理您数据的非独占许可。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. 免责声明</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>本服务提供的价格预测和建议仅供参考，不构成投资或采购决策的唯一依据。</li>
              <li>我们不保证服务的无中断或无错误运行。</li>
              <li>因不可抗力、第三方服务故障等导致的损失，我方不承担责任。</li>
              <li>责任上限为您在过去 12 个月支付的费用总额。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. 协议变更</h2>
            <p>我们可能更新本协议。重大变更将提前 30 天通过邮件通知。继续使用服务视为接受变更。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. 适用法律与争议解决</h2>
            <p>本协议受中华人民共和国法律管辖。争议应通过友好协商解决；协商不成的，提交有管辖权的人民法院裁决。</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. 联系方式</h2>
            <p>法律相关事务请联系：legal@sulfur-agent.com</p>
          </section>
        </div>
      </div>
    </div>
  )
}
