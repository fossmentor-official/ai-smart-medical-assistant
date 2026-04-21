import type { Mode } from "../types/clinical"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

// ─────────────────────────────────────────────────────────────────────────────
// Core chat stream
// ─────────────────────────────────────────────────────────────────────────────

export async function streamMessage(
  message: string,
  mode: Mode,
  onChunk: (chunk: string) => void
): Promise<void> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, mode }),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)

  const reader = res.body?.getReader()
  const decoder = new TextDecoder()
  if (!reader) return

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const lines = decoder.decode(value).split("\n")
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      const data = line.slice(6).trim()
      if (data === "[DONE]") return
      try {
        const parsed = JSON.parse(data)
        if (parsed.text)  onChunk(parsed.text)
        if (parsed.error) throw new Error(parsed.error)
      } catch {}
    }
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Shared EMR types  (used by both Demo and Live components)
// ─────────────────────────────────────────────────────────────────────────────

export interface EMRSoap {
  subjective: string
  objective:  string
  assessment: string
  plan:       string
}

export interface EMRCode {
  code:        string
  description: string
}

export interface EMRRisk {
  level:     "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  score:     number
  rationale: string
}

/** Shared shape returned by BOTH /api/demo/generate-emr and /api/voice/generate-emr */
export interface StructuredEMR {
  chief_complaint:   string
  soap:              EMRSoap
  icd10:             EMRCode[]
  cpt:               EMRCode[]
  medications:       string[]
  recommended_tests: string[]
  risk:              EMRRisk
  follow_up:         string
  confidence:        number
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO Voice-to-EMR API  (POST /api/demo/generate-emr)
// No microphone — sends pre-written dictation text to Gemini
// ─────────────────────────────────────────────────────────────────────────────

export interface DemoEMRResult extends StructuredEMR {
  dictation:   string   // echoed back by backend
  scenario_id: string
}

export async function generateEMRFromDemoScript(
  dictation: string,
  scenarioId: string
): Promise<DemoEMRResult> {
  const res = await fetch(`${API_URL}/api/demo/generate-emr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dictation, scenario_id: scenarioId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Demo EMR failed" }))
    throw new Error(err.detail ?? `Error ${res.status}`)
  }
  return res.json()
}


// ─────────────────────────────────────────────────────────────────────────────
// LIVE Voice-to-EMR API  (POST /api/voice/transcribe + /api/voice/generate-emr)
// Real microphone → Whisper → Gemini
// ─────────────────────────────────────────────────────────────────────────────

export interface Speaker {
  role: "doctor" | "patient" | "unknown"
  text: string
}

export interface LiveEMRResult extends StructuredEMR {
  transcript: string      // full raw transcript
  speakers:   Speaker[]   // diarized turns
}

/** Step 1: send audio blob to Whisper */
export async function transcribeAudio(
  audioBlob: Blob,
  filename = "recording.webm"
): Promise<{ transcript: string; language: string }> {
  const form = new FormData()
  form.append("audio", audioBlob, filename)

  const res = await fetch(`${API_URL}/api/voice/transcribe`, {
    method: "POST",
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Transcription failed" }))
    throw new Error(err.detail ?? `Transcription error ${res.status}`)
  }
  const data = await res.json()
  return { transcript: data.transcript, language: data.language }
}

/** Step 2: send transcript text to Gemini for EMR structuring */
export async function generateEMRFromTranscript(
  transcript: string
): Promise<LiveEMRResult> {
  const res = await fetch(`${API_URL}/api/voice/generate-emr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "EMR generation failed" }))
    throw new Error(err.detail ?? `EMR error ${res.status}`)
  }
  return res.json()
}
