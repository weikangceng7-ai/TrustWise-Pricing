"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/contexts/language-context"
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
  const { t } = useLanguage()
  const router = useRouter()
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([])
  const [quota, setQuota] = useState<QuotaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [showFullKey, setShowFullKey] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchApiKeys = useCallback(async () => {
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
  }, [router])

  useEffect(() => {
    fetchApiKeys()
  }, [fetchApiKeys])

  async function createKey() {
    if (!newKeyName.trim()) {
      setError(t("apiKeys.error.nameRequired"))
      return
    }

    setError(null)
    setCreating(true)
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      })

      const data = await res.json()

      if (data.success) {
        setShowFullKey(data.data.key)
        setNewKeyName("")
        await fetchApiKeys()
      } else {
        setError(data.error || t("apiConsole.createFailed"))
      }
    } catch (error) {
      console.error("创建失败:", error)
      setError(t("apiKeys.error.createRetry"))
    } finally {
      setCreating(false)
    }
  }

  async function deleteKey(id: string) {
    if (!confirm(t("apiConsole.confirmDeleteKey"))) return

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
    if (!confirm(t("apiKeys.confirmReset"))) return

    setError(null)
    try {
      const res = await fetch(`/api/api-keys/${id}/reset`, { method: "POST" })
      const data = await res.json()

      if (data.success) {
        setShowFullKey(data.data.key)
        await fetchApiKeys()
      } else {
        setError(data.error || t("apiConsole.resetFailed"))
      }
    } catch (error) {
      console.error("重置失败:", error)
      setError(t("apiKeys.error.resetRetry"))
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
          <h1 className="text-3xl font-bold">{t("apiKeys.title")}</h1>
          <p className="text-muted-foreground">{t("apiKeys.desc")}</p>
        </div>
        <Link href="/api-console">
          <Button variant="outline">
            <BarChart className="mr-2 h-4 w-4" />
            {t("apiKeys.apiDocs")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Quota Card */}
      {quota && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t("apiKeys.quotaBalance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div>
                <p className="text-sm text-muted-foreground">{t("apiKeys.freeQuota")}</p>
                <p className="text-2xl font-bold">{quota.free}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("apiKeys.paidQuota")}</p>
                <p className="text-2xl font-bold">{quota.paid}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("apiKeys.totalRemaining")}</p>
                <p className="text-2xl font-bold text-primary">{quota.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Key Form */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t("apiKeys.createNewKey")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder={t("apiKeys.keyNamePlaceholder")}
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
              {t("common.create")}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-500 mt-3">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Full Key Display (Warning Card) */}
      {showFullKey && (
        <Card className="mb-6 border-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              <div className="flex-1">
                <p className="font-semibold mb-2">{t("apiKeys.saveKeyWarning")}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("apiKeys.keyShownOnce")}
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
                  {t("common.close")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("apiKeys.yourKeys")}</CardTitle>
          <CardDescription>{t("apiKeys.maxKeys")}</CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("apiKeys.noKeysHint")}</p>
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
                        {key.isActive ? t("apiKeys.active") : t("apiConsole.inactive")}
                      </Badge>
                    </div>
                    <code className="text-sm text-muted-foreground font-mono">
                      {key.key}
                    </code>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t("apiKeys.createdAtLabel")}{new Date(key.createdAt).toLocaleDateString()}
                      {key.lastUsedAt && (
                        <span className="ml-4">
                          {t("apiKeys.lastUsedLabel")}{new Date(key.lastUsedAt).toLocaleDateString()}
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