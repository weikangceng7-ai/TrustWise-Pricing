import app from "@/lib/hono"
import { handle } from "hono/vercel"

// 将 Hono 应用适配为 Next.js Route Handler
export const GET = handle(app)
export const POST = handle(app)
export const OPTIONS = handle(app)
