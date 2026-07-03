import { test, expect } from "@playwright/test"

test.describe("报告页面测试", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/reports")
  })

  test("报告页面加载正常", async ({ page }) => {
    await expect(page).toHaveURL("/reports")
  })

  test("报告页面截图", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(3000)

    await page.screenshot({
      path: "screenshots/reports-page.png",
      fullPage: true,
    })
  })
})