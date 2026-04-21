import AppSidebar from "./AppSidebar"
import type { Mode } from "../types/clinical"

interface Props {
  children:     React.ReactNode
  activeMode:   Mode
  onModeChange: (m: Mode) => void
  onDemoCase:   (prompt: string, mode: Mode) => void
  onDemoEMR:    () => void
  onLiveEMR:    () => void
}

export default function AppLayout({
  children, activeMode, onModeChange, onDemoCase, onDemoEMR, onLiveEMR,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "fixed",
        top: 0,
        left: 0,
      }}
    >
      {/* Sidebar — fixed 256px */}
      <div
        style={{
          width: "256px",
          minWidth: "256px",
          maxWidth: "256px",
          height: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          flexShrink: 0,
        }}
      >
        <AppSidebar
          activeMode={activeMode}
          onModeChange={onModeChange}
          onDemoCase={onDemoCase}
          onDemoEMR={onDemoEMR}
          onLiveEMR={onLiveEMR}
        />
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  )
}
