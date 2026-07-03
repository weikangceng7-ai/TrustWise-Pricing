import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  // 测试目录
  testDir: "./tests",

  // 完全并行运行测试
  fullyParallel: true,

  // CI 上失败时禁止 test.only
  forbidOnly: !!process.env.CI,

  // CI 上失败时重试
  retries: process.env.CI ? 2 : 0,

  // CI 上限制并行 workers
  workers: process.env.CI ? 1 : undefined,

  // Reporter 配置
  reporter: "html",

  // 全局测试配置
  use: {
    // 基础 URL
    baseURL: "http://localhost:3000",

    // 收集失败测试的 trace
    trace: "on-first-retry",

    // 截图配置
    screenshot: "only-on-failure",

    // 视频录制（可选）
    video: "retain-on-failure",
  },

  // 测试项目配置
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    // 可选：添加其他浏览器测试
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },

    // 移动端测试（可选）
    // {
    //   name: "Mobile Chrome",
    //   use: { ...devices["Pixel 5"] },
    // },
  ],

  // 开发服务器配置
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})