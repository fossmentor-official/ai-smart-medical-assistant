import { useState, useEffect, useRef } from "react"
import { streamMessage } from "../lib/api"
import MessageBubble from "./MessageBubble"
import TypingIndicator from "./TypingIndicator"
import type { Message, Mode } from "../types/clinical"
import { MODES } from "../types/clinical"
import { Send } from "lucide-react"

interface Props {
  mode: Mode
  pendingPrompt: { text: string; mode: Mode } | null
  onPendingClear: () => void
}

const HINTS: Record<Mode, string[]> = {
  clinical: ["Fever + cough 3 days", "Diabetic with high HbA1c", "Chest pain urgent"],
  billing:  ["ICD-10 for hypertension + CKD", "CPT for office visit 30 min", "Diabetes billing codes"],
  docs:     ["SOAP note for flu patient", "Discharge summary for diabetic", "Referral letter to cardiologist"],
  insights: ["Optimize 45-patient OPD", "Reduce patient wait times", "No-show pattern analysis"],
}

const modeBadgeClass: Record<Mode, string> = {
  clinical: "bg-blue-50 text-blue-700 border-blue-200",
  billing:  "bg-amber-50 text-amber-700 border-amber-200",
  docs:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  insights: "bg-purple-50 text-purple-700 border-purple-200",
}

export default function ChatBox({ mode, pendingPrompt, onPendingClear }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const currentMode = MODES.find(m => m.id === mode)!

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  // Fire pending demo prompt
  useEffect(() => {
    if (pendingPrompt) {
      setText(pendingPrompt.text)
      onPendingClear()
      setTimeout(() => sendWith(pendingPrompt.text, pendingPrompt.mode), 80)
    }
  }, [pendingPrompt])

  const sendWith = async (msg: string, m: Mode) => {
    if (!msg.trim() || loading) return
    const userMsg: Message = { role: "user", text: msg, mode: m }
    const aiMsg: Message = { role: "ai", text: "", mode: m }
    setMessages(prev => [...prev, userMsg, aiMsg])
    setText("")
    setLoading(true)
    let accumulated = ""
    try {
      await streamMessage(msg, m, (chunk) => {
        accumulated += chunk
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: "ai", text: accumulated, mode: m }
          return updated
        })
      })
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: "ai", text: '{"type":"error","message":"Connection error. Please try again."}', mode: m }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSend = () => sendWith(text, mode)

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 120) + "px"
  }

  return (
    <div className="flex flex-col bg-slate-50" style={{ height: "100vh" }}>

      {/* Mode header */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">{currentMode.icon}</span>
          <div>
            <h1 className="font-display font-bold text-slate-900 text-base leading-none">{currentMode.label}</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">{currentMode.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border tracking-wide ${modeBadgeClass[mode]}`}>
            {currentMode.badge}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            AI Online
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 pb-20">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-3xl shadow-xl shadow-blue-200">
              {currentMode.icon}
            </div>
            <div>
              <h2 className="font-display font-bold text-slate-800 text-xl">{currentMode.label}</h2>
              <p className="text-slate-400 text-sm mt-1.5 max-w-sm leading-relaxed">
                Type a query or click a demo case in the sidebar to see structured AI output
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {HINTS[mode].map((h) => (
                <button
                  key={h}
                  onClick={() => { setText(h); textareaRef.current?.focus() }}
                  className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} text={m.text} mode={m.mode} />
        ))}

        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 bg-white px-4 py-3 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-end gap-3">
          <div className="flex-1 flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={e => { setText(e.target.value); autoResize(e.target) }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder={`${currentMode.icon}  ${mode === "clinical" ? "Describe patient symptoms..." : mode === "billing" ? "Describe visit for billing codes..." : mode === "docs" ? "Describe patient case for documentation..." : "Describe your clinic situation..."}`}
              className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-800 placeholder-slate-400 max-h-[120px]"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={loading || !text.trim()}
            className="w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white shadow-lg shadow-blue-200 transition-all active:scale-95 flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-2">
          AI-assisted only · Not a substitute for clinical judgment · Always verify with a qualified physician
        </p>
      </div>
    </div>
  )
}