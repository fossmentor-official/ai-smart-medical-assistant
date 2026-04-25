// frontend/src/App.tsx
import { useState } from "react"
import { AuthProvider, useAuth } from "./auth/AuthContext"
import AuthPage from "./auth/AuthPage"
import AppLayout from "./layouts/AppLayout"
import ChatBox from "./components/ChatBox"
import DemoVoiceEMR from "@/components/DemoVoiceEMR"
import LiveVoiceEMR from "@/components/LiveVoiceEMR"
import type { Mode } from "./types/clinical"
import AIInsightsDashboard from "@/pages/AIInsightsDashboard";
import SmartDemoBooking from "@/components/SmartDemoBooking"
import UseCaseSimulator from "@/components/UseCaseSimulator"    // ← NEW
import type { AppView } from "./types/appView"

function AuthedApp() {
  const { user, logout } = useAuth()
  const [mode, setMode]  = useState<Mode>("clinical")
  const [view, setView]  = useState<AppView>("chat")
  const [pendingPrompt, setPendingPrompt] = useState<{ text: string; mode: Mode } | null>(null)
  const [demoEMROpen, setDemoEMROpen] = useState(false)
  const [liveEMROpen, setLiveEMROpen] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)    // ← NEW

  const handleDemoCase = (prompt: string, demoMode: Mode) => {
    setMode(demoMode)
    setPendingPrompt({ text: prompt, mode: demoMode })
    setView("chat")                                              // ← NEW: always switch back to chat on demo
  }

  return (
    <>
      <AppLayout
        activeMode={mode}
        onModeChange={setMode}
        onDemoCase={handleDemoCase}
        onDemoEMR={() => setDemoEMROpen(true)}
        onLiveEMR={() => setLiveEMROpen(true)}
        onBookDemo={() => setBookingOpen(true)}                  // ← NEW
        onNavigate={setView}                                     // ← NEW: pass view switcher to layout/sidebar
        activeView={view}                                        // ← NEW: pass active view for sidebar highlighting
        user={user}
        onLogout={() => void logout()}
      >
        {/* ── View switcher ─────────────────────────────────────────────── */}
        {view === "chat" && (
          <ChatBox
            mode={mode}
            pendingPrompt={pendingPrompt}
            onPendingClear={() => setPendingPrompt(null)}
          />
        )}
        {view === "insights"  && <AIInsightsDashboard />}
        {view === "simulator" && (                              // ← NEW
          <UseCaseSimulator onBookDemo={() => setBookingOpen(true)} />
        )}
      </AppLayout>
      <DemoVoiceEMR open={demoEMROpen} onClose={() => setDemoEMROpen(false)} />
      <LiveVoiceEMR open={liveEMROpen} onClose={() => setLiveEMROpen(false)} />
      <SmartDemoBooking open={bookingOpen} onClose={() => setBookingOpen(false)} /> {/* ← NEW */}
    </>
  )
}

// ── Root — shows AuthPage until user is set ───────────────────────────────────

function RootRouter() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#060e1a" }}>
        <div style={{ width: "40px", height: "40px", border: "2px solid rgba(56,189,248,0.18)", borderTopColor: "#38bdf8", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return user ? <AuthedApp /> : <AuthPage />
}

export default function App() {
  return (
    <AuthProvider>
      <RootRouter />
    </AuthProvider>
  )
}
