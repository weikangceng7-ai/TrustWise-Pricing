import { test as setup } from "@playwright/test"

/**
 * 认证设置文件
 * 用于在测试前保存登录状态，避免每个测试都重新登录
 */

setup("登录认证", async ({ page }) => {
  // 执行登录
  await page.goto("/login")

  // 填写登录表单（根据实际表单调整）
  await page.fill('[name="email"]', process.env.TEST_USER_EMAIL || "test@example.com")
  await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD || "testpassword")

  // 点击登录按钮
  await page.click("button[type=submit]")

  // 等待登录成功，跳转到仪表盘
  await page.waitForURL("/dashboard")

  // 保存认证状态到文件
  await page.context().storageState({ path: "tests/utils/auth-state.json" })
})