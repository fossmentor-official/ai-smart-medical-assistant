// src/components/UseCaseSimulator.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Interactive Use-Case Simulator
// Select facility type → select your role → watch personalised AI workflow
// animate step by step with real AI output previews.
//
// Design: matches TotalCura's #0d1625 dark palette. All existing patterns
// (gradients, border tokens, typography scale) are preserved.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react"
import { CheckCircle2, ChevronRight, Zap, ArrowRight } from "lucide-react"
import { FACILITIES, SIMULATOR_DATA } from "@/data/simulatorData"
import { trackSimulatorEvent } from "@/lib/simulatorApi"
import type {
  FacilityType,
  WorkflowStep,
  RolePersona,
  RoleMetric,
} from "@/types/simulator"

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  /** Called when the user clicks the "Book a personalised demo" CTA. */
  onBookDemo?: () => void;
}

// ── Facility card ─────────────────────────────────────────────────────────────

function FacilityCard({
  facility,
  active,
  onClick,
}: {
  facility: (typeof FACILITIES)[0];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[130px] flex flex-col items-center gap-1.5 px-3 py-4 rounded-2xl border transition-all duration-200 text-center ${
        active
          ? "border-cyan-400/70 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.10)]"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
      }`}
    >
      <span className="text-2xl leading-none">{facility.icon}</span>
      <span className={`text-[13px] font-semibold leading-none ${active ? "text-cyan-200" : "text-slate-300"}`}>
        {facility.label}
      </span>
      <span className="text-[10px] text-slate-600 leading-tight">{facility.sub}</span>
    </button>
  )
}

// ── Role chip ─────────────────────────────────────────────────────────────────

function RoleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-[12px] font-medium border transition-all duration-150 whitespace-nowrap ${
        active
          ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-300"
          : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  )
}

// ── Step row ──────────────────────────────────────────────────────────────────

function StepRow({
  step,
  index,
  total,
  state,
  onClick,
}: {
  step: WorkflowStep;
  index: number;
  total: number;
  state: "idle" | "active" | "done";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-0 text-left transition-colors duration-150 border-b last:border-b-0 ${
        state === "active"
          ? "border-white/10 bg-cyan-500/5"
          : state === "done"
          ? "border-white/8 bg-emerald-500/[0.03]"
          : "border-white/8 hover:bg-white/[0.03]"
      }`}
    >
      {/* Left: number + connector line */}
      <div className="w-14 flex-shrink-0 flex flex-col items-center pt-[18px] pb-0">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
            state === "done"
              ? "bg-emerald-500 border-emerald-500"
              : state === "active"
              ? "bg-cyan-500 border-cyan-500"
              : "bg-transparent border border-white/20"
          }`}
        >
          {state === "done" ? (
            <CheckCircle2 size={12} className="text-white" />
          ) : (
            <span
              className={`text-[10px] font-bold ${
                state === "active" ? "text-white" : "text-slate-600"
              }`}
            >
              {index + 1}
            </span>
          )}
        </div>
        {index < total - 1 && (
          <div
            className={`w-px flex-1 mt-1.5 min-h-[24px] transition-colors duration-500 ${
              state === "done" ? "bg-emerald-500/30" : "bg-white/8"
            }`}
          />
        )}
      </div>

      {/* Right: content */}
      <div className="flex-1 py-4 pr-4">
        {/* Tag + title */}
        <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wider mb-0.5">
          {step.tag}
        </p>
        <p
          className={`text-[13px] font-semibold leading-snug mb-1 transition-colors ${
            state === "active" ? "text-cyan-200" : state === "done" ? "text-slate-300" : "text-slate-400"
          }`}
        >
          {step.title}
        </p>
        <p className="text-[12px] text-slate-500 leading-relaxed mb-2">{step.desc}</p>

        {/* AI output bubble — only shown when active */}
        {state === "active" && (
          <div className="mt-2 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-cyan-500/20">
            <p className="text-[10px] font-semibold text-cyan-500 uppercase tracking-wider mb-1.5">
              TotalCura AI · live output
            </p>
            <p className="text-[12px] text-slate-300 leading-relaxed font-mono">
              {step.aiOutput}
            </p>
          </div>
        )}

        {/* Timing note */}
        <p
          className={`text-[10px] mt-1.5 transition-colors ${
            state === "active" ? "text-cyan-600" : "text-slate-700"
          }`}
        >
          {step.timingNote}
        </p>
      </div>
    </button>
  )
}

// ── Metric pill ───────────────────────────────────────────────────────────────

function MetricPill({
  primary,
  label,
  accent = false,
}: {
  primary: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex-1 min-w-[120px] rounded-2xl px-4 py-3 text-center border ${
        accent
          ? "bg-cyan-500/10 border-cyan-500/25"
          : "bg-white/[0.04] border-white/10"
      }`}
    >
      <p className={`text-xl font-bold font-mono leading-none mb-1 ${accent ? "text-cyan-300" : "text-slate-200"}`}>
        {primary}
      </p>
      <p className="text-[10px] text-slate-500 leading-snug">{label}</p>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

const AUTO_PLAY_INTERVAL = 2800 // ms per step

export default function UseCaseSimulator({ onBookDemo }: Props) {
  const [facility, setFacility]     = useState<FacilityType>("clinic")
  const [role, setRole]             = useState<string>("Doctor")
  const [activeStep, setActiveStep] = useState(0)
  const [isPlaying, setIsPlaying]   = useState(true)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Derived data — always from static store (instant, no API needed for presets)
  const facilityData = SIMULATOR_DATA[facility]
  const roles        = facilityData.roles
  const roleData     = facilityData.roleData[role]
  const { persona, steps, metric } = roleData

  // ── Auto-play ──

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }, [])

  const startTimer = useCallback(() => {
    stopTimer()
    timerRef.current = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length)
    }, AUTO_PLAY_INTERVAL)
  }, [steps.length, stopTimer])

  useEffect(() => {
    if (isPlaying) {
      startTimer()
    } else {
      stopTimer()
    }
    return stopTimer
  }, [isPlaying, startTimer, stopTimer])

  // Reset to step 0 when facility or role changes
  useEffect(() => {
    setActiveStep(0)
    setIsPlaying(true)
  }, [facility, role])

  // ── Handlers ──

  const handleFacilityChange = (f: FacilityType) => {
    setFacility(f)
    const firstRole = SIMULATOR_DATA[f].roles[0]
    setRole(firstRole)
    trackSimulatorEvent(f, firstRole, "view")
  }

  const handleRoleChange = (r: string) => {
    setRole(r)
    trackSimulatorEvent(facility, r, "view")
  }

  const handleStepClick = (i: number) => {
    setActiveStep(i)
    setIsPlaying(false)
    trackSimulatorEvent(facility, role, "step_click")
  }

  const handleCtaClick = () => {
    trackSimulatorEvent(facility, role, "cta_click")
    onBookDemo?.()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#060e1a] text-slate-300">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">

        {/* ── Hero ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 mb-4">
            <Zap size={11} className="text-cyan-400" />
            <span className="text-[11px] font-medium text-cyan-400 tracking-wide uppercase">
              Interactive simulator
            </span>
          </div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-white leading-tight mb-3">
            See TotalCura working<br className="hidden sm:block" /> for your team
          </h1>
          <p className="text-[14px] text-slate-400 max-w-md mx-auto leading-relaxed">
            Select your setup below and watch your personalised AI workflow animate step by step.
          </p>
        </div>

        {/* ── Step 1: Facility picker ── */}
        <div className="mb-5">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3 px-1">
            I run a…
          </p>
          <div className="flex gap-2.5 flex-wrap">
            {FACILITIES.map((f) => (
              <FacilityCard
                key={f.id}
                facility={f}
                active={facility === f.id}
                onClick={() => handleFacilityChange(f.id)}
              />
            ))}
          </div>
        </div>

        {/* ── Step 2: Role picker ── */}
        <div className="mb-6">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3 px-1">
            I work as…
          </p>
          <div className="flex gap-2 flex-wrap">
            {roles.map((r) => (
              <RoleChip
                key={r}
                label={r}
                active={role === r}
                onClick={() => handleRoleChange(r)}
              />
            ))}
          </div>
        </div>

        {/* ── Workflow card ── */}
        <div
          className="rounded-3xl border border-white/10 overflow-hidden mb-5"
          style={{ background: "linear-gradient(160deg, #0d1625 0%, #0a111e 100%)" }}
        >
          {/* Persona header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-lg flex-shrink-0">
              {persona.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white leading-none truncate">
                {persona.name}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{persona.role}</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-medium text-emerald-400">AI active</span>
            </div>
          </div>

          {/* Steps */}
          <div>
            {steps.map((step, i) => (
              <StepRow
                key={i}
                step={step}
                index={i}
                total={steps.length}
                state={
                  i === activeStep ? "active" : i < activeStep ? "done" : "idle"
                }
                onClick={() => handleStepClick(i)}
              />
            ))}
          </div>

          {/* Play / pause toggle */}
          <div className="px-5 py-3 border-t border-white/8 flex items-center justify-between">
            <p className="text-[11px] text-slate-600">
              {isPlaying ? "Auto-advancing steps…" : `Step ${activeStep + 1} of ${steps.length} · click any step`}
            </p>
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors px-3 py-1 rounded-lg border border-white/8 hover:border-white/15"
            >
              {isPlaying ? "Pause" : "Auto-play"}
            </button>
          </div>
        </div>

        {/* ── Metrics row ── */}
        <div className="flex gap-2.5 flex-wrap mb-6">
          <MetricPill primary={metric.primary} label={metric.primaryLabel} accent />
          <MetricPill primary={String(steps.length)} label="Automated workflow steps" />
          <MetricPill primary="0 min" label="Manual data entry required" />
        </div>

        {/* ── CTA ── */}
        <div
          className="rounded-2xl border border-cyan-500/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ background: "linear-gradient(120deg, rgba(6,182,212,0.06) 0%, rgba(59,130,246,0.04) 100%)" }}
        >
          <div>
            <p className="text-[14px] font-semibold text-white mb-0.5">
              Ready to see this in your {FACILITIES.find((f) => f.id === facility)?.label.toLowerCase()}?
            </p>
            <p className="text-[12px] text-slate-500">
              Book a personalised demo — AI builds your exact workflow in 60 seconds.
            </p>
          </div>
          <button
            onClick={handleCtaClick}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-[13px] font-semibold text-white hover:opacity-90 transition-all active:scale-[0.98] whitespace-nowrap flex-shrink-0"
          >
            Book my demo
            <ArrowRight size={14} />
          </button>
        </div>

        {/* ── Switch facility nudge ── */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <p className="text-[12px] text-slate-600">Explore other setups:</p>
          {FACILITIES.filter((f) => f.id !== facility).map((f) => (
            <button
              key={f.id}
              onClick={() => handleFacilityChange(f.id)}
              className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
              <ChevronRight size={12} className="opacity-40" />
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
