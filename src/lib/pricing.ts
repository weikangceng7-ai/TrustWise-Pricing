// src/lib/pricing.ts

export interface PricingPlan {
  id: string
  name: string
  description: string
  price: number         // 人民币（元）
  quotaAmount: number   // API 调用额度
  features: string[]
  highlighted?: boolean
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "入门版",
    description: "适合个人开发者和小型项目",
    price: 99,
    quotaAmount: 10000,
    features: [
      "10,000 次 API 调用/月",
      "基础价格预测接口",
      "市场数据查询",
      "邮件支持",
    ],
  },
  {
    id: "professional",
    name: "专业版",
    description: "适合中小型企业和分析团队",
    price: 499,
    quotaAmount: 100000,
    features: [
      "100,000 次 API 调用/月",
      "高级价格预测 + 置信区间",
      "企业决策建议",
      "供需动态分析",
      "港口库存数据",
      "优先技术支持",
    ],
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "企业版",
    description: "适合大型企业和批量采购需求",
    price: 1999,
    quotaAmount: 500000,
    features: [
      "500,000 次 API 调用/月",
      "全部 API 接口",
      "定制化预测模型",
      "专属客户经理",
      "SLA 保障 99.9%",
      "私有化部署可选",
      "7×24 小时技术支持",
    ],
  },
]

export function getPlanById(id: string): PricingPlan | undefined {
  return PRICING_PLANS.find((p) => p.id === id)
}
