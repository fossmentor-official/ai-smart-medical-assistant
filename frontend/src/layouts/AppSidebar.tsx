import {
  Sidebar, SidebarContent, SidebarGroup,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem
} from "@/components/ui/sidebar"
import type { Mode } from "../types/clinical"
import { MODES, DEMO_CASES } from "../types/clinical"

interface Props {
  activeMode: Mode
  onModeChange: (m: Mode) => void
  onDemoCase: (prompt: string, mode: Mode) => void
}

const modeRing: Record<string, string> = {
  blue:    "ring-blue-400/40 bg-blue-500/10",
  amber:   "ring-amber-400/40 bg-amber-500/10",
  emerald: "ring-emerald-400/40 bg-emerald-500/10",
  purple:  "ring-purple-400/40 bg-purple-500/10",
}
const modeText: Record<string, string> = {
  blue: "text-blue-300", amber: "text-amber-300",
  emerald: "text-emerald-300", purple: "text-purple-300",
}

export default function AppSidebar({ activeMode, onModeChange, onDemoCase }: Props) {
  return (
    <Sidebar className="border-r border-white/10 bg-[#0d1625] text-slate-300">
      <SidebarContent className="flex flex-col h-full overflow-y-auto px-0 py-0">

        {/* Logo */}
        <div className="px-5 pt-5 pb-4 border-b border-white/10">
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

        {/* Modes */}
        <SidebarGroup className="px-3 pt-4">
          <div className="text-[9px] font-bold tracking-widest text-slate-600 uppercase mb-2 px-2">AI Modes</div>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {MODES.map((m) => (
                <SidebarMenuItem key={m.id}>
                  <button
                    onClick={() => onModeChange(m.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150
                      ${activeMode === m.id
                        ? `ring-1 ${modeRing[m.color]} text-white`
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      }`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0
                      ${activeMode === m.id ? "bg-white/10" : "bg-white/5"}`}>
                      {m.icon}
                    </span>
                    <div className="min-w-0">
                      <div className={`text-[13px] font-medium leading-none mb-0.5 ${activeMode === m.id ? modeText[m.color] : ""}`}>
                        {m.label}
                      </div>
                      <div className="text-[10px] text-slate-600 truncate">{m.desc}</div>
                    </div>
                  </button>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Demo Cases */}
        <SidebarGroup className="px-3 pt-5">
          <div className="text-[9px] font-bold tracking-widest text-slate-600 uppercase mb-2 px-2">Demo Cases</div>
          <SidebarGroupContent>
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
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Impact metrics */}
        <div className="mt-auto mx-3 mb-4 p-3.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20">
          <div className="text-[9px] font-bold tracking-widest text-cyan-400 uppercase mb-3">Impact Metrics</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { val: "70%", label: "Faster docs" },
              { val: "40%", label: "Fewer errors" },
              { val: "3×",  label: "Throughput" },
              { val: "95%", label: "SOAP accuracy" },
            ].map((m) => (
              <div key={m.label}>
                <div className="font-display font-bold text-lg text-blue-400 leading-none">{m.val}</div>
                <div className="text-[9px] text-slate-600 mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

      </SidebarContent>
    </Sidebar>
  )
}