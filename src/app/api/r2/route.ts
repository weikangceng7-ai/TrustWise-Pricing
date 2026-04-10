import { NextRequest, NextResponse } from "next/server"

/**
 * Cloudflare R2 图片上传 API
 *
 * 需要配置以下环境变量：
 * - R2_ACCOUNT_ID: Cloudflare 账户 ID
 * - R2_ACCESS_KEY_ID: R2 API Token Access Key ID
 * - R2_SECRET_ACCESS_KEY: R2 API Token Secret Access Key
 * - R2_BUCKET_NAME: R2 存储桶名称
 * - R2_PUBLIC_URL: R2 公开访问域名（可选）
 */

// R2 S3 API 端点
function getR2Endpoint(accountId: string): string {
  return `https://${accountId}.r2.cloudflarestorage.com`
}

// 生成简单的签名（用于 S3 API）
async function signRequest(
  method: string,
  path: string,
  headers: Record<string, string>,
  body: ArrayBuffer | null,
  accessKey: string,
  secretKey: string,
  region: string = "auto"
): Promise<string> {
  const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "")
  const dateShort = date.slice(0, 8)

  // 创建规范请求
  const canonicalHeaders = Object.entries(headers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k.toLowerCase()}:${v}`)
    .join("\n")

  const signedHeaders = Object.keys(headers)
    .sort()
    .map(k => k.toLowerCase())
    .join(";")

  const payloadHash = await crypto.subtle.digest(
    "SHA-256",
    body || new TextEncoder().encode("")
  ).then(hash =>
    Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")
  )

  const canonicalRequest = [
    method,
    path,
    "",
    canonicalHeaders,
    "",
    signedHeaders,
    payloadHash
  ].join("\n")

  // 创建待签名字符串
  const credentialScope = `${dateShort}/${region}/s3/aws4_request`
  const canonicalRequestHash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalRequest)
  ).then(hash =>
    Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")
  )

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    date,
    credentialScope,
    canonicalRequestHash
  ].join("\n")

  // 计算签名
  const encoder = new TextEncoder()
  const kDate = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`AWS4${secretKey}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  ).then(key =>
    crypto.subtle.sign("HMAC", key, encoder.encode(dateShort))
  )

  const kRegion = await crypto.subtle.importKey(
    "raw",
    kDate,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  ).then(key =>
    crypto.subtle.sign("HMAC", key, encoder.encode(region))
  )

  const kService = await crypto.subtle.importKey(
    "raw",
    kRegion,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  ).then(key =>
    crypto.subtle.sign("HMAC", key, encoder.encode("s3"))
  )

  const kSigning = await crypto.subtle.importKey(
    "raw",
    kService,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  ).then(key =>
    crypto.subtle.sign("HMAC", key, encoder.encode("aws4_request"))
  )

  const signature = await crypto.subtle.importKey(
    "raw",
    kSigning,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  ).then(key =>
    crypto.subtle.sign("HMAC", key, encoder.encode(stringToSign))
  ).then(sig =>
    Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")
  )

  return signature
}

export async function POST(request: NextRequest) {
  try {
    // 检查环境变量
    const accountId = process.env.R2_ACCOUNT_ID
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
    const bucketName = process.env.R2_BUCKET_NAME
    const publicUrl = process.env.R2_PUBLIC_URL

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      return NextResponse.json({
        success: false,
        error: "R2 配置缺失，请检查环境变量",
        required: ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"]
      }, { status: 500 })
    }

    // 解析表单数据
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const customKey = formData.get("key") as string | null

    if (!file) {
      return NextResponse.json({
        success: false,
        error: "未提供文件"
      }, { status: 400 })
    }

    // 生成文件名
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const ext = file.name.split(".").pop() || "jpg"
    const key = customKey || `images/${timestamp}-${randomStr}.${ext}`

    // 读取文件内容
    const body = await file.arrayBuffer()

    // 准备请求头
    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "")
    const dateShort = date.slice(0, 8)
    const contentType = file.type || "application/octet-stream"
    const contentLength = body.byteLength.toString()

    const headers: Record<string, string> = {
      "Host": `${accountId}.r2.cloudflarestorage.com`,
      "Content-Length": contentLength,
      "Content-Type": contentType,
      "X-Amz-Date": date,
    }

    // 生成签名
    const signature = await signRequest(
      "PUT",
      `/${bucketName}/${key}`,
      headers,
      body,
      accessKeyId,
      secretAccessKey
    )

    const signedHeaders = Object.keys(headers)
      .sort()
      .map(k => k.toLowerCase())
      .join(";")

    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${dateShort}/auto/s3/aws4_request, SignedHeaders=${signedHeaders}, Signature=${signature}`

    // 上传到 R2
    const endpoint = getR2Endpoint(accountId)
    const uploadUrl = `${endpoint}/${bucketName}/${key}`

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        ...headers,
        "Authorization": authorization,
      },
      body,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("R2 upload error:", errorText)
      return NextResponse.json({
        success: false,
        error: `上传失败: ${response.status}`,
        details: errorText
      }, { status: 500 })
    }

    // 返回结果
    const fileUrl = publicUrl ? `${publicUrl}/${key}` : key

    return NextResponse.json({
      success: true,
      key,
      url: fileUrl,
      publicUrl: publicUrl ? `${publicUrl}/${key}` : null,
      size: contentLength,
      contentType,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "上传失败"
    }, { status: 500 })
  }
}

// 获取图片列表
export async function GET() {
  try {
    const accountId = process.env.R2_ACCOUNT_ID
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
    const bucketName = process.env.R2_BUCKET_NAME
    const publicUrl = process.env.R2_PUBLIC_URL

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      return NextResponse.json({
        success: false,
        error: "R2 配置缺失"
      }, { status: 500 })
    }

    // 准备请求头
    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "")
    const dateShort = date.slice(0, 8)

    const headers: Record<string, string> = {
      "Host": `${accountId}.r2.cloudflarestorage.com`,
      "X-Amz-Date": date,
    }

    // 生成签名
    const signature = await signRequest(
      "GET",
      `/${bucketName}`,
      headers,
      null,
      accessKeyId,
      secretAccessKey
    )

    const signedHeaders = Object.keys(headers)
      .sort()
      .map(k => k.toLowerCase())
      .join(";")

    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${dateShort}/auto/s3/aws4_request, SignedHeaders=${signedHeaders}, Signature=${signature}`

    // 列出对象
    const endpoint = getR2Endpoint(accountId)
    const listUrl = `${endpoint}/${bucketName}?list-type=2&prefix=images/`

    const response = await fetch(listUrl, {
      method: "GET",
      headers: {
        ...headers,
        "Authorization": authorization,
      },
    })

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `获取列表失败: ${response.status}`
      }, { status: 500 })
    }

    const xmlText = await response.text()

    // 简单解析 XML 获取文件列表
    const keys: string[] = []
    const keyMatches = xmlText.matchAll(/<Key>([^<]+)<\/Key>/g)
    for (const match of keyMatches) {
      keys.push(match[1])
    }

    return NextResponse.json({
      success: true,
      images: keys.map(key => ({
        key,
        url: publicUrl ? `${publicUrl}/${key}` : key,
      })),
      publicUrl,
    })
  } catch (error) {
    console.error("List error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "获取列表失败"
    }, { status: 500 })
  }
}