import type { Message, ClinicalResponse, BillingResponse, DocsResponse, InsightsResponse, AIResponse } from "../types/clinical"

function parseResponse(text: string): AIResponse | null {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim()
    // Only parse once we have a complete JSON (ends with })
    if (!cleaned.endsWith("}")) return null
    return JSON.parse(cleaned) as AIResponse
  } catch {
    return null
  }
}

const riskConfig = {
  low:    { label: "Low Risk",    bar: "w-1/4", color: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  medium: { label: "Medium Risk", bar: "w-1/2", color: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50 border-amber-200"   },
  high:   { label: "High Risk",   bar: "w-3/4", color: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50 border-red-200"       },
}

function ClinicalCard({ d }: { d: ClinicalResponse }) {
  const risk = riskConfig[d.risk_level] ?? riskConfig.low
  return (
    <div className="clinical-card animate-slide-up">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-base">🧬</span>
          <span className="font-semibold text-slate-800 text-sm">AI Medical Analysis</span>
          <span className="text-slate-400 text-xs">· {d.summary}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono bg-blue-600 text-white px-2 py-0.5 rounded">
          ⚡ {d.confidence}% confidence
        </div>
      </div>

      {/* 2×2 grid */}
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-100">
        {/* Diagnosis */}
        <div className="p-4">
          <div className="text-[9px] font-bold tracking-widest text-blue-600 uppercase mb-2">🔍 Possible Diagnosis</div>
          <div className="flex flex-wrap gap-1.5">
            {d.possible_diagnosis.map(dx => <span key={dx} className="tag-blue">{dx}</span>)}
          </div>
        </div>

        {/* Risk */}
        <div className="p-4">
          <div className={`text-[9px] font-bold tracking-widest uppercase mb-2 ${risk.text}`}>⚠️ Risk Level</div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${risk.bg} ${risk.text}`}>
            {risk.label}
          </div>
          <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${risk.bar} ${risk.color}`} />
          </div>
        </div>

        {/* Tests */}
        <div className="p-4">
          <div className="text-[9px] font-bold tracking-widest text-emerald-600 uppercase mb-2">🧪 Recommended Tests</div>
          <div className="flex flex-wrap gap-1.5">
            {d.recommended_tests.map(t => <span key={t} className="tag-green">{t}</span>)}
          </div>
        </div>

        {/* Medications */}
        <div className="p-4">
          <div className="text-[9px] font-bold tracking-widest text-amber-600 uppercase mb-2">💊 Medications</div>
          <div className="flex flex-wrap gap-1.5">
            {d.medications.length > 0
              ? d.medications.map(m => <span key={m} className="tag-amber">{m}</span>)
              : <span className="text-xs text-slate-400">Conservative management</span>
            }
          </div>
        </div>
      </div>

      {/* Treatment plan */}
      <div className="px-4 py-3 border-t border-slate-100">
        <div className="text-[9px] font-bold tracking-widest text-slate-500 uppercase mb-2">📋 Treatment Plan</div>
        <ul className="space-y-1">
          {d.treatment_plan.map((step, i) => (
            <li key={i} className="flex gap-2 text-xs text-slate-600">
              <span className="text-blue-400 font-bold flex-shrink-0">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Referral */}
      {d.when_to_refer && (
        <div className="px-4 py-3 border-t border-red-100 bg-red-50">
          <div className="text-[9px] font-bold tracking-widest text-red-500 uppercase mb-1">🚨 Referral Criteria</div>
          <p className="text-xs text-red-700">{d.when_to_refer}</p>
        </div>
      )}

      {/* SOAP Notes */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="text-[9px] font-bold tracking-widest text-slate-500 uppercase mb-3">📝 SOAP Notes</div>
        <div className="grid grid-cols-2 gap-2">
          {(["subjective","objective","assessment","plan"] as const).map(k => (
            <div key={k} className="soap-cell">
              <div className="text-[9px] font-bold tracking-widest text-blue-500 uppercase mb-1">{k}</div>
              <p className="text-xs text-slate-600 leading-relaxed">{d.soap_notes[k]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex gap-2 flex-wrap">
        {["📄 Export PDF","📋 Copy SOAP Notes","📤 Send to EMR"].map(a => (
          <button key={a} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-all">
            {a}
          </button>
        ))}
      </div>
    </div>
  )
}

function BillingCard({ d }: { d: BillingResponse }) {
  return (
    <div className="clinical-card animate-slide-up">
      <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-100">
        <div className="flex items-center gap-2">
          <span>💰</span>
          <span className="font-semibold text-slate-800 text-sm">Billing Analysis</span>
          <span className="text-slate-400 text-xs">· {d.summary}</span>
        </div>
        <div className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded">BILLING</div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-slate-100">
        <div className="p-4">
          <div className="text-[9px] font-bold tracking-widest text-blue-600 uppercase mb-2">ICD-10 Codes</div>
          <div className="space-y-1.5">
            {d.icd10_codes.map(c => (
              <div key={c.code} className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">{c.code}</span>
                <span className="text-xs text-slate-600">{c.description}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4">
          <div className="text-[9px] font-bold tracking-widest text-emerald-600 uppercase mb-2">CPT Codes</div>
          <div className="space-y-1.5">
            {d.cpt_codes.map(c => (
              <div key={c.code} className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">{c.code}</span>
                <span className="text-xs text-slate-600">{c.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-slate-100 bg-emerald-50">
        <div className="text-[9px] font-bold tracking-widest text-emerald-600 uppercase mb-1">Estimated Reimbursement</div>
        <div className="font-display font-bold text-2xl text-emerald-700">{d.estimated_reimbursement}</div>
      </div>
      {d.denial_risks.length > 0 && (
        <div className="px-4 py-3 border-t border-red-100">
          <div className="text-[9px] font-bold tracking-widest text-red-500 uppercase mb-2">Denial Risks</div>
          <div className="flex flex-wrap gap-1.5">{d.denial_risks.map(r => <span key={r} className="tag-red">{r}</span>)}</div>
        </div>
      )}
      <div className="px-4 py-3 border-t border-slate-100">
        <div className="text-[9px] font-bold tracking-widest text-slate-500 uppercase mb-2">Optimization Tips</div>
        <ul className="space-y-1">{d.optimization_tips.map((t,i) => <li key={i} className="text-xs text-slate-600 flex gap-1.5"><span className="text-emerald-500">→</span>{t}</li>)}</ul>
      </div>
    </div>
  )
}

function DocsCard({ d }: { d: DocsResponse }) {
  return (
    <div className="clinical-card animate-slide-up">
      <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border-b border-emerald-100">
        <div className="flex items-center gap-2"><span>📄</span><span className="font-semibold text-slate-800 text-sm">{d.document_type} Generated</span></div>
        <div className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded">DOCS</div>
      </div>
      <div className="p-4">
        <div className="text-[9px] font-bold tracking-widest text-slate-500 uppercase mb-2">Document Content</div>
        <pre className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100 whitespace-pre-wrap font-sans leading-relaxed">{d.content}</pre>
      </div>
      {d.follow_up && (
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="text-[9px] font-bold tracking-widest text-blue-500 uppercase mb-1">Follow-up</div>
          <p className="text-xs text-slate-600">{d.follow_up}</p>
        </div>
      )}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex gap-2">
        {["📄 Export Word","📤 Send to EMR","📋 Copy"].map(a => (
          <button key={a} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-all">{a}</button>
        ))}
      </div>
    </div>
  )
}

function InsightsCard({ d }: { d: InsightsResponse }) {
  return (
    <div className="clinical-card animate-slide-up">
      <div className="flex items-center justify-between px-4 py-3 bg-purple-50 border-b border-purple-100">
        <div className="flex items-center gap-2"><span>📊</span><span className="font-semibold text-slate-800 text-sm">Clinic Insights</span><span className="text-slate-400 text-xs">· {d.summary}</span></div>
        <div className="text-[10px] font-bold bg-purple-500 text-white px-2 py-0.5 rounded">INSIGHTS</div>
      </div>
      <div className="p-4 grid grid-cols-3 gap-3">
        {d.key_metrics.map(m => (
          <div key={m.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
            <div className="font-display font-bold text-xl text-blue-600">{m.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{m.label}</div>
            <div className={`text-[9px] font-bold mt-1 ${m.trend === "down" ? "text-emerald-500" : "text-red-400"}`}>
              {m.trend === "down" ? "↓ Improving" : m.trend === "up" ? "↑ Attention" : "→ Stable"}
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-slate-100">
        <div className="text-[9px] font-bold tracking-widest text-slate-500 uppercase mb-2">Recommendations</div>
        <ul className="space-y-1">{d.recommendations.map((r,i) => <li key={i} className="text-xs text-slate-600 flex gap-1.5"><span className="text-purple-500">→</span>{r}</li>)}</ul>
      </div>
      <div className="px-4 py-3 border-t border-emerald-100 bg-emerald-50">
        <div className="text-[9px] font-bold tracking-widest text-emerald-600 uppercase mb-1">Projected Impact</div>
        <div className="font-display font-bold text-xl text-emerald-700">{d.projected_improvement}</div>
      </div>
    </div>
  )
}

// Streaming partial JSON — show shimmer until parseable
function StreamingCard({ text }: { text: string }) {
  return (
    <div className="clinical-card animate-fade-in p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{animationDelay:`${i*0.15}s`}} />)}</div>
        <span className="text-xs text-slate-400">Generating structured response...</span>
      </div>
      <div className="space-y-2">
        {[100,85,70,55].map(w => <div key={w} className={`h-3 rounded bg-slate-100 animate-pulse`} style={{width:`${w}%`}} />)}
      </div>
      <p className="text-[10px] text-slate-300 mt-3 font-mono break-all line-clamp-2">{text.slice(-100)}</p>
    </div>
  )
}

export default function MessageBubble({ role, text, mode }: Message) {
  if (role === "user") {
    return (
      <div className="flex justify-end animate-slide-up">
        <div className="bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[70%] text-sm shadow-md shadow-blue-100 leading-relaxed">
          {text}
        </div>
      </div>
    )
  }

  // AI message
  const parsed = parseResponse(text)

  if (!parsed) {
    // Still streaming — show shimmer
    return (
      <div className="flex gap-3 items-start animate-slide-up">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-sm flex-shrink-0 shadow-md shadow-blue-100">🤖</div>
        <div className="flex-1 max-w-2xl">
          <StreamingCard text={text} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 items-start animate-slide-up">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-sm flex-shrink-0 shadow-md shadow-blue-100 mt-0.5">🤖</div>
      <div className="flex-1 max-w-2xl">
        {parsed.type === "clinical"  && <ClinicalCard  d={parsed as ClinicalResponse}  />}
        {parsed.type === "billing"   && <BillingCard   d={parsed as BillingResponse}   />}
        {parsed.type === "docs"      && <DocsCard      d={parsed as DocsResponse}      />}
        {parsed.type === "insights"  && <InsightsCard  d={parsed as InsightsResponse}  />}
      </div>
    </div>
  )
}