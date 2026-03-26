"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Search, TrendingUp, Users, MapPin, Factory } from 'lucide-react'

interface Enterprise {
  id: string
  name: string
  shortName: string
  industry: string
  province: string
  city: string
  listed: boolean
  stockCode?: string
  mainProducts: string[]
  revenue?: number
  employees?: number
  founded?: number
  website?: string
  description: string
}

interface Stats {
  total: number
  listed: number
  unlisted: number
  industries: number
  provinces: number
}

export default function EnterprisesPage() {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [industryFilter, setIndustryFilter] = useState("all")
  const [provinceFilter, setProvinceFilter] = useState("all")
  const [lastUpdated, setLastUpdated] = useState<string>("")

  const fetchData = async () => {
    try {
      const response = await fetch('/api/enterprises')
      const data = await response.json()
      setEnterprises(data.enterprises)
      setStats(data.stats)
      setLastUpdated(data.lastUpdated)
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  const industries = [...new Set(enterprises.map(e => e.industry))]
  const provinces = [...new Set(enterprises.map(e => e.province))]

  const filteredEnterprises = enterprises.filter(e => {
    const matchesSearch = e.name.includes(searchTerm) || 
                          e.shortName.includes(searchTerm) ||
                          e.mainProducts.some(p => p.includes(searchTerm))
    const matchesIndustry = industryFilter === "all" || e.industry === industryFilter
    const matchesProvince = provinceFilter === "all" || e.province === provinceFilter
    return matchesSearch && matchesIndustry && matchesProvince
  })

  const formatRevenue = (revenue?: number) => {
    if (!revenue) return '-'
    if (revenue >= 10000) {
      return `${(revenue / 10000).toFixed(0)}亿`
    }
    return `${revenue}百万`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">化工企业数据库</h1>
          <p className="text-muted-foreground mt-1">
            实时更新 · 最后更新: {new Date(lastUpdated).toLocaleString('zh-CN')}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          共 {stats?.total || 0} 家企业
        </Badge>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Factory className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">企业总数</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.listed}</p>
                  <p className="text-xs text-muted-foreground">上市企业</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.industries}</p>
                  <p className="text-xs text-muted-foreground">行业分类</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.provinces}</p>
                  <p className="text-xs text-muted-foreground">省份分布</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.unlisted}</p>
                  <p className="text-xs text-muted-foreground">非上市企业</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索企业名称、产品..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="行业分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部行业</SelectItem>
                {industries.map(industry => (
                  <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={provinceFilter} onValueChange={setProvinceFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="省份" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部省份</SelectItem>
                {provinces.map(province => (
                  <SelectItem key={province} value={province}>{province}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        找到 {filteredEnterprises.length} 家企业
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEnterprises.map((enterprise) => (
          <Card key={enterprise.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{enterprise.shortName}</CardTitle>
                  <p className="text-sm text-muted-foreground">{enterprise.name}</p>
                </div>
                {enterprise.listed && (
                  <Badge variant="default" className="bg-green-500">
                    {enterprise.stockCode}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">{enterprise.industry}</Badge>
                <Badge variant="secondary">{enterprise.province} · {enterprise.city}</Badge>
              </div>
              
              <div className="text-sm">
                <span className="text-muted-foreground">主要产品：</span>
                <span>{enterprise.mainProducts.slice(0, 3).join('、')}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <div>
                  <span className="text-muted-foreground">营收：</span>
                  <span className="font-medium">{formatRevenue(enterprise.revenue)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">员工：</span>
                  <span className="font-medium">
                    {enterprise.employees ? `${(enterprise.employees / 1000).toFixed(0)}K` : '-'}
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground line-clamp-2">
                {enterprise.description}
              </p>
              
              {enterprise.website && (
                <a 
                  href={enterprise.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline block"
                >
                  访问官网 →
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
