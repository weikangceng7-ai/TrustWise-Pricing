import { NextResponse } from "next/server"
import { getYihuaCodeGraph } from "@/services/yihua-code-graph"

export async function GET(request: Request) {
  try {
    // 将查询参数转换为强约束的服务参数对象，避免前端拼参不规范导致异常。
    const url = new URL(request.url)
    const topFolder = url.searchParams.get("topFolder") ?? "all"
    const kind = url.searchParams.get("kind") ?? "all"
    const theme = url.searchParams.get("theme") ?? "all"
    const ontologyView = (url.searchParams.get("ontologyView") ?? "algorithm") as
      | "business"
      | "algorithm"
      | "data"
    const q = url.searchParams.get("q") ?? ""
    const maxFiles = url.searchParams.get("maxFiles")
      ? parseInt(url.searchParams.get("maxFiles")!, 10)
      : undefined

    const data = await getYihuaCodeGraph({
      topFolder,
      kind,
      theme,
      ontologyView,
      q,
      maxFiles,
    })

    // 统一 success/data 返回协议，便于前端 hooks 复用。
    return NextResponse.json({ success: true, data })
  } catch (e) {
    console.error("yihua code graph:", e)
    return NextResponse.json(
      { success: false, error: "获取代码知识图谱失败" },
      { status: 500 },
    )
  }
}

