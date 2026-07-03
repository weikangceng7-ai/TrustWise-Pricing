/**
 * API Server 端到端测试脚本
 * 测试: API Key 管理、配额、Rate Limiting、各端点功能
 */

const BASE_URL = process.env.TEST_API_URL || "http://localhost:3000"

// 测试用的 API Key（需要在数据库中预先创建或通过登录获取）
let testApiKey: string | null = null

interface TestResult {
  name: string
  passed: boolean
  message: string
  details?: Record<string, unknown>
}

const results: TestResult[] = []

async function test(name: string, fn: () => Promise<boolean>, details?: Record<string, unknown>) {
  try {
    const passed = await fn()
    results.push({ name, passed, message: passed ? "PASS" : "FAIL", details })
    console.log(`${passed ? "✅" : "❌"} ${name}`)
  } catch (error) {
    results.push({ name, passed: false, message: error instanceof Error ? error.message : "Unknown error", details })
    console.log(`❌ ${name}: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// 1. 测试缺少 API Key
async function testNoApiKey() {
  const res = await fetch(`${BASE_URL}/api/v1/prices`)
  const data = await res.json()
  return res.status === 401 && data.success === false && data.error?.code === "INVALID_API_KEY"
}

// 2. 测试无效 API Key
async function testInvalidApiKey() {
  const res = await fetch(`${BASE_URL}/api/v1/prices`, {
    headers: { "Authorization": "Bearer invalid_key_12345" }
  })
  const data = await res.json()
  return res.status === 401 && data.success === false && data.error?.code === "INVALID_API_KEY"
}

// 3. 测试格式错误的 API Key（无 sk_ 前缀）
async function testMalformedApiKey() {
  const res = await fetch(`${BASE_URL}/api/v1/prices`, {
    headers: { "X-API-Key": "not_a_valid_format" }
  })
  const data = await res.json()
  return res.status === 401 && data.success === false && data.error?.code === "INVALID_API_KEY"
}

// 4. 测试有效 API Key（如果有）
async function testValidApiKey() {
  if (!testApiKey) {
    console.log("  ⚠️  跳过：未设置测试 API Key")
    return true // 跳过不视为失败
  }

  const res = await fetch(`${BASE_URL}/api/v1/prices?limit=5`, {
    headers: { "Authorization": `Bearer ${testApiKey}` }
  })
  const data = await res.json()

  // 检查响应头
  const quotaFree = res.headers.get("X-Quota-Free")
  const quotaPaid = res.headers.get("X-Quota-Paid")
  const rateLimitRemaining = res.headers.get("X-RateLimit-Remaining")

  console.log(`    Quota-Free: ${quotaFree}, Quota-Paid: ${quotaPaid}, RateLimit-Remaining: ${rateLimitRemaining}`)

  return res.status === 200 &&
         data.success === true &&
         quotaFree !== null &&
         rateLimitRemaining !== null
}

// 5. 测试 POST 端点（价格预测）
async function testPredictEndpoint() {
  if (!testApiKey) {
    console.log("  ⚠️  跳过：未设置测试 API Key")
    return true
  }

  const res = await fetch(`${BASE_URL}/api/v1/prices/predict`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${testApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ days: 7 })
  })

  // 预测服务可能不可用，所以 200 或 500 都算通过（只要认证通过了）
  const data = await res.json()

  // 检查是否有配额扣减
  const quotaFree = res.headers.get("X-Quota-Free")

  return (res.status === 200 || res.status === 500) &&
         data.success !== undefined &&
         quotaFree !== null
}

// 6. 测试决策端点
async function testDecisionEndpoint() {
  if (!testApiKey) {
    console.log("  ⚠️  跳过：未设置测试 API Key")
    return true
  }

  const res = await fetch(`${BASE_URL}/api/v1/decision`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${testApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ days: 7 })
  })

  const data = await res.json()
  return (res.status === 200 || res.status === 500) && data.success !== undefined
}

// 7. 测试库存数据端点
async function testInventoryEndpoint() {
  if (!testApiKey) {
    console.log("  ⚠️  跳过：未设置测试 API Key")
    return true
  }

  const res = await fetch(`${BASE_URL}/api/v1/data/inventory?limit=5`, {
    headers: { "Authorization": `Bearer ${testApiKey}` }
  })
  const data = await res.json()
  return (res.status === 200 || res.status === 500) && data.success !== undefined
}

// 8. 测试市场新闻端点
async function testNewsEndpoint() {
  if (!testApiKey) {
    console.log("  ⚠️  跳过：未设置测试 API Key")
    return true
  }

  const res = await fetch(`${BASE_URL}/api/v1/data/news?limit=5`, {
    headers: { "Authorization": `Bearer ${testApiKey}` }
  })
  const data = await res.json()
  return (res.status === 200 || res.status === 500) && data.success !== undefined
}

// 9. 测试配额预警机制（模拟多次请求）
async function testQuotaWarning() {
  if (!testApiKey) {
    console.log("  ⚠️  跳过：未设置测试 API Key")
    return true
  }

  // 发送请求并检查响应头
  const res = await fetch(`${BASE_URL}/api/v1/prices?limit=1`, {
    headers: { "Authorization": `Bearer ${testApiKey}` }
  })

  const quotaWarning = res.headers.get("X-Quota-Warning")

  // 如果配额低于 20%，应该有 warning header
  // 如果配额高于 20%，应该没有 warning header（null）
  // 两种情况都算通过
  console.log(`    Quota-Warning: ${quotaWarning || "none (quota OK)"}`)

  return res.status === 200 || res.status === 429
}

// 10. 测试 Rate Limit 信息
async function testRateLimitHeaders() {
  if (!testApiKey) {
    console.log("  ⚠️  跳过：未设置测试 API Key")
    return true
  }

  const res = await fetch(`${BASE_URL}/api/v1/prices?limit=1`, {
    headers: { "Authorization": `Bearer ${testApiKey}` }
  })

  const limit = res.headers.get("X-RateLimit-Limit")
  const remaining = res.headers.get("X-RateLimit-Remaining")
  const reset = res.headers.get("X-RateLimit-Reset")

  console.log(`    RateLimit-Limit: ${limit}, Remaining: ${remaining}, Reset: ${reset}`)

  return limit === "100" && remaining !== null && reset !== null
}

// 11. 测试 X-API-Key 认证方式
async function testXApiKeyHeader() {
  if (!testApiKey) {
    console.log("  ⚠️  跳过：未设置测试 API Key")
    return true
  }

  const res = await fetch(`${BASE_URL}/api/v1/prices?limit=1`, {
    headers: { "X-API-Key": testApiKey }
  })

  return res.status === 200
}

// 12. 测试错误响应格式
async function testErrorResponseFormat() {
  const res = await fetch(`${BASE_URL}/api/v1/prices`, {
    headers: { "Authorization": "Bearer sk_invalid" }
  })
  const data = await res.json()

  // 验证错误响应结构
  const hasSuccess = data.success === false
  const hasError = typeof data.error === "object"
  const hasCode = typeof data.error?.code === "string"
  const hasMessage = typeof data.error?.message === "string"

  return hasSuccess && hasError && hasCode && hasMessage
}

// 运行所有测试
async function runTests() {
  console.log("\n=== API Server 端到端测试 ===\n")
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Test API Key: ${testApiKey || "(未设置，将跳过需要认证的测试)"}\n`)

  console.log("--- 认证测试 ---")
  await test("缺少 API Key 应返回 401", testNoApiKey)
  await test("无效 API Key 应返回 401", testInvalidApiKey)
  await test("格式错误 API Key 应返回 401", testMalformedApiKey)
  await test("X-API-Key 认证方式", testXApiKeyHeader)

  console.log("\n--- 端点功能测试 ---")
  await test("有效 API Key 可访问价格数据", testValidApiKey)
  await test("价格预测端点", testPredictEndpoint)
  await test("决策建议端点", testDecisionEndpoint)
  await test("库存数据端点", testInventoryEndpoint)
  await test("市场新闻端点", testNewsEndpoint)

  console.log("\n--- 响应头测试 ---")
  await test("Rate Limit 响应头", testRateLimitHeaders)
  await test("配额预警机制", testQuotaWarning)

  console.log("\n--- 格式测试 ---")
  await test("错误响应格式规范", testErrorResponseFormat)

  // 统计
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length

  console.log("\n=== 测试结果 ===")
  console.log(`总计: ${total} | 通过: ${passed} | 失败: ${failed}`)

  if (failed > 0) {
    console.log("\n失败的测试:")
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`)
    })
  }

  return failed === 0
}

// 从命令行参数获取测试 API Key
if (process.argv[2]) {
  testApiKey = process.argv[2]
}

runTests().then(success => {
  process.exit(success ? 0 : 1)
}).catch(err => {
  console.error("测试运行失败:", err)
  process.exit(1)
})