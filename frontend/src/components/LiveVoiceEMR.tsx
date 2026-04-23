/**
 * LiveVoiceEMR.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * REAL live-recording Voice → EMR pipeline:
 *
 *   1. Browser asks mic permission → MediaRecorder captures audio
 *   2. AudioContext + AnalyserNode drives a REAL frequency waveform
 *   3. On stop → send WebM blob to  POST /api/voice/transcribe  (Whisper)
 *   4. Show transcript → send to  POST /api/voice/generate-emr  (gemini-2.5-flash-lite)
 *   5. Render beautiful structured EMR card with speaker timeline
 */

import {
  useState, useEffect, useRef, useCallback
} from "react"
import {
  X, Mic, MicOff, Square, FileText, ChevronDown, ChevronUp,
  Zap, Activity, AlertCircle, User, Stethoscope, Clock
} from "lucide-react"
import { transcribeAudio, generateEMRFromTranscript, type LiveEMRResult } from "@/lib/api"
import { useFeatureGate } from "@/hooks/useFeatureGate"

interface Props {
  open: boolean
  onClose: () => void
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase =
  | "idle"         // ready to record
  | "requesting"   // asking mic permission
  | "recording"    // actively recording
  | "transcribing" // Whisper processing
  | "generating"   // Gemini structuring
  | "emr"          // showing result
  | "error"        // something failed

// ── Real AudioContext waveform ─────────────────────────────────────────────────
function LiveWaveform({
  analyser,
  active,
}: {
  analyser: AnalyserNode | null
  active: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !analyser || !active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    const ctx = canvas.getContext("2d")!
    const bufLen = analyser.frequencyBinCount
    const dataArr = new Uint8Array(bufLen)

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArr)

      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      const bars = 48
      const barW = W / bars - 1.5
      for (let i = 0; i < bars; i++) {
        const idx = Math.floor((i / bars) * bufLen)
        const val = dataArr[idx] / 255
        const h = Math.max(3, val * H * 0.9)
        const hue = 185 + i * 2
        const alpha = 0.5 + val * 0.5
        ctx.fillStyle = `hsla(${hue}, 90%, 60%, ${alpha})`
        const x = i * (barW + 1.5)
        const y = (H - h) / 2
        ctx.beginPath()
        ctx.roundRect(x, y, barW, h, 2)
        ctx.fill()
      }
    }
    draw()

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [analyser, active])

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={56}
      className={`rounded-xl transition-opacity duration-300 ${active ? "opacity-100" : "opacity-0"}`}
    />
  )
}

// ── Recording timer ────────────────────────────────────────────────────────────
function RecordingTimer({ running }: { running: boolean }) {
  const [secs, setSecs] = useState(0)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      setSecs(0)
      ref.current = setInterval(() => setSecs(s => s + 1), 1000)
    } else {
      if (ref.current) clearInterval(ref.current)
    }
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [running])

  const mm = String(Math.floor(secs / 60)).padStart(2, "0")
  const ss = String(secs % 60).padStart(2, "0")
  return (
    <span className="font-mono text-sm text-red-400 tabular-nums">{mm}:{ss}</span>
  )
}

// ── Risk badge ────────────────────────────────────────────────────────────────
const riskStyles: Record<string, { bar: string; text: string; bg: string }> = {
  LOW:      { bar: "bg-emerald-500", text: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/30" },
  MEDIUM:   { bar: "bg-amber-500",   text: "text-amber-300",   bg: "bg-amber-500/10 border-amber-500/30"   },
  HIGH:     { bar: "bg-orange-500",  text: "text-orange-300",  bg: "bg-orange-500/10 border-orange-500/30"  },
  CRITICAL: { bar: "bg-red-500",     text: "text-red-300",     bg: "bg-red-500/10 border-red-500/30"       },
}

function RiskMeter({ level, score, rationale }: { level: string; score: number; rationale: string }) {
  const s = riskStyles[level] ?? riskStyles.MEDIUM
  return (
    <div className={`rounded-xl border p-4 ${s.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Risk Assessment</span>
        <span className={`text-xs font-bold ${s.text}`}>{level} · {score}%</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full ${s.bar} rounded-full transition-all duration-1000`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-[11px] text-slate-400">{rationale}</p>
    </div>
  )
}

// ── Speaker turn ──────────────────────────────────────────────────────────────
function SpeakerTurn({ role, text, idx }: { role: string; text: string; idx: number }) {
  const isDoctor = role === "doctor"
  return (
    <div
      className={`flex gap-3 transition-all duration-500`}
      style={{ animationDelay: `${idx * 60}ms` }}
    >
      <div
        className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${
          isDoctor ? "bg-blue-500/20" : "bg-emerald-500/20"
        }`}
      >
        {isDoctor
          ? <Stethoscope size={12} className="text-blue-400" />
          : <User size={12} className="text-emerald-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[10px] font-bold tracking-wider mb-1 uppercase ${isDoctor ? "text-blue-400" : "text-emerald-400"}`}>
          {role === "unknown" ? "Speaker" : role}
        </div>
        <div className="text-[13px] text-slate-200 leading-relaxed">{text}</div>
      </div>
    </div>
  )
}

// ── SOAP section ──────────────────────────────────────────────────────────────
function SOAPCard({ label, icon, content }: { label: string; icon: string; content: string }) {
  const [open, setOpen] = useState(true)
  if (!content) return null
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-[13px] font-semibold text-slate-200">{label}</span>
        </div>
        {open ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
      </button>
      {open && (
        <div className="px-4 pb-4 text-[13px] text-slate-300 leading-relaxed border-t border-white/5 pt-3">
          {content}
        </div>
      )}
    </div>
  )
}

// ── Processing steps ──────────────────────────────────────────────────────────
const PROCESSING_STEPS_TRANSCRIBE = [
  "Uploading audio recording…",
  "Running Whisper speech-to-text…",
  "Identifying speakers…",
]
const PROCESSING_STEPS_GENERATE = [
  "Extracting clinical entities…",
  "Mapping ICD-10 codes…",
  "Structuring SOAP notes…",
  "Generating EMR with Gemini…",
]

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const MAX_RECORDING_SECS = 20

export default function LiveVoiceEMR({ open, onClose }: Props) {
  const { available, countdown, consume } = useFeatureGate("live")

  const [phase, setPhase] = useState<Phase>("idle")
  const [transcript, setTranscript] = useState("")
  const [emrData, setEmrData] = useState<LiveEMRResult | null>(null)
  const [error, setError] = useState("")
  const [processingStep, setProcessingStep] = useState(0)
  const [processingSteps, setProcessingSteps] = useState<string[]>([])

  // Recording refs
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null)
  const audioChunksRef    = useRef<Blob[]>([])
  const streamRef         = useRef<MediaStream | null>(null)
  const autoStopTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Real-time waveform refs
  const audioCtxRef  = useRef<AudioContext | null>(null)
  const analyserRef  = useRef<AnalyserNode | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)

  // Reset everything when modal closes
  useEffect(() => {
    if (!open) {
      stopRecordingCleanup()
      setTimeout(() => {
        setPhase("idle")
        setTranscript("")
        setEmrData(null)
        setError("")
        setProcessingStep(0)
      }, 300)
    }
  }, [open])

  const stopRecordingCleanup = () => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current)
      autoStopTimerRef.current = null
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach(t => t.stop())
    audioCtxRef.current?.close()
    streamRef.current = null
    audioCtxRef.current = null
    analyserRef.current = null
    setAnalyser(null)
  }

  // ── Start real recording ─────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setError("")
    setPhase("requesting")

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,   // Whisper prefers 16 kHz
          echoCancellation: true,
          noiseSuppression: true,
        }
      })
    } catch (err: any) {
      setError(
        err.name === "NotAllowedError"
          ? "Microphone access denied. Please allow mic access in your browser and try again."
          : `Could not access microphone: ${err.message}`
      )
      setPhase("error")
      return
    }

    streamRef.current = stream

    // Wire up AudioContext for real waveform
    const ctx = new AudioContext()
    const src = ctx.createMediaStreamSource(stream)
    const node = ctx.createAnalyser()
    node.fftSize = 256
    src.connect(node)
    audioCtxRef.current = ctx
    analyserRef.current = node
    setAnalyser(node)

    // MediaRecorder — prefer webm/opus; fallback to whatever browser supports
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
      ? "audio/ogg;codecs=opus"
      : ""
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    mediaRecorderRef.current = recorder
    audioChunksRef.current = []

    recorder.ondataavailable = e => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data)
    }

    recorder.onstop = () => handleRecordingStop()

    recorder.start(250)   // collect chunks every 250ms
    setPhase("recording")

    // ── Auto-stop after MAX_RECORDING_SECS ──
    autoStopTimerRef.current = setTimeout(() => {
      if (mediaRecorderRef.current?.state === "recording") {
        stopRecording()
      }
    }, MAX_RECORDING_SECS * 1000)

    // Mark feature as consumed (1×/hr gate)
    consume()
  }, [consume])

  // ── Stop recording ───────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    setAnalyser(null)
  }, [])

  // ── After recorder stops → pipeline ─────────────────────────────────────
  const handleRecordingStop = async () => {
    const chunks = audioChunksRef.current
    if (!chunks.length) {
      setError("No audio captured. Please try again.")
      setPhase("error")
      return
    }

    const mimeType = chunks[0].type || "audio/webm"
    const blob = new Blob(chunks, { type: mimeType })
    const ext  = mimeType.includes("ogg") ? "ogg" : "webm"

    // ── Step 1: Whisper transcription ──────────────────────────────────────
    setPhase("transcribing")
    const steps1 = PROCESSING_STEPS_TRANSCRIBE
    setProcessingSteps(steps1)
    setProcessingStep(0)

    let transcriptText = ""
    try {
      // Animate steps while waiting
      const timer1 = setInterval(() => setProcessingStep(s => Math.min(s + 1, steps1.length - 1)), 800)
      const result = await transcribeAudio(blob, `recording.${ext}`)
      clearInterval(timer1)
      transcriptText = result.transcript
      setTranscript(transcriptText)
      setProcessingStep(steps1.length)
    } catch (err: any) {
      setError(`Transcription failed: ${err.message}`)
      setPhase("error")
      return
    }

    // ── Step 2: Gemini EMR generation ──────────────────────────────────────
    setPhase("generating")
    const steps2 = PROCESSING_STEPS_GENERATE
    setProcessingSteps(steps2)
    setProcessingStep(0)

    try {
      const timer2 = setInterval(() => setProcessingStep(s => Math.min(s + 1, steps2.length - 1)), 700)
      const emr = await generateEMRFromTranscript(transcriptText)
      clearInterval(timer2)
      setProcessingStep(steps2.length)
      setEmrData(emr)
      setPhase("emr")
    } catch (err: any) {
      setError(`EMR generation failed: ${err.message}`)
      setPhase("error")
    }
  }

  const reset = () => {
    stopRecordingCleanup()
    setPhase("idle")
    setTranscript("")
    setEmrData(null)
    setError("")
    setProcessingStep(0)
  }

  if (!open) return null

  const isProcessing = phase === "transcribing" || phase === "generating"
  const allSteps = processingSteps

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-5xl max-h-[92vh] bg-[#080f1a] border border-white/10 rounded-2xl shadow-2xl shadow-black/70 flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
          style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 32px 64px rgba(0,0,0,0.6)" }}
        >

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <Mic size={18} className="text-white" />
              </div>
              <div>
                <div className="text-white font-bold text-[15px] leading-none">Live Voice → EMR</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Real microphone · Whisper STT · gemini-2.5-flash-lite structuring
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {phase !== "idle" && phase !== "error" && (
                <button
                  onClick={reset}
                  className="text-[12px] text-slate-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
                >
                  ← New Recording
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X size={15} className="text-slate-400" />
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-auto">

            {/* ════════════════ PHASE: IDLE ════════════════ */}
            {phase === "idle" && (
              <div className="flex flex-col items-center justify-center min-h-[460px] gap-8 p-10">

                {/* ── Cooldown banner ── */}
                {!available && (
                  <div className="w-full max-w-lg flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25">
                    <Clock size={18} className="text-amber-400 flex-shrink-0" />
                    <div>
                      <div className="text-[13px] font-bold text-amber-300">Usage limit reached</div>
                      <div className="text-[12px] text-amber-500/80 mt-0.5">
                        Live recording resets in <span className="font-mono font-bold text-amber-300">{countdown}</span> · 1 session per hour
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 mb-5">
                    <Activity size={12} className="text-cyan-400" />
                    <span className="text-[12px] text-cyan-300 font-medium">Live Recording · Max 20 sec · 1×/hr</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">Doctor-Patient Consultation Capture</h2>
                  <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
                    Click <strong className="text-cyan-400">Start Recording</strong>, then let the doctor and patient speak naturally.
                    The system captures the conversation, transcribes it with Whisper, and
                    structures a complete EMR using Gemini AI — in real time.
                  </p>
                </div>

                {/* How it works */}
                <div className="grid grid-cols-3 gap-4 max-w-2xl w-full">
                  {[
                    { icon: "🎙️", step: "1", title: "Record", desc: "Doctor & patient speak naturally. System captures via mic." },
                    { icon: "✍️", step: "2", title: "Transcribe", desc: "Whisper converts audio to text, identifying speakers." },
                    { icon: "🏥", step: "3", title: "Generate EMR", desc: "Gemini structures SOAP notes, ICD-10, CPT codes instantly." },
                  ].map(s => (
                    <div key={s.step} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                      <div className="text-2xl mb-2">{s.icon}</div>
                      <div className="text-[10px] font-bold tracking-widest text-slate-600 uppercase mb-1">Step {s.step}</div>
                      <div className="text-[13px] font-semibold text-slate-200 mb-1">{s.title}</div>
                      <div className="text-[11px] text-slate-500 leading-relaxed">{s.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Tips */}
                <div className="max-w-lg w-full bg-blue-500/5 border border-blue-500/15 rounded-xl p-4">
                  <div className="text-[10px] font-bold tracking-widest text-blue-400 uppercase mb-2">Tips for best results</div>
                  <ul className="space-y-1 text-[12px] text-slate-400">
                    <li>🔊 Speak clearly — avoid background noise</li>
                    <li>👨‍⚕️ Doctor should introduce themselves first so AI identifies speaker roles</li>
                    <li>⏱️ Record at least 20–30 seconds for meaningful EMR output</li>
                    <li>🌍 English gives the best Whisper accuracy (other languages also supported)</li>
                  </ul>
                </div>

                <button
                  onClick={available ? startRecording : undefined}
                  disabled={!available}
                  className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-base transition-all duration-200 ${
                    available
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] cursor-pointer"
                      : "bg-slate-700 text-slate-500 cursor-not-allowed opacity-60"
                  }`}
                >
                  <Mic size={20} />
                  {available ? "Start Recording Consultation" : `Available in ${countdown}`}
                </button>

                <div className="flex items-center gap-2 text-[11px] text-slate-600">
                  <span>🔒 Audio processed by Whisper</span>
                  <span>·</span>
                  <span>⏱️ Max {MAX_RECORDING_SECS}s per session</span>
                  <span>·</span>
                  <span>🔄 1 session per hour</span>
                </div>

                <p className="text-[11px] text-slate-600">
                  🔒 Audio is processed locally by Whisper · Only anonymised transcript sent to Gemini
                </p>
              </div>
            )}

            {/* ════════════════ PHASE: REQUESTING ════════════════ */}
            {phase === "requesting" && (
              <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-cyan-500/30 flex items-center justify-center animate-pulse">
                  <Mic size={28} className="text-cyan-400" />
                </div>
                <div className="text-white font-semibold">Requesting microphone access…</div>
                <div className="text-slate-500 text-sm">Please allow access in your browser prompt</div>
              </div>
            )}

            {/* ════════════════ PHASE: RECORDING ════════════════ */}
            {phase === "recording" && (
              <div className="flex flex-col md:flex-row min-h-[460px]">

                {/* Left panel: controls */}
                <div className="md:w-72 flex-shrink-0 flex flex-col items-center justify-center gap-6 p-8 border-b md:border-b-0 md:border-r border-white/[0.07] bg-white/[0.015]">
                  {/* Pulsing mic */}
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" style={{ animationDuration: "1.5s" }} />
                    <div className="absolute -inset-3 rounded-full bg-red-500/10 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.5s" }} />
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-2xl shadow-red-500/40 relative z-10">
                      <Mic size={30} className="text-white" />
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center gap-2 justify-center mb-1">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-white font-semibold text-sm">Recording</span>
                    </div>
                    <RecordingTimer running={phase === "recording"} />
                  </div>

                  {/* Real waveform */}
                  <LiveWaveform analyser={analyser} active={true} />

                  {/* Stop button */}
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 font-semibold hover:bg-red-500/30 hover:border-red-500/60 transition-all"
                  >
                    <Square size={14} className="fill-current" />
                    Stop & Generate EMR
                  </button>

                  <div className="text-center">
                    <div className="text-[11px] text-slate-600">Doctor &amp; patient may speak now</div>
                    <div className="text-[10px] text-slate-700 mt-1">Min 20s recommended</div>
                  </div>
                </div>

                {/* Right panel: live transcript placeholder */}
                <div className="flex-1 p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[12px] font-bold tracking-widest text-slate-400 uppercase">Live Capture</span>
                  </div>

                  <div className="flex-1 rounded-xl bg-white/[0.02] border border-white/[0.07] p-5 flex flex-col gap-3">
                    {/* Skeleton lines to show it's recording */}
                    {[0.9, 0.7, 0.85, 0.6, 0.75].map((w, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-white/5 flex-shrink-0 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-2.5 bg-white/5 rounded animate-pulse" style={{ width: `${w * 100}%`, animationDelay: `${i * 0.15}s` }} />
                          <div className="h-2 bg-white/[0.03] rounded animate-pulse" style={{ width: `${(w - 0.15) * 100}%`, animationDelay: `${i * 0.15 + 0.1}s` }} />
                        </div>
                      </div>
                    ))}
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center text-slate-600">
                        <Mic size={24} className="mx-auto mb-2 opacity-30" />
                        <div className="text-[12px]">Transcript will appear after recording stops</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3 flex gap-2">
                    <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[12px] text-amber-300/70">
                      Audio is buffered locally. Click <strong>Stop & Generate EMR</strong> when the consultation ends.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════ PHASE: TRANSCRIBING / GENERATING ════════════════ */}
            {isProcessing && (
              <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-12">
                {/* Spinner */}
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-spin" style={{ borderTopColor: "rgb(6,182,212)" }} />
                  <div className="absolute inset-2 rounded-full border-2 border-blue-500/15 animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s", borderTopColor: "rgb(59,130,246)" }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap size={22} className="text-cyan-400" />
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-white font-bold text-lg mb-1">
                    {phase === "transcribing" ? "Transcribing Audio…" : "Generating EMR…"}
                  </div>
                  <div className="text-slate-400 text-sm">
                    {phase === "transcribing" ? "Whisper is processing your recording" : "gemini-2.5-flash-lite is structuring the clinical data"}
                  </div>
                </div>

                <div className="w-full max-w-sm space-y-2">
                  {allSteps.map((step, i) => (
                    <div
                      key={step}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                        i < processingStep
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : i === processingStep
                          ? "border-cyan-500/40 bg-cyan-500/10"
                          : "border-white/5"
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

                {/* Show transcript while generating */}
                {phase === "generating" && transcript && (
                  <div className="w-full max-w-xl rounded-xl bg-white/[0.03] border border-white/[0.07] p-4">
                    <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                      <Clock size={10} /> Transcript captured
                    </div>
                    <p className="text-[12px] text-slate-300 leading-relaxed line-clamp-4 font-mono">{transcript}</p>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════ PHASE: ERROR ════════════════ */}
            {phase === "error" && (
              <div className="flex flex-col items-center justify-center min-h-[360px] gap-5 p-10">
                <div className="w-14 h-14 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                  <AlertCircle size={24} className="text-red-400" />
                </div>
                <div className="text-center">
                  <div className="text-white font-bold mb-2">Something went wrong</div>
                  <div className="text-slate-400 text-sm max-w-md">{error}</div>
                </div>
                <button
                  onClick={reset}
                  className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* ════════════════ PHASE: EMR OUTPUT ════════════════ */}
            {phase === "emr" && emrData && (
              <div>
                {/* Success banner */}
                <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-3 flex items-center gap-3">
                  <span className="text-emerald-400 text-base">✅</span>
                  <span className="text-emerald-300 text-sm font-semibold">EMR Generated from Live Recording</span>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Confidence:</span>
                    <span className="text-[11px] font-bold text-emerald-400">{emrData.confidence}%</span>
                  </div>
                </div>

                <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">

                  {/* ── Left column ── */}
                  <div className="space-y-4">

                    {/* Chief complaint */}
                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                      <div className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase mb-2">Chief Complaint</div>
                      <p className="text-[13px] text-slate-200">{emrData.chief_complaint || "—"}</p>
                    </div>

                    {/* Risk */}
                    <RiskMeter
                      level={emrData.risk?.level ?? "MEDIUM"}
                      score={emrData.risk?.score ?? 50}
                      rationale={emrData.risk?.rationale ?? ""}
                    />

                    {/* ICD-10 */}
                    {emrData.icd10?.length > 0 && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
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

                    {/* CPT */}
                    {emrData.cpt?.length > 0 && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
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

                    {/* Medications */}
                    {emrData.medications?.length > 0 && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-3">Medications</div>
                        <ul className="space-y-1">
                          {emrData.medications.map((m, i) => (
                            <li key={i} className="text-[12px] text-slate-300 flex gap-2">
                              <span className="text-blue-400">💊</span>{m}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Tests */}
                    {emrData.recommended_tests?.length > 0 && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-3">Recommended Tests</div>
                        <ul className="space-y-1">
                          {emrData.recommended_tests.map((t, i) => (
                            <li key={i} className="text-[12px] text-slate-300 flex gap-2">
                              <span className="text-emerald-400">🧪</span>{t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* ── Right column ── */}
                  <div className="lg:col-span-2 space-y-4">

                    {/* Speaker timeline */}
                    {emrData.speakers?.length > 0 && (
                      <details className="rounded-xl border border-white/10 bg-white/[0.02]" open>
                        <summary className="px-4 py-3 text-[12px] font-semibold text-slate-300 cursor-pointer flex items-center gap-2 hover:text-white transition-colors">
                          <Mic size={12} />
                          Conversation Transcript  ({emrData.speakers.length} turns)
                        </summary>
                        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3 max-h-60 overflow-y-auto">
                          {emrData.speakers.map((sp, i) => (
                            <SpeakerTurn key={i} role={sp.role} text={sp.text} idx={i} />
                          ))}
                        </div>
                      </details>
                    )}

                    {/* SOAP Notes */}
                    <div className="flex items-center gap-2 pt-1">
                      <FileText size={13} className="text-cyan-400" />
                      <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">SOAP Notes</span>
                    </div>

                    <SOAPCard
                      label="Subjective"
                      icon="🗣️"
                      content={emrData.soap?.subjective}
                    />
                    <SOAPCard
                      label="Objective"
                      icon="📊"
                      content={emrData.soap?.objective}
                    />
                    <SOAPCard
                      label="Assessment"
                      icon="🔍"
                      content={emrData.soap?.assessment}
                    />
                    <SOAPCard
                      label="Plan"
                      icon="📋"
                      content={emrData.soap?.plan}
                    />

                    {/* Follow-up */}
                    {emrData.follow_up && (
                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                        <div className="text-[10px] font-bold tracking-widest text-blue-400 uppercase mb-2">Follow-up Instructions</div>
                        <p className="text-[13px] text-slate-300">{emrData.follow_up}</p>
                      </div>
                    )}
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
