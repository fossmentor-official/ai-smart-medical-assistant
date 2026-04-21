/**
 * DemoVoiceEMR.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Demo feature — NO real microphone.
 *
 * Flow:
 *   1. User picks one of 3 clinical scenarios
 *   2. Dictation text types out character-by-character (simulated recording)
 *   3. Full dictation text sent to POST /api/demo/generate-emr  (Gemini)
 *   4. Structured EMR card renders with SOAP, ICD-10, CPT, risk
 *
 * Completely separate from LiveVoiceEMR.tsx — shares no state or logic.
 */

import { useState, useRef, useCallback, useEffect } from "react"
import {
  X, Mic, FileText, ChevronDown, ChevronUp, Zap, Sparkles,
} from "lucide-react"
import { generateEMRFromDemoScript, type DemoEMRResult } from "@/lib/api"
import { DEMO_SCRIPTS, type DemoScript } from "@/data/emrDemoScripts"

interface Props {
  open: boolean
  onClose: () => void
}

type Phase = "select" | "dictating" | "generating" | "emr" | "error"

// ── Animated CSS waveform (no real audio — pure visual) ──────────────────────
function FakeWaveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-10">
      {Array.from({ length: 32 }).map((_, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: 3,
            backgroundColor: active
              ? `hsl(${170 + i * 4}, 80%, 58%)`
              : "rgba(100,116,139,0.25)",
            height: active ? undefined : "3px",
            animationName: active ? "waveBar" : "none",
            animationDuration: `${0.55 + (i % 6) * 0.12}s`,
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
            animationDirection: "alternate",
            animationDelay: `${(i * 0.038).toFixed(3)}s`,
            minHeight: active ? "4px" : undefined,
          }}
        />
      ))}
    </div>
  )
}

// ── Risk styles ───────────────────────────────────────────────────────────────
const riskCfg: Record<string, { bar: string; text: string; border: string }> = {
  LOW:      { bar: "bg-emerald-500", text: "text-emerald-300", border: "border-emerald-500/30" },
  MEDIUM:   { bar: "bg-amber-500",   text: "text-amber-300",   border: "border-amber-500/30"   },
  HIGH:     { bar: "bg-orange-500",  text: "text-orange-300",  border: "border-orange-500/30"  },
  CRITICAL: { bar: "bg-red-500",     text: "text-red-300",     border: "border-red-500/30"     },
}

function RiskBar({ level, score, rationale }: { level: string; score: number; rationale: string }) {
  const c = riskCfg[level] ?? riskCfg.MEDIUM
  return (
    <div className={`rounded-xl border p-4 bg-white/[0.03] ${c.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Risk Level</span>
        <span className={`text-xs font-bold ${c.text}`}>{level} · {score}%</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
        <div className={`h-full ${c.bar} rounded-full transition-all duration-1000`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-[11px] text-slate-500">{rationale}</p>
    </div>
  )
}

// ── Collapsible SOAP card ─────────────────────────────────────────────────────
function SOAPCard({ icon, label, content }: { icon: string; label: string; content: string }) {
  const [open, setOpen] = useState(true)
  if (!content) return null
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-[13px] font-semibold text-slate-200">{label}</span>
        </div>
        {open
          ? <ChevronUp size={13} className="text-slate-600" />
          : <ChevronDown size={13} className="text-slate-600" />
        }
      </button>
      {open && (
        <div className="px-4 pb-4 text-[13px] text-slate-300 leading-relaxed border-t border-white/5 pt-3">
          {content}
        </div>
      )}
    </div>
  )
}

// ── Processing steps animation ────────────────────────────────────────────────
const GEN_STEPS = [
  "Parsing clinical dictation…",
  "Extracting diagnoses & findings…",
  "Mapping ICD-10 & CPT codes…",
  "Structuring SOAP notes via Gemini…",
  "Calculating risk score…",
]

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function DemoVoiceEMR({ open, onClose }: Props) {
  const [phase, setPhase]           = useState<Phase>("select")
  const [script, setScript]         = useState<DemoScript | null>(null)
  const [typedText, setTypedText]   = useState("")
  const [emrData, setEmrData]       = useState<DemoEMRResult | null>(null)
  const [error, setError]           = useState("")
  const [genStep, setGenStep]       = useState(0)
  const [emrVisible, setEmrVisible] = useState(false)

  const typingRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollRef  = useRef<HTMLDivElement>(null)

  // Reset on close
  useEffect(() => {
    if (!open) {
      if (typingRef.current) clearTimeout(typingRef.current)
      setTimeout(() => {
        setPhase("select"); setScript(null); setTypedText("")
        setEmrData(null);   setError("");   setGenStep(0); setEmrVisible(false)
      }, 300)
    }
  }, [open])

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [typedText])

  const reset = () => {
    if (typingRef.current) clearTimeout(typingRef.current)
    setPhase("select"); setScript(null); setTypedText("")
    setEmrData(null);   setError("");   setGenStep(0); setEmrVisible(false)
  }

  // ── Start a scenario ──────────────────────────────────────────────────────
  const startScenario = useCallback((s: DemoScript) => {
    setScript(s)
    setPhase("dictating")
    setTypedText("")

    let i = 0
    const typeNext = () => {
      if (i < s.dictation.length) {
        i++
        setTypedText(s.dictation.slice(0, i))
        const ch = s.dictation[i - 1]
        const delay = ch === "." || ch === "," ? 200 : ch === " " ? 55 : 22
        typingRef.current = setTimeout(typeNext, delay)
      } else {
        // Typing done → call backend
        runGeneration(s.dictation, s.id)
      }
    }
    typeNext()
  }, [])

  const runGeneration = async (dictation: string, scenarioId: string) => {
    setPhase("generating")
    setGenStep(0)

    const timer = setInterval(() => setGenStep(s => Math.min(s + 1, GEN_STEPS.length - 1)), 600)
    try {
      const result = await generateEMRFromDemoScript(dictation, scenarioId)
      clearInterval(timer)
      setGenStep(GEN_STEPS.length)
      setEmrData(result)
      setPhase("emr")
      setTimeout(() => setEmrVisible(true), 80)
    } catch (err: any) {
      clearInterval(timer)
      setError(err.message ?? "EMR generation failed")
      setPhase("error")
    }
  }

  if (!open) return null

  const scenarioColor: Record<string, string> = {
    red:   "border-red-500/25 bg-red-500/8 hover:border-red-400/50",
    amber: "border-amber-500/25 bg-amber-500/8 hover:border-amber-400/50",
    blue:  "border-blue-500/25 bg-blue-500/8 hover:border-blue-400/50",
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-5xl max-h-[92vh] bg-[#080e1a] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
          style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 32px 80px rgba(0,0,0,0.7)" }}
        >

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Sparkles size={17} className="text-white" />
              </div>
              <div>
                <div className="text-white font-bold text-[15px] leading-none">Demo Voice → EMR</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Simulated dictation · Gemini-2.5-flash structuring · No microphone</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {phase !== "select" && (
                <button onClick={reset} className="text-[12px] text-slate-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors">
                  ← Scenarios
                </button>
              )}
              <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                <X size={15} className="text-slate-400" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto">

            {/* ═══ SELECT ═══ */}
            {phase === "select" && (
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-4">
                    <Sparkles size={12} className="text-violet-400" />
                    <span className="text-[12px] text-violet-300 font-medium">Simulated — no real audio</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Pick a Clinical Scenario</h2>
                  <p className="text-slate-400 text-sm max-w-md mx-auto">
                    Watch AI animate a doctor's dictation word-by-word, then generate a fully structured EMR instantly.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                  {DEMO_SCRIPTS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => startScenario(s)}
                      className={`group text-left p-5 rounded-2xl border transition-all duration-200 ${scenarioColor[s.color] ?? scenarioColor.blue}`}
                    >
                      <div className="text-3xl mb-3">{s.icon}</div>
                      <div className="text-[15px] font-bold text-white mb-1">{s.title}</div>
                      <div className="text-[12px] text-slate-400 mb-4">{s.subtitle}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 group-hover:text-slate-300 transition-colors">
                        <Sparkles size={10} /> Click to simulate
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-center text-[11px] text-slate-700 mt-8">
                  🔒 All data is fictional — no real patient information used
                </p>
              </div>
            )}

            {/* ═══ DICTATING ═══ */}
            {phase === "dictating" && script && (
              <div className="flex flex-col md:flex-row min-h-[460px]">
                {/* Left */}
                <div className="md:w-64 flex-shrink-0 flex flex-col items-center justify-center gap-5 p-7 border-b md:border-b-0 md:border-r border-white/[0.07] bg-white/[0.015]">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping" style={{ animationDuration: "1.8s" }} />
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-xl shadow-violet-500/30 relative z-10">
                      <Mic size={24} className="text-white" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-semibold text-sm">Dictating…</div>
                    <div className="text-slate-600 text-[11px] mt-1">{script.title}</div>
                  </div>
                  <FakeWaveform active />
                  <div className="w-full bg-white/[0.04] rounded-xl p-3 text-center border border-white/5">
                    <div className="text-[10px] text-slate-600 mb-1">Words captured</div>
                    <div className="text-xl font-bold text-violet-400 font-mono">
                      {typedText.split(" ").filter(Boolean).length}
                    </div>
                  </div>
                </div>

                {/* Right — transcript */}
                <div className="flex-1 p-6 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                    <span className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">Live Dictation</span>
                  </div>
                  <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto rounded-xl bg-white/[0.02] border border-white/[0.07] p-5 min-h-[280px]"
                  >
                    <p className="text-[14px] text-slate-200 leading-relaxed font-mono">
                      {typedText}
                      <span className="inline-block w-0.5 h-4 bg-violet-400 ml-0.5 animate-pulse align-middle" />
                    </p>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-700">
                    <span>{script.subtitle}</span>
                    <span>{typedText.length} / {script.dictation.length} chars</span>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ GENERATING ═══ */}
            {phase === "generating" && (
              <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-12">
                <div className="relative w-18 h-18">
                  <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-violet-500/20 animate-spin" style={{ borderTopColor: "rgb(139,92,246)" }} />
                  <div className="absolute inset-2 w-12 h-12 rounded-full border-2 border-purple-500/15 animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.9s", borderTopColor: "rgb(168,85,247)" }} />
                  <div className="absolute inset-0 w-16 h-16 flex items-center justify-center">
                    <Zap size={20} className="text-violet-400" />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-white font-bold text-lg mb-1">Generating EMR…</div>
                  <div className="text-slate-500 text-sm">Gemini-2.5-flash is structuring the clinical data</div>
                </div>
                <div className="w-full max-w-sm space-y-2">
                  {GEN_STEPS.map((step, i) => (
                    <div
                      key={step}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                        i < genStep
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : i === genStep
                          ? "border-violet-500/40 bg-violet-500/10"
                          : "border-white/5"
                      }`}
                    >
                      <span>{i < genStep ? "✅" : i === genStep ? "⚡" : "○"}</span>
                      <span className={`text-[12px] ${i < genStep ? "text-emerald-400" : i === genStep ? "text-violet-300" : "text-slate-600"}`}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ ERROR ═══ */}
            {phase === "error" && (
              <div className="flex flex-col items-center justify-center min-h-[360px] gap-5 p-10">
                <div className="text-4xl">⚠️</div>
                <div className="text-center">
                  <div className="text-white font-bold mb-2">Something went wrong</div>
                  <div className="text-slate-400 text-sm max-w-md">{error}</div>
                </div>
                <button onClick={reset} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors">
                  Try Again
                </button>
              </div>
            )}

            {/* ═══ EMR OUTPUT ═══ */}
            {phase === "emr" && emrData && (
              <div className={`transition-all duration-500 ${emrVisible ? "opacity-100" : "opacity-0"}`}>
                {/* Banner */}
                <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-3 flex items-center gap-3">
                  <span className="text-emerald-400">✅</span>
                  <span className="text-emerald-300 text-sm font-semibold">EMR Generated from Demo Dictation</span>
                  <div className="ml-auto flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500">Confidence:</span>
                    <span className="font-bold text-emerald-400">{emrData.confidence}%</span>
                  </div>
                </div>

                <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">

                  {/* Left col */}
                  <div className="space-y-4">
                    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                      <div className="text-[10px] font-bold tracking-widest text-violet-400 uppercase mb-2">Chief Complaint</div>
                      <p className="text-[13px] text-slate-200">{emrData.chief_complaint || "—"}</p>
                    </div>

                    {emrData.risk && (
                      <RiskBar level={emrData.risk.level} score={emrData.risk.score} rationale={emrData.risk.rationale} />
                    )}

                    {emrData.icd10?.length > 0 && (
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                        <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-3">ICD-10 Codes</div>
                        <div className="space-y-2">
                          {emrData.icd10.map((c, i) => (
                            <div key={i} className="flex gap-2">
                              <span className="font-mono text-[11px] text-cyan-400 font-bold flex-shrink-0">{c.code}</span>
                              <span className="text-[11px] text-slate-400">{c.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {emrData.cpt?.length > 0 && (
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                        <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-3">CPT Codes</div>
                        <div className="space-y-2">
                          {emrData.cpt.map((c, i) => (
                            <div key={i} className="flex gap-2">
                              <span className="font-mono text-[11px] text-purple-400 font-bold flex-shrink-0">{c.code}</span>
                              <span className="text-[11px] text-slate-400">{c.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {emrData.medications?.length > 0 && (
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                        <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-3">Medications</div>
                        <ul className="space-y-1">
                          {emrData.medications.map((m, i) => (
                            <li key={i} className="text-[12px] text-slate-300 flex gap-2"><span className="text-blue-400">💊</span>{m}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {emrData.recommended_tests?.length > 0 && (
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                        <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-3">Recommended Tests</div>
                        <ul className="space-y-1">
                          {emrData.recommended_tests.map((t, i) => (
                            <li key={i} className="text-[12px] text-slate-300 flex gap-2"><span className="text-emerald-400">🧪</span>{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Right col */}
                  <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-center gap-2 pb-1">
                      <FileText size={13} className="text-violet-400" />
                      <span className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">SOAP Notes</span>
                    </div>
                    <SOAPCard icon="🗣️" label="Subjective"  content={emrData.soap?.subjective} />
                    <SOAPCard icon="📊" label="Objective"   content={emrData.soap?.objective}  />
                    <SOAPCard icon="🔍" label="Assessment"  content={emrData.soap?.assessment} />
                    <SOAPCard icon="📋" label="Plan"        content={emrData.soap?.plan}       />

                    {emrData.follow_up && (
                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                        <div className="text-[10px] font-bold tracking-widest text-blue-400 uppercase mb-2">Follow-up</div>
                        <p className="text-[13px] text-slate-300">{emrData.follow_up}</p>
                      </div>
                    )}

                    {/* Original dictation */}
                    <details className="rounded-xl border border-white/[0.07] bg-white/[0.02]">
                      <summary className="px-4 py-3 text-[12px] font-semibold text-slate-500 cursor-pointer hover:text-slate-300 flex items-center gap-2 transition-colors">
                        <Mic size={11} /> Original Dictation
                      </summary>
                      <div className="px-4 pb-4 pt-3 border-t border-white/5">
                        <p className="text-[12px] text-slate-400 font-mono leading-relaxed">{emrData.dictation}</p>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
