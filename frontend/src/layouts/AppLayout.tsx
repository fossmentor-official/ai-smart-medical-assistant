import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import AppSidebar from "./AppSidebar"

export default function AppLayout({ children }: any) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">

        {/* SIDEBAR */}
        <AppSidebar />

        {/* MAIN AREA */}
        <SidebarInset className="flex flex-1 min-w-0 flex-col">

          {/* TOP BAR */}
          <header className="h-14 flex items-center px-6 border-b bg-white/60 backdrop-blur shrink-0">
            <h1 className="text-sm font-medium">
              Total Cura AI Medical Assistant
            </h1>
          </header>

          {/* PAGE CONTENT */}
          <main className="flex-1 min-w-0 overflow-hidden p-6">
            {children}
          </main>

        </SidebarInset>

      </div>
    </SidebarProvider>
  )
}