import { NextResponse } from 'next/server'
import { enterprises } from '@/data/enterprises'

export async function GET() {
  const industries = [...new Set(enterprises.map(e => e.industry))]
  const provinces = [...new Set(enterprises.map(e => e.province))]
  const listedCount = enterprises.filter(e => e.listed).length
  
  const stats = {
    total: enterprises.length,
    listed: listedCount,
    unlisted: enterprises.length - listedCount,
    industries: industries.length,
    provinces: provinces.length
  }
  
  const industryStats = industries.map(industry => ({
    industry,
    count: enterprises.filter(e => e.industry === industry).length,
    totalRevenue: enterprises
      .filter(e => e.industry === industry && e.revenue)
      .reduce((sum, e) => sum + (e.revenue || 0), 0)
  }))
  
  const provinceStats = provinces.map(province => ({
    province,
    count: enterprises.filter(e => e.province === province).length
  }))
  
  return NextResponse.json({
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),
    dataSource: "示例数据（企业信息已匿名化处理，不对应任何真实企业）",
    stats,
    industryStats,
    provinceStats,
    enterprises
  })
}
