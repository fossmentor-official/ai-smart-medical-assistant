import type { Mode } from "../types/clinical"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

// ─────────────────────────────────────────────────────────────────────────────
// 🔥 Shared fetch with retry + timeout
// ─────────────────────────────────────────────────────────────────────────────

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  timeout = 15000
): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(id)

      if (res.ok) return res

      // Retry only on server errors (5xx)
      if (res.status >= 500 && attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 2 ** attempt * 1000))
        continue
      }

      return res
    } catch (err) {
      clearTimeout(id)

      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 2 ** attempt * 1000))
        continue
      }

      throw err
    }
  }

  throw new Error("Request failed after retries")
}

// ─────────────────────────────────────────────────────────────────────────────
// Core chat stream (SSE)
// ─────────────────────────────────────────────────────────────────────────────

export async function streamMessage(
  message: string,
  mode: Mode,
  onChunk: (chunk: string) => void
): Promise<void> {
  const res = await fetchWithRetry(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, mode }),
  })

  if (!res.ok) throw new Error(`API error: ${res.status}`)

  const reader = res.body?.getReader()
  const decoder = new TextDecoder()

  if (!reader) throw new Error("Streaming not supported")

  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue

      const data = line.slice(6).trim()

      if (data === "[DONE]") return

      try {
        const parsed = JSON.parse(data)
        if (parsed.text) onChunk(parsed.text)
        if (parsed.error) throw new Error(parsed.error)
      } catch {
        // ignore partial JSON
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared EMR types
// ─────────────────────────────────────────────────────────────────────────────

export interface EMRSoap {
  subjective: string
  objective: string
  assessment: string
  plan: string
}

export interface EMRCode {
  code: string
  description: string
}

export interface EMRRisk {
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  score: number
  rationale: string
}

export interface StructuredEMR {
  chief_complaint: string
  soap: EMRSoap
  icd10: EMRCode[]
  cpt: EMRCode[]
  medications: string[]
  recommended_tests: string[]
  risk: EMRRisk
  follow_up: string
  confidence: number
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO EMR
// ─────────────────────────────────────────────────────────────────────────────

export interface DemoEMRResult extends StructuredEMR {
  dictation: string
  scenario_id: string
}

export async function generateEMRFromDemoScript(
  dictation: string,
  scenarioId: string
): Promise<DemoEMRResult> {
  const res = await fetchWithRetry(`${API_URL}/api/demo/generate-emr`, {
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
// LIVE Voice APIs
// ─────────────────────────────────────────────────────────────────────────────

export interface Speaker {
  role: "doctor" | "patient" | "unknown"
  text: string
}

export interface LiveEMRResult extends StructuredEMR {
  transcript: string
  speakers: Speaker[]
}

export async function transcribeAudio(
  audioBlob: Blob,
  filename = "recording.webm"
): Promise<{ transcript: string; language: string }> {
  const form = new FormData()
  form.append("audio", audioBlob, filename)

  const res = await fetchWithRetry(`${API_URL}/api/voice/transcribe`, {
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

export async function generateEMRFromTranscript(
  transcript: string
): Promise<LiveEMRResult> {
  const res = await fetchWithRetry(`${API_URL}/api/voice/generate-emr`, {
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

// ─────────────────────────────────────────────────────────────────────────────
// RCM / Billing Intelligence (🔥 upgraded resilience)
// ─────────────────────────────────────────────────────────────────────────────

export interface RCMCode {
  code: string
  description: string
  fee: number
}

export interface RCMError {
  severity: "critical" | "warning" | "info"
  code: string
  title: string
  detail: string
  fix: string
}

export interface RCMResult {
  visit_description: string
  scenario_id: string
  icd10_codes: RCMCode[]
  cpt_codes: RCMCode[]
  standard_fee: number
  estimated_reimbursement: number
  net_collection: number
  denial_probability: number
  errors: RCMError[]
  optimization_tips: string[]
  revenue_leakage: number
  summary: string
  confidence: number
}

// 🔥 fallback response (never break UI)
function fallbackRCM(visitDescription: string): RCMResult {
  return {
    visit_description: visitDescription,
    scenario_id: "fallback",
    icd10_codes: [],
    cpt_codes: [
      { code: "99213", description: "Consultation", fee: 70 },
    ],
    standard_fee: 70,
    estimated_reimbursement: 60,
    net_collection: 55,
    denial_probability: 0.35,
    errors: [
      {
        severity: "warning",
        code: "AI_FALLBACK",
        title: "AI temporarily unavailable",
        detail: "Showing estimated billing",
        fix: "Retry for full analysis",
      },
    ],
    optimization_tips: ["Retry AI analysis for accuracy"],
    revenue_leakage: 20,
    summary: "Fallback estimation due to AI load",
    confidence: 0.6,
  }
}

export async function analyzeRCM(
  visitDescription: string,
  scenarioId = ""
): Promise<RCMResult> {
  try {
    const res = await fetchWithRetry(`${API_URL}/api/billing/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visit_description: visitDescription,
        scenario_id: scenarioId,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail ?? `Error ${res.status}`)
    }

    return res.json()
  } catch (err) {
    console.warn("RCM fallback triggered:", err)
    return fallbackRCM(visitDescription)
  }
}