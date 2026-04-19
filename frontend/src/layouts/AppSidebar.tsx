import type { Mode } from "../types/clinical"
import { MODES, DEMO_CASES } from "../types/clinical"

interface Props {
  activeMode: Mode
  onModeChange: (m: Mode) => void
  onDemoCase: (prompt: string, mode: Mode) => void
}

const modeRing: Record<string, string> = {
  blue:    "ring-1 ring-blue-400/40 bg-blue-500/10",
  amber:   "ring-1 ring-amber-400/40 bg-amber-500/10",
  emerald: "ring-1 ring-emerald-400/40 bg-emerald-500/10",
  purple:  "ring-1 ring-purple-400/40 bg-purple-500/10",
}
const modeText: Record<string, string> = {
  blue:    "text-blue-300",
  amber:   "text-amber-300",
  emerald: "text-emerald-300",
  purple:  "text-purple-300",
}

export default function AppSidebar({ activeMode, onModeChange, onDemoCase }: Props) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", height: "100vh" }}
      className="bg-[#0d1625] text-slate-300 border-r border-white/10"
    >
      {/* Logo — fixed at top */}
      <div className="px-5 pt-5 pb-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-lg shadow-lg shadow-blue-500/20">
            🏥
          </div>
          <div>
            <div className="font-display font-bold text-white text-base leading-none">TotalCura</div>
            <div className="text-[10px] text-slate-500 mt-0.5 tracking-wide">AI Clinical Intelligence</div>
          </div>
        </div>
      </div>

      {/* Scrollable middle section */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {/* AI Modes */}
        <div className="px-3 pt-4 pb-2">
          <div className="text-[9px] font-bold tracking-widest text-slate-600 uppercase mb-2 px-2">
            AI Modes
          </div>
          <div className="space-y-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => onModeChange(m.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                  activeMode === m.id
                    ? `${modeRing[m.color]} text-white`
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${
                    activeMode === m.id ? "bg-white/10" : "bg-white/5"
                  }`}
                >
                  {m.icon}
                </span>
                <div className="min-w-0">
                  <div
                    className={`text-[13px] font-medium leading-none mb-0.5 ${
                      activeMode === m.id ? modeText[m.color] : ""
                    }`}
                  >
                    {m.label}
                  </div>
                  <div className="text-[10px] text-slate-600 truncate">{m.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Demo Cases */}
        <div className="px-3 pt-4 pb-2">
          <div className="text-[9px] font-bold tracking-widest text-slate-600 uppercase mb-2 px-2">
            Demo Cases
          </div>
          <div className="space-y-1.5">
            {DEMO_CASES.map((d, i) => (
              <button
                key={i}
                onClick={() => onDemoCase(d.prompt, d.mode)}
                className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/10 text-left transition-all group"
              >
                <span className="text-base mt-0.5 flex-shrink-0">{d.icon}</span>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-slate-300 group-hover:text-white leading-none mb-0.5">
                    {d.label}
                  </div>
                  <div className="text-[10px] text-slate-600">{d.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Impact Metrics — pinned to bottom */}
      <div className="mx-3 mb-4 mt-2 p-3.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 flex-shrink-0">
        <div className="text-[9px] font-bold tracking-widest text-cyan-400 uppercase mb-3">
          Impact Metrics
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { val: "70%", label: "Faster docs"   },
            { val: "40%", label: "Fewer errors"  },
            { val: "3×",  label: "Throughput"    },
            { val: "95%", label: "SOAP accuracy" },
          ].map((m) => (
            <div key={m.label}>
              <div className="font-display font-bold text-lg text-blue-400 leading-none">{m.val}</div>
              <div className="text-[9px] text-slate-600 mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}