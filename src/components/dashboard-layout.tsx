"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { TopNav } from "@/components/top-nav"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopNav />
        <div className="px-4 md:px-6 pt-1">
          <BreadcrumbNav />
        </div>
        <main className="flex-1 overflow-auto p-4 md:p-6 pt-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
