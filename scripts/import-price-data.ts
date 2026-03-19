/**
 * 数据导入脚本 - 将宜化价格预测文档中的数据导入到数据库
 * 运行方式: bun run scripts/import-price-data.ts
 */

import * as XLSX from "xlsx";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sulfurPrices, portInventory } from "../src/db/schema";

const DATA_DIR = "d:/市场方案agent/宜化价格预测/宜化价格预测/资料/数据";

async function main() {
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/sulfur_agent";
  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log("开始导入数据...\n");

  // 1. 导入隆众市场价格数据
  await importMarketPrices(db);

  // 2. 导入港口库存数据
  await importPortInventory(db);

  await client.end();
  console.log("\n数据导入完成!");
}

async function importMarketPrices(db: ReturnType<typeof drizzle>) {
  const filePath = `${DATA_DIR}/隆众市场价格-硫磺-20250909103019.xlsx`;
  console.log(`读取文件: ${filePath}`);

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

  // 跳过标题行
  const rows = data.slice(1);
  console.log(`发现 ${rows.length} 条价格记录`);

  const records = rows.map((row) => {
    const dateValue = row[0];
    let date: string;

    // 处理日期格式
    if (typeof dateValue === "number") {
      // Excel 日期序列号转换为日期
      const excelDate = new Date((dateValue as number - 25569) * 86400 * 1000);
      date = excelDate.toISOString().split("T")[0];
    } else if (typeof dateValue === "string") {
      date = dateValue.replace(/\//g, "-");
    } else {
      date = String(dateValue);
    }

    return {
      date,
      productName: String(row[1] || "硫磺"),
      region: String(row[2] || ""),
      market: String(row[3] || ""),
      specification: String(row[4] || ""),
      minPrice: row[5] ? String(row[5]) : null,
      maxPrice: row[6] ? String(row[6]) : null,
      mainPrice: row[7] ? String(row[7]) : null,
      changeValue: row[8] ? String(row[8]) : null,
      changePercent: String(row[9] || ""),
      unit: String(row[10] || "元/吨"),
      source: "隆众资讯",
    };
  });

  // 批量插入，每次100条
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await db.insert(sulfurPrices).values(batch).onConflictDoNothing();
    console.log(`已导入 ${Math.min(i + batchSize, records.length)}/${records.length} 条价格记录`);
  }
}

async function importPortInventory(db: ReturnType<typeof drizzle>) {
  const filePath = `${DATA_DIR}/港口库存.xlsx`;
  console.log(`\n读取文件: ${filePath}`);

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

  // 跳过标题行
  const rows = data.slice(1);
  console.log(`发现 ${rows.length} 条库存记录`);

  const records = rows.map((row) => {
    const dateValue = row[0];
    let date: string;

    // 处理日期格式（Excel序列号）
    if (typeof dateValue === "number") {
      const excelDate = new Date((dateValue as number - 25569) * 86400 * 1000);
      date = excelDate.toISOString().split("T")[0];
    } else {
      date = String(dateValue);
    }

    return {
      date,
      inventory: row[1] ? String(row[1]) : "0",
      price: row[2] ? String(row[2]) : null,
    };
  });

  // 批量插入
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await db.insert(portInventory).values(batch).onConflictDoNothing();
    console.log(`已导入 ${Math.min(i + batchSize, records.length)}/${records.length} 条库存记录`);
  }
}

main().catch(console.error);