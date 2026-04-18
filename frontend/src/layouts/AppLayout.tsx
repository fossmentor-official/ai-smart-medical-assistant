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
      {/* SidebarProvider renders as a flex row — Sidebar + SidebarInset sit directly inside it */}
      <AppSidebar
        activeMode={activeMode}
        onModeChange={onModeChange}
        onDemoCase={onDemoCase}
      />
      <SidebarInset className="flex flex-col h-svh overflow-hidden bg-slate-50">
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}