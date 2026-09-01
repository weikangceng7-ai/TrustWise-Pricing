/**
 * Firecrawl 集成验证脚本
 *
 * 用法: npx tsx scripts/test-firecrawl.ts
 *
 * 验证流程:
 * 1. 检查 FIRECRAWL_API_KEY 是否配置
 * 2. 爬取一个硫磺行业页面
 * 3. 打印爬取结果
 * 4. 验证 embedding 生成（可选）
 */

import { config } from "dotenv"
import { resolve } from "path"

// 加载 .env.local
config({ path: resolve(__dirname, "../.env.local") })

import { scrapePage, isFirecrawlAvailable, mapUrls } from "../src/lib/firecrawl-client"
import { scrapeNewsFromSource, getSulfurNewsSources } from "../src/lib/sulfur-news-scraper"

async function main() {
  console.log("🔥 Firecrawl 集成验证\n")

  // 1. 检查配置
  console.log("📋 检查配置...")
  if (!isFirecrawlAvailable()) {
    console.error("❌ FIRECRAWL_API_KEY 未配置")
    console.log("\n请执行以下步骤:")
    console.log("1. 访问 https://firecrawl.dev 注册账号")
    console.log("2. 获取 API Key")
    console.log("3. 在 .env.local 中添加: FIRECRAWL_API_KEY=fc-xxxxx")
    process.exit(1)
  }
  console.log("✅ Firecrawl API Key 已配置\n")

  // 2. 显示配置的硫磺行业源
  console.log("📰 配置的硫磺行业数据源:")
  const sources = getSulfurNewsSources()
  sources.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name}: ${s.url}`)
  })
  console.log()

  // 3. 测试爬取第一个源
  console.log("🕷️  测试爬取第一个数据源...")
  const testSource = {
    name: sources[0].name,
    channelUrl: sources[0].url,
    searchKeywords: ["硫磺", "sulfur"],
    urlFilters: ["/sulfur", "/news", "/article"],
  }

  // 先爬取页面查看原始内容
  const rawPage = await scrapePage(testSource.channelUrl)

  if (rawPage) {
    console.log("\n📄 原始页面内容（前 1000 字符）:")
    console.log(rawPage.markdown.slice(0, 1000))
    console.log("\n" + "=".repeat(50) + "\n")
  }

  const result = await scrapeNewsFromSource(testSource)

  if (!result.success) {
    console.error(`❌ 爬取失败: ${result.error}`)
    process.exit(1)
  }

  console.log(`✅ 爬取成功: ${result.count} 条新闻\n`)

  if (result.items.length > 0) {
    console.log("📄 前 3 条新闻:")
    result.items.slice(0, 3).forEach((item, i) => {
      console.log(`\n  ${i + 1}. ${item.title}`)
      console.log(`     日期: ${item.date}`)
      console.log(`     链接: ${item.url}`)
      if (item.summary) {
        console.log(`     摘要: ${item.summary.slice(0, 100)}...`)
      }
    })
  } else {
    console.log("⚠️  未提取到新闻，需要调整提取逻辑")
  }

  // 4. 测试爬取单个页面（可选）
  console.log("\n\n🔍 测试爬取单个页面...")
  const testUrl = "https://www.baiinfo.com/sulfur"
  const page = await scrapePage(testUrl)

  if (page) {
    console.log(`✅ 页面爬取成功`)
    console.log(`   标题: ${page.title}`)
    console.log(`   内容长度: ${page.markdown.length} 字符`)
    console.log(`   链接数: ${page.links?.length || 0}`)

    // 显示前 500 字符
    console.log(`\n📝 内容预览 (前 500 字符):`)
    console.log(page.markdown.slice(0, 500))
  } else {
    console.log("⚠️  页面爬取失败（可能是网站结构变化或需要登录）")
  }

  // 5. 测试 URL 发现（可选）
  console.log("\n\n🗺️  测试 URL 发现...")
  const urls = await mapUrls("https://www.baiinfo.com", {
    search: "硫磺",
    limit: 10,
  })

  if (urls.length > 0) {
    console.log(`✅ 发现 ${urls.length} 个硫磺相关 URL:`)
    urls.slice(0, 5).forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`)
    })
  } else {
    console.log("⚠️  未发现相关 URL")
  }

  console.log("\n\n✅ 验证完成!")
  console.log("\n下一步:")
  console.log("1. 运行开发服务器: npm run dev")
  console.log("2. 访问: http://localhost:3000/api/cron/ingest-web-content")
  console.log("3. 检查数据库 knowledge_chunks 表是否有新数据")
}

main().catch((error) => {
  console.error("验证失败:", error)
  process.exit(1)
})
