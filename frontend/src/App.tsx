// frontend/src/App.tsx
import { useState } from "react"
import AppLayout from "./layouts/AppLayout"
import ChatBox from "./components/ChatBox"
import VoiceEMR from "./components/VoiceEMR"
import type { Mode } from "./types/clinical"

export default function App() {
  const [mode, setMode] = useState<Mode>("clinical")
  const [pendingPrompt, setPendingPrompt] = useState<{ text: string; mode: Mode } | null>(null)
  const [voiceEMROpen, setVoiceEMROpen] = useState(false)

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
        onVoiceEMR={() => setVoiceEMROpen(true)}
      >
        <ChatBox
          mode={mode}
          pendingPrompt={pendingPrompt}
          onPendingClear={() => setPendingPrompt(null)}
        />
      </AppLayout>

      <VoiceEMR open={voiceEMROpen} onClose={() => setVoiceEMROpen(false)} />
    </>
  )
}