"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Key, Plus, Trash2, RefreshCw, Copy, Check, AlertTriangle, Loader2 } from "lucide-react"

interface ApiKey {
  id: string
  name: string
  key: string
  isActive: boolean
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string | null
}

interface Quota {
  free: number
  paid: number
  total: number
}

export default function ApiConsolePage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState("prices")
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [quota, setQuota] = useState<Quota | null>(null)
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState<string | null>(null)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  // 获取 API Keys 和配额
  const fetchApiKeys = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/api-keys")
      const data = await res.json()
      if (data.success) {
        setApiKeys(data.data.keys)
        setQuota(data.data.quota)
      }
    } catch (error) {
      console.error("获取 API Keys 失败:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApiKeys()
  }, [])

  // 创建新 Key
  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return
    try {
      setCreating(true)
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setNewlyCreatedKey(data.data.key)
        setNewKeyName("")
        fetchApiKeys()
      } else {
        toast.error(data.error || "创建失败")
      }
    } catch (error) {
      console.error("创建 API Key 失败:", error)
      toast.error("创建失败")
    } finally {
      setCreating(false)
    }
  }

  // 删除 Key
  const handleDeleteKey = async (id: string) => {
    if (!confirm("确定要删除此 API Key 吗？删除后无法恢复。")) return
    try {
      setDeletingId(id)
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        fetchApiKeys()
      } else {
        toast.error(data.error || "删除失败")
      }
    } catch (error) {
      console.error("删除 API Key 失败:", error)
      toast.error("删除失败")
    } finally {
      setDeletingId(null)
    }
  }

  // 重置 Key
  const handleResetKey = async (id: string) => {
    try {
      setResettingId(id)
      const res = await fetch(`/api/api-keys/${id}/reset`, { method: "POST" })
      const data = await res.json()
      if (data.success) {
        setResetKey(data.data.key)
        setResetDialogOpen(true)
        fetchApiKeys()
      } else {
        toast.error(data.error || "重置失败")
      }
    } catch (error) {
      console.error("重置 API Key 失败:", error)
      toast.error("重置失败")
    } finally {
      setResettingId(null)
    }
  }

  // 复制 Key
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  // 获取示例代码中使用的 API Key（显示掩码后的 key 或占位符）
  const getDemoApiKey = () => {
    if (apiKeys.length > 0 && apiKeys[0].key) {
      // 显示掩码后的 key：前8位 + ... + 后4位
      const fullKey = apiKeys[0].key
      if (fullKey.length > 12) {
        return fullKey.substring(0, 8) + "..." + fullKey.substring(fullKey.length - 4)
      }
      return fullKey
    }
    return "YOUR_API_KEY"
  }

  // 获取完整的 API Key 用于复制示例代码
  const getFullDemoApiKey = () => {
    if (apiKeys.length > 0 && apiKeys[0].key) {
      return apiKeys[0].key
    }
    return "YOUR_API_KEY"
  }

  // 复制示例代码
  const copyExampleCode = async (code: string) => {
    // 替换 YOUR_API_KEY 为真实的 key（如果有）
    const realCode = code.replace(/YOUR_API_KEY/g, getFullDemoApiKey())
    await navigator.clipboard.writeText(realCode)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const demoKey = getDemoApiKey()

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* API Keys 管理 */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            <CardTitle>API Keys 管理</CardTitle>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            size="sm"
            className="flex items-center gap-1"
            disabled={apiKeys.length >= 5}
          >
            <Plus className="h-4 w-4" />
            创建 Key
          </Button>
        </CardHeader>
        <CardContent>
          {/* 配额信息 */}
          {quota && (
            <div className="mb-4 p-3 rounded-lg bg-cyan-50/50 dark:bg-cyan-500/10 border border-cyan-200/50 dark:border-cyan-500/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">API 配额（本月剩余）</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm">
                    <span className="text-cyan-600 dark:text-cyan-400 font-medium">{quota.free}</span>
                    <span className="text-slate-400"> 免费</span>
                  </span>
                  {quota.paid > 0 && (
                    <span className="text-sm">
                      <span className="text-violet-600 dark:text-violet-400 font-medium">{quota.paid}</span>
                      <span className="text-slate-400"> 付费</span>
                    </span>
                  )}
                  <Badge variant="outline" className="text-xs">
                    共 {quota.total} 次
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* API Keys 列表 */}
          {loading ? (
            <div className="text-center py-8 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              加载中...
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>暂无 API Key</p>
              <p className="text-sm mt-1">创建一个 API Key 开始使用 API 服务</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900 dark:text-white">{apiKey.name}</span>
                      {apiKey.isActive ? (
                        <Badge variant="default" className="text-xs bg-emerald-500">活跃</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">已禁用</Badge>
                      )}
                    </div>
                    <code className="text-sm text-slate-600 dark:text-slate-400 font-mono">
                      {apiKey.key}
                    </code>
                    <div className="text-xs text-slate-400 mt-1">
                      创建于 {new Date(apiKey.createdAt).toLocaleDateString()}
                      {apiKey.lastUsedAt && ` · 最后使用 ${new Date(apiKey.lastUsedAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetKey(apiKey.id)}
                      disabled={resettingId === apiKey.id}
                      className="flex items-center gap-1"
                    >
                      {resettingId === apiKey.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      重置
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteKey(apiKey.id)}
                      disabled={deletingId === apiKey.id}
                      className="flex items-center gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    >
                      {deletingId === apiKey.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 创建 Key 数量提示 */}
          {apiKeys.length >= 5 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              API Key 数量已达上限（最多 5 个）
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建 API Key 弹窗 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建 API Key</DialogTitle>
          </DialogHeader>
          {!newlyCreatedKey ? (
            <>
              <div className="py-4">
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">Key 名称</label>
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="例如：生产环境 Key"
                  maxLength={50}
                />
                <p className="text-xs text-slate-400 mt-2">为 API Key 设置一个易于识别的名称</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setCreateDialogOpen(false); setNewKeyName(""); }}>
                  取消
                </Button>
                <Button onClick={handleCreateKey} disabled={!newKeyName.trim() || creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "创建"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="py-4">
                <div className="flex items-center gap-2 mb-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm text-amber-700 dark:text-amber-300">请妥善保存此 API Key，创建后将不再显示完整值</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-sm break-all">
                    {newlyCreatedKey}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(newlyCreatedKey)}
                    className="flex items-center gap-1"
                  >
                    {copiedKey ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    {copiedKey ? "已复制" : "复制"}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => { setCreateDialogOpen(false); setNewlyCreatedKey(null); }}>
                  完成
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 重置 Key 弹窗 */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key 已重置</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2 mb-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span className="text-sm text-amber-700 dark:text-amber-300">旧 Key 已失效，请保存新的 Key</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-sm break-all">
                {resetKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(resetKey!)}
                className="flex items-center gap-1"
              >
                {copiedKey ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                {copiedKey ? "已复制" : "复制"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setResetDialogOpen(false); setResetKey(null); }}>
              完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API 文档 */}
      <Card>
        <CardHeader>
          <CardTitle>API 文档</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
            <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
              <TabsTrigger value="prices">价格查询</TabsTrigger>
              <TabsTrigger value="predict">价格预测</TabsTrigger>
              <TabsTrigger value="decision">决策建议</TabsTrigger>
              <TabsTrigger value="inventory">库存数据</TabsTrigger>
              <TabsTrigger value="news">市场新闻</TabsTrigger>
              <TabsTrigger value="chat">AI 聊天</TabsTrigger>
            </TabsList>

            {/* 价格查询 */}
            <TabsContent value="prices" className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>GET</Badge>
                  <code className="text-sm">/api/v1/prices</code>
                </div>
                <p className="text-sm text-muted-foreground">获取硫磺价格历史数据</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">请求参数</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">参数</th>
                      <th className="text-left py-2">类型</th>
                      <th className="text-left py-2">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b"><td className="py-2">startDate</td><td className="py-2">string</td><td className="py-2">开始日期 (YYYY-MM-DD)</td></tr>
                    <tr className="border-b"><td className="py-2">endDate</td><td className="py-2">string</td><td className="py-2">结束日期 (YYYY-MM-DD)</td></tr>
                    <tr className="border-b"><td className="py-2">region</td><td className="py-2">string</td><td className="py-2">地区筛选</td></tr>
                    <tr className="border-b"><td className="py-2">market</td><td className="py-2">string</td><td className="py-2">市场筛选</td></tr>
                    <tr><td className="py-2">limit</td><td className="py-2">integer</td><td className="py-2">返回数量 (默认 30)</td></tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h4 className="font-semibold mb-2">示例代码</h4>
                <div className="relative">
                  <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`curl -X GET "https://sulfur-agent-web.vercel.app/api/v1/prices?limit=10" \\
  -H "Authorization: Bearer ${demoKey}"`}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyExampleCode(`curl -X GET "https://sulfur-agent-web.vercel.app/api/v1/prices?limit=10" \\
  -H "Authorization: Bearer YOUR_API_KEY"`)}
                  >
                    {copiedKey ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* 价格预测 */}
            <TabsContent value="predict" className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default">POST</Badge>
                  <code className="text-sm">/api/v1/prices/predict</code>
                </div>
                <p className="text-sm text-muted-foreground">预测未来硫磺价格</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">请求体</h4>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`{
  "days": 7
}`}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">示例代码</h4>
                <div className="relative">
                  <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`curl -X POST "https://sulfur-agent-web.vercel.app/api/v1/prices/predict" \\
  -H "Authorization: Bearer ${demoKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"days": 7}'`}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyExampleCode(`curl -X POST "https://sulfur-agent-web.vercel.app/api/v1/prices/predict" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"days": 7}'`)}
                  >
                    {copiedKey ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* 决策建议 */}
            <TabsContent value="decision" className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default">POST</Badge>
                  <code className="text-sm">/api/v1/decision</code>
                </div>
                <p className="text-sm text-muted-foreground">获取采购决策建议</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">请求体</h4>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`{
  "days": 7,
  "current_inventory": 5000,
  "daily_consumption": 100,
  "safety_days": 30
}`}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">示例代码</h4>
                <div className="relative">
                  <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`curl -X POST "https://sulfur-agent-web.vercel.app/api/v1/decision" \\
  -H "Authorization: Bearer ${demoKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"days": 7, "current_inventory": 5000, "daily_consumption": 100, "safety_days": 30}'`}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyExampleCode(`curl -X POST "https://sulfur-agent-web.vercel.app/api/v1/decision" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"days": 7, "current_inventory": 5000, "daily_consumption": 100, "safety_days": 30}'`)}
                  >
                    {copiedKey ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* 库存数据 */}
            <TabsContent value="inventory" className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>GET</Badge>
                  <code className="text-sm">/api/v1/data/inventory</code>
                </div>
                <p className="text-sm text-muted-foreground">获取港口库存数据</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">请求参数</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">参数</th>
                      <th className="text-left py-2">类型</th>
                      <th className="text-left py-2">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b"><td className="py-2">port</td><td className="py-2">string</td><td className="py-2">港口筛选</td></tr>
                    <tr><td className="py-2">limit</td><td className="py-2">integer</td><td className="py-2">返回数量 (默认 30)</td></tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h4 className="font-semibold mb-2">示例代码</h4>
                <div className="relative">
                  <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`curl -X GET "https://sulfur-agent-web.vercel.app/api/v1/data/inventory?limit=10" \\
  -H "Authorization: Bearer ${demoKey}"`}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyExampleCode(`curl -X GET "https://sulfur-agent-web.vercel.app/api/v1/data/inventory?limit=10" \\
  -H "Authorization: Bearer YOUR_API_KEY"`)}
                  >
                    {copiedKey ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* 市场新闻 */}
            <TabsContent value="news" className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>GET</Badge>
                  <code className="text-sm">/api/v1/data/news</code>
                </div>
                <p className="text-sm text-muted-foreground">获取市场新闻动态</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">请求参数</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">参数</th>
                      <th className="text-left py-2">类型</th>
                      <th className="text-left py-2">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b"><td className="py-2">keyword</td><td className="py-2">string</td><td className="py-2">关键词筛选</td></tr>
                    <tr><td className="py-2">limit</td><td className="py-2">integer</td><td className="py-2">返回数量 (默认 20)</td></tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h4 className="font-semibold mb-2">示例代码</h4>
                <div className="relative">
                  <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`curl -X GET "https://sulfur-agent-web.vercel.app/api/v1/data/news?limit=10" \\
  -H "Authorization: Bearer ${demoKey}"`}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyExampleCode(`curl -X GET "https://sulfur-agent-web.vercel.app/api/v1/data/news?limit=10" \\
  -H "Authorization: Bearer YOUR_API_KEY"`)}
                  >
                    {copiedKey ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* AI 聊天 */}
            <TabsContent value="chat" className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default">POST</Badge>
                  <code className="text-sm">/api/v1/chat</code>
                </div>
                <p className="text-sm text-muted-foreground">与 AI 聊天助手对话</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">请求体</h4>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`{
  "message": "当前硫磺价格趋势如何？",
  "history": []
}`}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">示例代码</h4>
                <div className="relative">
                  <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
{`curl -X POST "https://sulfur-agent-web.vercel.app/api/v1/chat" \\
  -H "Authorization: Bearer ${demoKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "当前硫磺价格趋势如何？", "history": []}'`}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyExampleCode(`curl -X POST "https://sulfur-agent-web.vercel.app/api/v1/chat" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "当前硫磺价格趋势如何？", "history": []}'`)}
                  >
                    {copiedKey ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}