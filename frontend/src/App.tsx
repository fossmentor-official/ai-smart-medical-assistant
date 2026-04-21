// frontend/src/App.tsx
import { useState } from "react"
import { AuthProvider, useAuth } from "./auth/AuthContext"
import AuthPage from "./auth/AuthPage"
import AppLayout from "./layouts/AppLayout"
import ChatBox from "./components/ChatBox"
import DemoVoiceEMR from "@/components/DemoVoiceEMR"
import LiveVoiceEMR from "@/components/LiveVoiceEMR"
import type { Mode } from "./types/clinical"

function AuthedApp() {
  const { user, logout } = useAuth()
  const [mode, setMode] = useState<Mode>("clinical")
  const [pendingPrompt, setPendingPrompt] = useState<{ text: string; mode: Mode } | null>(null)
  const [demoEMROpen, setDemoEMROpen] = useState(false)
  const [liveEMROpen, setLiveEMROpen] = useState(false)

  const handleDemoCase = (prompt: string, demoMode: Mode) => {
    setMode(demoMode)
    setPendingPrompt({ text: prompt, mode: demoMode })
  }

  return (
    <>
      <AppLayout
        activeMode={mode}
        onModeChange={setMode}
        onDemoCase={handleDemoCase}
        onDemoEMR={() => setDemoEMROpen(true)}
        onLiveEMR={() => setLiveEMROpen(true)}
        user={user}
        onLogout={() => void logout()}
      >
        <ChatBox
          mode={mode}
          pendingPrompt={pendingPrompt}
          onPendingClear={() => setPendingPrompt(null)}
        />
      </AppLayout>
      <DemoVoiceEMR open={demoEMROpen} onClose={() => setDemoEMROpen(false)} />
      <LiveVoiceEMR open={liveEMROpen} onClose={() => setLiveEMROpen(false)} />
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
