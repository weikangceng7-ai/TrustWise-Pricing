// 预设的 AI 回复模板
const mockResponses: Record<string, string> = {
  default: `根据最新的市场数据分析，我的建议如下：

**价格趋势分析**
- 近期硫磺价格呈现稳步上涨趋势，从月初的 850 元/吨上涨至目前的 900 元/吨
- 中东地区运费波动是影响价格的主要因素之一
- 国内需求保持稳定，但进口量有所下降

**库存建议**
- 当前库存水平处于中等偏低状态
- 建议在价格回调时适当增加库存
- 预计下周价格可能上涨 3-5%

**风险提示**
- 需关注国际原油价格变动
- 中东地区地缘政治风险需持续监控
- 建议与供应商保持密切沟通，及时调整采购策略`,

  inventory: `关于库存管理的建议：

**当前库存状态**
- 您的当前库存约为 15 天用量
- 建议安全库存为 20-25 天用量

**备库建议**
- 建议在未来一周内补充约 500 吨库存
- 可考虑分批采购，降低单次采购风险
- 建议锁定 3 个月期合约价格

**成本分析**
- 按当前价格计算，补充库存成本约 45 万元
- 若延后采购，可能面临 5-8% 的价格上涨风险`,

  price: `关于硫磺价格走势的分析：

**近期价格变化**
- 本周均价：885 元/吨
- 较上周上涨：4.7%
- 较上月上涨：8.2%

**影响因素**
1. 中东运费上涨 12%
2. 国内磷肥需求增加
3. 环保检查导致部分产能受限

**价格预测**
- 短期（1-2周）：预计继续上涨 3-5%
- 中期（1个月）：可能在 900-920 元/吨区间震荡
- 长期（3个月）：需关注新产能投放情况`,
}

// 关键词匹配规则
const keywordMappings: Array<{ keywords: string[]; response: string }> = [
  { keywords: ["库存", "备库", "囤货", "库存管理"], response: mockResponses.inventory },
  { keywords: ["价格", "走势", "涨价", "跌价", "预测"], response: mockResponses.price },
]

/**
 * 模拟 AI 聊天回复
 * @param question 用户提问
 * @param delay 延迟时间（毫秒），默认 1000ms
 */
export async function getChatResponse(question: string, delay = 1000): Promise<string> {
  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, delay))

  // 根据关键词匹配合适的回复
  const lowerQuestion = question.toLowerCase()

  for (const mapping of keywordMappings) {
    if (mapping.keywords.some((keyword) => lowerQuestion.includes(keyword))) {
      return mapping.response
    }
  }

  // 默认回复
  return mockResponses.default
}

/**
 * 聊天请求类型
 */
export interface ChatRequest {
  question: string
  context?: string
}

/**
 * 聊天响应类型
 */
export interface ChatResponse {
  answer: string
  timestamp: string
}
