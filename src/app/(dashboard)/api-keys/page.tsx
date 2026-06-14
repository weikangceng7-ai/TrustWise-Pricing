"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Key, Plus, Trash2, RefreshCw, Copy, Check,
  AlertTriangle, BarChart, ArrowRight, Loader2
} from "lucide-react"

interface ApiKeyData {
  id: string
  name: string
  key: string
  isActive: boolean
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string | null
}

interface QuotaData {
  free: number
  paid: number
  total: number
}

export default function ApiKeysPage() {
  const router = useRouter()
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([])
  const [quota, setQuota] = useState<QuotaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [showFullKey, setShowFullKey] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetchApiKeys()
  }, [])

  async function fetchApiKeys() {
    try {
      const res = await fetch("/api/api-keys")
      const data = await res.json()

      if (data.success) {
        setApiKeys(data.data.keys)
        setQuota(data.data.quota)
      } else {
        if (data.error === "未登录") {
          router.push("/login")
        }
      }
    } catch (error) {
      console.error("获取 API Keys 失败:", error)
    } finally {
      setLoading(false)
    }
  }

  async function createKey() {
    if (!newKeyName.trim()) return

    setCreating(true)
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      })

      const data = await res.json()

      if (data.success) {
        setShowFullKey(data.data.key.key)
        setNewKeyName("")
        await fetchApiKeys()
      }
    } catch (error) {
      console.error("创建失败:", error)
    } finally {
      setCreating(false)
    }
  }

  async function deleteKey(id: string) {
    if (!confirm("确定要删除此 API Key 吗？")) return

    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" })
      const data = await res.json()

      if (data.success) {
        await fetchApiKeys()
      }
    } catch (error) {
      console.error("删除失败:", error)
    }
  }

  async function resetKey(id: string) {
    if (!confirm("重置后旧 Key 将失效，确定继续？")) return

    try {
      const res = await fetch(`/api/api-keys/${id}/reset`, { method: "POST" })
      const data = await res.json()

      if (data.success) {
        setShowFullKey(data.data.key.key)
        await fetchApiKeys()
      }
    } catch (error) {
      console.error("重置失败:", error)
    }
  }

  async function copyKey(key: string) {
    await navigator.clipboard.writeText(key)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">API Keys 管理</h1>
          <p className="text-muted-foreground">管理你的 API 密钥和配额</p>
        </div>
        <Link href="/api-console">
          <Button variant="outline">
            <BarChart className="mr-2 h-4 w-4" />
            API 文档
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Quota Card */}
      {quota && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">配额余额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div>
                <p className="text-sm text-muted-foreground">免费额度</p>
                <p className="text-2xl font-bold">{quota.free}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">付费额度</p>
                <p className="text-2xl font-bold">{quota.paid}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">总剩余</p>
                <p className="text-2xl font-bold text-primary">{quota.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Key Form */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">创建新 API Key</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Key 名称（如：生产环境）"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={createKey} disabled={creating}>
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              创建
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Full Key Display (Warning Card) */}
      {showFullKey && (
        <Card className="mb-6 border-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              <div className="flex-1">
                <p className="font-semibold mb-2">请保存此 API Key</p>
                <p className="text-sm text-muted-foreground mb-4">
                  此 Key 仅显示一次，关闭后将无法再次查看完整值
                </p>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-3 py-2 rounded text-sm font-mono flex-1">
                    {showFullKey}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyKey(showFullKey)}
                  >
                    {copied === showFullKey ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => setShowFullKey(null)}
                >
                  关闭
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>已创建的 API Keys</CardTitle>
          <CardDescription>最多可创建 5 个 API Key</CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无 API Key，请创建一个</p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between border rounded-lg p-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{key.name}</span>
                      <Badge variant={key.isActive ? "default" : "secondary"}>
                        {key.isActive ? "活跃" : "已禁用"}
                      </Badge>
                    </div>
                    <code className="text-sm text-muted-foreground font-mono">
                      {key.key}
                    </code>
                    <div className="text-xs text-muted-foreground mt-1">
                      创建: {new Date(key.createdAt).toLocaleDateString()}
                      {key.lastUsedAt && (
                        <span className="ml-4">
                          最后使用: {new Date(key.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resetKey(key.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteKey(key.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}