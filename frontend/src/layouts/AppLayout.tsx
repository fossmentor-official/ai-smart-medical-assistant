import AppSidebar from "./AppSidebar"
import type { Mode } from "../types/clinical"
import type { User } from "../auth/AuthContext"

interface Props {
  children:     React.ReactNode
  activeMode:   Mode
  onModeChange: (m: Mode) => void
  onDemoCase:   (prompt: string, mode: Mode) => void
  onDemoEMR:    () => void
  onLiveEMR:    () => void
  user:         User | null
  onLogout:     () => void
}

export default function AppLayout({
  children, activeMode, onModeChange, onDemoCase, onDemoEMR, onLiveEMR, user, onLogout,
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
          user={user}
          onLogout={onLogout}
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
