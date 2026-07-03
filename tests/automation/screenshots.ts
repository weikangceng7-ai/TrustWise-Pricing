import { test } from "@playwright/test"

test.describe("页面截图自动化", () => {
  test.use({ storageState: "tests/utils/auth-state.json" })

  test("首页截图", async ({ page }) => {
    await page.goto("/")

    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: "screenshots/homepage.png",
      fullPage: true,
    })
  })

  test("登录页面截图", async ({ page }) => {
    // 不使用认证状态，直接访问登录页
    await page.context().clearCookies()
    await page.goto("/login")

    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: "screenshots/login-page.png",
      fullPage: true,
    })
  })

  test("仪表盘截图 - 多视口", async ({ page }) => {
    const viewports = [
      { name: "desktop", width: 1920, height: 1080 },
      { name: "laptop", width: 1366, height: 768 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "mobile", width: 375, height: 667 },
    ]

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto("/dashboard")

      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(2000)

      await page.screenshot({
        path: `screenshots/dashboard-${viewport.name}.png`,
        fullPage: true,
      })
    }
  })

  test("企业管理页面截图", async ({ page }) => {
    await page.goto("/enterprises")

    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: "screenshots/enterprises.png",
      fullPage: true,
    })
  })

  test("报告页面截图", async ({ page }) => {
    await page.goto("/reports")

    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000)

    // 截取完整页面
    await page.screenshot({
      path: "screenshots/reports-full.png",
      fullPage: true,
    })

    // 展开第一个报告并截图
    const firstReport = page.locator("[data-testid='report-item']").first()
    await firstReport.click()
    await page.waitForTimeout(500)

    await firstReport.screenshot({
      path: "screenshots/report-detail.png",
    })
  })

  test("AI 聊天页面截图", async ({ page }) => {
    await page.goto("/agent-chat")

    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: "screenshots/agent-chat.png",
      fullPage: true,
    })
  })

  test("知识图谱页面截图", async ({ page }) => {
    await page.goto("/yihua-code-graph")

    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2000) // 等待图谱渲染

    await page.screenshot({
      path: "screenshots/yihua-code-graph.png",
      fullPage: true,
    })
  })

  test("设置页面截图", async ({ page }) => {
    await page.goto("/settings")

    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: "screenshots/settings.png",
      fullPage: true,
    })
  })
})