import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"
import { NextResponse } from "next/server"

const handler = toNextJsHandler(auth)

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      session: null,
      user: null,
    })
  }
  return handler.GET(request)
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      session: null,
      user: null,
    })
  }
  return handler.POST(request)
}
