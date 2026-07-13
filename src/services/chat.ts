/**
 * 聊天服务
 *
 * @deprecated 客户端 mock 聊天已被 /api/v1/chat 取代。
 * 仅在 NEXT_PUBLIC_USE_MOCK_CHAT=true 时使用 mock 回复。
 */

// 预设的 AI 回复模板（仅开发调试用）
const mockResponses: Record<string, string> = {
  default: `根据最新的市场数据分析，我的建议如下：

**价格趋势分析**
- 近期硫磺价格呈现稳步上涨趋势
- 中东地区运费波动是影响价格的主要因素之一
- 国内需求保持稳定，但进口量有所下降

**库存建议**
- 当前库存水平处于中等偏低状态
- 建议在价格回调时适当增加库存`,

  inventory: `关于库存管理的建议：

**当前库存状态**
- 您的当前库存约为 15 天用量
- 建议安全库存为 20-25 天用量

**备库建议**
- 建议在未来一周内补充约 500 吨库存
- 可考虑分批采购，降低单次采购风险`,

  price: `关于硫磺价格走势的分析：

**价格预测**
- 短期（1-2周）：预计继续上涨 3-5%
- 中期（1个月）：可能在 900-920 元/吨区间震荡
- 长期（3个月）：需关注新产能投放情况`,
}

const keywordMappings: Array<{ keywords: string[]; response: string }> = [
  { keywords: ["库存", "备库", "囤货", "库存管理"], response: mockResponses.inventory },
  { keywords: ["价格", "走势", "涨价", "跌价", "预测"], response: mockResponses.price },
]

/** @deprecated 使用 /api/v1/chat 获取 AI 驱动的聊天回复 */
export async function getChatResponseMock(question: string, delay = 1000): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, delay))

  const lowerQuestion = question.toLowerCase()
  for (const mapping of keywordMappings) {
    if (mapping.keywords.some((keyword) => lowerQuestion.includes(keyword))) {
      return mapping.response
    }
  }
  return mockResponses.default
}

/**
 * 聊天回复（自动判断用真实 API 还是 mock）
 */
export async function getChatResponse(question: string, delay = 1000): Promise<string> {
  if (process.env.NEXT_PUBLIC_USE_MOCK_CHAT === "true") {
    return getChatResponseMock(question, delay)
  }

  // 调用真实 API
  try {
    const res = await fetch("/api/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: question }),
    })

    if (!res.ok) {
      throw new Error(`API 返回 ${res.status}`)
    }

    const data = await res.json()
    return data.message || data.answer || "抱歉，暂时无法回复。"
  } catch (e) {
    console.warn("聊天 API 不可用，使用 mock 回复:", e)
    return getChatResponseMock(question, delay)
  }
}

export interface ChatRequest {
  question: string
  context?: string
}

export interface ChatResponse {
  answer: string
  timestamp: string
}
