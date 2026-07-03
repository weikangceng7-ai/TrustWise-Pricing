import { test, expect } from "@playwright/test"

test.describe("仪表盘页面测试", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard")
  })

  test("仪表盘页面加载正常", async ({ page }) => {
    await expect(page).toHaveURL("/dashboard")
  })

  test("仪表盘页面截图", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(3000)

    await page.screenshot({
      path: "screenshots/dashboard-full.png",
      fullPage: true,
    })
  })

  test("仪表盘桌面端截图", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto("/dashboard")

    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(3000)

    await page.screenshot({
      path: "screenshots/dashboard-desktop.png",
    })
  })

  test("仪表盘移动端截图", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto("/dashboard")

    await page.waitForLoadState("domcontentloaded")
    await page.waitForTimeout(3000)

    await page.screenshot({
      path: "screenshots/dashboard-mobile.png",
      fullPage: true,
    })
  })
})