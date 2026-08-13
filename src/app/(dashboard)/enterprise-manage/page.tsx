"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Building2,
  Plus,
  Upload,
  Download,
  Trash2,
  Edit,
  Search,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  ExternalLink,
} from "lucide-react"
import {
  getAllEnterprises,
  createEnterprise,
  updateEnterprise,
  deleteEnterprise,
  importEnterprises,
  getImportTemplate,
  isStaticEnterprise,
  StorageEnterprise,
  EnterpriseFormData,
  ImportResult,
} from "@/services/enterprise-storage"

// 企业类型（使用存储服务的类型）
type Enterprise = StorageEnterprise

const COLOR_OPTIONS = [
  { value: 'cyan', label: '青色', class: 'bg-cyan-500' },
  { value: 'violet', label: '紫色', class: 'bg-violet-500' },
  { value: 'amber', label: '琥珀色', class: 'bg-amber-500' },
  { value: 'emerald', label: '翠绿色', class: 'bg-emerald-500' },
  { value: 'rose', label: '玫瑰色', class: 'bg-rose-500' },
  { value: 'blue', label: '蓝色', class: 'bg-blue-500' },
]

const TRANSPORT_MODES = [
  { value: 'water', label: '水运' },
  { value: 'rail', label: '铁路' },
  { value: 'road', label: '公路' },
]

const INVENTORY_STRATEGIES = [
  { value: 'aggressive', label: '激进' },
  { value: 'moderate', label: '稳健' },
  { value: 'conservative', label: '保守' },
]

export default function EnterpriseManagePage() {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editingEnterprise, setEditingEnterprise] = useState<Enterprise | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    location: '',
    province: '',
    capacity: '',
    transportMode: 'water',
    mainProducts: '',
    customerRegions: '',
    inventoryStrategy: 'moderate',
    description: '',
    tailwindColor: 'cyan',
    shortDescription: '',
    basePrice: '',
    currentStock: '',
    maxCapacity: '',
    safetyDays: '',
    avgConsumption: '',
    turnoverRate: '',
    lastPurchaseDate: '',
    nextPurchaseDate: '',
    supplierCount: '',
    portDistance: '',
  })

  const fetchEnterprises = () => {
    setLoading(true)
    try {
      // 使用 localStorage 存储服务
      const data = getAllEnterprises()
      setEnterprises(data)
      setError(null)
    } catch (err) {
      console.error('获取企业列表失败:', err)
      setError('获取企业列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEnterprises()
  }, [])

  const filteredEnterprises = enterprises.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      location: '',
      province: '',
      capacity: '',
      transportMode: 'water',
      mainProducts: '',
      customerRegions: '',
      inventoryStrategy: 'moderate',
      description: '',
      tailwindColor: 'cyan',
      shortDescription: '',
      basePrice: '',
      currentStock: '',
      maxCapacity: '',
      safetyDays: '',
      avgConsumption: '',
      turnoverRate: '',
      lastPurchaseDate: '',
      nextPurchaseDate: '',
      supplierCount: '',
      portDistance: '',
    })
    setEditingEnterprise(null)
  }

  const handleOpenDialog = (enterprise?: Enterprise) => {
    if (enterprise) {
      setEditingEnterprise(enterprise)
      setFormData({
        code: enterprise.code,
        name: enterprise.name,
        location: enterprise.location || '',
        province: enterprise.province || '',
        capacity: enterprise.capacity?.toString() || '',
        transportMode: enterprise.transportMode || 'water',
        mainProducts: enterprise.mainProducts?.join(', ') || '',
        customerRegions: enterprise.customerRegions?.join(', ') || '',
        inventoryStrategy: enterprise.inventoryStrategy || 'moderate',
        description: enterprise.description || '',
        tailwindColor: enterprise.tailwindColor || 'cyan',
        shortDescription: enterprise.shortDescription || '',
        basePrice: enterprise.basePrice?.toString() || '',
        currentStock: enterprise.currentStock?.toString() || '',
        maxCapacity: enterprise.maxCapacity?.toString() || '',
        safetyDays: enterprise.safetyDays?.toString() || '',
        avgConsumption: enterprise.avgConsumption?.toString() || '',
        turnoverRate: enterprise.turnoverRate?.toString() || '',
        lastPurchaseDate: enterprise.lastPurchaseDate || '',
        nextPurchaseDate: enterprise.nextPurchaseDate || '',
        supplierCount: enterprise.supplierCount?.toString() || '',
        portDistance: enterprise.portDistance?.toString() || '',
      })
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  const handleSubmit = () => {
    try {
      const payload: EnterpriseFormData = {
        code: formData.code,
        name: formData.name,
        location: formData.location || undefined,
        province: formData.province || undefined,
        capacity: formData.capacity ? parseFloat(formData.capacity) : undefined,
        transportMode: formData.transportMode as 'water' | 'rail' | 'road',
        mainProducts: formData.mainProducts.split(',').map(s => s.trim()).filter(Boolean),
        customerRegions: formData.customerRegions.split(',').map(s => s.trim()).filter(Boolean),
        inventoryStrategy: formData.inventoryStrategy as 'aggressive' | 'moderate' | 'conservative',
        description: formData.description || undefined,
        tailwindColor: formData.tailwindColor,
        shortDescription: formData.shortDescription || undefined,
        basePrice: formData.basePrice ? parseFloat(formData.basePrice) : undefined,
        currentStock: formData.currentStock ? parseFloat(formData.currentStock) : undefined,
        maxCapacity: formData.maxCapacity ? parseFloat(formData.maxCapacity) : undefined,
        safetyDays: formData.safetyDays ? parseInt(formData.safetyDays) : undefined,
        avgConsumption: formData.avgConsumption ? parseFloat(formData.avgConsumption) : undefined,
        turnoverRate: formData.turnoverRate ? parseInt(formData.turnoverRate) : undefined,
        lastPurchaseDate: formData.lastPurchaseDate || undefined,
        nextPurchaseDate: formData.nextPurchaseDate || undefined,
        supplierCount: formData.supplierCount ? parseInt(formData.supplierCount) : undefined,
        portDistance: formData.portDistance ? parseInt(formData.portDistance) : undefined,
      }

      if (editingEnterprise) {
        updateEnterprise(editingEnterprise.id, payload)
      } else {
        createEnterprise(payload)
      }

      setDialogOpen(false)
      resetForm()
      fetchEnterprises()
      setError(null)
    } catch (err) {
      console.error('保存企业失败:', err)
      setError(err instanceof Error ? err.message : '保存企业失败')
    }
  }

  const handleDelete = (id: number) => {
    const enterprise = enterprises.find(e => e.id === id)
    if (!enterprise) return

    // 检查是否为静态企业
    if (isStaticEnterprise(enterprise.code)) {
      toast.error('静态企业（HX集团、HY集团、TC集团）不允许删除')
      return
    }

    if (!confirm('确定要删除此企业吗？')) return

    try {
      deleteEnterprise(id)
      fetchEnterprises()
      setError(null)
    } catch (err) {
      console.error('删除企业失败:', err)
      setError(err instanceof Error ? err.message : '删除企业失败')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string
        let data: EnterpriseFormData[] = []

        if (file.name.endsWith('.json')) {
          const json = JSON.parse(content)
          data = Array.isArray(json) ? json : [json]
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split('\n')
          const headers = lines[0].split(',').map(h => h.trim())
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',')
            if (values.length === headers.length) {
              const row: Record<string, string | number> = {}
              headers.forEach((h, idx) => {
                const val = values[idx]?.trim()
                row[h] = isNaN(Number(val)) ? val : Number(val)
              })
              data.push(row as unknown as EnterpriseFormData)
            }
          }
        }

        // 使用 localStorage 导入
        const result = importEnterprises(data, 'upsert')
        setImportResult(result)
        fetchEnterprises()
      } catch (error) {
        console.error('导入失败:', error)
        setError('导入失败，请检查文件格式')
      }
    }

    if (file.name.endsWith('.json') || file.name.endsWith('.csv')) {
      reader.readAsText(file)
    } else {
      setError('请上传 JSON 或 CSV 文件')
    }
  }

  const downloadTemplate = () => {
    const template = getImportTemplate()
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'enterprise_template.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">企业管理</h2>
          <p className="text-muted-foreground">
            管理需要分析的企业信息，支持导入新企业
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            下载模板
          </Button>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            导入企业
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            添加企业
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-3 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <Button variant="ghost" size="sm" className="ml-auto h-6 px-2" onClick={() => setError(null)}>
            关闭
          </Button>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索企业名称或代码..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          共 {enterprises.length} 家企业
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEnterprises.map((enterprise) => (
            <Card key={enterprise.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        COLOR_OPTIONS.find(c => c.value === enterprise.tailwindColor)?.class || 'bg-cyan-500'
                      }`}
                    />
                    <CardTitle className="text-lg">{enterprise.name}</CardTitle>
                    {isStaticEnterprise(enterprise.code) && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        预设
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Link href={`/enterprise/${enterprise.code}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="查看详情"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenDialog(enterprise)}
                      title="编辑"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!isStaticEnterprise(enterprise.code) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(enterprise.id)}
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {enterprise.code} · {enterprise.location || '未知地区'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">产能：</span>
                    <span className="font-medium">{enterprise.capacity ?? '-'} 万吨/年</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">运输：</span>
                    <span className="font-medium">
                      {TRANSPORT_MODES.find(t => t.value === enterprise.transportMode)?.label || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">库存：</span>
                    <span className="font-medium">{enterprise.currentStock ?? '-'} 吨</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">策略：</span>
                    <span className="font-medium">
                      {INVENTORY_STRATEGIES.find(s => s.value === enterprise.inventoryStrategy)?.label || '-'}
                    </span>
                  </div>
                </div>
                {enterprise.mainProducts?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {enterprise.mainProducts.slice(0, 3).map((product, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800"
                      >
                        {product}
                      </span>
                    ))}
                    {enterprise.mainProducts.length > 3 && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800">
                        +{enterprise.mainProducts.length - 3}
                      </span>
                    )}
                  </div>
                )}
                {enterprise.shortDescription && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {enterprise.shortDescription}
                  </p>
                )}
                <Link
                  href={`/enterprise/${enterprise.code}`}
                  className="block mt-2 text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
                >
                  查看价格影响因子权重和预测趋势 →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 添加/编辑企业对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEnterprise ? '编辑企业' : '添加企业'}</DialogTitle>
            <DialogDescription>
              {editingEnterprise ? '修改企业信息' : '填写新企业信息，带 * 为必填项'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">企业代码 *</label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="如: example_corp"
                  disabled={!!editingEnterprise}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">企业名称 *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="企业全称"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">所在地区</label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="如: 华东地区"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">省份</label>
                <Input
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  placeholder="如: 山东"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">产能(万吨/年)</label>
                <Input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">运输方式</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.transportMode}
                  onChange={(e) => setFormData({ ...formData, transportMode: e.target.value })}
                >
                  {TRANSPORT_MODES.map(mode => (
                    <option key={mode.value} value={mode.value}>{mode.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">库存策略</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.inventoryStrategy}
                  onChange={(e) => setFormData({ ...formData, inventoryStrategy: e.target.value })}
                >
                  {INVENTORY_STRATEGIES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">主要产品</label>
                <Input
                  value={formData.mainProducts}
                  onChange={(e) => setFormData({ ...formData, mainProducts: e.target.value })}
                  placeholder="用逗号分隔，如: 磷酸一铵,尿素"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">客户区域</label>
                <Input
                  value={formData.customerRegions}
                  onChange={(e) => setFormData({ ...formData, customerRegions: e.target.value })}
                  placeholder="用逗号分隔，如: 华东,华南"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">企业描述</label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="详细描述企业情况..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">简短描述</label>
                <Input
                  value={formData.shortDescription}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                  placeholder="用于侧边栏显示"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">UI颜色</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.tailwindColor}
                  onChange={(e) => setFormData({ ...formData, tailwindColor: e.target.value })}
                >
                  {COLOR_OPTIONS.map(color => (
                    <option key={color.value} value={color.value}>{color.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">库存与采购信息</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">当前库存(吨)</label>
                  <Input
                    type="number"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">最大仓储(吨)</label>
                  <Input
                    type="number"
                    value={formData.maxCapacity}
                    onChange={(e) => setFormData({ ...formData, maxCapacity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">安全库存天数</label>
                  <Input
                    type="number"
                    value={formData.safetyDays}
                    onChange={(e) => setFormData({ ...formData, safetyDays: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">日均消耗(吨/天)</label>
                  <Input
                    type="number"
                    value={formData.avgConsumption}
                    onChange={(e) => setFormData({ ...formData, avgConsumption: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">供应商数量</label>
                  <Input
                    type="number"
                    value={formData.supplierCount}
                    onChange={(e) => setFormData({ ...formData, supplierCount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">距港口(公里)</label>
                  <Input
                    type="number"
                    value={formData.portDistance}
                    onChange={(e) => setFormData({ ...formData, portDistance: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">价格预测配置</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">基准价格</label>
                  <Input
                    type="number"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">上次采购日期</label>
                  <Input
                    type="date"
                    value={formData.lastPurchaseDate}
                    onChange={(e) => setFormData({ ...formData, lastPurchaseDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editingEnterprise ? '保存修改' : '添加企业'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 导入对话框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              导入企业数据
            </DialogTitle>
            <DialogDescription>
              支持 JSON 和 CSV 格式的文件导入
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv"
              className="hidden"
              onChange={handleFileUpload}
            />
            
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-cyan-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                点击上传或拖拽文件到此处
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                支持 JSON、CSV 格式
              </p>
            </div>

            {importResult && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>成功: {importResult.success}</span>
                </div>
                {importResult.skipped > 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>跳过: {importResult.skipped}</span>
                  </div>
                )}
                {importResult.failed > 0 && (
                  <div className="flex items-center gap-2 text-sm text-red-500">
                    <AlertCircle className="h-4 w-4" />
                    <span>失败: {importResult.failed}</span>
                  </div>
                )}
                {importResult.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded p-2">
                    {importResult.errors.map((err, idx) => (
                      <div key={idx}>{err}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setImportDialogOpen(false)
              setImportResult(null)
            }}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
