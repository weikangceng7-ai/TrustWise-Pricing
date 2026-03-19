import app from "@/lib/hono"
import { handle } from "hono/vercel"

// API 路由最大执行时间（秒）
export const maxDuration = 30

// 将 Hono 应用适配为 Next.js Route Handler
export const GET = handle(app)
export const POST = handle(app)
export const OPTIONS = handle(app)
