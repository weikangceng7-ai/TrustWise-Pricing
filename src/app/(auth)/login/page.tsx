import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { LoginClient } from "./client"

export const metadata: Metadata = {
  title: "登录 - SulfurAI",
  description: "登录硫磺督价与采购智能决策系统",
}

export default async function LoginPage() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  })

  if (session) {
    redirect("/dashboard")
  }

  return <LoginClient />
}