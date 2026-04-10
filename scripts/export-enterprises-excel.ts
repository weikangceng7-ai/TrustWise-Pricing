import * as XLSX from 'xlsx'
import * as path from 'path'
import { enterprises, Enterprise } from '../src/data/enterprises'

const desktopPath = path.join(process.env.USERPROFILE || process.env.HOME || '', 'Desktop')
const outputPath = path.join(desktopPath, '化工企业100强数据.xlsx')

const excelData = enterprises.map((e: Enterprise) => ({
  '企业ID': e.id,
  '企业全称': e.name,
  '企业简称': e.shortName,
  '行业分类': e.industry,
  '省份': e.province,
  '城市': e.city,
  '是否上市': e.listed ? '是' : '否',
  '股票代码': e.stockCode || '',
  '主要产品': e.mainProducts.join('、'),
  '营收(百万元)': e.revenue || '',
  '员工数': e.employees || '',
  '成立年份': e.founded || '',
  '官方网站': e.website || '',
  '企业描述': e.description
}))

const ws = XLSX.utils.json_to_sheet(excelData)

ws['!cols'] = [
  { wch: 15 },
  { wch: 35 },
  { wch: 12 },
  { wch: 12 },
  { wch: 8 },
  { wch: 10 },
  { wch: 10 },
  { wch: 12 },
  { wch: 30 },
  { wch: 15 },
  { wch: 10 },
  { wch: 10 },
  { wch: 30 },
  { wch: 40 }
]

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, '化工企业100强')

XLSX.writeFile(wb, outputPath)

console.log(`Excel文件已生成: ${outputPath}`)
console.log(`共 ${enterprises.length} 家企业数据`)
