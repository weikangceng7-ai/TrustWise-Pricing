/**
 * 企业存储服务 - localStorage 后备存储
 *
 * 当数据库未配置时，使用 localStorage 存储动态企业数据
 * 合并静态配置 (ENTERPRISE_CONFIGS) 与动态企业
 */

import { ENTERPRISE_CONFIGS, calculateEnterpriseFactorWeights, ENTERPRISE_COLORS, EnterpriseConfig } from './enterprise-knowledge-config'

const STORAGE_KEY = 'sulfur_dynamic_enterprises'

// 存储的企业数据结构
export interface StorageEnterprise {
  id: number
  code: string
  name: string
  location: string | null
  province: string | null
  capacity: number | null  // 万吨/年
  transportMode: 'water' | 'rail' | 'road' | null
  mainProducts: string[]
  customerRegions: string[]
  inventoryStrategy: 'aggressive' | 'moderate' | 'conservative' | null
  description: string | null
  tailwindColor: string
  shortDescription: string | null

  // 价格预测配置
  basePrice: number | null
  volatility: number | null
  trend: number | null
  modelAccuracy: number | null

  // 库存信息
  currentStock: number | null  // 当前库存（吨）
  maxCapacity: number | null   // 最大仓储能力（吨）
  safetyDays: number | null    // 安全库存天数
  avgConsumption: number | null // 日均消耗量（吨/天）
  turnoverRate: number | null  // 年周转次数
  lastPurchaseDate: string | null
  nextPurchaseDate: string | null
  supplierCount: number | null
  portDistance: number | null  // 距港口距离（公里）

  isActive: boolean
  createdAt: string
  updatedAt: string
}

// 导入结果
export interface ImportResult {
  success: number
  failed: number
  skipped: number
  errors: string[]
}

// 表单数据（用于创建/更新）
export interface EnterpriseFormData {
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

// 静态企业代码（不可删除）
const STATIC_ENTERPRISE_CODES = ['yihua', 'luxi', 'jinzhengda']

/**
 * 获取 localStorage 中的动态企业
 */
function getStoredEnterprises(): StorageEnterprise[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * 保存动态企业到 localStorage
 */
function saveStoredEnterprises(enterprises: StorageEnterprise[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(enterprises))
}

/**
 * 将静态配置转换为存储格式
 */
function convertStaticConfigToStorage(config: EnterpriseConfig, index: number): StorageEnterprise {
  return {
    id: -(index + 1), // 负数 ID 表示静态企业
    code: config.code,
    name: config.name,
    location: config.location,
    province: config.province,
    capacity: config.capacity,
    transportMode: config.transportMode,
    mainProducts: config.mainProducts,
    customerRegions: config.customerRegions,
    inventoryStrategy: config.inventoryStrategy,
    description: config.description,
    tailwindColor: config.tailwindColor,
    shortDescription: config.shortDescription,
    basePrice: config.priceConfig.basePrice,
    volatility: config.priceConfig.volatility,
    trend: config.priceConfig.trend,
    modelAccuracy: config.priceConfig.modelAccuracy,
    currentStock: config.inventory.currentStock,
    maxCapacity: config.inventory.maxCapacity,
    safetyDays: config.inventory.safetyDays,
    avgConsumption: config.inventory.avgConsumption,
    turnoverRate: config.inventory.turnoverRate,
    lastPurchaseDate: config.inventory.lastPurchaseDate,
    nextPurchaseDate: config.inventory.nextPurchaseDate,
    supplierCount: config.inventory.supplierCount,
    portDistance: config.inventory.portDistance,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * 获取所有企业（静态 + 动态）
 */
export function getAllEnterprises(): StorageEnterprise[] {
  const staticEnterprises = ENTERPRISE_CONFIGS.map((config, index) =>
    convertStaticConfigToStorage(config, index)
  )
  const dynamicEnterprises = getStoredEnterprises()
  return [...staticEnterprises, ...dynamicEnterprises]
}

/**
 * 根据 code 获取企业
 */
export function getEnterpriseByCode(code: string): StorageEnterprise | null {
  // 先查静态配置
  const staticConfig = ENTERPRISE_CONFIGS.find(e => e.code === code)
  if (staticConfig) {
    const index = ENTERPRISE_CONFIGS.indexOf(staticConfig)
    return convertStaticConfigToStorage(staticConfig, index)
  }

  // 再查动态存储
  const stored = getStoredEnterprises()
  return stored.find(e => e.code === code) || null
}

/**
 * 创建新企业
 */
export function createEnterprise(data: EnterpriseFormData): StorageEnterprise {
  const stored = getStoredEnterprises()

  // 检查 code 是否已存在
  const allCodes = [...STATIC_ENTERPRISE_CODES, ...stored.map(e => e.code)]
  if (allCodes.includes(data.code)) {
    throw new Error(`企业代码 "${data.code}" 已存在`)
  }

  // 生成新 ID
  const maxId = stored.length > 0 ? Math.max(...stored.map(e => e.id)) : 0
  const newId = maxId + 1

  const now = new Date().toISOString()
  const newEnterprise: StorageEnterprise = {
    id: newId,
    code: data.code,
    name: data.name,
    location: data.location || null,
    province: data.province || '华东',
    capacity: data.capacity || 80,
    transportMode: data.transportMode || 'water',
    mainProducts: data.mainProducts || [],
    customerRegions: data.customerRegions || [],
    inventoryStrategy: data.inventoryStrategy || 'moderate',
    description: data.description || '',
    tailwindColor: data.tailwindColor || 'cyan',
    shortDescription: data.shortDescription || null,
    basePrice: data.basePrice || 1180,
    volatility: data.volatility || 30,
    trend: data.trend || 0.2,
    modelAccuracy: data.modelAccuracy || 93,
    currentStock: data.currentStock || 5000,
    maxCapacity: data.maxCapacity || 10000,
    safetyDays: data.safetyDays || 20,
    avgConsumption: data.avgConsumption || 200,
    turnoverRate: data.turnoverRate || 8,
    lastPurchaseDate: data.lastPurchaseDate || null,
    nextPurchaseDate: data.nextPurchaseDate || null,
    supplierCount: data.supplierCount || 4,
    portDistance: data.portDistance || 100,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }

  stored.push(newEnterprise)
  saveStoredEnterprises(stored)

  return newEnterprise
}

/**
 * 更新企业
 */
export function updateEnterprise(id: number, data: Partial<EnterpriseFormData>): StorageEnterprise {
  const stored = getStoredEnterprises()
  const index = stored.findIndex(e => e.id === id)

  if (index === -1) {
    throw new Error(`企业 ID ${id} 不存在`)
  }

  const enterprise = stored[index]

  // 不允许修改静态企业
  if (STATIC_ENTERPRISE_CODES.includes(enterprise.code)) {
    throw new Error(`静态企业 "${enterprise.code}" 不允许修改`)
  }

  // 不允许修改 code
  if (data.code && data.code !== enterprise.code) {
    throw new Error('不允许修改企业代码')
  }

  const updated: StorageEnterprise = {
    ...enterprise,
    ...data,
    updatedAt: new Date().toISOString(),
  }

  stored[index] = updated
  saveStoredEnterprises(stored)

  return updated
}

/**
 * 删除企业
 */
export function deleteEnterprise(id: number): boolean {
  const stored = getStoredEnterprises()
  const enterprise = stored.find(e => e.id === id)

  if (!enterprise) {
    return false
  }

  // 不允许删除静态企业
  if (STATIC_ENTERPRISE_CODES.includes(enterprise.code)) {
    throw new Error(`静态企业 "${enterprise.code}" 不允许删除`)
  }

  const filtered = stored.filter(e => e.id !== id)
  saveStoredEnterprises(filtered)

  return true
}

/**
 * 批量导入企业
 */
export function importEnterprises(
  enterprises: EnterpriseFormData[],
  mode: 'create' | 'update' | 'upsert' = 'upsert'
): ImportResult {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  }

  const stored = getStoredEnterprises()
  const existingCodes = [...STATIC_ENTERPRISE_CODES, ...stored.map(e => e.code)]
  const maxId = stored.length > 0 ? Math.max(...stored.map(e => e.id)) : 0

  let newId = maxId + 1

  for (const data of enterprises) {
    try {
      // 验证必填字段
      if (!data.code || !data.name) {
        result.failed++
        result.errors.push(`缺少必填字段: code 或 name`)
        continue
      }

      const exists = existingCodes.includes(data.code)

      if (mode === 'create' && exists) {
        result.skipped++
        continue
      }

      if (mode === 'update' && !exists) {
        result.skipped++
        continue
      }

      // 静态企业不允许导入覆盖
      if (STATIC_ENTERPRISE_CODES.includes(data.code)) {
        result.skipped++
        result.errors.push(`静态企业 "${data.code}" 不允许修改`)
        continue
      }

      const now = new Date().toISOString()

      if (exists && mode !== 'create') {
        // 更新现有企业
        const index = stored.findIndex(e => e.code === data.code)
        stored[index] = {
          ...stored[index],
          ...data,
          updatedAt: now,
        }
        result.success++
      } else if (!exists && mode !== 'update') {
        // 创建新企业
        stored.push({
          id: newId++,
          code: data.code,
          name: data.name,
          location: data.location || null,
          province: data.province || '华东',
          capacity: data.capacity || 80,
          transportMode: data.transportMode || 'water',
          mainProducts: data.mainProducts || [],
          customerRegions: data.customerRegions || [],
          inventoryStrategy: data.inventoryStrategy || 'moderate',
          description: data.description || '',
          tailwindColor: data.tailwindColor || 'cyan',
          shortDescription: data.shortDescription || null,
          basePrice: data.basePrice || 1180,
          volatility: data.volatility || 30,
          trend: data.trend || 0.2,
          modelAccuracy: data.modelAccuracy || 93,
          currentStock: data.currentStock || 5000,
          maxCapacity: data.maxCapacity || 10000,
          safetyDays: data.safetyDays || 20,
          avgConsumption: data.avgConsumption || 200,
          turnoverRate: data.turnoverRate || 8,
          lastPurchaseDate: data.lastPurchaseDate || null,
          nextPurchaseDate: data.nextPurchaseDate || null,
          supplierCount: data.supplierCount || 4,
          portDistance: data.portDistance || 100,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        existingCodes.push(data.code)
        result.success++
      }
    } catch (error) {
      result.failed++
      result.errors.push(error instanceof Error ? error.message : '未知错误')
    }
  }

  saveStoredEnterprises(stored)

  return result
}

/**
 * 导出所有动态企业
 */
export function exportEnterprises(): StorageEnterprise[] {
  return getStoredEnterprises()
}

/**
 * 获取导入模板
 */
export function getImportTemplate(): EnterpriseFormData[] {
  return [
    {
      code: 'example_enterprise',
      name: '示例企业',
      location: '华东地区',
      province: '华东',
      capacity: 100,
      transportMode: 'water',
      mainProducts: ['磷酸一铵', '尿素'],
      customerRegions: ['华东', '华南'],
      inventoryStrategy: 'moderate',
      description: '示例企业描述',
      tailwindColor: 'cyan',
      shortDescription: '示例企业简短描述',
      basePrice: 1180,
      currentStock: 5000,
      maxCapacity: 10000,
      safetyDays: 20,
      avgConsumption: 200,
      turnoverRate: 8,
      supplierCount: 4,
      portDistance: 100,
    }
  ]
}

/**
 * 将存储企业转换为 EnterpriseConfig 格式（用于因子权重计算）
 */
export function convertStorageToConfig(enterprise: StorageEnterprise): EnterpriseConfig {
  return {
    code: enterprise.code,
    name: enterprise.name,
    location: enterprise.location || '未知地区',
    province: enterprise.province || '华东',
    capacity: enterprise.capacity || 80,
    transportMode: enterprise.transportMode || 'water',
    mainProducts: enterprise.mainProducts || [],
    customerRegions: enterprise.customerRegions || [],
    inventoryStrategy: enterprise.inventoryStrategy || 'moderate',
    description: enterprise.description || '',
    tailwindColor: enterprise.tailwindColor || 'cyan',
    shortDescription: enterprise.shortDescription || '',
    priceConfig: {
      basePrice: enterprise.basePrice || 1180,
      volatility: enterprise.volatility || 30,
      trend: enterprise.trend || 0.2,
      modelAccuracy: enterprise.modelAccuracy || 93,
    },
    inventory: {
      currentStock: enterprise.currentStock || 5000,
      maxCapacity: enterprise.maxCapacity || 10000,
      safetyDays: enterprise.safetyDays || 20,
      avgConsumption: enterprise.avgConsumption || 200,
      turnoverRate: enterprise.turnoverRate || 8,
      lastPurchaseDate: enterprise.lastPurchaseDate || new Date().toISOString().split('T')[0],
      nextPurchaseDate: enterprise.nextPurchaseDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      supplierCount: enterprise.supplierCount || 4,
      portDistance: enterprise.portDistance || 100,
    },
  }
}

/**
 * 获取企业影响因子权重
 */
export function getEnterpriseFactorWeights(code: string) {
  const enterprise = getEnterpriseByCode(code)
  if (!enterprise) return null

  const config = convertStorageToConfig(enterprise)
  return calculateEnterpriseFactorWeights(config)
}

/**
 * 获取企业颜色
 */
export function getEnterpriseColor(code: string): string {
  // 先查静态颜色配置
  if (ENTERPRISE_COLORS[code as keyof typeof ENTERPRISE_COLORS]) {
    return ENTERPRISE_COLORS[code as keyof typeof ENTERPRISE_COLORS]
  }

  // 再查动态企业颜色
  const enterprise = getEnterpriseByCode(code)
  if (enterprise?.tailwindColor) {
    const colorMap: Record<string, string> = {
      cyan: '#06b6d4',
      violet: '#8b5cf6',
      amber: '#f59e0b',
      emerald: '#10b981',
      rose: '#f43f5e',
      blue: '#3b82f6',
    }
    return colorMap[enterprise.tailwindColor] || '#06b6d4'
  }

  return '#06b6d4'
}

/**
 * 判断是否为静态企业
 */
export function isStaticEnterprise(code: string): boolean {
  return STATIC_ENTERPRISE_CODES.includes(code)
}