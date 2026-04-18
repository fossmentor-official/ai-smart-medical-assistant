import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import AppSidebar from "./AppSidebar"
import type { Mode } from "../types/clinical"

interface Props {
  children: React.ReactNode
  activeMode: Mode
  onModeChange: (m: Mode) => void
  onDemoCase: (prompt: string, mode: Mode) => void
}

export default function AppLayout({ children, activeMode, onModeChange, onDemoCase }: Props) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50">
        <AppSidebar
          activeMode={activeMode}
          onModeChange={onModeChange}
          onDemoCase={onDemoCase}
        />
        <SidebarInset className="flex flex-1 min-w-0 flex-col overflow-hidden">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}