// frontend/src/components/VoiceEMR.tsx

import { useState, useEffect, useRef, useCallback } from "react"
import { X, Mic, MicOff, FileText, ChevronDown, ChevronUp, Zap, Activity } from "lucide-react"
import { DEMO_SCRIPTS, type DemoScript, type EMRField } from "@/data/emrDemoScripts"

interface Props {
  open: boolean
  onClose: () => void
}

// ── Waveform bars (pure CSS animation via inline delays) ──────────────────────
function WaveformBars({ active, bars = 28 }: { active: boolean; bars?: number }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-12">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: 3,
            backgroundColor: active ? `hsl(${200 + i * 3}, 90%, 65%)` : "rgba(148,163,184,0.3)",
            height: active
              ? `${12 + Math.sin(i * 0.7) * 20 + Math.random() * 10}px`
              : "4px",
            animationName: active ? "waveBar" : "none",
            animationDuration: `${0.6 + (i % 5) * 0.15}s`,
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
            animationDirection: "alternate",
            animationDelay: `${(i * 0.04).toFixed(2)}s`,
          }}
        />
      ))}
    </div>
  )
}

// ── Badge component ───────────────────────────────────────────────────────────
const badgePalette: Record<string, string> = {
  red:    "bg-red-500/15 text-red-300 border-red-500/30",
  amber:  "bg-amber-500/15 text-amber-300 border-amber-500/30",
  green:  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  blue:   "bg-blue-500/15 text-blue-300 border-blue-500/30",
  purple: "bg-purple-500/15 text-purple-300 border-purple-500/30",
}

function Badge({ text, color = "blue" }: { text: string; color?: string }) {
  return (
    <span className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-full border ${badgePalette[color] ?? badgePalette.blue}`}>
      {text}
    </span>
  )
}

// ── Risk indicator ────────────────────────────────────────────────────────────
const riskConfig = {
  LOW:      { color: "text-emerald-400", bar: "bg-emerald-500", glow: "shadow-emerald-500/40" },
  MEDIUM:   { color: "text-amber-400",   bar: "bg-amber-500",   glow: "shadow-amber-500/40"   },
  HIGH:     { color: "text-orange-400",  bar: "bg-orange-500",  glow: "shadow-orange-500/40"  },
  CRITICAL: { color: "text-red-400",     bar: "bg-red-500",     glow: "shadow-red-500/40"     },
}

function RiskMeter({ level, score }: { level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; score: number }) {
  const cfg = riskConfig[level]
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full ${cfg.bar} rounded-full shadow-md ${cfg.glow} transition-all duration-1000`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
      <span className={`text-xs font-bold ${cfg.color}`}>{level}</span>
      <span className="text-xs text-slate-500">{score}%</span>
    </div>
  )
}

// ── EMR Field row ─────────────────────────────────────────────────────────────
function EMRFieldRow({ field, delay }: { field: EMRField; delay: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div
      className={`flex gap-3 py-2 border-b border-white/5 last:border-0 transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <span className="text-[11px] text-slate-500 w-32 flex-shrink-0 pt-0.5">{field.label}</span>
      <div className="flex-1 min-w-0">
        {Array.isArray(field.value) ? (
          <ul className="space-y-0.5">
            {field.value.map((v, i) => (
              <li key={i} className="text-[12px] text-slate-200 flex items-start gap-1.5">
                <span className="text-cyan-500 mt-1">›</span> {v}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-[12px] text-slate-200">{field.value}</span>
        )}
        {field.badge && (
          <div className="mt-1">
            <Badge text={field.badge} color={field.badgeColor} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────
function EMRSection({
  section,
  baseDelay,
}: {
  section: DemoScript["emr"]["sections"][0]
  baseDelay: number
}) {
  const [open, setOpen] = useState(true)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), baseDelay)
    return () => clearTimeout(t)
  }, [baseDelay])

  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden transition-all duration-500 ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{section.icon}</span>
          <span className="text-[13px] font-semibold text-slate-200">{section.title}</span>
        </div>
        {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
      </button>
      {open && (
        <div className="px-4 pb-3">
          {section.fields.map((field, i) => (
            <EMRFieldRow key={i} field={field} delay={i * 80} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
type Phase = "select" | "listening" | "processing" | "emr"

export default function VoiceEMR({ open, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("select")
  const [selectedScript, setSelectedScript] = useState<DemoScript | null>(null)
  const [typedText, setTypedText] = useState("")
  const [emrVisible, setEmrVisible] = useState(false)
  const [processingStep, setProcessingStep] = useState(0)
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const PROCESSING_STEPS = [
    "Detecting voice segments…",
    "Transcribing speech to text…",
    "Extracting clinical entities…",
    "Mapping ICD-10 & CPT codes…",
    "Structuring SOAP notes…",
    "Generating EMR record…",
  ]

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setPhase("select")
        setSelectedScript(null)
        setTypedText("")
        setEmrVisible(false)
        setProcessingStep(0)
      }, 300)
    }
  }, [open])

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [typedText])

  const startDemo = useCallback((script: DemoScript) => {
    setSelectedScript(script)
    setPhase("listening")
    setTypedText("")

    // Type out the dictation char by char
    let i = 0
    const typeNext = () => {
      if (i < script.dictation.length) {
        i++
        setTypedText(script.dictation.slice(0, i))
        const delay = script.dictation[i - 1] === " " ? 60 : script.dictation[i - 1] === "." ? 220 : 28
        typingRef.current = setTimeout(typeNext, delay)
      } else {
        // Dictation done → processing phase
        setTimeout(() => {
          setPhase("processing")
          let step = 0
          const stepInterval = setInterval(() => {
            step++
            setProcessingStep(step)
            if (step >= PROCESSING_STEPS.length) {
              clearInterval(stepInterval)
              setTimeout(() => {
                setPhase("emr")
                setTimeout(() => setEmrVisible(true), 100)
              }, 400)
            }
          }, 500)
        }, 600)
      }
    }
    typeNext()
  }, [])

  const reset = () => {
    if (typingRef.current) clearTimeout(typingRef.current)
    setPhase("select")
    setSelectedScript(null)
    setTypedText("")
    setEmrVisible(false)
    setProcessingStep(0)
  }

  if (!open) return null

  const scriptColorMap: Record<string, string> = {
    red:   "border-red-500/30 bg-red-500/10 hover:border-red-500/60",
    amber: "border-amber-500/30 bg-amber-500/10 hover:border-amber-500/60",
    blue:  "border-blue-500/30 bg-blue-500/10 hover:border-blue-500/60",
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-5xl max-h-[92vh] bg-[#0a1220] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Mic size={18} className="text-white" />
              </div>
              <div>
                <div className="text-white font-bold text-base leading-none">Voice → EMR</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Real-time clinical dictation to structured record</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {phase !== "select" && (
                <button
                  onClick={reset}
                  className="text-[12px] text-slate-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
                >
                  ← New Demo
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto">

            {/* ── PHASE: SELECT ── */}
            {phase === "select" && (
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 mb-4">
                    <Activity size={13} className="text-cyan-400" />
                    <span className="text-[12px] text-cyan-300 font-medium">Simulated Dictation Demo</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Choose a Clinical Scenario
                  </h2>
                  <p className="text-slate-400 text-sm max-w-md mx-auto">
                    Watch AI transcribe doctor's dictation in real-time and generate a fully-structured EMR — instantly.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                  {DEMO_SCRIPTS.map((script) => (
                    <button
                      key={script.id}
                      onClick={() => startDemo(script)}
                      className={`group text-left p-5 rounded-2xl border transition-all duration-200 ${scriptColorMap[script.color] ?? scriptColorMap.blue}`}
                    >
                      <div className="text-3xl mb-3">{script.icon}</div>
                      <div className="text-[15px] font-bold text-white mb-1">{script.title}</div>
                      <div className="text-[12px] text-slate-400 mb-4">{script.subtitle}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 group-hover:text-slate-300 transition-colors">
                        <Mic size={11} />
                        Click to simulate dictation
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-center text-[11px] text-slate-600 mt-8">
                  🔒 All data simulated — no real patient information used
                </p>
              </div>
            )}

            {/* ── PHASE: LISTENING ── */}
            {phase === "listening" && selectedScript && (
              <div className="flex flex-col md:flex-row h-full min-h-[500px]">
                {/* Left: mic + waveform */}
                <div className="md:w-72 flex-shrink-0 flex flex-col items-center justify-center gap-6 p-8 border-b md:border-b-0 md:border-r border-white/10 bg-white/[0.02]">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-xl shadow-red-500/30 relative z-10">
                      <Mic size={30} className="text-white" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-semibold text-sm">Recording…</div>
                    <div className="text-slate-500 text-[11px] mt-1">{selectedScript.title}</div>
                  </div>
                  <WaveformBars active={true} />
                  <div className="w-full bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-600 mb-1">Transcribed words</div>
                    <div className="text-lg font-bold text-cyan-400">
                      {typedText.split(" ").filter(Boolean).length}
                    </div>
                  </div>
                </div>

                {/* Right: live transcript */}
                <div className="flex-1 p-6 flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[12px] font-semibold text-slate-300 tracking-wide uppercase">Live Transcript</span>
                  </div>
                  <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto rounded-xl bg-white/[0.03] border border-white/5 p-5"
                  >
                    <p className="text-[14px] text-slate-200 leading-relaxed font-mono">
                      {typedText}
                      <span className="inline-block w-0.5 h-4 bg-cyan-400 ml-0.5 animate-pulse align-middle" />
                    </p>
                  </div>
                  <div className="mt-3 text-[11px] text-slate-600 text-right">
                    {typedText.length} / {selectedScript.dictation.length} characters
                  </div>
                </div>
              </div>
            )}

            {/* ── PHASE: PROCESSING ── */}
            {phase === "processing" && (
              <div className="flex flex-col items-center justify-center p-12 min-h-[400px] gap-6">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-spin" style={{ borderTopColor: "rgb(6,182,212)" }} />
                  <div className="absolute inset-2 rounded-full border-2 border-blue-500/20 animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s", borderTopColor: "rgb(59,130,246)" }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap size={24} className="text-cyan-400" />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-white font-bold text-lg mb-1">AI Processing…</div>
                  <div className="text-slate-400 text-sm">Structuring clinical intelligence</div>
                </div>
                <div className="w-full max-w-sm space-y-2">
                  {PROCESSING_STEPS.map((step, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                        i < processingStep
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : i === processingStep
                          ? "border-cyan-500/40 bg-cyan-500/10"
                          : "border-white/5 bg-transparent"
                      }`}
                    >
                      <span className="text-base">
                        {i < processingStep ? "✅" : i === processingStep ? "⚡" : "○"}
                      </span>
                      <span className={`text-[12px] ${i < processingStep ? "text-emerald-400" : i === processingStep ? "text-cyan-300" : "text-slate-600"}`}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── PHASE: EMR OUTPUT ── */}
            {phase === "emr" && selectedScript && (
              <div className={`transition-all duration-500 ${emrVisible ? "opacity-100" : "opacity-0"}`}>
                {/* Top banner */}
                <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-3 flex items-center gap-3">
                  <span className="text-emerald-400 text-lg">✅</span>
                  <span className="text-emerald-300 text-sm font-semibold">EMR Generated Successfully</span>
                  <span className="text-slate-500 text-[11px] ml-auto">
                    Processed in ~{(DEMO_SCRIPTS.indexOf(selectedScript) + 2.4).toFixed(1)}s
                  </span>
                </div>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: patient card + risk + codes */}
                  <div className="space-y-4">
                    {/* Patient card */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                          {selectedScript.emr.patientName.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <div className="text-white font-semibold text-[13px]">{selectedScript.emr.patientName}</div>
                          <div className="text-slate-500 text-[10px]">MRN: {selectedScript.emr.mrn}</div>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">DOB</span>
                          <span className="text-slate-300">{selectedScript.emr.dob}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Visit Date</span>
                          <span className="text-slate-300">{selectedScript.emr.visitDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Provider</span>
                          <span className="text-slate-300">{selectedScript.emr.provider}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <div className="text-[10px] text-slate-500 mb-1">Chief Complaint</div>
                        <div className="text-[12px] text-slate-200">{selectedScript.emr.chiefComplaint}</div>
                      </div>
                    </div>

                    {/* Risk meter */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-3">AI Risk Assessment</div>
                      <RiskMeter level={selectedScript.emr.riskLevel} score={selectedScript.emr.riskScore} />
                    </div>

                    {/* ICD-10 codes */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-3">ICD-10 Codes</div>
                      <div className="space-y-2">
                        {selectedScript.emr.icd10.map((code, i) => (
                          <div key={i} className="flex gap-2 items-start">
                            <span className="text-[11px] font-mono text-cyan-400 font-bold flex-shrink-0">{code.code}</span>
                            <span className="text-[11px] text-slate-400">{code.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CPT codes */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-3">CPT Codes</div>
                      <div className="space-y-2">
                        {selectedScript.emr.cpt.map((code, i) => (
                          <div key={i} className="flex gap-2 items-start">
                            <span className="text-[11px] font-mono text-purple-400 font-bold flex-shrink-0">{code.code}</span>
                            <span className="text-[11px] text-slate-400">{code.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: SOAP sections */}
                  <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={14} className="text-cyan-400" />
                      <span className="text-[12px] font-semibold text-slate-300 uppercase tracking-widest">Structured SOAP Notes</span>
                    </div>
                    {selectedScript.emr.sections.map((section, i) => (
                      <EMRSection key={section.title} section={section} baseDelay={i * 150} />
                    ))}

                    {/* Transcript accordion */}
                    <details className="rounded-xl border border-white/10 bg-white/[0.02] group">
                      <summary className="px-4 py-3 text-[12px] font-semibold text-slate-400 cursor-pointer hover:text-slate-200 flex items-center gap-2 transition-colors">
                        <Mic size={12} />
                        Original Dictation Transcript
                      </summary>
                      <div className="px-4 pb-4">
                        <p className="text-[12px] text-slate-400 leading-relaxed font-mono bg-white/[0.03] rounded-lg p-3 border border-white/5">
                          {selectedScript.dictation}
                        </p>
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