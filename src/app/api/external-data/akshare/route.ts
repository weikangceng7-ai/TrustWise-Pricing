import { NextResponse } from "next/server"

/**
 * AkShare 数据 API
 * 文档：https://akshare.akfamily.xyz/
 * 无需 API 密钥
 */

export const maxDuration = 30

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "oil"

  try {
    // AkShare 需要在 Python 环境中运行
    // 这里返回模拟数据，实际部署时可以使用 Python 微服务或直接调用
    const mockData = getMockData(type)

    return NextResponse.json({
      success: true,
      source: "AkShare",
      type: type,
      data: mockData,
      timestamp: new Date().toISOString(),
      note: "模拟数据，实际部署需配置 Python 环境调用 AkShare"
    })
  } catch (error) {
    console.error("AkShare API error:", error)
    return NextResponse.json(
      { success: false, error: "获取数据失败" },
      { status: 500 }
    )
  }
}

function getMockData(type: string) {
  const basePrice = {
    oil: 75.5,      // WTI 原油
    brent: 79.2,    // 布伦特原油
    usdcny: 7.24,   // 美元人民币汇率
    bdi: 1650,      // 波罗的海干散货指数
  }

  const now = new Date()
  const data = []

  // 生成最近30天的模拟数据
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    const baseValue = basePrice[type as keyof typeof basePrice] || 100
    const fluctuation = (Math.random() - 0.5) * baseValue * 0.1

    data.push({
      date: date.toISOString().split("T")[0],
      value: Number((baseValue + fluctuation).toFixed(2)),
      change: Number(((Math.random() - 0.5) * 5).toFixed(2)),
      changePercent: Number(((Math.random() - 0.5) * 3).toFixed(2))
    })
  }

  return {
    name: getTypeName(type),
    unit: getUnit(type),
    latest: data[data.length - 1],
    history: data
  }
}

function getTypeName(type: string): string {
  const names: Record<string, string> = {
    oil: "WTI原油期货",
    brent: "布伦特原油期货",
    usdcny: "美元人民币汇率",
    bdi: "波罗的海干散货指数"
  }
  return names[type] || type
}

function getUnit(type: string): string {
  const units: Record<string, string> = {
    oil: "美元/桶",
    brent: "美元/桶",
    usdcny: "人民币/美元",
    bdi: "点"
  }
  return units[type] || ""
}