// frontend/src/components/BillingRCM.tsx
// Full RCM / Revenue Cycle Management demo component
// Investor-grade UI: scenario selector → Gemini analysis → rich structured output

import { useState } from "react"
import {
  DollarSign, AlertTriangle, CheckCircle, TrendingUp,
  Zap, RefreshCw, ChevronRight, Info, XCircle, FileText,
  BarChart3, ArrowRight
} from "lucide-react"
import { analyzeRCM, type RCMResult, type RCMError } from "../lib/api"

// ── Demo scenarios ────────────────────────────────────────────────────────────

const SCENARIOS = [
  {
    id: "diabetes-followup",
    label: "Diabetes Follow-up",
    icon: "🩸",
    tag: "Common",
    tagColor: "bg-blue-100 text-blue-700",
    description: "58M with T2DM, HbA1c 9.2%. 30-min established patient visit. CBC, HbA1c labs drawn. BP medication adjusted. Telehealth visit.",
  },
  {
    id: "chest-pain-er",
    label: "Chest Pain — ED",
    icon: "💔",
    tag: "High Value",
    tagColor: "bg-emerald-100 text-emerald-700",
    description: "55M presenting to ED with acute chest pain. 12-lead ECG, troponin x2, chest X-ray ordered. Cardiology consult. Admitted for observation. History of hypertension.",
  },
  {
    id: "annual-wellness",
    label: "Annual Wellness Visit",
    icon: "🏥",
    tag: "Preventive",
    tagColor: "bg-purple-100 text-purple-700",
    description: "45F annual wellness visit. Pap smear, mammogram referral, depression screening (PHQ-9), BMI counseling, flu vaccine administered. New patient.",
  },
  {
    id: "orthopedic-knee",
    label: "Knee Replacement Pre-op",
    icon: "🦴",
    tag: "Surgical",
    tagColor: "bg-amber-100 text-amber-700",
    description: "68M pre-operative assessment for right knee arthroplasty. H&P documented, anesthesia consult, pre-op CBC, BMP, coagulation panel, ECG, chest X-ray. ASA classification III.",
  },
]

// ── Subcomponents ─────────────────────────────────────────────────────────────

function RevenueMeter({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-1000 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function ErrorBadge({ severity }: { severity: RCMError["severity"] }) {
  if (severity === "critical") return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 border border-red-200">
      <XCircle size={9} className="text-red-600" />
      <span className="text-[9px] font-bold text-red-700 uppercase tracking-wide">Critical</span>
    </div>
  )
  if (severity === "warning") return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200">
      <AlertTriangle size={9} className="text-amber-600" />
      <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wide">Warning</span>
    </div>
  )
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 border border-blue-200">
      <Info size={9} className="text-blue-600" />
      <span className="text-[9px] font-bold text-blue-700 uppercase tracking-wide">Info</span>
    </div>
  )
}

function DenialMeter({ probability }: { probability: number }) {
  const color =
    probability < 20 ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
    probability < 50 ? "text-amber-600 bg-amber-50 border-amber-200" :
    "text-red-600 bg-red-50 border-red-200"
  const barColor =
    probability < 20 ? "bg-emerald-400" :
    probability < 50 ? "bg-amber-400" :
    "bg-red-400"
  const label =
    probability < 20 ? "Low Risk" :
    probability < 50 ? "Moderate Risk" :
    "High Risk"

  return (
    <div className={`rounded-xl border px-4 py-3 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest">Denial Probability</span>
        <span className="font-display font-bold text-2xl">{probability}%</span>
      </div>
      <div className="h-2 w-full bg-white/60 rounded-full overflow-hidden mb-1.5">
        <div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${probability}%` }} />
      </div>
      <div className="text-[10px] font-semibold">{label}</div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function BillingRCM() {
  const [selectedScenario, setSelectedScenario] = useState<typeof SCENARIOS[0] | null>(null)
  const [customInput, setCustomInput]           = useState("")
  const [useCustom, setUseCustom]               = useState(false)
  const [loading, setLoading]                   = useState(false)
  const [result, setResult]                     = useState<RCMResult | null>(null)
  const [error, setError]                       = useState<string | null>(null)
  const [expandedError, setExpandedError]       = useState<string | null>(null)

  const handleAnalyze = async () => {
    const description = useCustom ? customInput : selectedScenario?.description
    if (!description?.trim()) return

    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const data = await analyzeRCM(
        description,
        useCustom ? "custom" : (selectedScenario?.id ?? "")
      )
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
    setSelectedScenario(null)
    setCustomInput("")
    setUseCustom(false)
  }

  const canAnalyze = useCustom ? customInput.trim().length > 10 : !!selectedScenario

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">

      {/* ── Header ── */}
      <div className="clinical-card overflow-hidden">
        <div className="bg-gradient-to-r from-[#0d1625] via-[#111e33] to-[#0d1625] px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={12} className="text-emerald-400" />
                <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
                  Revenue Cycle Management
                </span>
              </div>
              <h2 className="font-display font-bold text-white text-xl">AI Billing Intelligence</h2>
              <p className="text-slate-400 text-xs mt-1">
                Auto-generate billing codes · Estimate claim revenue · Detect errors before submission
              </p>
            </div>
            <div className="hidden md:flex flex-col items-end gap-1">
              <div className="flex gap-3 text-right">
                {[
                  { val: "40%", label: "Fewer denials" },
                  { val: "23%", label: "Revenue uplift" },
                  { val: "90%", label: "Code accuracy" },
                ].map(m => (
                  <div key={m.label} className="text-right">
                    <div className="font-display font-bold text-emerald-400 text-lg leading-none">{m.val}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Scenario selector ── */}
        {!result && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                Select Visit Scenario
              </div>
              <button
                onClick={() => { setUseCustom(v => !v); setSelectedScenario(null) }}
                className={`text-[11px] font-medium px-3 py-1 rounded-full border transition-all ${
                  useCustom
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                {useCustom ? "← Use demo scenario" : "✏️ Enter custom visit"}
              </button>
            </div>

            {!useCustom ? (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {SCENARIOS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedScenario(s)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      selectedScenario?.id === s.id
                        ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <span className="text-xl flex-shrink-0 mt-0.5">{s.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[13px] font-semibold text-slate-800">{s.label}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${s.tagColor}`}>{s.tag}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{s.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                placeholder="Describe the clinical visit in detail: patient demographics, diagnosis, procedures performed, tests ordered, visit duration, visit type (in-person/telehealth)..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 resize-none outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 mb-4"
                rows={4}
              />
            )}

            {/* Selected preview */}
            {selectedScenario && !useCustom && (
              <div className="mb-4 p-3.5 rounded-xl bg-blue-50 border border-blue-200 animate-fade-in">
                <div className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-1.5">Selected Visit</div>
                <p className="text-xs text-slate-700 leading-relaxed">{selectedScenario.description}</p>
              </div>
            )}

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze || loading}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing with Gemini AI...
                </>
              ) : (
                <>
                  <Zap size={15} />
                  Analyze & Generate Billing Report
                  <ChevronRight size={15} />
                </>
              )}
            </button>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="mx-5 mb-5 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
            <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-red-700">Analysis Failed</div>
              <div className="text-xs text-red-600 mt-0.5">{error}</div>
              <button onClick={handleReset} className="text-xs text-red-600 font-semibold underline mt-2">Try again</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Results ── */}
      {result && (
        <div className="space-y-3 animate-slide-up">

          {/* Summary banner */}
          <div className="clinical-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
              <div className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-emerald-600" />
                <div>
                  <div className="text-sm font-semibold text-slate-800">{result.summary}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {result.icd10_codes.length} ICD-10 · {result.cpt_codes.length} CPT ·{" "}
                    {result.errors.filter(e => e.severity === "critical").length} critical errors · {result.confidence}% confidence
                  </div>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-slate-300 transition-all"
              >
                <RefreshCw size={11} /> New Analysis
              </button>
            </div>

            {/* Revenue summary row */}
            <div className="grid grid-cols-4 divide-x divide-slate-100">
              {[
                {
                  label: "Standard Fee",
                  value: `$${result.standard_fee.toFixed(2)}`,
                  sub: "Billed amount",
                  color: "text-slate-800",
                  bg: "",
                },
                {
                  label: "Est. Reimbursement",
                  value: `$${result.estimated_reimbursement.toFixed(2)}`,
                  sub: "Expected payout",
                  color: "text-emerald-700",
                  bg: "bg-emerald-50/50",
                },
                {
                  label: "Net Collection",
                  value: `$${result.net_collection.toFixed(2)}`,
                  sub: "After deductibles",
                  color: "text-blue-700",
                  bg: "bg-blue-50/30",
                },
                {
                  label: "Revenue Leakage",
                  value: `$${result.revenue_leakage.toFixed(2)}`,
                  sub: "Missed opportunity",
                  color: "text-red-600",
                  bg: "bg-red-50/40",
                },
              ].map(m => (
                <div key={m.label} className={`px-4 py-4 ${m.bg}`}>
                  <div className="text-[9px] font-bold tracking-widest text-slate-500 uppercase mb-1">{m.label}</div>
                  <div className={`font-display font-bold text-2xl ${m.color}`}>{m.value}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Revenue bars */}
            <div className="px-5 py-3 space-y-2 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-500 w-32 flex-shrink-0">Reimbursement rate</span>
                <div className="flex-1">
                  <RevenueMeter value={result.estimated_reimbursement} max={result.standard_fee} color="bg-emerald-400" />
                </div>
                <span className="text-[10px] font-mono font-semibold text-emerald-600 w-10 text-right">
                  {Math.round((result.estimated_reimbursement / result.standard_fee) * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-500 w-32 flex-shrink-0">Collection rate</span>
                <div className="flex-1">
                  <RevenueMeter value={result.net_collection} max={result.standard_fee} color="bg-blue-400" />
                </div>
                <span className="text-[10px] font-mono font-semibold text-blue-600 w-10 text-right">
                  {Math.round((result.net_collection / result.standard_fee) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Codes + Denial probability */}
          <div className="grid grid-cols-3 gap-3">

            {/* ICD-10 */}
            <div className="col-span-1 clinical-card overflow-hidden">
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                <div className="text-[9px] font-bold tracking-widest text-blue-700 uppercase">ICD-10 Diagnoses</div>
              </div>
              <div className="p-3 space-y-2">
                {result.icd10_codes.map(c => (
                  <div key={c.code} className="flex items-start gap-2">
                    <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                      {c.code}
                    </span>
                    <span className="text-[11px] text-slate-600 leading-tight">{c.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CPT */}
            <div className="col-span-1 clinical-card overflow-hidden">
              <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
                <div className="text-[9px] font-bold tracking-widest text-emerald-700 uppercase">CPT Procedures + Fees</div>
              </div>
              <div className="p-3 space-y-2">
                {result.cpt_codes.map(c => (
                  <div key={c.code} className="flex items-start gap-2">
                    <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                      {c.code}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-slate-600 leading-tight">{c.description}</div>
                      {c.fee > 0 && (
                        <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">${c.fee.toFixed(2)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Denial probability */}
            <div className="col-span-1 clinical-card overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="text-[9px] font-bold tracking-widest text-slate-500 uppercase">Claim Risk</div>
              </div>
              <div className="p-3">
                <DenialMeter probability={result.denial_probability} />
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Critical errors</span>
                    <span className="font-bold text-red-600">
                      {result.errors.filter(e => e.severity === "critical").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Warnings</span>
                    <span className="font-bold text-amber-600">
                      {result.errors.filter(e => e.severity === "warning").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Confidence</span>
                    <span className="font-bold text-blue-600">{result.confidence}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error detection */}
          {result.errors.length > 0 && (
            <div className="clinical-card overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100">
                <AlertTriangle size={14} className="text-amber-500" />
                <div className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">
                  Billing Errors Detected — Fix Before Submission
                </div>
                <div className="ml-auto flex gap-1.5">
                  {["critical","warning","info"].map(sev => {
                    const count = result.errors.filter(e => e.severity === sev).length
                    if (!count) return null
                    const cls = sev === "critical" ? "bg-red-100 text-red-700" : sev === "warning" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    return <span key={sev} className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{count} {sev}</span>
                  })}
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {result.errors.map(err => (
                  <div key={err.code} className="px-5 py-4">
                    <div
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => setExpandedError(expandedError === err.code ? null : err.code)}
                    >
                      <ErrorBadge severity={err.severity} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400">{err.code}</span>
                          <span className="text-[13px] font-semibold text-slate-800">{err.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{err.detail}</p>
                      </div>
                      <ChevronRight
                        size={14}
                        className={`text-slate-400 flex-shrink-0 mt-0.5 transition-transform ${expandedError === err.code ? "rotate-90" : ""}`}
                      />
                    </div>
                    {expandedError === err.code && (
                      <div className="mt-3 ml-[72px] p-3 rounded-xl bg-slate-50 border border-slate-200 animate-fade-in">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <ArrowRight size={11} className="text-emerald-600" />
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Recommended Fix</span>
                        </div>
                        <p className="text-[12px] text-slate-700 leading-relaxed">{err.fix}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optimization tips */}
          {result.optimization_tips.length > 0 && (
            <div className="clinical-card overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100">
                <TrendingUp size={14} className="text-emerald-600" />
                <div className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">
                  Revenue Optimization Tips
                </div>
                <div className="ml-auto text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  +${result.revenue_leakage.toFixed(2)} potential
                </div>
              </div>
              <div className="p-4 space-y-2.5">
                {result.optimization_tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-[12px] text-slate-700 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action footer */}
          <div className="clinical-card p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="text-[11px] text-slate-400">
              ⚠️ AI-assisted billing analysis · Always verify codes with a certified medical coder before submission
            </div>
            <div className="flex gap-2">
              {["📄 Export Report", "📤 Submit Claim", "📋 Copy Codes"].map(a => (
                <button key={a} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-600 transition-all font-medium">
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}