/**
 * Firecrawl 网页爬取客户端
 *
 * 封装 Firecrawl SDK，提供统一的爬取/结构化提取/URL发现接口。
 * 遵循项目现有降级链模式：失败返回 null，不抛错，由上层处理。
 *
 * 文档: https://docs.firecrawl.dev
 */

import FirecrawlApp from "@mendable/firecrawl-js"
import { DATA_SOURCE_CONFIG } from "@/lib/constants"

// ---- 类型定义 ----

export interface ScrapedPage {
  url: string
  title: string
  markdown: string
  links?: string[]
  metadata?: Record<string, unknown>
}

export interface ExtractResult<T = Record<string, unknown>> {
  url: string
  data: T
}

// ---- SDK 单例 ----

let _client: FirecrawlApp | null = null

function getClient(): FirecrawlApp | null {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey || apiKey === "fc-xxxxx") {
    return null
  }
  if (!_client) {
    _client = new FirecrawlApp({ apiKey })
  }
  return _client
}

// ---- 核心方法 ----

/**
 * 爬取单个页面，返回 markdown 内容
 * 支持 JS 渲染页面（headless browser）
 */
export async function scrapePage(
  url: string,
  options?: { formats?: string[] }
): Promise<ScrapedPage | null> {
  const client = getClient()
  if (!client) {
    console.warn("Firecrawl 未配置，跳过爬取")
    return null
  }

  const { timeoutMs } = DATA_SOURCE_CONFIG.firecrawl

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const result = await client.scrapeUrl(url, {
      formats: (options?.formats as any[]) || ["markdown"],
      timeout: timeoutMs,
    })

    clearTimeout(timer)

    if (!result || !result.markdown) {
      console.warn(`Firecrawl 爬取无内容: ${url.slice(0, 80)}`)
      return null
    }

    return {
      url,
      title: (result.metadata as any)?.title || "",
      markdown: result.markdown,
      links: result.links as string[] | undefined,
      metadata: result.metadata as Record<string, unknown> | undefined,
    }
  } catch (error) {
    console.warn(`Firecrawl 爬取失败: ${url.slice(0, 80)}`, error)
    return null
  }
}

/**
 * 结构化提取：从页面中提取符合 schema 的 JSON 数据
 * 用于价格表、新闻列表等结构化数据提取
 */
export async function extractStructured<T = Record<string, unknown>>(
  url: string,
  prompt: string,
  schema: Record<string, unknown>
): Promise<ExtractResult<T> | null> {
  const client = getClient()
  if (!client) {
    console.warn("Firecrawl 未配置，跳过结构化提取")
    return null
  }

  const { timeoutMs } = DATA_SOURCE_CONFIG.firecrawl

  try {
    const result = await client.scrapeUrl(url, {
      formats: [{ type: "json", prompt, schema }],
      timeout: timeoutMs,
    })

    if (!result || !result.json) {
      console.warn(`Firecrawl 结构化提取无结果: ${url.slice(0, 80)}`)
      return null
    }

    return {
      url,
      data: result.json as T,
    }
  } catch (error) {
    console.warn(`Firecrawl 结构化提取失败: ${url.slice(0, 80)}`, error)
    return null
  }
}

/**
 * 发现网站 URL：爬取站点地图或首页，返回所有可访问链接
 */
export async function mapUrls(
  baseUrl: string,
  options?: { search?: string; limit?: number }
): Promise<string[]> {
  const client = getClient()
  if (!client) {
    console.warn("Firecrawl 未配置，跳过 URL 发现")
    return []
  }

  const { timeoutMs } = DATA_SOURCE_CONFIG.firecrawl

  try {
    const result = await client.mapUrl(baseUrl, {
      search: options?.search,
      timeout: timeoutMs,
    })

    if (!result || !result.links) {
      return []
    }

    // mapUrl 返回 SearchResultWeb[]，需要提取 url 字段
    const urls = result.links.map((link) => link.url).filter(Boolean)
    return options?.limit ? urls.slice(0, options.limit) : urls
  } catch (error) {
    console.warn(`Firecrawl URL 发现失败: ${baseUrl.slice(0, 80)}`, error)
    return []
  }
}

/**
 * 检查 Firecrawl 是否可用
 */
export function isFirecrawlAvailable(): boolean {
  return getClient() !== null
}
