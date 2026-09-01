import { config } from "dotenv"
import { resolve } from "node:path"

// 加载 .env.local
config({ path: resolve(process.cwd(), ".env.local") })

async function main() {
  const { db } = await import("../src/db")
  const { createApiKey } = await import("../src/lib/api-auth")

  if (!db) {
    console.error("❌ 数据库不可用")
    process.exit(1)
  }

  console.log("🔑 创建 MCP 测试 API Key...")

  try {
    const apiKey = await createApiKey("MCP Test Key")

    console.log("\n" + "=".repeat(60))
    console.log("✅ API Key 创建成功！")
    console.log("=".repeat(60))
    console.log(`\n  ${apiKey.key}\n`)
    console.log("=".repeat(60))
    console.log("\n📋 MCP Server 配置（mcp-server/.env）:")
    console.log(`  API_BASE_URL=http://localhost:3000`)
    console.log(`  API_KEY=${apiKey.key}`)
    console.log(`  INDUSTRY_CODE=sulfur`)
    console.log(`  MCP_TRANSPORT=stdio`)
    console.log(`  DEMO_MODE=false`)
    console.log("\n📋 Claude Desktop 配置 (claude_desktop_config.json):")
    console.log(`  在 mcpServers 中添加:`)
    console.log(`  "sulfur": {`)
    console.log(`    "command": "npx",`)
    console.log(`    "args": ["tsx", "mcp-server/index.ts"],`)
    console.log(`    "cwd": "D:\\\\市场方案agent\\\\sulfur-agent-web",`)
    console.log(`    "env": {`)
    console.log(`      "API_BASE_URL": "http://localhost:3000",`)
    console.log(`      "API_KEY": "${apiKey.key}",`)
    console.log(`      "DEMO_MODE": "false"`)
    console.log(`    }`)
    console.log(`  }`)
    console.log("=".repeat(60))

    process.exit(0)
  } catch (error: any) {
    console.error("❌ 创建失败:", error.message)
    process.exit(1)
  }
}

main().catch(e => {
  console.error("❌ 执行失败:", e)
  process.exit(1)
})
