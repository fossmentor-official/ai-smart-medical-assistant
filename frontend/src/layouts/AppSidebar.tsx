// frontend/src/layouts/AppSidebar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Sidebar updated with user avatar + logout panel at the bottom.
// ─────────────────────────────────────────────────────────────────────────────

import type { Mode } from "../types/clinical"
import type { User } from "../auth/AuthContext"
import { MODES, DEMO_CASES } from "../types/clinical"
import { Sparkles, Mic, LogOut } from "lucide-react"

interface Props {
  activeMode:   Mode
  onModeChange: (m: Mode) => void
  onDemoCase:   (prompt: string, mode: Mode) => void
  onDemoEMR:    () => void
  onLiveEMR:    () => void
  user:         User | null
  onLogout:     () => void
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function providerIcon(provider: User["provider"]) {
  if (provider === "google")
    return (
      <svg width="10" height="10" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    )
  if (provider === "github")
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
      </svg>
    )
  return null
}

export default function AppSidebar({
  activeMode, onModeChange, onDemoCase, onDemoEMR, onLiveEMR, user, onLogout,
}: Props) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", height: "100vh" }}
      className="bg-[#0d1625] text-slate-300 border-r border-white/10"
    >
      {/* ── Logo ── */}
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

      {/* ── Scrollable middle ── */}
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
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${activeMode === m.id ? "bg-white/10" : "bg-white/5"}`}>
                  {m.icon}
                </span>
                <div className="min-w-0">
                  <div className={`text-[13px] font-medium leading-none mb-0.5 ${activeMode === m.id ? modeText[m.color] : ""}`}>
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

        {/* Voice EMR */}
        <div className="px-3 pt-5 pb-2">
          <div className="text-[9px] font-bold tracking-widest text-slate-600 uppercase mb-3 px-2">
            Voice to EMR
          </div>

          {/* Demo dictation — unlimited */}
          <button
            onClick={onDemoEMR}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-violet-500/15 to-purple-600/15 border border-violet-500/25 hover:border-violet-400/50 hover:from-violet-500/25 hover:to-purple-600/25 transition-all group mb-2"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-500/25">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <div className="text-[12px] font-bold text-violet-300 leading-none mb-0.5">Demo Dictation</div>
              <div className="text-[10px] text-slate-600 group-hover:text-slate-400 transition-colors">Simulated · Unlimited uses</div>
            </div>
            <div className="text-[9px] font-bold text-violet-600 border border-violet-600/40 rounded-full px-1.5 py-0.5">
              FREE
            </div>
          </button>

          {/* Live recording — 1×/hr, 20s max */}
          <button
            onClick={onLiveEMR}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-cyan-500/15 to-blue-600/15 border border-cyan-500/25 hover:border-cyan-400/50 hover:from-cyan-500/25 hover:to-blue-600/25 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-cyan-500/25">
              <Mic size={14} className="text-white" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <div className="text-[12px] font-bold text-cyan-300 leading-none mb-0.5">Live Recording</div>
              <div className="text-[10px] text-slate-600 group-hover:text-slate-400 transition-colors">Real mic · 20 sec · 1×/hr</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
          </button>
        </div>

        {/* ── Impact Metrics ── */}
        <div className="mx-3 mb-3 mt-4 p-3.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 flex-shrink-0">
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

      {/* ── User panel — pinned bottom ── */}
      {user && (
        <div className="flex-shrink-0 border-t border-white/10 px-3 py-3">
          {/* User info row */}
          <div className="flex items-center gap-2.5 px-2 pt-1 pb-2">
            {/* Avatar */}
            <div style={{
              width: "30px", height: "30px", borderRadius: "9px",
              background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "11px", fontWeight: 700, color: "#fff",
              flexShrink: 0, position: "relative",
            }}>
              {user.avatar
                ? <img src={user.avatar} alt={user.name} style={{ width: "100%", height: "100%", borderRadius: "9px", objectFit: "cover" }} />
                : getInitials(user.name)
              }
              {user.provider !== "email" && (
                <div style={{
                  position: "absolute", bottom: -3, right: -3,
                  width: "14px", height: "14px", borderRadius: "50%",
                  background: "#0d1625", display: "flex", alignItems: "center",
                  justifyContent: "center", border: "1px solid rgba(255,255,255,0.1)",
                }}>
                  {providerIcon(user.provider)}
                </div>
              )}
            </div>

            {/* Name + email */}
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-slate-200 truncate leading-none mb-0.5">
                {user.name}
              </div>
              <div className="text-[10px] text-slate-600 truncate">{user.email}</div>
            </div>
          </div>

          {/* Logout button — always visible */}
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 hover:border-red-500/40 transition-all text-[12px] font-semibold"
          >
            <LogOut size={12} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
