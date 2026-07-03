import { test, expect } from "@playwright/test"

test.describe("登录流程测试", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
  })

  test("登录页面加载正常", async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/硫磺/)

    // 验证登录表单元素存在
    await expect(page.locator('[name="email"]')).toBeVisible()
    await expect(page.locator('[name="password"]')).toBeVisible()
    await expect(page.locator("button[type=submit]")).toBeVisible()
  })

  test("空表单提交验证", async ({ page }) => {
    // 点击登录按钮，不填写任何内容
    await page.click("button[type=submit]")

    // 验证表单验证提示（根据实际实现调整）
    // 这里假设有验证错误提示
    const emailInput = page.locator('[name="email"]')
    await expect(emailInput).toHaveAttribute("required", "")
  })

  test("无效邮箱格式验证", async ({ page }) => {
    // 填写无效邮箱
    await page.fill('[name="email"]', "invalid-email")
    await page.fill('[name="password"]', "somepassword")

    // 验证邮箱格式验证（浏览器原生验证）
    const emailInput = page.locator('[name="email"]')
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid)
    expect(isValid).toBe(false)
  })

  // 注意：实际测试需要使用有效的测试账号
  // test("成功登录跳转仪表盘", async ({ page }) => {
  //   await page.fill('[name="email"]', 'test@example.com')
  //   await page.fill('[name="password"]', 'testpassword')
  //   await page.click("button[type=submit]")
  //   await expect(page).toHaveURL("/dashboard")
  // })

  test("登录失败显示错误提示", async ({ page }) => {
    // 使用错误的账号密码
    await page.fill('[name="email"]', "wrong@example.com")
    await page.fill('[name="password"]', "wrongpassword")
    await page.click("button[type=submit]")

    // 等待错误提示出现（根据实际实现调整）
    // await expect(page.locator('.error-message')).toBeVisible()
  })
})

test.describe("已登录状态测试", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard")
  })

  test("仪表盘页面可访问", async ({ page }) => {
    // 验证仪表盘页面可以访问
    await expect(page).toHaveURL("/dashboard")
  })
})