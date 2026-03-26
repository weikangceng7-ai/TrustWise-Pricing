import * as fs from 'fs'
import * as path from 'path'
import { enterprises, Enterprise } from '../src/data/enterprises'

const publicDataPath = path.join(__dirname, '..', 'public', 'data')
if (!fs.existsSync(publicDataPath)) {
  fs.mkdirSync(publicDataPath, { recursive: true })
}

const jsonData = {
  version: "1.0.0",
  lastUpdated: new Date().toISOString().split('T')[0],
  dataSource: "中国化工企业100强榜单、全球化工企业50强榜单、中国化肥企业100强榜单、中国精细化工百强榜单",
  totalEnterprises: enterprises.length,
  industries: [...new Set(enterprises.map(e => e.industry))],
  provinces: [...new Set(enterprises.map(e => e.province))],
  enterprises: enterprises.map((e: Enterprise) => ({
    id: e.id,
    name: e.name,
    shortName: e.shortName,
    industry: e.industry,
    province: e.province,
    city: e.city,
    listed: e.listed,
    stockCode: e.stockCode || null,
    mainProducts: e.mainProducts,
    revenue: e.revenue || null,
    employees: e.employees || null,
    founded: e.founded || null,
    website: e.website || null,
    description: e.description
  }))
}

const outputPath = path.join(publicDataPath, 'enterprises.json')
fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8')

console.log(`JSON数据文件已生成: ${outputPath}`)
console.log(`共 ${enterprises.length} 家企业数据`)
console.log(`行业分类: ${jsonData.industries.length} 个`)
console.log(`省份分布: ${jsonData.provinces.length} 个`)
