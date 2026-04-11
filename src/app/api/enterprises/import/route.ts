import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { enterprises } from '@/db/schema'
import { eq } from 'drizzle-orm'

interface EnterpriseImportData {
  code: string
  name: string
  location?: string
  province?: string
  capacity?: number
  transportMode?: 'water' | 'rail' | 'road'
  mainProducts?: string[]
  customerRegions?: string[]
  inventoryStrategy?: 'aggressive' | 'moderate' | 'conservative'
  description?: string
  tailwindColor?: string
  shortDescription?: string
  basePrice?: number
  volatility?: number
  trend?: number
  modelAccuracy?: number
  currentStock?: number
  maxCapacity?: number
  safetyDays?: number
  avgConsumption?: number
  turnoverRate?: number
  lastPurchaseDate?: string
  nextPurchaseDate?: string
  supplierCount?: number
  portDistance?: number
}

function parseExcelRow(row: Record<string, string | number | undefined>): EnterpriseImportData | null {
  if (!row['企业代码'] && !row['code']) return null
  
  const parseStringArray = (value: string | number | undefined): string[] => {
    if (!value) return []
    return String(value).split(/[,，、;；]/).map(s => s.trim()).filter(Boolean)
  }
  
  return {
    code: String(row['企业代码'] || row['code'] || ''),
    name: String(row['企业名称'] || row['name'] || ''),
    location: row['所在地区'] || row['location'] ? String(row['所在地区'] || row['location']) : undefined,
    province: row['省份'] || row['province'] ? String(row['省份'] || row['province']) : undefined,
    capacity: Number(row['产能(万吨/年)'] || row['capacity']) || undefined,
    transportMode: (row['运输方式'] || row['transportMode']) as 'water' | 'rail' | 'road' | undefined,
    mainProducts: parseStringArray(row['主要产品'] || row['mainProducts']),
    customerRegions: parseStringArray(row['客户区域'] || row['customerRegions']),
    inventoryStrategy: (row['库存策略'] || row['inventoryStrategy']) as 'aggressive' | 'moderate' | 'conservative' | undefined,
    description: row['企业描述'] || row['description'] ? String(row['企业描述'] || row['description']) : undefined,
    tailwindColor: row['UI颜色'] || row['tailwindColor'] ? String(row['UI颜色'] || row['tailwindColor']) : 'cyan',
    shortDescription: row['简短描述'] || row['shortDescription'] ? String(row['简短描述'] || row['shortDescription']) : undefined,
    basePrice: Number(row['基准价格'] || row['basePrice']) || undefined,
    volatility: Number(row['波动幅度'] || row['volatility']) || undefined,
    trend: Number(row['趋势'] || row['trend']) || undefined,
    modelAccuracy: Number(row['模型准确率'] || row['modelAccuracy']) || undefined,
    currentStock: Number(row['当前库存(吨)'] || row['currentStock']) || undefined,
    maxCapacity: Number(row['最大仓储能力(吨)'] || row['maxCapacity']) || undefined,
    safetyDays: Number(row['安全库存天数'] || row['safetyDays']) || undefined,
    avgConsumption: Number(row['日均消耗量(吨/天)'] || row['avgConsumption']) || undefined,
    turnoverRate: Number(row['年周转次数'] || row['turnoverRate']) || undefined,
    lastPurchaseDate: row['上次采购日期'] || row['lastPurchaseDate'] ? String(row['上次采购日期'] || row['lastPurchaseDate']) : undefined,
    nextPurchaseDate: row['预计下次采购日期'] || row['nextPurchaseDate'] ? String(row['预计下次采购日期'] || row['nextPurchaseDate']) : undefined,
    supplierCount: Number(row['供应商数量'] || row['supplierCount']) || undefined,
    portDistance: Number(row['距港口距离(公里)'] || row['portDistance']) || undefined,
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: '数据库未连接' }, { status: 500 })
    }

    const body = await request.json()
    const { enterprises: enterpriseList, mode = 'create' } = body as { 
      enterprises: EnterpriseImportData[] 
      mode?: 'create' | 'update' | 'upsert' 
    }
    
    if (!enterpriseList || !Array.isArray(enterpriseList)) {
      return NextResponse.json({ error: '无效的企业数据' }, { status: 400 })
    }

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as { code: string; error: string }[],
    }

    for (const data of enterpriseList) {
      try {
        if (!data.code || !data.name) {
          results.skipped++
          results.errors.push({ code: data.code || 'unknown', error: '缺少企业代码或名称' })
          continue
        }

        const existing = await db
          .select()
          .from(enterprises)
          .where(eq(enterprises.code, data.code))
          .limit(1)

        if (existing.length > 0) {
          if (mode === 'create') {
            results.skipped++
            results.errors.push({ code: data.code, error: '企业已存在' })
            continue
          }
          
          if (mode === 'update' || mode === 'upsert') {
            await db
              .update(enterprises)
              .set({
                name: data.name,
                location: data.location || null,
                province: data.province || null,
                capacity: data.capacity?.toString() || null,
                transportMode: data.transportMode || null,
                mainProducts: data.mainProducts || [],
                customerRegions: data.customerRegions || [],
                inventoryStrategy: data.inventoryStrategy || 'moderate',
                description: data.description || null,
                tailwindColor: data.tailwindColor || 'cyan',
                shortDescription: data.shortDescription || null,
                basePrice: data.basePrice?.toString() || null,
                volatility: data.volatility?.toString() || null,
                trend: data.trend?.toString() || null,
                modelAccuracy: data.modelAccuracy?.toString() || null,
                currentStock: data.currentStock?.toString() || null,
                maxCapacity: data.maxCapacity?.toString() || null,
                safetyDays: data.safetyDays || null,
                avgConsumption: data.avgConsumption?.toString() || null,
                turnoverRate: data.turnoverRate || null,
                lastPurchaseDate: data.lastPurchaseDate || null,
                nextPurchaseDate: data.nextPurchaseDate || null,
                supplierCount: data.supplierCount || null,
                portDistance: data.portDistance || null,
                updatedAt: new Date(),
              })
              .where(eq(enterprises.code, data.code))
            results.success++
            continue
          }
        }

        await db.insert(enterprises).values({
          code: data.code,
          name: data.name,
          location: data.location || null,
          province: data.province || null,
          capacity: data.capacity?.toString() || null,
          transportMode: data.transportMode || null,
          mainProducts: data.mainProducts || [],
          customerRegions: data.customerRegions || [],
          inventoryStrategy: data.inventoryStrategy || 'moderate',
          description: data.description || null,
          tailwindColor: data.tailwindColor || 'cyan',
          shortDescription: data.shortDescription || null,
          basePrice: data.basePrice?.toString() || null,
          volatility: data.volatility?.toString() || null,
          trend: data.trend?.toString() || null,
          modelAccuracy: data.modelAccuracy?.toString() || null,
          currentStock: data.currentStock?.toString() || null,
          maxCapacity: data.maxCapacity?.toString() || null,
          safetyDays: data.safetyDays || null,
          avgConsumption: data.avgConsumption?.toString() || null,
          turnoverRate: data.turnoverRate || null,
          lastPurchaseDate: data.lastPurchaseDate || null,
          nextPurchaseDate: data.nextPurchaseDate || null,
          supplierCount: data.supplierCount || null,
          portDistance: data.portDistance || null,
          isActive: true,
        })
        results.success++
      } catch (error) {
        results.failed++
        results.errors.push({ 
          code: data.code, 
          error: error instanceof Error ? error.message : '未知错误' 
        })
      }
    }

    return NextResponse.json({
      message: `导入完成: 成功 ${results.success}, 跳过 ${results.skipped}, 失败 ${results.failed}`,
      ...results,
    })
  } catch (error) {
    console.error('导入企业失败:', error)
    return NextResponse.json({ error: '导入企业失败' }, { status: 500 })
  }
}

export async function GET() {
  const template = [
    {
      '企业代码': 'example_corp',
      '企业名称': '示例企业',
      '所在地区': '华东地区',
      '省份': '山东',
      '产能(万吨/年)': 100,
      '运输方式': 'water',
      '主要产品': '磷酸一铵,磷酸二铵,尿素',
      '客户区域': '华东,华南,出口',
      '库存策略': 'moderate',
      '企业描述': '示例企业描述',
      'UI颜色': 'cyan',
      '简短描述': '示例企业简短描述',
      '基准价格': 980,
      '波动幅度': 30,
      '趋势': 0.2,
      '模型准确率': 93,
      '当前库存(吨)': 5000,
      '最大仓储能力(吨)': 10000,
      '安全库存天数': 20,
      '日均消耗量(吨/天)': 250,
      '年周转次数': 8,
      '上次采购日期': '2026-03-15',
      '预计下次采购日期': '2026-04-10',
      '供应商数量': 5,
      '距港口距离(公里)': 100,
    },
  ]

  return NextResponse.json({
    message: '企业导入模板',
    template,
    fields: [
      { field: '企业代码', required: true, description: '唯一标识符，如 yihua, luxi' },
      { field: '企业名称', required: true, description: '企业全称' },
      { field: '所在地区', required: false, description: '如 华东地区、华北地区' },
      { field: '省份', required: false, description: '省份名称' },
      { field: '产能(万吨/年)', required: false, description: '年产能数值' },
      { field: '运输方式', required: false, description: 'water(水运)/rail(铁路)/road(公路)' },
      { field: '主要产品', required: false, description: '用逗号分隔多个产品' },
      { field: '客户区域', required: false, description: '用逗号分隔多个区域' },
      { field: '库存策略', required: false, description: 'aggressive/moderate/conservative' },
      { field: 'UI颜色', required: false, description: 'cyan/violet/amber/emerald 等 Tailwind 颜色' },
      { field: '基准价格', required: false, description: '价格预测基准价格' },
      { field: '当前库存(吨)', required: false, description: '当前库存量' },
      { field: '距港口距离(公里)', required: false, description: '距离最近港口的距离' },
    ],
  })
}
