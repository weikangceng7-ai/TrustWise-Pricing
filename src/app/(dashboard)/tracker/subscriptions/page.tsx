/**
 * Tracker 订阅配置管理页面
 *
 * 功能：
 * - 查看订阅列表
 * - 创建/编辑/删除订阅
 * - 启用/停用订阅
 */

"use client"

import { useState } from "react"
import {
  Activity,
  Bell,
  Clock,
  Plus,
  Trash2,
  Edit,
  Play,
  Pause,
  RefreshCw,
  Settings,
  Target,
  Calendar,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useTrackerSubscriptions, useTrackerSubscription } from "@/hooks/use-tracker-subscriptions"
import type { UpdateSubscriptionInput } from "@/hooks/use-tracker-subscriptions"
import type { TrackerSubscription, AlertRuleConfig } from "@/db/schema-tracker"

// ==================== 频率映射 ====================

const FREQUENCY_MAP = {
  hourly: "每小时",
  daily: "每天",
  weekly: "每周",
}

// ==================== 目标类型映射 ====================

const TARGET_TYPE_MAP = {
  price: "价格",
  inventory: "库存",
  news: "新闻",
  all: "全部",
}

// ==================== 订阅列表组件 ====================

function SubscriptionList() {
  const { subscriptions, isLoading, toggleSubscription, deleteSubscription } = useTrackerSubscriptions({
    activeOnly: false,
  })
  const [editingId, setEditingId] = useState<number | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>还没有创建订阅</p>
            <p className="text-sm mt-1">创建订阅后，Tracker 会自动追踪价格、库存、新闻等数据</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {subscriptions.map((subscription) => (
        <SubscriptionCard
          key={subscription.id}
          subscription={subscription}
          onToggle={() => toggleSubscription(subscription.id, !subscription.isActive)}
          onDelete={() => deleteSubscription(subscription.id)}
          isEditing={editingId === subscription.id}
          onEditStart={() => setEditingId(subscription.id)}
          onEditEnd={() => setEditingId(null)}
        />
      ))}
    </div>
  )
}

// ==================== 订阅卡片组件 ====================

function SubscriptionCard({
  subscription,
  onToggle,
  onDelete,
  isEditing,
  onEditStart,
  onEditEnd,
}: {
  subscription: TrackerSubscription
  onToggle: () => void
  onDelete: () => void
  isEditing: boolean
  onEditStart: () => void
  onEditEnd: () => void
}) {
  const { updateSubscription } = useTrackerSubscription(subscription.id)

  const handleEdit = async (data: Partial<TrackerSubscription>) => {
    // Convert null values to undefined for UpdateSubscriptionInput
    const updateData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value ?? undefined])
    )
    await updateSubscription(updateData as UpdateSubscriptionInput)
    onEditEnd()
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${subscription.isActive ? "bg-cyan-100 dark:bg-cyan-500/20" : "bg-slate-100 dark:bg-slate-500/20"}`}>
              <Target className={`h-5 w-5 ${subscription.isActive ? "text-cyan-600" : "text-slate-500"}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{subscription.name}</p>
                <Badge variant={subscription.isActive ? "default" : "secondary"}>
                  {subscription.isActive ? "运行中" : "已停用"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <span>{TARGET_TYPE_MAP[subscription.targetType as keyof typeof TARGET_TYPE_MAP] || subscription.targetType}</span>
                <span>·</span>
                <span>{FREQUENCY_MAP[subscription.frequency as keyof typeof FREQUENCY_MAP] || subscription.frequency}</span>
                {subscription.targetRegion && (
                  <>
                    <span>·</span>
                    <span>{subscription.targetRegion}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={subscription.isActive} onCheckedChange={onToggle} />
            <Button variant="ghost" size="sm" onClick={onEditStart}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        {/* 详情信息 */}
        <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-500/20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">执行时间</p>
              <p className="font-medium">{subscription.scheduleTime || "09:00"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">上次执行</p>
              <p className="font-medium">
                {subscription.lastRunAt
                  ? new Date(subscription.lastRunAt).toLocaleString("zh-CN", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "未执行"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">下次执行</p>
              <p className="font-medium">
                {subscription.nextRunAt
                  ? new Date(subscription.nextRunAt).toLocaleString("zh-CN", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "未调度"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">报告类型</p>
              <p className="font-medium">
                {subscription.reportEnabled ? (subscription.reportType || "daily") : "未启用"}
              </p>
            </div>
          </div>

          {/* 阈值规则 */}
          {subscription.alertRules && subscription.alertRules.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">阈值规则</p>
              <div className="flex flex-wrap gap-2">
                {subscription.alertRules.map((rule, idx) => (
                  <Badge key={idx} variant="outline">
                    {rule.type === "price_change" && `价格变化>${rule.priceChangeThreshold}%`}
                    {rule.type === "price_threshold" && `价格区间[${rule.priceLowerThreshold}-${rule.priceUpperThreshold}]`}
                    {rule.type === "inventory_change" && `库存变化>${rule.inventoryChangeThreshold}%`}
                    {rule.type === "inventory_threshold" && `库存区间[${rule.inventoryLowerThreshold}-${rule.inventoryUpperThreshold}]`}
                    {rule.type === "news_keyword" && `关键词: ${rule.newsKeywords?.join(",")}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ==================== 创建订阅对话框组件 ====================

function CreateSubscriptionDialog() {
  const { createSubscription } = useTrackerSubscriptions({ activeOnly: false })
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    targetType: "all",
    targetRegion: "",
    targetMarket: "",
    frequency: "daily",
    scheduleTime: "09:00",
    reportEnabled: true,
    reportType: "daily",
    alertRules: [] as Array<{
      type: string
      priceChangeThreshold?: string
      priceUpperThreshold?: string
      priceLowerThreshold?: string
      inventoryChangeThreshold?: string
      inventoryUpperThreshold?: string
      inventoryLowerThreshold?: string
      newsKeywords?: string
      urgency: string
    }>,
  })

  const addAlertRule = () => {
    setFormData({
      ...formData,
      alertRules: [...formData.alertRules, { type: "price_change", urgency: "normal" }],
    })
  }

  const removeAlertRule = (index: number) => {
    setFormData({
      ...formData,
      alertRules: formData.alertRules.filter((_, i) => i !== index),
    })
  }

  const updateAlertRule = (index: number, updates: Record<string, unknown>) => {
    const newRules = [...formData.alertRules]
    newRules[index] = { ...newRules[index], ...updates }
    setFormData({ ...formData, alertRules: newRules })
  }

  const handleSubmit = async () => {
    await createSubscription({
      name: formData.name,
      description: formData.description,
      targetType: formData.targetType as "price" | "inventory" | "news" | "all",
      targetRegion: formData.targetRegion || undefined,
      targetMarket: formData.targetMarket || undefined,
      frequency: formData.frequency as "hourly" | "daily" | "weekly",
      scheduleTime: formData.scheduleTime,
      alertRules: formData.alertRules.map((r) => {
        const base = { type: r.type as AlertRuleConfig["type"], urgency: r.urgency as AlertRuleConfig["urgency"] }
        switch (r.type) {
          case "price_change":
            return { ...base, priceChangeThreshold: Number(r.priceChangeThreshold) || undefined }
          case "price_threshold":
            return { ...base, priceUpperThreshold: Number(r.priceUpperThreshold) || undefined, priceLowerThreshold: Number(r.priceLowerThreshold) || undefined }
          case "inventory_change":
            return { ...base, inventoryChangeThreshold: Number(r.inventoryChangeThreshold) || undefined }
          case "inventory_threshold":
            return { ...base, inventoryUpperThreshold: Number(r.inventoryUpperThreshold) || undefined, inventoryLowerThreshold: Number(r.inventoryLowerThreshold) || undefined }
          case "news_keyword":
            return { ...base, newsKeywords: r.newsKeywords ? r.newsKeywords.split(",").map((s) => s.trim()).filter(Boolean) : undefined }
          default:
            return base
        }
      }) as AlertRuleConfig[],
      reportEnabled: formData.reportEnabled,
      reportType: formData.reportType as "daily" | "weekly" | "monthly",
      notificationChannels: { email: true, inApp: true, sms: false },
    })
    setOpen(false)
    // 重置表单
    setFormData({
      name: "",
      description: "",
      targetType: "all",
      targetRegion: "",
      targetMarket: "",
      frequency: "daily",
      scheduleTime: "09:00",
      reportEnabled: true,
      reportType: "daily",
      alertRules: [],
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="gap-2 inline-flex items-center justify-center rounded-md text-sm font-medium">
        <Plus className="h-4 w-4" />
        新建订阅
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>创建追踪订阅</DialogTitle>
          <DialogDescription>配置追踪目标、频率和通知方式</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">订阅名称</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如：硫磺价格每日追踪"
            />
          </div>

          <div>
            <Label htmlFor="description">描述（可选）</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="订阅用途说明..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="targetType">追踪目标</Label>
            <Select value={formData.targetType} onValueChange={(v) => setFormData({ ...formData, targetType: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部（价格+库存+新闻）</SelectItem>
                <SelectItem value="price">价格</SelectItem>
                <SelectItem value="inventory">库存</SelectItem>
                <SelectItem value="news">新闻</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="targetRegion">目标区域（可选）</Label>
              <Input
                id="targetRegion"
                value={formData.targetRegion}
                onChange={(e) => setFormData({ ...formData, targetRegion: e.target.value })}
                placeholder="例如：华东"
              />
            </div>
            <div>
              <Label htmlFor="targetMarket">目标市场（可选）</Label>
              <Input
                id="targetMarket"
                value={formData.targetMarket}
                onChange={(e) => setFormData({ ...formData, targetMarket: e.target.value })}
                placeholder="例如：镇江港"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="frequency">执行频率</Label>
              <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">每小时</SelectItem>
                  <SelectItem value="daily">每天</SelectItem>
                  <SelectItem value="weekly">每周</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="scheduleTime">执行时间</Label>
              <Input
                id="scheduleTime"
                type="time"
                value={formData.scheduleTime}
                onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={formData.reportEnabled}
              onCheckedChange={(v) => setFormData({ ...formData, reportEnabled: v })}
            />
            <Label>生成报告</Label>
          </div>

          {formData.reportEnabled && (
            <div>
              <Label htmlFor="reportType">报告类型</Label>
              <Select value={formData.reportType} onValueChange={(v) => setFormData({ ...formData, reportType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">日报</SelectItem>
                  <SelectItem value="weekly">周报</SelectItem>
                  <SelectItem value="monthly">月报</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

          {/* 告警规则 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>告警规则</Label>
              <Button variant="outline" size="sm" onClick={addAlertRule} className="gap-1">
                <Plus className="h-3 w-3" />
                添加规则
              </Button>
            </div>

            {formData.alertRules.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂未设置告警规则，添加规则以在数据异常时触发告警</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {formData.alertRules.map((rule, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2 relative">
                    <div className="flex items-center gap-2">
                      <Select value={rule.type} onValueChange={(v) => updateAlertRule(index, { type: v })}>
                        <SelectTrigger className="flex-1 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="price_change">价格变化阈值</SelectItem>
                          <SelectItem value="price_threshold">价格绝对区间</SelectItem>
                          <SelectItem value="inventory_change">库存变化阈值</SelectItem>
                          <SelectItem value="inventory_threshold">库存绝对区间</SelectItem>
                          <SelectItem value="news_keyword">新闻关键词</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={rule.urgency} onValueChange={(v) => updateAlertRule(index, { urgency: v })}>
                        <SelectTrigger className="w-20 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">低</SelectItem>
                          <SelectItem value="normal">中</SelectItem>
                          <SelectItem value="high">高</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => removeAlertRule(index)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {(rule.type === "price_change" || rule.type === "inventory_change") && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">变化幅度 &gt;</span>
                        <Input
                          type="number"
                          className="h-8 w-24 text-sm"
                          placeholder="5"
                          value={rule.type === "price_change" ? (rule.priceChangeThreshold || "") : (rule.inventoryChangeThreshold || "")}
                          onChange={(e) => updateAlertRule(index, rule.type === "price_change" ? { priceChangeThreshold: e.target.value } : { inventoryChangeThreshold: e.target.value })}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    )}

                    {(rule.type === "price_threshold" || rule.type === "inventory_threshold") && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">区间</span>
                        <Input
                          type="number"
                          className="h-8 w-24 text-sm"
                          placeholder="下限"
                          value={rule.type === "price_threshold" ? (rule.priceLowerThreshold || "") : (rule.inventoryLowerThreshold || "")}
                          onChange={(e) => updateAlertRule(index, rule.type === "price_threshold" ? { priceLowerThreshold: e.target.value } : { inventoryLowerThreshold: e.target.value })}
                        />
                        <span className="text-sm text-muted-foreground">~</span>
                        <Input
                          type="number"
                          className="h-8 w-24 text-sm"
                          placeholder="上限"
                          value={rule.type === "price_threshold" ? (rule.priceUpperThreshold || "") : (rule.inventoryUpperThreshold || "")}
                          onChange={(e) => updateAlertRule(index, rule.type === "price_threshold" ? { priceUpperThreshold: e.target.value } : { inventoryUpperThreshold: e.target.value })}
                        />
                      </div>
                    )}

                    {rule.type === "news_keyword" && (
                      <Input
                        className="h-8 text-sm"
                        placeholder="多个关键词用逗号分隔，如: 检修,停产,制裁"
                        value={rule.newsKeywords || ""}
                        onChange={(e) => updateAlertRule(index, { newsKeywords: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.name}>
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==================== 主页面组件 ====================

export default function TrackerSubscriptionsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">订阅配置管理</h1>
          <p className="text-muted-foreground">创建和管理 Tracker 追踪订阅</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/market-analysis?tab=tracker">
            <Button variant="outline" className="gap-2">
              <Activity className="h-4 w-4" />
              返回追踪面板
            </Button>
          </Link>
          <CreateSubscriptionDialog />
        </div>
      </div>

      {/* 订阅列表 */}
      <SubscriptionList />
    </div>
  )
}