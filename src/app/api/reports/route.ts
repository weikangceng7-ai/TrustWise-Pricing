import { NextRequest, NextResponse } from "next/server"
import { getReports, getReportStats, createReport, generateWeeklyReport, type ReportFilters } from "@/services/reports"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const filters: ReportFilters = {
      keyword: searchParams.get("keyword") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      trend: searchParams.get("trend") as ReportFilters["trend"] || undefined,
      risk: searchParams.get("risk") as ReportFilters["risk"] || undefined,
    }

    const statsOnly = searchParams.get("stats") === "true"
    const generate = searchParams.get("generate") === "true"

    if (statsOnly) {
      const stats = await getReportStats()
      return NextResponse.json({ success: true, stats })
    }

    if (generate) {
      const newReport = await generateWeeklyReport()
      if (newReport) {
        const report = await createReport(newReport)
        return NextResponse.json({ success: true, data: report })
      } else {
        return NextResponse.json(
          { success: false, error: "无法生成报告，请检查价格数据" },
          { status: 400 }
        )
      }
    }

    const reports = await getReports(filters)

    return NextResponse.json({
      success: true,
      data: reports,
      total: reports.length,
    })
  } catch (error) {
    console.error("获取报告数据失败:", error)
    return NextResponse.json(
      { success: false, error: "获取报告数据失败" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const report = await createReport(body)
    
    return NextResponse.json({
      success: true,
      data: report,
    })
  } catch (error) {
    console.error("创建报告失败:", error)
    return NextResponse.json(
      { success: false, error: "创建报告失败" },
      { status: 500 }
    )
  }
}
