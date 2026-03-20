/**
 * 扫描 `宜化价格预测/宜化价格预测/代码` 下的关键代码文件，写入 `yihua_code_items`。
 * 运行：`npm run db:seed:yihua-code`
 */
import "dotenv/config"
import { upsertYihuaCodeIndex, buildYihuaCodeIndex } from "@/services/yihua-code-index"
import { db } from "@/db"

async function main() {
  if (!process.env.DATABASE_URL || !db) {
    console.error("请配置 DATABASE_URL 后再执行种子脚本。")
    process.exit(1)
  }

  const rows = await buildYihuaCodeIndex()
  await upsertYihuaCodeIndex(rows)

  console.log(`已写入/跳过 ${rows.length} 条宜化代码元数据。`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

