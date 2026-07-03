import { test } from "@playwright/test"

test.describe("报告自动导出", () => {
  test.use({ storageState: "tests/utils/auth-state.json" })

  test("导出所有报告为 Word", async ({ page }) => {
    await page.goto("/reports")

    // 等待报告列表加载
    await page.waitForLoadState("networkidle")

    // 获取所有报告卡片
    const reportCards = await page.locator("[data-testid='report-item']").all()

    // 遍历导出每个报告
    for (let i = 0; i < Math.min(reportCards.length, 3); i++) {
      const card = reportCards[i]

      // 点击展开报告
      await card.click()
      await page.waitForTimeout(500)

      // 点击 Word 导出按钮
      const downloadPromise = page.waitForEvent("download")
      await page.click(`button:has-text("Word")`)

      const download = await downloadPromise
      const filename = download.suggestedFilename()

      console.log(`已导出报告: ${filename}`)

      // 保存下载文件
      await download.saveAs(`exports/${filename}`)

      // 折叠报告
      await card.click()
      await page.waitForTimeout(300)
    }
  })

  test("导出所有报告为 Excel", async ({ page }) => {
    await page.goto("/reports")

    await page.waitForLoadState("networkidle")

    const reportCards = await page.locator("[data-testid='report-item']").all()

    for (let i = 0; i < Math.min(reportCards.length, 3); i++) {
      const card = reportCards[i]

      await card.click()
      await page.waitForTimeout(500)

      const downloadPromise = page.waitForEvent("download")
      await page.click(`button:has-text("Excel")`)

      const download = await downloadPromise
      const filename = download.suggestedFilename()

      console.log(`已导出报告: ${filename}`)

      await download.saveAs(`exports/${filename}`)

      await card.click()
      await page.waitForTimeout(300)
    }
  })

  test("批量截图所有报告", async ({ page }) => {
    await page.goto("/reports")

    await page.waitForLoadState("networkidle")

    const reportCards = await page.locator("[data-testid='report-item']").all()

    for (let i = 0; i < reportCards.length; i++) {
      // 展开每个报告
      await reportCards[i].click()
      await page.waitForTimeout(500)

      // 截图展开后的报告卡片
      await reportCards[i].screenshot({
        path: `screenshots/report-${i + 1}.png`,
      })

      // 折叠
      await reportCards[i].click()
      await page.waitForTimeout(300)
    }
  })
})