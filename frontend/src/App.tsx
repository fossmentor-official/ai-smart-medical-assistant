// frontend/src/App.tsx
import { useState } from "react"
import AppLayout   from "./layouts/AppLayout"
import ChatBox     from "./components/ChatBox"
import DemoVoiceEMR from "./components/DemoVoiceEMR"
import LiveVoiceEMR from "./components/LiveVoiceEMR"
import type { Mode } from "./types/clinical"

export default function App() {
  const [mode, setMode]               = useState<Mode>("clinical")
  const [pendingPrompt, setPendingPrompt] = useState<{ text: string; mode: Mode } | null>(null)

  // Two separate modal states — completely independent
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
      >
        <ChatBox
          mode={mode}
          pendingPrompt={pendingPrompt}
          onPendingClear={() => setPendingPrompt(null)}
        />
      </AppLayout>

      {/* Demo Voice→EMR modal — simulated dictation, no mic, Gemini structures */}
      <DemoVoiceEMR
        open={demoEMROpen}
        onClose={() => setDemoEMROpen(false)}
      />

      {/* Live Voice→EMR modal — real mic, Whisper STT, Gemini structures */}
      <LiveVoiceEMR
        open={liveEMROpen}
        onClose={() => setLiveEMROpen(false)}
      />
    </>
  )
}
