import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { LoginClient } from "./client"

export default async function LoginPage() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  })

  if (session) {
    redirect("/dashboard")
  }

  return <LoginClient />
}