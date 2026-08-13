// src/app/api/health/route.ts
import { NextResponse } from "next/server"
import { getRedis } from "@/lib/redis"

export async function GET() {
  const checks: Record<string, string> = {}

  // Database check
  if (process.env.DATABASE_URL) {
    checks.database = "configured"
  } else {
    checks.database = "missing"
  }

  // Redis check
  try {
    const redis = getRedis()
    if (redis) {
      await redis.ping()
      checks.redis = "connected"
    } else {
      checks.redis = "not_configured"
    }
  } catch {
    checks.redis = "error"
  }

  // Stripe check
  checks.stripe = process.env.STRIPE_SECRET_KEY ? "configured" : "not_configured"

  // AI check
  checks.ai = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY ? "configured" : "not_configured"

  const allConfigured = Object.values(checks).every((v) => v !== "missing" && v !== "error")

  return NextResponse.json({
    status: allConfigured ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    checks,
  })
}
