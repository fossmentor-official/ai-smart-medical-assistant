import { useState } from "react"
import AppLayout from "./layouts/AppLayout"
import ChatBox from "./components/ChatBox"
import type { Mode } from "./types/clinical"

export default function App() {
  const [mode, setMode] = useState<Mode>("clinical")
  const [pendingPrompt, setPendingPrompt] = useState<{ text: string; mode: Mode } | null>(null)

  const handleDemoCase = (prompt: string, demoMode: Mode) => {
    setMode(demoMode)
    setPendingPrompt({ text: prompt, mode: demoMode })
  }

  return (
    <AppLayout activeMode={mode} onModeChange={setMode} onDemoCase={handleDemoCase}>
      <ChatBox
        mode={mode}
        pendingPrompt={pendingPrompt}
        onPendingClear={() => setPendingPrompt(null)}
      />
    </AppLayout>
  )
}