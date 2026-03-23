"use client"

import { useState, useRef } from "react"
import { Upload, Image as ImageIcon, Copy, Check, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface ImageInfo {
  key: string
  url: string
}

export default function SettingsPage() {
  const [images, setImages] = useState<ImageInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchImages = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/r2")
      const data = await res.json()
      if (data.success) {
        setImages(data.images || [])
      } else {
        setError(data.error || "获取图片列表失败")
      }
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/r2", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (data.success) {
        setImages(prev => [...prev, { key: data.key, url: data.url }])
      } else {
        setError(data.error || "上传失败")
      }
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch (err) {
      console.error("复制失败:", err)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 返回按钮 */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">图片管理</h1>
          <p className="text-slate-400 text-sm">
            上传图片到 Cloudflare R2，用作页面背景
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-300 text-sm">
            {error}
          </div>
        )}

        {/* 上传区域 */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <h2 className="text-lg font-semibold mb-4">上传图片</h2>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-cyan-500/50 hover:bg-white/5 transition-all"
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
                <span className="text-slate-400">上传中...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-slate-400" />
                <span className="text-slate-400">点击选择图片上传</span>
                <span className="text-xs text-slate-500">支持 JPG、PNG、WebP 格式</span>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
        </div>

        {/* 图片列表 */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">已上传的图片</h2>
            <button
              onClick={fetchImages}
              disabled={isLoading}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
            >
              {isLoading ? "加载中..." : "刷新列表"}
            </button>
          </div>

          {images.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>暂无图片</p>
              <p className="text-xs text-slate-500 mt-1">上传图片后会显示在这里</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {images.map((img) => (
                <div
                  key={img.key}
                  className="bg-white/5 rounded-xl p-3 border border-white/10 hover:border-white/20 transition-colors"
                >
                  <div className="aspect-video bg-slate-800 rounded-lg mb-3 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.key}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 truncate flex-1">
                      {img.key.split("/").pop()}
                    </span>
                    <button
                      onClick={() => copyUrl(img.url)}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      title="复制 URL"
                    >
                      {copiedUrl === img.url ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 使用说明 */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <h2 className="text-lg font-semibold mb-4">使用说明</h2>
          <ol className="space-y-3 text-sm text-slate-400">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">1</span>
              <span>在 Cloudflare Dashboard 创建 R2 存储桶</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">2</span>
              <span>创建 API Token，获取 Access Key ID 和 Secret Access Key</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">3</span>
              <span>将以下环境变量添加到 <code className="bg-white/10 px-1.5 py-0.5 rounded">.env.local</code> 文件：</span>
            </li>
          </ol>

          <div className="mt-4 bg-black/30 rounded-lg p-4 text-xs font-mono text-slate-300 space-y-1">
            <p>R2_ACCOUNT_ID=你的账户ID</p>
            <p>R2_ACCESS_KEY_ID=你的AccessKeyID</p>
            <p>R2_SECRET_ACCESS_KEY=你的SecretAccessKey</p>
            <p>R2_BUCKET_NAME=你的存储桶名称</p>
            <p>R2_PUBLIC_URL=https://pub-xxx.r2.dev</p>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            配置完成后，重启开发服务器即可使用图片上传功能。
          </p>
        </div>
      </div>
    </div>
  )
}