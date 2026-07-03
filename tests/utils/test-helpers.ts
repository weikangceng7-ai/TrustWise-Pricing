import { Page } from "@playwright/test"

/**
 * 测试辅助工具函数
 */

/**
 * 等待页面加载完成
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState("networkidle")
}

/**
 * 登录辅助函数
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto("/login")
  await page.fill('[name="email"]', email)
  await page.fill('[name="password"]', password)
  await page.click("button[type=submit]")
  await page.waitForURL("/dashboard")
}

/**
 * 导出报告辅助函数
 */
export async function exportReport(page: Page, format: "word" | "excel") {
  // 点击导出按钮
  await page.click(`button:has-text("${format === "word" ? "Word" : "Excel"}")`)

  // 等待下载开始
  const downloadPromise = page.waitForEvent("download")
  const download = await downloadPromise

  // 返回下载文件名
  return download.suggestedFilename()
}

/**
 * 截图辅助函数
 */
export async function takeScreenshot(page: Page, name: string, fullPage = true) {
  await page.screenshot({
    path: `screenshots/${name}.png`,
    fullPage,
  })
}

/**
 * 等待 API 响应
 */
export async function waitForAPIResponse(page: Page, urlPattern: string) {
  return page.waitForResponse((response) => response.url().includes(urlPattern))
}

/**
 * 模拟用户操作延迟
 */
export async function simulateUserDelay(ms: number = 500) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}