import { config as loadEnv } from "dotenv"
import { resolve } from "path"
import { defineConfig } from "drizzle-kit"

loadEnv({ path: resolve(process.cwd(), ".env.local"), quiet: true })
loadEnv({ path: resolve(process.cwd(), ".env"), quiet: true })

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/sulfur_agent",
  },
})