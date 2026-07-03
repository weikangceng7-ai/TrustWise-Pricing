import { test } from "@playwright/test"

/**
 * 硫磺价格数据爬取示例
 *
 * 注意：此脚本仅供演示，实际爬取需要：
 * 1. 确认目标网站的数据使用许可
 * 2. 遵守网站的 robots.txt 规则
 * 3. 添加适当的请求间隔避免对目标服务器造成压力
 */

test.describe.skip("价格数据爬取", () => {
  test("爬取示例价格数据", async ({ page }) => {
    // 示例：访问价格数据源网站
    // 实际使用时替换为真实的数据源 URL
    const dataSourceUrl = "https://example.com/prices"

    await page.goto(dataSourceUrl)

    await page.waitForLoadState("networkidle")

    // 提取价格数据（根据目标网站结构调整选择器）
    const priceData = await page.evaluate(() => {
      const rows = document.querySelectorAll(".price-table tr")
      const data: Array<{
        date: string
        price: string
        region: string
      }> = []

      rows.forEach((row) => {
        const cells = row.querySelectorAll("td")
        if (cells.length >= 3) {
          data.push({
            date: cells[0]?.textContent?.trim() || "",
            price: cells[1]?.textContent?.trim() || "",
            region: cells[2]?.textContent?.trim() || "",
          })
        }
      })

      return data
    })

    // 打印爬取的数据
    console.log("爬取的价格数据:", priceData)

    // 可选：保存为 JSON 文件
    // import fs from 'fs'
    // fs.writeFileSync('scraped-data/prices.json', JSON.stringify(priceData, null, 2))

    expect(priceData.length).toBeGreaterThan(0)
  })

  test("爬取并截图数据源页面", async ({ page }) => {
    const dataSourceUrl = "https://example.com/prices"

    await page.goto(dataSourceUrl)

    await page.waitForLoadState("networkidle")

    // 截图保存数据源页面
    await page.screenshot({
      path: "screenshots/data-source-prices.png",
      fullPage: true,
    })
  })
})

/**
 * API 数据采集示例
 * 直接调用 API 获取数据，无需浏览器渲染
 */
test.describe.skip("API 数据采集", () => {
  test("通过 API 采集价格数据", async ({ request }) => {
    // 示例 API 端点
    const apiUrl = "https://api.example.com/v1/prices"

    const response = await request.get(apiUrl, {
      headers: {
        Accept: "application/json",
      },
    })

    expect(response.ok()).toBeTruthy()

    const data = await response.json()

    console.log("API 返回数据:", data)

    // 保存数据
    // import fs from 'fs'
    // fs.writeFileSync('scraped-data/api-prices.json', JSON.stringify(data, null, 2))
  })

  test("采集 EIA 石油价格数据", async ({ request }) => {
    // EIA API 示例（需要 API Key）
    const eiaApiKey = process.env.EIA_API_KEY
    if (!eiaApiKey) {
      test.skip()
      return
    }

    const response = await request.get(
      `https://api.eia.gov/v2/petroleum/pri/wpr/data/?api_key=${eiaApiKey}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    )

    if (response.ok()) {
      const data = await response.json()
      console.log("EIA 数据:", data)
    }
  })
})